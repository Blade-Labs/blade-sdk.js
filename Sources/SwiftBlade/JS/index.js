import { Client, AccountBalanceQuery, TransferTransaction, Mnemonic, PrivateKey } from "@hashgraph/sdk";
import { Buffer } from "buffer";

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
        client.setOperator(accountId, accountPrivateKey)
    
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
        Mnemonic.fromString(mnemonic).then(function (mnemonicObj) {
            //TODO check which type of keys to be used
            mnemonicObj.toEcdsaPrivateKey().then(function (privateKey) {
                var publicKey = privateKey.publicKey;
                SDK.#sendMessageToNative(completionKey, {
                    privateKey: privateKey.toStringDer(),
                    publicKey: publicKey.toBytesDer()
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
        debugger
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
     * Get client based on network
     * 
     * @returns {string}
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
