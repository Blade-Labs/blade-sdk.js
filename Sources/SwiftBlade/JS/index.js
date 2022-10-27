import {
    Client,
    AccountBalanceQuery,
    TransferTransaction,
    Mnemonic,
    PrivateKey,
    Transaction,
    ContractFunctionParameters, AccountId, ContractExecuteTransaction
} from "@hashgraph/sdk";
import { Buffer } from "buffer";
import BigNumber from "bignumber.js";

export class SDK {

    static NETWORK = 'testnet'

    /**
     * Set network for Hedera operations
     *
     * @param {string} network
     */
    static setNetwork(network, completionKey) {
        SDK.NETWORK = network
        SDK.#sendMessageToNative(completionKey, {status: "success"})
    }

    /**
     * Get balances by Hedera accountId (address)
     *
     * @param {string} accountId
     */
    static getBalance(accountId, completionKey) {
        const client = SDK.#getClient();

        new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(client).then(data => {
            SDK.#sendMessageToNative(completionKey, data)
        }).catch(error => {
            SDK.#sendMessageToNative(completionKey, null, error)
        })
    }

    /**
     * Transfer Hbars from current account to a receiver
     *
     * @param {string} accountId
     * @param {string} accountPrivateKey
     * @param {string} receiverID
     * @param {number} amount
     */
    static transferHbars(accountId, accountPrivateKey, receiverID, amount, completionKey) {
        const client = SDK.#getClient();
        client.setOperator(accountId, accountPrivateKey);

        new TransferTransaction()
            .addHbarTransfer(receiverID, amount)
            .addHbarTransfer(accountId, -1 * amount)
            .execute(client).then(data => {
            SDK.#sendMessageToNative(completionKey, data)
        }).catch(error => {
            SDK.#sendMessageToNative(completionKey, null, error)
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
     * @param {number} gas
     * @param {string} completionKey
     */
    static contractCallFunction(contractId, functionName, paramsEncoded, accountId, accountPrivateKey, gas, completionKey) {
        const client = SDK.#getClient();
        client.setOperator(accountId, accountPrivateKey);

        const encodedParams = JSON.parse(paramsEncoded);
        const functionParams = new ContractFunctionParameters();
        encodedParams.forEach(param => {
            switch (param?.type) {
                case "address": {
                    // "0.0.48619523"
                    const solidityAddress = AccountId.fromString(param.value).toSolidityAddress()
                    functionParams.addAddress(solidityAddress);
                } break;
                case "bytes32": {
                    // "WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTMsMTQsMTUsMTYsMTcsMTgsMTksMjAsMjEsMjIsMjMsMjQsMjUsMjYsMjcsMjgsMjksMzAsMzFd"
                    // base64 decode -> json parse -> data
                    functionParams.addBytes32(Uint8Array.from(JSON.parse(atob(param.value))));
                } break;
                case "int64": {
                    // "18446744073709551615"
                    functionParams.addInt64(BigNumber(param.value));
                } break;
                case "uint64": {
                    // "18446744073709551615"
                    functionParams.addUint64(BigNumber(param.value));
                } break;
                case "uint256": {
                    // "1780731860627700044960722568376592200742329637303199754547598369979440671"
                    functionParams.addUint256(BigNumber(param.value));
                } break;
                default: {
                    const error = {
                        name: "SwiftBlade JS",
                        reason: `Type "${param?.type}" not implemented on JS`
                    };
                    SDK.#sendMessageToNative(completionKey, null, error);
                    throw error;
                } break;
            }
        })

        const contractFunc = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(gas)
            .setFunction(functionName, functionParams)
        ;

        contractFunc
            .freezeWith(client)
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
                    serial: txReceipt.serial?.map(value => value.toString())
                }
                SDK.#sendMessageToNative(completionKey, result);
            })
            .catch(error => {
                SDK.#sendMessageToNative(completionKey, null, error)
            });
    }

