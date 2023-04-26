import {
    AccountBalanceQuery,
    AccountDeleteTransaction,
    Client,
    ContractCallQuery,
    ContractExecuteTransaction,
    ContractFunctionResult,
    Mnemonic,
    PrivateKey,
    PublicKey,
    Transaction,
    TransactionReceipt,
    TransactionResponse,
    TransferTransaction
} from "@hashgraph/sdk";
import {Buffer} from "buffer";
import {hethers} from "@hashgraph/hethers";
import {
    checkAccountCreationStatus,
    createAccount,
    accountInfo,
    getAccountsFromPublicKey,
    getC14token,
    getPendingAccountData,
    confirmAccountUpdate,
    getTransactionsFrom,
    requestTokenInfo,
    signContractCallTx,
    transferTokens,
    apiCallContractQuery
} from "./ApiService";
import {Network} from "./models/Networks";
import StringHelpers from "./helpers/StringHelpers";
import {
    getContractFunctionBytecode,
    parseContractFunctionParams,
    parseContractQueryResponse
} from "./helpers/ContractHelpers";
import {CustomError} from "./models/Errors";
import {
    AccountInfoData,
    AccountStatus,
    BalanceData,
    BridgeResponse,
    C14WidgetConfig,
    ContractCallQueryRecord,
    CreateAccountData,
    InitData,
    IntegrationUrlData,
    PrivateKeyData,
    SignMessageData,
    SignVerifyMessageData,
    SplitSignatureData,
    TransactionsHistoryData
} from "./models/Common";
import {executeUpdateAccountTransactions, processBalanceData} from "./helpers/AccountHelpers";
import {ParametersBuilder} from "./ParametersBuilder";

export class BladeSDK {
    private apiKey: string = "";
    private network: Network = Network.Testnet;
    private dAppCode: string = "";
    private fingerprint: string = "";
    private webView: boolean = false;

    /**
     * BladeSDK constructor.
     * @param isWebView - true if you are using this SDK in webview of native app. It changes the way of communication with native app.
     */
    constructor(isWebView = false) {
        this.webView = isWebView;
    }

    /**
     * Inits instance of BladeSDK for correct work with Blade API and Hedera network.
     * @param apiKey Unique key for API provided by Blade team.
     * @param network "Mainnet" or "Testnet" of Hedera network
     * @param dAppCode your dAppCode - request specific one by contacting us
     * @param fingerprint client unique fingerprint
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {InitData} status: "success" or "error"
     */
    init(apiKey: string, network: string, dAppCode: string, fingerprint: string, completionKey?: string): Promise<InitData> {
        this.apiKey = apiKey;
        this.network = StringHelpers.stringToNetwork(network);
        this.dAppCode = dAppCode;
        this.fingerprint = fingerprint;

        return this.sendMessageToNative(completionKey, {status: "success"});
    }

    /**
     * Returns information about initialized instance of BladeSDK.
     * @returns {InfoData}
     */
    getInfo(completionKey?: string): Promise<InitData> {
        return this.sendMessageToNative(completionKey, {
            apiKey: this.apiKey,
            dAppCode: this.dAppCode,
            network: this.network,
            fingerprint: this.fingerprint,
            nonce: Math.round(Math.random() * 1000000000)
        });
    }

    /**
     * Get hbar and token balances for specific account.
     * @param accountId Hedera account id (0.0.xxxxx)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {BalanceData} hbars: number, tokens: [{tokenId: string, balance: number}]
     */
    getBalance(accountId: string, completionKey?: string): Promise<BalanceData> {
        const client = this.getClient();

        return new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(client)
            .then((data) => {
                return this.sendMessageToNative(completionKey, processBalanceData(data));
            }).catch(error => {
                return this.sendMessageToNative(completionKey, null, error);
            });
    }

