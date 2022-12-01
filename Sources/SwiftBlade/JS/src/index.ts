import {
    AccountBalanceQuery, AccountDeleteTransaction,
    Client, ContractFunctionSelector,
    Mnemonic,
    PrivateKey, PublicKey,
    Transaction,
    TransferTransaction
} from "@hashgraph/sdk";
import {Buffer} from "buffer";
import {hethers} from "@hashgraph/hethers";
import {createAccount, getAccountsFromPublicKey, requestTokenInfo, signContractCallTx} from "./ApiService";
import {Network} from "./models/Networks";
import StringHelpers from "./helpers/StringHelpers";
import {parseContractFunctionParams} from "./helpers/ContractHelpers";
import {CustomError} from "./models/Errors";

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

    /**
     * Get balances by Hedera accountId (address)
     */
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

    /**
     * Transfer Hbars from current account to a receiver
     */
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

    /**
     * Contract function call
     */
    async contractCallFunction(contractId: string, functionName: string, paramsEncoded: string, accountId: string, accountPrivateKey: string, completionKey: string) {
        try {
            const client = this.getClient();
            client.setOperator(accountId, accountPrivateKey);


            const {types, values} = parseContractFunctionParams(paramsEncoded);
            // console.log(types, values);

            const abiCoder = new hethers.utils.AbiCoder();
            const encodedBytes0x = abiCoder.encode(types, values);

            const fromHexString = (hexString) => {
                if (!hexString || hexString.length < 2) {
                    return Uint8Array.from([]);
                }
                return Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
            };

            // to get function identifier we need to hash functions signature with params
            const cfs = new ContractFunctionSelector(functionName);
            cfs._params = types.join(",");
            const functionIdentifier = cfs._build();

            const encodedBytes = encodedBytes0x.split("0x")[1];
            const paramBytes = Buffer.concat([functionIdentifier, fromHexString(encodedBytes)]);

            const options = {
                dAppCode: this.dAppCode,
                apiKey: this.apiKey,
                paramBytes,
                contractId,
                functionName
            };

            const {transactionBytes} = await signContractCallTx(this.network, options);
            const buffer = Buffer.from(transactionBytes, "base64");
            const transaction = Transaction.fromBytes(buffer);

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

    /**
     * Transfer tokens from current account to a receiver
     */
    async transferTokens(tokenId: string, accountId: string, accountPrivateKey: string, receiverID: string, amount: string, completionKey: string) {
        try {
            const client = this.getClient();
            client.setOperator(accountId, accountPrivateKey);

            const meta = await requestTokenInfo(this.network, tokenId);
            const correctedAmount = parseFloat(amount) * (10 ** parseInt(meta.decimals));

            return new TransferTransaction()
                .addTokenTransfer(tokenId, receiverID, correctedAmount)
                .addTokenTransfer(tokenId, accountId, -1 * correctedAmount)
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

    /**
     * Method that creates new account
     */
    async createAccount(completionKey: string) {
        try {
            const seedPhrase = await Mnemonic.generate12();
            const privateKey = await seedPhrase.toEcdsaPrivateKey();
            const publicKey = privateKey.publicKey.toStringDer();

            const options = {
                apiKey: this.apiKey,
                fingerprint: this.fingerprint,
                dAppCode: this.dAppCode,
                publicKey
            };


            const {id, transactionBytes, updateAccountTransactionBytes} = await createAccount(this.network, options);

            const client = this.getClient();
            if (updateAccountTransactionBytes) {
                const buffer: Buffer = Buffer.from(updateAccountTransactionBytes, "base64");
                const transaction = await Transaction.fromBytes(buffer).sign(privateKey);
                await transaction.execute(client);
            }

            if (transactionBytes) {
                const buffer = Buffer.from(transactionBytes, "base64");
                const transaction = await Transaction.fromBytes(buffer).sign(privateKey);
                await transaction.execute(client);
            }

            const result = {
                seedPhrase: seedPhrase.toString(),
                publicKey,
                privateKey: privateKey.toStringDer(),
                accountId: id
            };
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
                serial: txReceipt.serials?.map(value => value.toString())
            };
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get public/private keys by seed phrase
     */
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
                accounts
            });
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign message by private key
     */
    sign(messageString: string, privateKey: string, completionKey: string) {
        try {
            const key = PrivateKey.fromString(privateKey);
            const signed = key.sign(Buffer.from(messageString, 'base64'));

            return this.sendMessageToNative(completionKey, {
                signedMessage: Buffer.from(signed).toString("hex")
            });
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Verify signature by public key
     */
    signVerify(messageString: string, signature: string, publicKey: string, completionKey: string) {
        try {
            const valid = PublicKey.fromString(publicKey).verify(
                Buffer.from(messageString, 'base64'),
                Buffer.from(signature, 'hex')
            );
            return this.sendMessageToNative(completionKey, {valid});
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign message with hethers lib (signedTypeData)
     */
    hethersSign(messageString: string, privateKey: string, completionKey: string) {
        try {
            const wallet = new hethers.Wallet(privateKey);
            return wallet
                .signMessage(Buffer.from(messageString, 'base64'))
                .then(signedMessage => {
                    return this.sendMessageToNative(completionKey, {
                        signedMessage: signedMessage
                    });
                })
                .catch((error) => {
                    return this.sendMessageToNative(completionKey, null, error);
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
            const {types, values} = parseContractFunctionParams(paramsEncoded);

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

        // @ts-ignore
        if (window?.webkit?.messageHandlers?.bladeMessageHandler) {
            // @ts-ignore
            window.webkit.messageHandlers.bladeMessageHandler.postMessage(JSON.stringify(responseObject));
        }
        return responseObject;
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