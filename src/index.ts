import {
    AccountBalanceQuery,
    AccountDeleteTransaction,
    Client,
    ContractExecuteTransaction,
    Mnemonic,
    PrivateKey,
    PublicKey,
    Transaction,
    TransferTransaction
} from "@hashgraph/sdk";
import {Buffer} from "buffer";
import {hethers} from "@hashgraph/hethers";
import {
    checkAccountCreationStatus,
    createAccount,
    accountInfo,
    getAccountsFromPublicKey,
    getPendingAccountData,
    getTransactionsFrom,
    requestTokenInfo,
    signContractCallTx,
    transferTokens
} from "./ApiService";
import {Network} from "./models/Networks";
import StringHelpers from "./helpers/StringHelpers";
import {parseContractFunctionParams} from "./helpers/ContractHelpers";
import {CustomError} from "./models/Errors";
import {AccountStatus} from "./models/Common";
import {executeUpdateAccountTransactions} from "./helpers/AccountHelpers";

export class SDK {
    private apiKey: string = "";
    private network: Network = Network.Testnet;
    private dAppCode: string = "";
    private fingerprint: string = "";

    init(apiKey: string, network: string, dAppCode: string, fingerprint: string, completionKey: string) {
        this.apiKey = apiKey;
        this.network = StringHelpers.stringToNetwork(network);
        this.dAppCode = dAppCode;
        this.fingerprint = fingerprint;

        return this.sendMessageToNative(completionKey, {status: "success"});
    }

    getBalance(accountId: string, completionKey: string) {
        const client = this.getClient();

        return new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(client)
            .then(data => {
                return this.sendMessageToNative(completionKey, this.processBalanceData(data));
            }).catch(error => {
                return this.sendMessageToNative(completionKey, null, error);
            });
    }

    transferHbars(accountId: string, accountPrivateKey: string, receiverID: string, amount: string, completionKey: string) {
        try {
            const client = this.getClient();
            client.setOperator(accountId, accountPrivateKey);

            const parsedAmount = parseFloat(amount);
            return new TransferTransaction()
                .addHbarTransfer(receiverID, parsedAmount)
                .addHbarTransfer(accountId, -1 * parsedAmount)
                .execute(client)
                .then(data => {
                    return this.sendMessageToNative(completionKey, data);
                }).catch(error => {
                    return this.sendMessageToNative(completionKey, null, error);
                });
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }

    }