    /**
     * Transfer tokens from current account to a receiver
     *
     * @param {string} tokenId
     * @param {string} accountId
     * @param {string} accountPrivateKey
     * @param {string} receiverID
     * @param {number} amount
     * @param {string} completionKey
     */
    static transferTokens(tokenId, accountId, accountPrivateKey, receiverID, amount, completionKey) {
        const client = SDK.#getClient();
        client.setOperator(accountId, accountPrivateKey)

        new TransferTransaction()
            .addTokenTransfer(tokenId, receiverID, amount)
            .addTokenTransfer(tokenId, accountId, -1 * amount)
            .execute(client).then(data => {
            SDK.#sendMessageToNative(completionKey, data)
        }).catch(error => {
            SDK.#sendMessageToNative(completionKey, null, error)
        })
    }

    /**
     * Method that generates set of keys and seed phrase
     *
     * @param {string} completionKey
     */
    static generateKeys(completionKey) {
        Mnemonic.generate12().then(seedPhrase => {
            //TODO check which type of keys to be used
            seedPhrase.toEcdsaPrivateKey().then(privateKey => {
                var publicKey = privateKey.publicKey;
                SDK.#sendMessageToNative(completionKey, {
                    seedPhrase: seedPhrase.toString(),
                    publicKey: publicKey.toStringDer(),
                    privateKey: privateKey.toStringDer()
                })
            }).catch(error => {
                SDK.#sendMessageToNative(completionKey, null, error)
            })
        });
    }

    /**
     * Get public/private keys by seed phrase
     *
     * @param {string} mnemonic
     * @param {string} completionKey
     */
    static getKeysFromMnemonic(mnemonic, completionKey) {
        //TODO support all the different type of private keys
        Mnemonic.fromString(mnemonic).then(mnemonicObj => {
            //TODO check which type of keys to be used
            mnemonicObj.toEcdsaPrivateKey().then(privateKey => {
                var publicKey = privateKey.publicKey;
                SDK.#sendMessageToNative(completionKey, {
                    privateKey: privateKey.toStringDer(),
                    publicKey: publicKey.toStringDer()
                })
            }).catch((error) => {
                SDK.#sendMessageToNative(completionKey, null, error)
            })
        }).catch((error) => {
            SDK.#sendMessageToNative(completionKey, null, error)
        })
    }

    /**
     * Sign message by private key
     *
     * @param {string} messageString
     * @param {string} privateKey
     * @param {string} completionKey
     */
    static sign(messageString, privateKey, completionKey) {
        try {
            const key = PrivateKey.fromString(privateKey)
            const signed = key.sign(Buffer.from(messageString, 'base64'))

            SDK.#sendMessageToNative(completionKey, {
                signedMessage: Buffer.from(signed).toString("base64")
            })
        } catch (error) {
            SDK.#sendMessageToNative(completionKey, null, error)
        }
    }

    /**
     * Execute token association transaction
     *
     * @param {string} transactionBytes
     * @param {string} accountId
     * @param {string} privateKey
     * @param {string} completionKey
     */
    static doTokenAutoAssociate(transactionBytes, accountId, privateKey, completionKey) {
        const client = SDK.#getClient();
        client.setOperator(accountId, privateKey);

        const buffer = Buffer.from(transactionBytes, "base64");
        const tx = Transaction.fromBytes(buffer);
        tx.signWithOperator(client).then(() => {
            tx.execute(client).then(response => {
                const txid = response.transactionId.toString();
                SDK.#sendMessageToNative(completionKey, {
                    txid: txid
                })
            }).catch((error) => {
                SDK.#sendMessageToNative(completionKey, null, error)
            })
        }).catch((error) => {
            SDK.#sendMessageToNative(completionKey, null, error)
        })
    }

    /**
     * Get client based on network
     *
     * @returns {string}
     */
    static #getClient() {
        return SDK.NETWORK === "testnet" ? Client.forTestnet() : Client.forMainnet()
    }

    /**
     * Message that sends response back to native handler
     *
     * @param {string} completionKey
     * @param {*} data
     * @param {Error} error
     */
    static #sendMessageToNative(completionKey, data, error) {
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bladeMessageHandler) {
            var responseObject = {
                completionKey: completionKey,
                data: data
            }
            if (error) {
                responseObject["error"] = {
                    name: error.name,
                    reason: error.reason
                }
            }
            window.webkit.messageHandlers.bladeMessageHandler.postMessage(JSON.stringify(responseObject));
        }
    }
};
