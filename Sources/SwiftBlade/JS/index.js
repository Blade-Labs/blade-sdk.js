import { Client, AccountBalanceQuery, TransferTransaction, Mnemonic, PrivateKey, Transaction } from "@hashgraph/sdk";
import { Buffer } from "buffer";
import { hethers } from '@hashgraph/hethers';

const NetworkMirrorNodes = {
    "mainnet": "https://mainnet-public.mirrornode.hedera.com",
    "testnet": "https://testnet.mirrornode.hedera.com"
};

export class SDK {

    static NETWORK = 'testnet'

    /**
     * Set network for Hedera operations
     *
     * @param {string} network
     */
    static setNetwork(network, completionKey){
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
                SDK.#sendMessageToNative(completionKey, SDK.#processBalanceData(data))
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
     * @param {string} amount
     */
    static transferHbars(accountId, accountPrivateKey, receiverID, amount, completionKey) {
        const client = SDK.#getClient();
        client.setOperator(accountId, accountPrivateKey)

        const parsedAmount = parseFloat(amount);
        new TransferTransaction()
            .addHbarTransfer(receiverID, parsedAmount)
            .addHbarTransfer(accountId, -1 * parsedAmount)
            .execute(client).then(data => {
                SDK.#sendMessageToNative(completionKey, data)
            }).catch(error => {
                SDK.#sendMessageToNative(completionKey, null, error)
            })
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
    static async transferTokens(tokenId, accountId, accountPrivateKey, receiverID, amount, completionKey) {
        const client = SDK.#getClient();
        client.setOperator(accountId, accountPrivateKey)

        try {
            const meta = await SDK.#requestTokenInfo(tokenId);
            const correctedAmount = parseFloat(amount) * (10 ** parseInt(meta.decimals));

            new TransferTransaction()
                .addTokenTransfer(tokenId, receiverID, correctedAmount)
                .addTokenTransfer(tokenId, accountId, -1 * correctedAmount)
                .execute(client).then(data => {
                SDK.#sendMessageToNative(completionKey, data)
            }).catch(error => {
                SDK.#sendMessageToNative(completionKey, null, error)
            });
        } catch (error) {
            SDK.#sendMessageToNative(completionKey, null, error);
        }
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
     * Sign message with hethers lib (signedTypeData)
     *
     * @param {string} messageString
     * @param {string} privateKey
     * @param {string} completionKey
     */
    static hethersSign(messageString, privateKey, completionKey) {
        const wallet = new hethers.Wallet(privateKey);
        wallet.signMessage(messageString).then(signedMessage => {
            SDK.#sendMessageToNative(completionKey, {
                signedMessage: signedMessage
            })
        }).catch((error) => {
            SDK.#sendMessageToNative(completionKey, null, error)
        })
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
     * @returns {NodeClient}
     */
    static #getClient() {
        return SDK.NETWORK == "testnet" ? Client.forTestnet() : Client.forMainnet()
    }

    /**
     * Message that sends response back to native handler
     *
     * @param {string} completionKey
     * @param {*} data
     * @param {Error} error
     */
    static #sendMessageToNative(completionKey, data, error = null) {
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

    /**
     * Object to parse balance response
     *
     * @param {JSON} data
     * @returns {JSON}
     */
    static #processBalanceData(data) {
        const hbars = data.hbars.toBigNumber().toNumber();
        var tokens = []
        const dataJson = data.toJSON()
        dataJson.tokens.forEach(token => {
            var balance = Number(token.balance)
            const tokenDecimals = Number(token.decimals)
            if (tokenDecimals) balance = balance / (10 * tokenDecimals)
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

    static #requestTokenInfo(tokenId) {
        return fetchWithRetry(`${NetworkMirrorNodes[SDK.NETWORK]}/api/v1/tokens/${tokenId}`, {})
            .then(statusCheck)
            .then(x => x.json());
    }
};

const fetchWithRetry = async (url, options, maxAttempts = 3) => {
    return new Promise((resolve, reject) => {
        let attemptCounter = 0;

        const interval = 5000;
        const makeRequest = (url, options) => {
            attemptCounter += 1;
            fetch(url, options)
                .then(async (res) => {
                    if (!res.ok) {
                        // Request timeout check
                        if ((res.status === 408 || res.status === 429) && attemptCounter < maxAttempts) {
                            setTimeout(() => {
                                makeRequest(url, options);
                            }, interval * attemptCounter);
                        } else {
                            reject(await res.json());
                        }
                    } else {
                        resolve(res);
                    }
                });
        };
        makeRequest(url, options);
    });
};

const statusCheck = async (res) => {
    if (!res.ok) {
        throw await res.json();
    }
    return res;
};