    async contractCallFunction(
        contractId: string,
        functionName: string,
        paramsEncoded: string,
        accountId: string,
        accountPrivateKey: string,
        gas: number = 100000,
        bladePayFee: boolean = false,
        completionKey: string
    ) {
        try {
            const client = this.getClient();
            client.setOperator(accountId, accountPrivateKey);
            const {types, values} = await parseContractFunctionParams(paramsEncoded, this.network);

            // get func identifier
            const functionSignature = `${functionName}(${types.join(",")})`;
            const functionIdentifier = new hethers.utils.Interface([
                hethers.utils.FunctionFragment.from(functionSignature)
            ]).getSighash(functionName);

            const abiCoder = new hethers.utils.AbiCoder();
            const encodedBytes = abiCoder.encode(types, values);

            const contractFunctionParameters = Buffer.concat([
                hethers.utils.arrayify(functionIdentifier),
                hethers.utils.arrayify(encodedBytes)
            ]);

            let transaction;
            if (bladePayFee) {
                const options = {
                    dAppCode: this.dAppCode,
                    apiKey: this.apiKey,
                    contractFunctionParameters,
                    contractId,
                    functionName,
                    gas
                };

                const {transactionBytes} = await signContractCallTx(this.network, options);
                const buffer = Buffer.from(transactionBytes, "base64");
                transaction = Transaction.fromBytes(buffer);
            } else {
                transaction = new ContractExecuteTransaction()
                    .setContractId(contractId)
                    .setGas(gas)
                    .setFunction(functionName)
                    .setFunctionParameters(contractFunctionParameters)
                    .freezeWith(client);
            }

            return transaction
                .sign(PrivateKey.fromString(accountPrivateKey))
                .then(signTx => {
                    return signTx.execute(client);
                })
                .then(executedTx => {
                    return executedTx.getReceipt(client);
                })
                .then(txReceipt => {
                    const result = {
                        status: txReceipt.status?.toString(),
                        contractId: txReceipt.contractId?.toString(),
                        topicSequenceNumber: txReceipt.topicSequenceNumber?.toString(),
                        totalSupply: txReceipt.totalSupply?.toString(),
                        // TODO check if we need serial
                        serial: txReceipt.serials?.map(value => value.toString())
                    };
                    return this.sendMessageToNative(completionKey, result);
                })
                .catch(error => {
                    return this.sendMessageToNative(completionKey, null, error);
                });
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    async transferTokens(tokenId: string, accountId: string, accountPrivateKey: string, receiverID: string, amount: string, freeTransfer: boolean = true, completionKey: string) {
        try {
            const client = this.getClient();
            client.setOperator(accountId, accountPrivateKey);

            const meta = await requestTokenInfo(this.network, tokenId);
            const correctedAmount = parseFloat(amount) * (10 ** parseInt(meta.decimals));

            if (freeTransfer) {
                const options = {
                    dAppCode: this.dAppCode,
                    apiKey: this.apiKey,
                    receiverAccountId: receiverID,
                    senderAccountId: accountId,
                    amount: correctedAmount,
                    decimals: null,
                    memo: ""
                    // no tokenId, backend pick first token from list for currend dApp
                };

                const {transactionBytes} = await transferTokens(this.network, options);
                const buffer = Buffer.from(transactionBytes, "base64");
                const transaction = Transaction.fromBytes(buffer);

                return transaction
                    .sign(PrivateKey.fromString(accountPrivateKey))
                    .then(signTx => {
                        return signTx.execute(client);
                    })
                    .then(result => {
                        return this.sendMessageToNative(completionKey, result);
                    })
                    .catch(error => {
                        return this.sendMessageToNative(completionKey, null, error);
                    });
            } else {
                return new TransferTransaction()
                    .addTokenTransfer(tokenId, receiverID, correctedAmount)
                    .addTokenTransfer(tokenId, accountId, -1 * correctedAmount)
                    .execute(client)
                    .then(data => {
                        return this.sendMessageToNative(completionKey, data);
                    }).catch(error => {
                        return this.sendMessageToNative(completionKey, null, error);
                    });
            }

        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    async createAccount(completionKey: string) {
        try {
            let seedPhrase: Mnemonic | null = null;
            let privateKey: PrivateKey | null = null;

            let valid = false;
            // https://github.com/hashgraph/hedera-sdk-js/issues/1396
            do {
                seedPhrase = await Mnemonic.generate12();
                privateKey = await seedPhrase.toEcdsaPrivateKey();
                const privateKeyString = privateKey.toStringDer();
                const publicKeyString = privateKey.publicKey.toStringRaw();
                const restoredPrivateKey = PrivateKey.fromString(privateKeyString);
                const restoredPublicKeyString = restoredPrivateKey.publicKey.toStringRaw();
                valid = publicKeyString === restoredPublicKeyString;
            } while (!valid);
            const publicKey = privateKey.publicKey.toStringDer();

            const options = {
                apiKey: this.apiKey,
                fingerprint: this.fingerprint,
                dAppCode: this.dAppCode,
                publicKey
            };

            const {
                id,
                transactionBytes,
                updateAccountTransactionBytes,
                transactionId
            } = await createAccount(this.network, options);

            await executeUpdateAccountTransactions(this.getClient(), privateKey, updateAccountTransactionBytes, transactionBytes);

            const evmAddress = hethers.utils.computeAddress(`0x${privateKey.publicKey.toStringRaw()}`);

            const result = {
                transactionId,
                status: transactionId ? "PENDING" : "SUCCESS",
                seedPhrase: seedPhrase.toString(),
                publicKey,
                privateKey: privateKey.toStringDer(),
                accountId: id || null,
                evmAddress: evmAddress.toLowerCase()
            };
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    async getPendingAccount(transactionId: string, mnemonic: string, completionKey: string) {
        try {
            const seedPhrase = await Mnemonic.fromString(mnemonic);
            const privateKey = await seedPhrase.toEcdsaPrivateKey();
            const publicKey = privateKey.publicKey.toStringDer();
            let evmAddress = hethers.utils.computeAddress(`0x${privateKey.publicKey.toStringRaw()}`);

            const result = {
                transactionId,
                status: AccountStatus.PENDING,
                seedPhrase: seedPhrase.toString(),
                publicKey,
                privateKey: privateKey.toStringDer(),
                accountId: null,
                evmAddress: evmAddress.toLowerCase(),
                queueNumber: 0
            };

            const params = {
                apiKey: this.apiKey,
                fingerprint: this.fingerprint,
                network: this.network.toLowerCase(),
                dAppCode: this.dAppCode
            };
            const {status, queueNumber} = await checkAccountCreationStatus(transactionId, this.network, params);
            if (status === AccountStatus.SUCCESS) {
                const {
                    id,
                    transactionBytes,
                    updateAccountTransactionBytes,
                    originalPublicKey
                } = await getPendingAccountData(transactionId, this.network, params);

                await executeUpdateAccountTransactions(this.getClient(), privateKey, updateAccountTransactionBytes, transactionBytes);

                evmAddress = hethers.utils.computeAddress(`0x${originalPublicKey ? originalPublicKey.slice(-66) : privateKey.publicKey.toStringRaw()}`);

                result.transactionId = null;
                result.status = status;
                result.accountId = id;
                result.evmAddress = evmAddress.toLowerCase();
            } else {
                result.queueNumber = queueNumber;
            }

            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    async deleteAccount(deleteAccountId: string, deletePrivateKey: string, transferAccountId: string, operatorAccountId: string, operatorPrivateKey: string, completionKey: string) {
        try {
            const client = this.getClient();
            const deleteAccountKey = PrivateKey.fromString(deletePrivateKey);
            const operatorAccountKey = PrivateKey.fromString(operatorPrivateKey);
            client.setOperator(operatorAccountId, operatorAccountKey);

            const transaction = await new AccountDeleteTransaction()
                .setAccountId(deleteAccountId)
                .setTransferAccountId(transferAccountId)
                .freezeWith(client)
            ;

            const signTx = await transaction.sign(deleteAccountKey);
            const txResponse = await signTx.execute(client);
            const txReceipt = await txResponse.getReceipt(client);

            const result = {
                status: txReceipt.status?.toString(),
                contractId: txReceipt.contractId?.toString(),
                topicSequenceNumber: txReceipt.topicSequenceNumber?.toString(),
                totalSupply: txReceipt.totalSupply?.toString(),
                // TODO check if we need serial
                serial: txReceipt.serials?.map(value => value.toString())
            };
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    async getAccountInfo(accountId: string, completionKey: string) {
        try {
            const {evmAddress, publicKey} = await accountInfo(this.network, accountId);

            return this.sendMessageToNative(completionKey, {
                accountId,
                evmAddress: evmAddress,
                calculatedEvmAddress: hethers.utils.computeAddress(`0x${publicKey}`).toLowerCase()
            });
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    async getKeysFromMnemonic(mnemonicRaw: string, lookupNames: boolean, completionKey: string) {
        try {
            //TODO support all the different type of private keys
            const mnemonic = await Mnemonic.fromString(mnemonicRaw);
            //TODO check which type of keys to be used
            const privateKey = await mnemonic.toEcdsaPrivateKey();
            const publicKey = privateKey.publicKey;
            let accounts = [];

            if (lookupNames) {
                accounts = await getAccountsFromPublicKey(this.network, publicKey);
            }

            return this.sendMessageToNative(completionKey, {
                privateKey: privateKey.toStringDer(),
                publicKey: publicKey.toStringDer(),
                accounts,
                evmAddress: hethers.utils.computeAddress(`0x${publicKey.toStringRaw()}`).toLowerCase()
            });
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    sign(messageString: string, privateKey: string, completionKey: string) {
        try {
            const key = PrivateKey.fromString(privateKey);
            const signed = key.sign(Buffer.from(messageString, "base64"));

            return this.sendMessageToNative(completionKey, {
                signedMessage: Buffer.from(signed).toString("hex")
            });
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    signVerify(messageString: string, signature: string, publicKey: string, completionKey: string) {
        try {
            const valid = PublicKey.fromString(publicKey).verify(
                Buffer.from(messageString, "base64"),
                Buffer.from(signature, "hex")
            );
            return this.sendMessageToNative(completionKey, {valid});
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    hethersSign(messageString: string, privateKey: string, completionKey: string) {
        try {
            const wallet = new hethers.Wallet(privateKey);
            return wallet
                .signMessage(Buffer.from(messageString, "base64"))
                .then(signedMessage => {
                    return this.sendMessageToNative(completionKey, {
                        signedMessage: signedMessage
                    });
                });
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }

    }

    splitSignature(signature: string, completionKey: string) {
        try {
            const {v, r, s} = hethers.utils.splitSignature(signature);
            return this.sendMessageToNative(completionKey, {v, r, s});
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    async getParamsSignature(paramsEncoded: any, privateKey: string, completionKey: string) {
        try {
            const {types, values} = await parseContractFunctionParams(paramsEncoded, this.network);
            const hash = hethers.utils.solidityKeccak256(types, values);
            const messageHashBytes = hethers.utils.arrayify(hash);

            const wallet = new hethers.Wallet(privateKey);
            const signed = await wallet.signMessage(messageHashBytes);

            const {v, r, s} = hethers.utils.splitSignature(signed);
            return this.sendMessageToNative(completionKey, {v, r, s});
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    async getTransactions(accountId: string, transactionType: string = "", nextPage: string, transactionsLimit: string = "10", completionKey: string) {
        try {
            const transactionData = await getTransactionsFrom(this.network, accountId, transactionType, nextPage, transactionsLimit);
            return this.sendMessageToNative(completionKey, transactionData);
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    private getClient() {
        return this.network === Network.Testnet ? Client.forTestnet() : Client.forMainnet();
    }

    /**
     * Message that sends response back to native handler
     */
    private sendMessageToNative(completionKey: string, data: any | null, error: Partial<CustomError> = null) {
        const responseObject = {
            completionKey: completionKey,
            data: data
        };
        if (error) {
            responseObject["error"] = {
                name: error?.name || "Error",
                reason: error.reason || error.message || JSON.stringify(error)
            };
        }

        // @ts-ignore  // IOS or Android
        const bladeMessageHandler = window?.webkit?.messageHandlers?.bladeMessageHandler || window?.bladeMessageHandler;
        if (bladeMessageHandler) {
            bladeMessageHandler.postMessage(JSON.stringify(responseObject));
        }
        return JSON.parse(JSON.stringify(responseObject));
    }

    /**
     * Object to parse balance response
     *
     * @param {JSON} data
     * @returns {JSON}
     */
    private processBalanceData(data) {
        const hbars = data.hbars.toBigNumber().toNumber();
        const tokens: any[] = [];
        const dataJson = data.toJSON();
        dataJson.tokens.forEach(token => {
            var balance = Number(token.balance);
            const tokenDecimals = Number(token.decimals);
            if (tokenDecimals) balance = balance / (10 ** tokenDecimals);
            tokens.push({
                tokenId: token.tokenId,
                balance: balance
            });
        });
        return {
            hbars: hbars,
            tokens: tokens
        };
    }
}

if (window) window["bladeSdk"] = new SDK();