    /**
     * Send hbars to specific account.
     * @param accountId sender account id (0.0.xxxxx)
     * @param accountPrivateKey sender's hex-encoded private key with DER-header (302e020100300506032b657004220420...). ECDSA or Ed25519
     * @param receiverID receiver account id (0.0.xxxxx)
     * @param amount of hbars to send (decimal number)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionResponse}
     */
    transferHbars(accountId: string, accountPrivateKey: string, receiverID: string, amount: string, completionKey?: string): Promise<TransactionResponse> {
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
     * Call contract function. Directly or via Blade Payer account (fee will be paid by Blade), depending on your dApp configuration.
     * @param contractId - contract id (0.0.xxxxx)
     * @param functionName - name of the contract function to call
     * @param paramsEncoded - function argument. Can be generated with {@link ParametersBuilder} object
     * @param accountId - operator account id (0.0.xxxxx)
     * @param accountPrivateKey - operator's hex-encoded private key with DER-header, ECDSA or Ed25519
     * @param gas - gas limit for the transaction
     * @param bladePayFee - if true, fee will be paid by Blade (note: msg.sender inside the contract will be Blade Payer account)
     * @param completionKey - optional field bridge between mobile webViews and native apps
     * @returns {Partial<TransactionReceipt>}
     */
    async contractCallFunction(
        contractId: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        accountId: string,
        accountPrivateKey: string,
        gas: number = 100000,
        bladePayFee: boolean = false,
        completionKey?: string
    ): Promise<Partial<TransactionReceipt>> {
        try {
            const client = this.getClient();
            client.setOperator(accountId, accountPrivateKey);
            const contractFunctionParameters = await getContractFunctionBytecode(functionName, paramsEncoded);

            let transaction: Transaction;
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
                transaction = Transaction.fromBytes(Buffer.from(transactionBytes, "base64"));
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

    /**
     * Call query on contract function. Similar to {@link contractCallFunction} can be called directly or via Blade Payer account.
     * @param contractId - contract id (0.0.xxxxx)
     * @param functionName - name of the contract function to call
     * @param paramsEncoded - function argument. Can be generated with {@link ParametersBuilder} object
     * @param accountId - operator account id (0.0.xxxxx)
     * @param accountPrivateKey - operator's hex-encoded private key with DER-header, ECDSA or Ed25519
     * @param gas - gas limit for the transaction
     * @param bladePayFee - if true, fee will be paid by Blade (note: msg.sender inside the contract will be Blade Payer account)
     * @param resultTypes - array of result types. Currently supported only plain data types
     * @param completionKey - optional field bridge between mobile webViews and native apps
     * @returns {ContractCallQueryRecord[]}
     */
    async contractCallQueryFunction(
        contractId: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        accountId: string,
        accountPrivateKey: string,
        gas: number = 100000,
        bladePayFee: boolean = false,
        resultTypes: string[],
        completionKey?: string): Promise<ContractCallQueryRecord[]> {
        try {
            const client = this.getClient();
            client.setOperator(accountId, accountPrivateKey);
            const contractFunctionParameters = await getContractFunctionBytecode(functionName, paramsEncoded);
            let response: ContractFunctionResult;
            try {
                if (bladePayFee) {
                    const options = {
                        dAppCode: this.dAppCode,
                        apiKey: this.apiKey,
                        contractFunctionParameters,
                        contractId,
                        functionName,
                        gas
                    };
                    const {contractFunctionResult, rawResult} = await apiCallContractQuery(this.network, options);

                    response = new ContractFunctionResult({
                        _createResult: false,
                        contractId: contractFunctionResult?.contractId,
                        errorMessage: "",
                        bloom: Uint8Array.from([]),
                        gasUsed: contractFunctionResult?.gasUsed,
                        logs: [],
                        createdContractIds: [],
                        evmAddress: null,
                        bytes: Buffer.from(rawResult, "base64"),
                        gas: contractFunctionResult?.gasUsed,
                        amount: contractFunctionResult?.gasUsed,
                        functionParameters: Uint8Array.from([]),
                        senderAccountId: null,
                        stateChanges: [],
                    });
                } else {
                    response = await new ContractCallQuery()
                        .setContractId(contractId)
                        .setGas(gas)
                        .setFunction(functionName)
                        .setFunctionParameters(contractFunctionParameters)
                        .execute(client);
                }

                const result = await parseContractQueryResponse(response, resultTypes);
                return this.sendMessageToNative(completionKey, result);
            } catch (error) {
                return this.sendMessageToNative(completionKey, null, error);
            }
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error)
        }
    }

    /**
     * Send token to specific account.
     * @param tokenId token id to send (0.0.xxxxx)
     * @param accountId sender account id (0.0.xxxxx)
     * @param accountPrivateKey sender's hex-encoded private key with DER-header (302e020100300506032b657004220420...). ECDSA or Ed25519
     * @param receiverID receiver account id (0.0.xxxxx)
     * @param amount of tokens to send (with token-decimals correction)
     * @param freeTransfer if true, Blade will pay fee transaction. Only for single dApp configured token. In that case tokenId not used
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionResponse}
     */
    async transferTokens(tokenId: string, accountId: string, accountPrivateKey: string, receiverID: string, amount: string, freeTransfer: boolean = false, completionKey?: string): Promise<TransactionResponse> {
        try {
            const client = this.getClient();
            client.setOperator(accountId, accountPrivateKey);

            const meta = await requestTokenInfo(this.network, tokenId);
            const correctedAmount = parseFloat(amount) * (10 ** parseInt(meta.decimals, 10));

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

    /**
     * Create Hedera account (ECDSA). Only for configured dApps. Depending on dApp config Blade create account, associate tokens, etc.
     * In case of not using pre-created accounts pool and network high load, this method can return transactionId and no accountId.
     * In that case account creation added to queue, and you should wait some time and call `getPendingAccount()` method.
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {CreateAccountData}
     */
    async createAccount(completionKey?: string): Promise<CreateAccountData> {
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

            await confirmAccountUpdate({
                accountId: id,
                network: this.network,
                apiKey: this.apiKey,
                fingerprint: this.fingerprint,
                dAppCode: this.dAppCode
            });

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

    /**
     * Get account from queue (read more at `createAccount()`).
     * If account already created, return account data.
     * If account not created yet, response will be same as in `createAccount()` method if account in queue.
     * @param transactionId returned from `createAccount()` method
     * @param mnemonic returned from `createAccount()` method
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {CreateAccountData}
     */
    async getPendingAccount(transactionId: string, mnemonic: string, completionKey?: string): Promise<CreateAccountData> {
        try {
            const seedPhrase = await Mnemonic.fromString(mnemonic);
            const privateKey = await seedPhrase.toEcdsaPrivateKey();
            const publicKey = privateKey.publicKey.toStringDer();
            let evmAddress = hethers.utils.computeAddress(`0x${privateKey.publicKey.toStringRaw()}`);

            const result = {
                transactionId: transactionId || null,
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

                await confirmAccountUpdate({
                    accountId: id,
                    network: this.network,
                    apiKey: this.apiKey,
                    fingerprint: this.fingerprint,
                    dAppCode: this.dAppCode
                });

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

    /**
     * Delete Hedera account
     * @param deleteAccountId account id of account to delete (0.0.xxxxx)
     * @param deletePrivateKey account private key (DER encoded hex string)
     * @param transferAccountId if any funds left on account, they will be transferred to this account (0.0.xxxxx)
     * @param operatorAccountId operator account id (0.0.xxxxx). Used for fee
     * @param operatorPrivateKey operator's account private key (DER encoded hex string)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceipt}
     */
    async deleteAccount(deleteAccountId: string, deletePrivateKey: string, transferAccountId: string, operatorAccountId: string, operatorPrivateKey: string, completionKey?: string): Promise<TransactionReceipt> {
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

    /**
     * Get account info.
     * EvmAddress is address of Hedera account if exists. Else accountId will be converted to solidity address.
     * CalculatedEvmAddress is calculated from account public key. May be different from evmAddress.
     * @param accountId Hedera account id (0.0.xxxxx)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {AccountInfoData}
     */
    async getAccountInfo(accountId: string, completionKey?: string): Promise<AccountInfoData> {
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

    /**
     * Get ECDSA private key from mnemonic. Also try to find accountIds based on public key if lookupNames is true.
     * Returned keys with DER header.
     * EvmAddress computed from Public key.
     * @param mnemonicRaw BIP39 mnemonic
     * @param lookupNames if true, get accountIds from mirror node by public key
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {PrivateKeyData}
     */
    async getKeysFromMnemonic(mnemonicRaw: string, lookupNames: boolean, completionKey?: string): Promise<PrivateKeyData> {
        try {
            //TODO support all the different type of private keys
            const mnemonic = await Mnemonic.fromString(mnemonicRaw);
            //TODO check which type of keys to be used
            const privateKey = await mnemonic.toEcdsaPrivateKey();
            const publicKey = privateKey.publicKey;
            let accounts: string[] = [];

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

    /**
     * Sign base64-encoded message with private key. Returns hex-encoded signature.
     * @param messageString base64-encoded message to sign
     * @param privateKey hex-encoded private key with DER header
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignMessageData}
     */
    sign(messageString: string, privateKey: string, completionKey?: string): Promise<SignMessageData> {
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

    /**
     * Verify message signature by public key
     * @param messageString base64-encoded message (same as provided to `sign()` method)
     * @param signature hex-encoded signature (result from `sign()` method)
     * @param publicKey hex-encoded public key with DER header
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignVerifyMessageData}
     */
    signVerify(messageString: string, signature: string, publicKey: string, completionKey?: string): Promise<SignVerifyMessageData> {
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

    /**
     * Sign base64-encoded message with private key using hethers lib. Returns hex-encoded signature.
     * @param messageString base64-encoded message to sign
     * @param privateKey hex-encoded private key with DER header
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignMessageData}
     */
    hethersSign(messageString: string, privateKey: string, completionKey?: string): Promise<SignMessageData> {
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

    /**
     * Split signature to v-r-s format.
     * @param signature hex-encoded signature
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SplitSignatureData}
     */
    splitSignature(signature: string, completionKey?: string): Promise<SplitSignatureData> {
        try {
            const {v, r, s} = hethers.utils.splitSignature(signature);
            return this.sendMessageToNative(completionKey, {v, r, s});
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get v-r-s signature of contract function params
     * @param paramsEncoded - data to sign. Can be string or ParametersBuilder
     * @param privateKey - signer private key (hex-encoded with DER header)
     * @param completionKey - optional field bridge between mobile webViews and native apps
     * @returns {SplitSignatureData}
     */
    async getParamsSignature(paramsEncoded: string | ParametersBuilder, privateKey: string, completionKey?: string): Promise<SplitSignatureData> {
        try {
            const {types, values} = await parseContractFunctionParams(paramsEncoded);
            const hash = hethers.utils.defaultAbiCoder.encode(types, values);
            const messageHashBytes = hethers.utils.arrayify(hash);

            const wallet = new hethers.Wallet(privateKey);
            const signed = await wallet.signMessage(messageHashBytes);

            const {v, r, s} = hethers.utils.splitSignature(signed);
            return this.sendMessageToNative(completionKey, {v, r, s});
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get transactions history for account. Can be filtered by transaction type.
     * Transaction requested from mirror node. Every transaction requested for child transactions. Result are flattened.
     * If transaction type is not provided, all transactions will be returned.
     * If transaction type is CRYPTOTRANSFERTOKEN records will additionally contain plainData field with decoded data.
     * @param accountId account id to get transactions for (0.0.xxxxx)
     * @param transactionType one of enum MirrorNodeTransactionType or "CRYPTOTRANSFERTOKEN"
     * @param nextPage link to next page of transactions from previous request
     * @param transactionsLimit number of transactions to return. Speed of request depends on this value if transactionType is set.
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionsHistoryData}
     */
    async getTransactions(accountId: string, transactionType: string = "", nextPage: string, transactionsLimit: string = "10", completionKey?: string): Promise<TransactionsHistoryData> {
        try {
            const transactionData = await getTransactionsFrom(this.network, accountId, transactionType, nextPage, transactionsLimit);
            return this.sendMessageToNative(completionKey, transactionData);
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get configured url for C14 integration (iframe or popup)
     * @param asset name (USDC or HBAR)
     * @param account receiver account id (0.0.xxxxx)
     * @param amount preset amount. May be overwritten if out of range (min/max)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {IntegrationUrlData}
     */
    async getC14url(asset: string, account: string, amount: string, completionKey?: string): Promise<IntegrationUrlData> {
        try {
            const {token} = await getC14token({apiKey: this.apiKey});
            const url = new URL("https://pay.c14.money/");
            const purchaseParams: C14WidgetConfig = {
                clientId: token
            };

            switch (asset.toUpperCase()) {
                case "USDC": {
                    purchaseParams.targetAssetId = "b0694345-1eb4-4bc4-b340-f389a58ee4f3";
                    purchaseParams.targetAssetIdLock = true;
                } break;
                case "HBAR": {
                    purchaseParams.targetAssetId = "d9b45743-e712-4088-8a31-65ee6f371022";
                    purchaseParams.targetAssetIdLock = true;
                } break;
            }
            if (amount) {
                purchaseParams.sourceAmount = amount;
                purchaseParams.quoteAmountLock = true;
            }
            if (account) {
                purchaseParams.targetAddress = account;
                purchaseParams.targetAddressLock = true;
            }

            url.search = new URLSearchParams(purchaseParams as Record<keyof C14WidgetConfig, any>).toString();
            return this.sendMessageToNative(completionKey, {url: url.toString()});
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
    private sendMessageToNative(completionKey: string | undefined, data: any | null, error: Partial<CustomError>|any|null = null) {
        if (!this.webView) {
            if (error) {
                throw error;
            }
            return data;
        }

        // web-view bridge response
        const responseObject: BridgeResponse = {
            completionKey: completionKey || "",
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
}
