import {
    AccountBalanceQuery,
    AccountId,
    Client, ContractFunctionSelector,
    Mnemonic,
    PrivateKey,
    PublicKey,
    Transaction,
    TransferTransaction
} from "@hashgraph/sdk";
import {Buffer} from "buffer";
import {hethers} from "@hashgraph/hethers";
import {createAccount, getAccountsFromPublicKey, requestTokenInfo, signContractCallTx} from "./ApiService";
import {Network} from "./models/Networks";
import StringHelpers from "./helpers/StringHelpers";
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

        this.sendMessageToNative(completionKey, {status: "success"})
    }

    /**
     * Get balances by Hedera accountId (address)
     *
     * @param {string} accountId
     * @param {string} completionKey
     */
    getBalance(accountId, completionKey) {
        const client = this.getClient();

        new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(client).then(data => {
            this.sendMessageToNative(completionKey, this.processBalanceData(data))
        }).catch(error => {
            this.sendMessageToNative(completionKey, null, error)
        })
    }

    /**
     * Transfer Hbars from current account to a receiver
     *
     * @param {string} accountId
     * @param {string} accountPrivateKey
     * @param {string} receiverID
     * @param {string} amount
     * @param {string} completionKey
     */
    transferHbars(accountId, accountPrivateKey, receiverID, amount, completionKey) {
        const client = this.getClient();
        client.setOperator(accountId, accountPrivateKey);

        const parsedAmount = parseFloat(amount);
        new TransferTransaction()
            .addHbarTransfer(receiverID, parsedAmount)
            .addHbarTransfer(accountId, -1 * parsedAmount)
            .execute(client).then(data => {
            this.sendMessageToNative(completionKey, data)
        }).catch(error => {
            this.sendMessageToNative(completionKey, null, error)
        })
    }

    /**
     * Contract function call
     *
     * @param {string} contractId
     * @param {string} functionName
     * @param {string} paramsEncoded
     * @param {string} accountId
     * @param {string} accountPrivateKey
     * @param {string} completionKey
     */
    async contractCallFunction(contractId: string, functionName: string, paramsEncoded: string, accountId: string, accountPrivateKey: string, completionKey: string) {
        try {
            const client = this.getClient();
            client.setOperator(accountId, accountPrivateKey);

            const parseContractFunctionParams = (paramsEncoded) => {
                const types: string[] = [];
                const values: any[] = [];
                const paramsData = JSON.parse(paramsEncoded);

                paramsData.forEach(param => {
                    switch (param?.type) {
                        case "address": {
                            // ["0.0.48619523"]
                            const solidityAddress = AccountId.fromString(param.value[0]).toSolidityAddress()

                            types.push(param.type);
                            values.push(solidityAddress);
                        } break;

                        case "address[]": {
                            // ["0.0.48619523", "0.0.4861934333"]

                            const solidityAddresses = param.value.map(address => {
                                return AccountId.fromString(address).toSolidityAddress()
                            })

                            types.push(param.type);
                            values.push(solidityAddresses);
                        } break;

                        case "bytes32": {
                            // "WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTMsMTQsMTUsMTYsMTcsMTgsMTksMjAsMjEsMjIsMjMsMjQsMjUsMjYsMjcsMjgsMjksMzAsMzFd"
                            // base64 decode -> json parse -> data
                            types.push(param.type);
                            values.push(Uint8Array.from(JSON.parse(atob(param.value[0]))));
                        } break;
                        case "uint8":
                        case "int64":
                        case "uint64":
                        case "uint256": {
                            types.push(param.type);
                            values.push(param.value[0]);
                        } break;
                        case "uint64[]":
                        case "uint256[]": {
                            types.push(param.type);
                            values.push(param.value);
                        } break;

                        case "tuple": {
                            const result = parseContractFunctionParams(param.value[0]);

                            types.push(`tuple(${result.types})`);
                            values.push(result.values);
                        } break;

                        case "tuple[]": {
                            const result = param.value.map(value => {
                                return parseContractFunctionParams(value)
                            });

                            types.push(`tuple[](${result[0].types})`);
                            values.push(result.map(({values}) => values));
                        } break;
                        default: {
                            const error = {
                                name: "SwiftBlade JS",
                                reason: `Type "${param?.type}" not implemented on JS`
                            };
                            this.sendMessageToNative(completionKey, null, error);
                            throw error;
                        } break;
                    }
                });

                return {types, values};
            }

            const {types, values} = parseContractFunctionParams(paramsEncoded);
            // console.log(types, values);

            const abiCoder = new hethers.utils.AbiCoder();
            const encodedBytes0x = abiCoder.encode(types, values);

            const fromHexString = (hexString) => {
                if (!hexString || hexString.length < 2) {
                    return Uint8Array.from([]);
                }
                return Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
            }

            // to get function identifier we need to hash functions signature with params
            const cfs = new ContractFunctionSelector(functionName);
            cfs._params = types.join(',');
            const functionIdentifier = cfs._build();

            const encodedBytes = encodedBytes0x.split("0x")[1];
            const paramBytes = Buffer.concat([functionIdentifier, fromHexString(encodedBytes)]);

            const options = {
                dAppCode: this.dAppCode,
                apiKey: this.apiKey,
                paramBytes,
                contractId,
                functionName,
            };

            const {transactionBytes} = await signContractCallTx(this.network, options);
            const buffer = Buffer.from(transactionBytes, "base64");
            const transaction = Transaction.fromBytes(buffer);

            transaction
                .sign(PrivateKey.fromString(accountPrivateKey))
                .then(signTx => {
                    return signTx.execute(client);
                })
                .then(executedTx => {
                    return executedTx.getReceipt(client)
                })
                .then(txReceipt => {
                    const result = {
                        status: txReceipt.status?.toString(),
                        contractId: txReceipt.contractId?.toString(),
                        topicSequenceNumber: txReceipt.topicSequenceNumber?.toString(),
                        totalSupply: txReceipt.totalSupply?.toString(),
                        serial: txReceipt.serials?.map(value => value.toString())
                    }
                    this.sendMessageToNative(completionKey, result);
                })
                .catch(error => {
                    this.sendMessageToNative(completionKey, null, error)
                });
        } catch (error) {
            this.sendMessageToNative(completionKey, null, error)
        }
    }

    /**
     * Transfer tokens from current account to a receiver
     *
     * @param {string} tokenId
     * @param {string} accountId
     * @param {string} accountPrivateKey
     * @param {string} receiverID
     * @param {string} amount
     * @param {string} completionKey
     */
    async transferTokens(tokenId, accountId, accountPrivateKey, receiverID, amount, completionKey) {
        const client = this.getClient();
        client.setOperator(accountId, accountPrivateKey)

        try {
            const meta = await requestTokenInfo(this.network, tokenId);
            const correctedAmount = parseFloat(amount) * (10 ** parseInt(meta.decimals));

            new TransferTransaction()
                .addTokenTransfer(tokenId, receiverID, correctedAmount)
                .addTokenTransfer(tokenId, accountId, -1 * correctedAmount)
                .execute(client).then(data => {
                this.sendMessageToNative(completionKey, data)
            }).catch(error => {
                this.sendMessageToNative(completionKey, null, error)
            });
        } catch (error) {
            this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Method that creates new account
     *
     * @param {string} completionKey
     */
    async createAccount(completionKey) {
        const seedPhrase = await Mnemonic.generate12();
        const privateKey = await seedPhrase.toEcdsaPrivateKey();
        const publicKey = privateKey.publicKey.toStringDer();

        const options = {
            apiKey: this.apiKey,
            fingerprint: this.fingerprint,
            dAppCode: this.dAppCode,
            publicKey
        };

        try {
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
            this.sendMessageToNative(completionKey, result)
        } catch (error) {
            this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get public/private keys by seed phrase
     *
     * @param {string} mnemonicRaw
     * @param {boolean} lookupNames
     * @param {string} completionKey
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

            this.sendMessageToNative(completionKey, {
                privateKey: privateKey.toStringDer(),
                publicKey: publicKey.toStringDer(),
                accounts
            })
        } catch (error) {
            this.sendMessageToNative(completionKey, null, error)
        }
    }

    /**
     * Sign message by private key
     *
     * @param {string} messageString
     * @param {string} privateKey
     * @param {string} completionKey
     */
    sign(messageString, privateKey, completionKey) {
        try {
            const key = PrivateKey.fromString(privateKey)
            const signed = key.sign(Buffer.from(messageString, 'base64'))

            this.sendMessageToNative(completionKey, {
                signedMessage: Buffer.from(signed).toString("base64")
            })
        } catch (error) {
            this.sendMessageToNative(completionKey, null, error)
        }
    }
    /**
     * Sign message with hethers lib (signedTypeData)
     *
     * @param {string} messageString
     * @param {string} privateKey
     * @param {string} completionKey
     */
    hethersSign(messageString, privateKey, completionKey) {
        const wallet = new hethers.Wallet(privateKey);
        wallet.signMessage(messageString).then(signedMessage => {
            this.sendMessageToNative(completionKey, {
                signedMessage: signedMessage
            })
        }).catch((error) => {
            this.sendMessageToNative(completionKey, null, error)
        })
    }

    splitSignature(signature: string, completionKey: string) {
        try {
            const {v, r, s} = hethers.utils.splitSignature(signature);
            this.sendMessageToNative(completionKey, {v, r, s});
        } catch (error) {
            this.sendMessageToNative(completionKey, null, error);
        }
    }

    private getClient() {
        return this.network === Network.Testnet ? Client.forTestnet() : Client.forMainnet()
    }

    /**
     * Message that sends response back to native handler
     *
     * @param {string} completionKey
     * @param {*} data
     * @param {Error} error
     */
    private sendMessageToNative(completionKey: string, data: any | null, error: Partial<CustomError> = null) {
        // @ts-ignore
        if (window?.webkit?.messageHandlers?.bladeMessageHandler) {
            var responseObject = {
                completionKey: completionKey,
                data: data
            }
            if (error) {
                responseObject["error"] = {
                    name: error?.name || "Error",
                    reason: error.reason || error.message || JSON.stringify(error)
                }
            }
            // @ts-ignore
            window.webkit.messageHandlers.bladeMessageHandler.postMessage(JSON.stringify(responseObject));
        }
    }

    /**
     * Object to parse balance response
     *
     * @param {JSON} data
     * @returns {JSON}
     */
    private processBalanceData(data) {
        const hbars = data.hbars.toBigNumber().toNumber();
        var tokens: any[] = []
        const dataJson = data.toJSON()
        dataJson.tokens.forEach(token => {
            var balance = Number(token.balance)
            const tokenDecimals = Number(token.decimals)
            if (tokenDecimals) balance = balance / (10 ** tokenDecimals)
            tokens.push({
                tokenId: token.tokenId,
                balance: balance
            })
        });
        return {
            hbars: hbars,
            tokens: tokens
        }
    }
}

window["bladeSdk"] = new SDK();