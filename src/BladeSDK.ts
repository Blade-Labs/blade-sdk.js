import {
    AccountDeleteTransaction,
    AccountUpdateTransaction,
    Client,
    ContractCallQuery,
    ContractExecuteTransaction,
    ContractFunctionResult,
    Hbar,
    HbarUnit,
    Mnemonic,
    PrivateKey,
    PublicKey,
    ScheduleCreateTransaction,
    ScheduleSignTransaction,
    Signer,
    Status,
    TokenAssociateTransaction,
    TokenCreateTransaction,
    TokenMintTransaction,
    TokenSupplyType,
    TokenType,
    Transaction,
    TransferTransaction,
} from "@hashgraph/sdk";
import { Buffer } from "buffer";
import { ethers } from "ethers";
import {
    apiCallContractQuery,
    checkAccountCreationStatus,
    confirmAccountUpdate,
    createAccount,
    createScheduleRequest,
    dropTokens,
    getAccountBalance,
    getAccountInfo,
    getApiUrl,
    getBladeConfig,
    getC14token,
    getCoinInfo,
    getCoins,
    getCryptoFlowData,
    getNftInfo,
    getNftMetadataFromIpfs,
    getNodeList,
    getPendingAccountData,
    getTransactionsFrom,
    initApiService,
    requestTokenInfo,
    setVisitorId,
    signContractCallTx,
    signScheduleRequest,
    transferTokens,
    getContractErrorMessage,
    getTokenAssociateTransaction
} from "./services/ApiService";
import {checkSeedPhrase, getAccountsFromMnemonic, getAccountsFromPrivateKey} from "./services/AccountService";
import CryptoFlowService from "./services/CryptoFlowService";
import { HbarTokenId } from "./services/FeeService";
import { Network } from "./models/Networks";
import StringHelpers from "./helpers/StringHelpers";
import {
    getContractFunctionBytecode,
    parseContractFunctionParams,
    parseContractQueryResponse,
} from "./helpers/ContractHelpers";
import { CustomError } from "./models/Errors";
import {
    AccountInfoData,
    AccountPrivateData,
    AccountPrivateRecord,
    AccountProvider,
    AccountStatus,
    AssociationAction,
    BalanceData,
    BladeConfig,
    BridgeResponse,
    C14WidgetConfig,
    CoinData,
    CoinInfoData,
    CoinInfoRaw,
    CoinListData,
    ContractCallQueryRecordsData,
    CreateAccountData,
    CreateTokenResult,
    CryptoKeyType,
    InfoData,
    IntegrationUrlData,
    KeyRecord,
    KeyType,
    KnownChain,
    KnownChainIds,
    NFTStorageConfig,
    NFTStorageProvider,
    NodeListData,
    PrivateKeyData,
    ScheduleResult,
    ScheduleTransactionTransfer,
    ScheduleTransactionType,
    ScheduleTransferType,
    SdkEnvironment,
    SignMessageData,
    SignVerifyMessageData,
    SplitSignatureData,
    StatusResult,
    SwapQuotesData,
    TokenDropData,
    TokenInfoData,
    TransactionReceiptData,
    TransactionsHistoryData,
    UserInfo,
    UserInfoData,
} from "./models/Common";
import config from "./config";
import { executeUpdateAccountTransactions } from "./helpers/AccountHelpers";
import { dataURLtoFile } from "./helpers/FileHelper";
import { ParametersBuilder } from "./ParametersBuilder";
import {
    CryptoFlowRoutes,
    CryptoFlowServiceStrategy,
    ICryptoFlowAssets,
    ICryptoFlowAssetsParams,
    ICryptoFlowQuote,
    ICryptoFlowQuoteParams,
    ICryptoFlowTransaction,
    ICryptoFlowTransactionParams,
} from "./models/CryptoFlow";
import * as FingerprintJS from "@fingerprintjs/fingerprintjs-pro";
import { File, NFTStorage } from "nft.storage";
import { decrypt, encrypt } from "./helpers/SecurityHelper";
import { formatReceipt } from "./helpers/TransactionHelpers";
import { Magic } from "magic-sdk";
import { HederaExtension } from "@magic-ext/hedera";
import { MagicSigner } from "./signers/magic/MagicSigner";
import { HederaProvider, HederaSigner } from "./signers/hedera";
import { getConfig } from "./services/ConfigService";

export class BladeSDK {
    private apiKey: string = "";
    private network: Network = Network.Testnet;
    private dAppCode: string = "";
    private visitorId: string = "";
    private sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod;
    private sdkVersion: string = config.sdkVersion;
    private readonly webView: boolean = false;
    private accountProvider: AccountProvider | null = null;
    private signer: Signer = null!;
    private magic: any;
    private userAccountId: string = "";
    private userPublicKey: string = "";
    private userPrivateKey: string = "";

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
     * @param dAppCode your dAppCode - request specific one by contacting Bladelabs team
     * @param visitorId optional field to set client unique id. SDK will try to get it using fingerprintjs-pro library by default.
     * @param sdkEnvironment optional field to set BladeAPI environment (Prod, CI). Prod used by default.
     * @param sdkVersion optional field, used for header X-SDK-VERSION
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {InfoData} status: "success" or "error"
     * @example
     * const info = await bladeSdk.init("apiKey", "Mainnet", "dAppCode");
     */
    async init(
        apiKey: string,
        network: string,
        dAppCode: string,
        visitorId: string = "",
        sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod,
        sdkVersion: string = config.sdkVersion,
        completionKey?: string
    ): Promise<InfoData> {
        this.apiKey = apiKey;
        this.network = StringHelpers.stringToNetwork(network);
        this.dAppCode = dAppCode;
        this.sdkEnvironment = sdkEnvironment;
        this.sdkVersion = sdkVersion;
        this.visitorId = visitorId;

        initApiService(apiKey, dAppCode, sdkEnvironment, sdkVersion, this.network, visitorId);
        if (!this.visitorId) {
            try {
                const [decryptedVisitorId, timestamp, env] = (
                    await decrypt(localStorage.getItem("BladeSDK.visitorId") || "", this.apiKey)
                ).split("@");
                if (
                    this.sdkEnvironment === (env as SdkEnvironment) &&
                    Date.now() - parseInt(timestamp, 10) < 3600_000 * 24 * 30
                ) {
                    // if visitorId was saved less than 30 days ago and in the same environment
                    this.visitorId = decryptedVisitorId;
                }
            } catch (e) {
                // console.log("failed to decrypt visitor id", e);
            }
        }
        if (!this.visitorId) {
            try {
                const fpConfig = {
                    apiKey: await getConfig("fpApiKey"),
                    scriptUrlPattern: `${getApiUrl(true)}/fpjs/<version>/<loaderVersion>`,
                    endpoint: [await getConfig("fpSubdomain"), FingerprintJS.defaultEndpoint],
                };

                const fpPromise = await FingerprintJS.load(fpConfig);
                this.visitorId = (await fpPromise.get()).visitorId;
                localStorage.setItem(
                    "BladeSDK.visitorId",
                    await encrypt(`${this.visitorId}@${Date.now()}@${this.sdkEnvironment}`, this.apiKey)
                );
            } catch (error: any) {
                // tslint:disable-next-line:no-console
                console.log("failed to get visitor id", error);
            }
        }
        setVisitorId(this.visitorId);

        return this.sendMessageToNative(completionKey, {
            apiKey: this.apiKey,
            dAppCode: this.dAppCode,
            network: this.network,
            visitorId: this.visitorId,
            sdkEnvironment: this.sdkEnvironment,
            sdkVersion: this.sdkVersion,
            nonce: Math.round(Math.random() * 1000000000),
        });
    }

    /**
     * This method returns basic params of initialized instance of BladeSDK. This params may useful for support.
     * Returned object likely will contain next fields: `apiKey`, `dAppCode`, `network`, `visitorId`, `sdkEnvironment`, `sdkVersion`, `nonce`
     * In case of support please not provide full apiKey, limit yourself to the part of the code that includes a few characters at the beginning and at the end (eg. `AdR3....BFgd`)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {InfoData}
     * @example
     * const info = bladeSdk.getInfo();
     */
    getInfo(completionKey?: string): InfoData {
        return this.sendMessageToNative(completionKey, {
            apiKey: this.apiKey,
            dAppCode: this.dAppCode,
            network: this.network,
            visitorId: this.visitorId,
            sdkEnvironment: this.sdkEnvironment,
            sdkVersion: this.sdkVersion,
            nonce: Math.round(Math.random() * 1000000000),
        });
    }

    /**
     * Set account for further operations.
     * Currently supported two account providers: Hedera and Magic.
     * Hedera: pass accountId and privateKey as hex-encoded strings with DER-prefix (302e020100300506032b657004220420...)
     * Magic: pass email to accountIdOrEmail and empty string as privateKey. SDK will handle Magic authentication, and finish after user click on confirmation link in email.
     * After successful authentication, SDK will store public and private keys in memory and use them for further operations.
     * After that in each method call provide empty strings to accountId and accountPrivateKey. Otherwise, SDK will override current user with provided credentials as Hedera provider.
     * In case of calling method with `accountId` and `accountPrivateKey` arguments, SDK will override current user with this credentials.
     * It's optional method, you can pass accountId and accountPrivateKey in each method call. In further releases this method will be mandatory.
     *
     * @param accountProvider Account provider (Hedera or Magic)
     * @param accountIdOrEmail Hedera account id (0.0.xxxxx) or Magic email
     * @param privateKey private key with DER-prefix (302e020100300506032b657004220420...) or empty string for Magic provider
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {UserInfoData}
     *
     * @example
     * // Set account for Hedera provider
     * const userInfo = await bladeSdk.setUser(AccountProvider.Hedera, "0.0.45467464", "302e020100300506032b6570042204204323472EA5374E80B07346243234DEADBEEF25235235...");
     * // Set account for Magic provider
     * const userInfo = await bladeSdk.setUser(AccountProvider.Magic, "your_email@domain.com", "");
     */
    async setUser(
        accountProvider: AccountProvider,
        accountIdOrEmail: string,
        privateKey?: string,
        completionKey?: string
    ): Promise<UserInfoData> {
        try {
            switch (accountProvider) {
                case AccountProvider.Hedera:
                    const key = PrivateKey.fromStringDer(privateKey!);
                    this.userAccountId = accountIdOrEmail;
                    this.userPrivateKey = privateKey!;
                    this.userPublicKey = key.publicKey.toStringDer();
                    const provider = new HederaProvider({ client: this.getClient() });
                    this.signer = new HederaSigner(this.userAccountId, key, provider);
                    break;
                case AccountProvider.Magic:
                    let userInfo;
                    if (!this.magic) {
                        await this.initMagic();
                    }

                    if (await this.magic?.user.isLoggedIn()) {
                        userInfo = await this.magic.user.getInfo();
                        if (userInfo.email !== accountIdOrEmail) {
                            this.magic.user.logout();
                            await this.magic.auth.loginWithMagicLink({ email: accountIdOrEmail, showUI: false });
                            userInfo = await this.magic.user.getInfo();
                        }
                    } else {
                        await this.magic?.auth.loginWithMagicLink({ email: accountIdOrEmail, showUI: false });
                        userInfo = await this.magic?.user.getInfo();
                    }

                    if (!(await this.magic?.user.isLoggedIn())) {
                        throw new Error("Not logged in Magic. Please call magicLogin() first");
                    }

                    this.userAccountId = userInfo.publicAddress;
                    const { publicKeyDer } = await this.magic.hedera.getPublicKey();
                    this.userPublicKey = publicKeyDer;
                    const magicSign = (message: any) => this.magic.hedera.sign(message);
                    this.signer = new MagicSigner(this.userAccountId, this.network, publicKeyDer, magicSign);
                    break;
                default:
                    break;
            }
            this.accountProvider = accountProvider;

            return this.sendMessageToNative(completionKey, {
                accountId: this.userAccountId,
                accountProvider: this.accountProvider,
                userPrivateKey: this.userPrivateKey,
                userPublicKey: this.userPublicKey
            });
        } catch (error: unknown) {
            this.userAccountId = "";
            this.userPrivateKey = "";
            this.userPublicKey = "";
            this.signer = null!;
            this.magic = null;
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Clears current user credentials.
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {StatusResult}
     * @example
     * const result = await bladeSdk.resetUser();
     */
    async resetUser(completionKey?: string): Promise<StatusResult> {
        try {
            this.userPublicKey = "";
            this.userPrivateKey = "";
            this.userAccountId = "";
            this.signer = null!;
            if (this.accountProvider === AccountProvider.Magic) {
                if (!this.magic) {
                    await this.initMagic();
                }
                await this.magic.user.logout();
            }
            this.accountProvider = null;

            return this.sendMessageToNative(completionKey, {
                success: true,
            });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get hbar and token balances for specific account.
     * @param accountId Hedera account id (0.0.xxxxx)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {BalanceData} hbars: number, tokens: [{tokenId: string, balance: number}]
     * @example
     * const balance = await bladeSdk.getBalance("0.0.45467464");
     */
    async getBalance(accountId: string, completionKey?: string): Promise<BalanceData> {
        try {
            if (!accountId) {
                accountId = this.getUser().accountId;
            }
            return this.sendMessageToNative(completionKey, await getAccountBalance(accountId));
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get list of all available coins on CoinGecko.
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {CoinListData}
     * @example
     * const coinList = await bladeSdk.getCoinList();
     */
    async getCoinList(completionKey?: string): Promise<CoinListData> {
        try {
            const coinList: CoinInfoRaw[] = await getCoins({
                dAppCode: this.dAppCode,
                visitorId: this.visitorId,
            });

            const result: CoinListData = {
                coins: coinList.map((coin) => {
                    return {
                        ...coin,
                        platforms: Object.keys(coin.platforms).map((name) => {
                            return {
                                name,
                                address: coin.platforms[name],
                            };
                        }),
                    };
                }),
            };
            return this.sendMessageToNative(completionKey, result);
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get coin price and coin info from CoinGecko. Search can be coin id or address in one of the coin platforms.
     * @param search coin alias (get one using getCoinList method)
     * @param currency currency to get price in (usd, eur, etc.)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {CoinInfoData}
     * @example
     * const coinInfo = await bladeSdk.getCoinPrice("hedera-hashgraph", "usd");
     */
    async getCoinPrice(
        search: string = "hbar",
        currency: string = "usd",
        completionKey?: string
    ): Promise<CoinInfoData> {
        try {
            if (search === HbarTokenId || search.toLowerCase() === "hbar") {
                search = "hedera-hashgraph";
            }

            const params = {
                dAppCode: this.dAppCode,
                visitorId: this.visitorId,
            };

            let coinInfo: CoinData | null = null;
            try {
                // try to get coin info from CoinGecko
                coinInfo = await getCoinInfo(search, params);
            } catch (error: any) {
                // on fail try to get coin info from CoinGecko and match by address
                const coinList: CoinInfoRaw[] = await getCoins(params);
                const coin = coinList.find((item) => Object.values(item.platforms).includes(search));
                if (!coin) {
                    throw new Error(`Coin with address ${search} not found`);
                }
                coinInfo = await getCoinInfo(coin.id, params);
            }

            const result: CoinInfoData = {
                coin: coinInfo,
                priceUsd: coinInfo.market_data.current_price.usd,
                price: coinInfo.market_data.current_price[currency.toLowerCase()] || null,
                currency: currency.toLowerCase(),
            };
            return this.sendMessageToNative(completionKey, result);
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Send hbars to specific account.
     * @param accountId sender account id (0.0.xxxxx)
     * @param accountPrivateKey sender's hex-encoded private key with DER-header (302e020100300506032b657004220420...). ECDSA or Ed25519
     * @param receiverId receiver account id (0.0.xxxxx)
     * @param amount amount of hbars to send (decimal number)
     * @param memo transaction memo
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const receipt = await bladeSdk.transferHbars("0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", "0.0.10002", "1.0", "test memo");
     */
    async transferHbars(
        accountId: string,
        accountPrivateKey: string,
        receiverId: string,
        amount: string,
        memo: string,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            if (accountId && accountPrivateKey) {
                await this.setUser(AccountProvider.Hedera, accountId, accountPrivateKey);
            }
            accountId = this.getUser().accountId;

            const parsedAmount = parseFloat(amount);
            return new TransferTransaction()
                .addHbarTransfer(accountId, -1 * parsedAmount)
                .addHbarTransfer(receiverId, parsedAmount)
                .setTransactionMemo(memo)
                .freezeWithSigner(this.signer)
                .then((tx) => tx.signWithSigner(this.signer))
                .then((tx) => tx.executeWithSigner(this.signer))
                .then((result) => result.getReceiptWithSigner(this.signer))
                .then((data) => {
                    return this.sendMessageToNative(completionKey, formatReceipt(data));
                })
                .catch((error) => {
                    throw this.sendMessageToNative(completionKey, null, error);
                });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Call contract function. Directly or via BladeAPI using paymaster account (fee will be paid by Paymaster account), depending on your dApp configuration.
     * @param contractId contract id (0.0.xxxxx)
     * @param functionName name of the contract function to call
     * @param paramsEncoded function argument. Can be generated with {@link ParametersBuilder} object
     * @param accountId operator account id (0.0.xxxxx)
     * @param accountPrivateKey operator's hex-encoded private key with DER-header, ECDSA or Ed25519
     * @param gas gas limit for the transaction
     * @param usePaymaster if true, fee will be paid by Paymaster account (note: msg.sender inside the contract will be Paymaster account)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const params = new ParametersBuilder().addString("Hello");
     * const contractId = "0.0.123456";
     * const gas = 100000;
     * const receipt = await bladeSdk.contractCallFunction(contractId, "set_message", params, "0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", gas, false);
     */
    async contractCallFunction(
        contractId: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        accountId: string,
        accountPrivateKey: string,
        gas: number = 100000,
        usePaymaster: boolean = false,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            if (accountId && accountPrivateKey) {
                await this.setUser(AccountProvider.Hedera, accountId, accountPrivateKey);
            }
            usePaymaster = usePaymaster && (await getConfig("smartContract")).toLowerCase() === "true";
            const contractFunctionParameters = await getContractFunctionBytecode(functionName, paramsEncoded);

            let transaction: Transaction;
            if (usePaymaster) {
                const options = {
                    dAppCode: this.dAppCode,
                    visitorId: this.visitorId,
                    contractFunctionParameters,
                    contractId,
                    functionName,
                    gas,
                };

                const { transactionBytes } = await signContractCallTx(this.network, options);
                transaction = Transaction.fromBytes(Buffer.from(transactionBytes, "base64"));
            } else {
                transaction = new ContractExecuteTransaction()
                    .setContractId(contractId)
                    .setGas(gas)
                    .setFunction(functionName)
                    .setFunctionParameters(contractFunctionParameters);
            }

            return transaction
                .freezeWithSigner(this.signer)
                .then((tx) => tx.signWithSigner(this.signer))
                .then((tx) => tx.executeWithSigner(this.signer))
                .then((result) => result.getReceiptWithSigner(this.signer))
                .then((data) => {
                    return this.sendMessageToNative(completionKey, formatReceipt(data));
                })
                .catch(async(error: any) => {
                    const parseErrorMessage = JSON.parse(JSON.stringify(error))

                    if (error.message.includes("CONTRACT_REVERT_EXECUTED")) {
                        const transactionID = parseErrorMessage.transactionId.split('@')[0]
                        const seconds = error?.transactionId?.validStart?.seconds?.low
                        const nanos = error?.transactionId?.validStart?.nanos?.low
                        const message = await getContractErrorMessage(this.network, `${transactionID}-${seconds}-${nanos}`, contractId);

                        if (message && message.startsWith('0x') && message.length > 2) {
                            const reason = ethers.AbiCoder.defaultAbiCoder().decode(
                                ['string'],
                                ethers.dataSlice(message, 4)
                            )

                            error.message += ` (${reason[0]})`

                            throw this.sendMessageToNative(completionKey, null, error);
                        }
                    }

                    throw this.sendMessageToNative(completionKey, null, error);
                });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Call query on contract function. Similar to {@link contractCallFunction} can be called directly or via BladeAPI using Paymaster account.
     * @param contractId - contract id (0.0.xxxxx)
     * @param functionName - name of the contract function to call
     * @param paramsEncoded - function argument. Can be generated with {@link ParametersBuilder} object
     * @param accountId - operator account id (0.0.xxxxx)
     * @param accountPrivateKey - operator's hex-encoded private key with DER-header, ECDSA or Ed25519
     * @param gas - gas limit for the transaction
     * @param usePaymaster - if true, the fee will be paid by paymaster account (note: msg.sender inside the contract will be Paymaster account)
     * @param resultTypes - array of result types. Currently supported only plain data types
     * @param completionKey - optional field bridge between mobile webViews and native apps
     * @returns {ContractCallQueryRecordsData}
     * @example
     * const params = new ParametersBuilder();
     * const contractId = "0.0.123456";
     * const gas = 100000;
     * const result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, "0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", gas, false, ["string"]);
     */
    async contractCallQueryFunction(
        contractId: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        accountId: string,
        accountPrivateKey: string,
        gas: number = 100000,
        usePaymaster: boolean = false,
        resultTypes: string[],
        completionKey?: string
    ): Promise<ContractCallQueryRecordsData> {
        try {
            if (accountId && accountPrivateKey) {
                await this.setUser(AccountProvider.Hedera, accountId, accountPrivateKey);
            }
            const contractFunctionParameters = await getContractFunctionBytecode(functionName, paramsEncoded);
            let response: ContractFunctionResult;
            try {
                if (usePaymaster) {
                    const options = {
                        dAppCode: this.dAppCode,
                        visitorId: this.visitorId,
                        contractFunctionParameters,
                        contractId,
                        functionName,
                        gas,
                    };
                    const { contractFunctionResult, rawResult } = await apiCallContractQuery(this.network, options);

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
                        contractNonces: [],
                    });
                } else {
                    response = await new ContractCallQuery()
                        .setContractId(contractId)
                        .setGas(gas)
                        .setFunction(functionName)
                        .setFunctionParameters(contractFunctionParameters)
                        .executeWithSigner(this.signer);
                }

                const values = parseContractQueryResponse(response, resultTypes);
                return this.sendMessageToNative(completionKey, {
                    values,
                    gasUsed: parseInt(response.gasUsed.toString(), 10),
                });
            } catch (error: any) {
                throw this.sendMessageToNative(completionKey, null, error);
            }
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Send token to specific account.
     * @param tokenId token id to send (0.0.xxxxx)
     * @param accountId sender account id (0.0.xxxxx)
     * @param accountPrivateKey sender's hex-encoded private key with DER-header (302e020100300506032b657004220420...). ECDSA or Ed25519
     * @param receiverID receiver account id (0.0.xxxxx)
     * @param amountOrSerial amount of fungible tokens to send (with token-decimals correction) on NFT serial number
     * @param memo transaction memo
     * @param usePaymaster if true, Paymaster account will pay fee transaction. Only for single dApp configured fungible-token. In that case tokenId not used
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const receipt = await bladeSdk.transferTokens("0.0.1337", "0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", "0.0.10002", "1.0", "test memo", false);
     */
    async transferTokens(
        tokenId: string,
        accountId: string,
        accountPrivateKey: string,
        receiverID: string,
        amountOrSerial: string,
        memo: string,
        usePaymaster: boolean = false,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            if (accountId && accountPrivateKey) {
                await this.setUser(AccountProvider.Hedera, accountId, accountPrivateKey);
            }
            accountId = this.getUser().accountId;

            const meta = await requestTokenInfo(this.network, tokenId);
            let isNFT = false;
            if (meta.type === "NON_FUNGIBLE_UNIQUE") {
                isNFT = true;
                usePaymaster = false;
            }
            usePaymaster = usePaymaster && (await getConfig("freeTransfer")).toLowerCase() === "true";

            const correctedAmount = parseFloat(amountOrSerial) * 10 ** parseInt(meta.decimals, 10);

            if (usePaymaster) {
                const options = {
                    dAppCode: this.dAppCode,
                    visitorId: this.visitorId,
                    receiverAccountId: receiverID,
                    senderAccountId: accountId,
                    amount: correctedAmount,
                    decimals: null,
                    memo,
                    tokenId,
                };

                const { transactionBytes } = await transferTokens(this.network, options);
                const buffer = Buffer.from(transactionBytes, "base64");
                const transaction = Transaction.fromBytes(buffer);

                return transaction
                    .freezeWithSigner(this.signer)
                    .then((tx) => tx.signWithSigner(this.signer))
                    .then((tx) => tx.executeWithSigner(this.signer))
                    .then((result) => result.getReceiptWithSigner(this.signer))
                    .then((data) => {
                        return this.sendMessageToNative(completionKey, formatReceipt(data));
                    })
                    .catch((error) => {
                        throw this.sendMessageToNative(completionKey, null, error);
                    });
            } else {
                const tokenTransferTx = new TransferTransaction().setTransactionMemo(memo);

                if (isNFT) {
                    tokenTransferTx.addNftTransfer(tokenId, parseInt(amountOrSerial, 10), accountId, receiverID);
                } else {
                    tokenTransferTx
                        .addTokenTransfer(tokenId, receiverID, correctedAmount)
                        .addTokenTransfer(tokenId, accountId, -1 * correctedAmount);
                }
                return tokenTransferTx
                    .freezeWithSigner(this.signer)
                    .then((tx) => tx.signWithSigner(this.signer))
                    .then((tx) => tx.executeWithSigner(this.signer))
                    .then((result) => result.getReceiptWithSigner(this.signer))
                    .then((data) => {
                        return this.sendMessageToNative(completionKey, formatReceipt(data));
                    })
                    .catch((error) => {
                        throw this.sendMessageToNative(completionKey, null, error);
                    });
            }
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Create scheduled transaction
     * @param accountId account id (0.0.xxxxx)
     * @param accountPrivateKey optional field if you need specify account key (hex encoded privateKey with DER-prefix)
     * @param type schedule transaction type (currently only TRANSFER supported)
     * @param transfers array of transfers to schedule (HBAR, FT, NFT)
     * @param usePaymaster if true, Paymaster account will pay transaction fee (also dApp had to be configured for free schedules)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {ScheduleResult}
     * @example
     * const receiverAccountId = "0.0.10001";
     * const receiverAccountPrivateKey = "302e020100300506032b65700422042043234DEADBEEF255...";
     * const senderAccountId = "0.0.10002";
     * const tokenId = "0.0.1337";
     * const nftId = "0.0.1234";
     * const {scheduleId} = await bladeSdk.createScheduleTransaction(
     *     receiverAccountId,
     *     receiverAccountPrivateKey,
     *     "TRANSFER", [
     *         {
     *             type: "HBAR",
     *             sender: senderAccountId,
     *             receiver: receiverAccountId,
     *             value: 1 * 10**8,
     *         },
     *         {
     *             type: "FT",
     *             sender: senderAccountId,
     *             receiver: receiverAccountId,
     *             tokenId: tokenId,
     *             value: 1
     *         },
     *         {
     *             type: "NFT",
     *             sender: senderAccountId,
     *             receiver: receiverAccountId,
     *             tokenId: nftId,
     *             serial: 4
     *         },
     *     ],
     *     false
     * );
     */
    async createScheduleTransaction(
        accountId: string,
        accountPrivateKey: string,
        type: ScheduleTransactionType,
        transfers: ScheduleTransactionTransfer[],
        usePaymaster: boolean = false,
        completionKey?: string
    ): Promise<ScheduleResult> {
        try {
            if (accountId && accountPrivateKey) {
                await this.setUser(AccountProvider.Hedera, accountId, accountPrivateKey);
            }

            usePaymaster = usePaymaster && (await getConfig("freeSchedules")).toLowerCase() === "true";
            if (usePaymaster) {
                const result = await createScheduleRequest(this.network, type, transfers);
                return this.sendMessageToNative(completionKey, result);
            } else {
                switch (type) {
                    case ScheduleTransactionType.TRANSFER:
                        {
                            const transactionToSchedule = new TransferTransaction();
                            transfers.forEach((transfer) => {
                                switch (transfer.type) {
                                    case ScheduleTransferType.HBAR:
                                        if (!transfer.value) {
                                            throw new Error("Value required for HBAR transfer");
                                        }
                                        const amount = Hbar.fromTinybars(transfer.value!);
                                        transactionToSchedule
                                            .addHbarTransfer(transfer.sender, amount.negated())
                                            .addHbarTransfer(transfer.receiver, amount);
                                        break;
                                    case ScheduleTransferType.FT:
                                        if (!transfer.value || !transfer.tokenId) {
                                            throw new Error("Token id and value required for FT transfer");
                                        }
                                        transactionToSchedule
                                            .addTokenTransfer(transfer.tokenId!, transfer.sender, -transfer.value!)
                                            .addTokenTransfer(transfer.tokenId!, transfer.receiver, transfer.value!);
                                        break;
                                    case ScheduleTransferType.NFT:
                                        if (!transfer.tokenId || !transfer.serial) {
                                            throw new Error("Token id and serial required for NFT transfer");
                                        }
                                        transactionToSchedule.addNftTransfer(
                                            transfer.tokenId!,
                                            transfer.serial!,
                                            transfer.sender,
                                            transfer.receiver
                                        );
                                        break;
                                    default:
                                        throw new Error(`Schedule transaction transfer type "${type}" not supported`);
                                }
                            });

                            return new ScheduleCreateTransaction()
                                .setScheduledTransaction(transactionToSchedule)
                                .freezeWithSigner(this.signer)

                                .then((tx) => tx.executeWithSigner(this.signer))
                                .then((result) => result.getReceiptWithSigner(this.signer))
                                .then((data) => {
                                    return this.sendMessageToNative(completionKey, {
                                        scheduleId: `${data.scheduleId}`,
                                    });
                                })
                                .catch((error) => {
                                    throw this.sendMessageToNative(completionKey, null, error);
                                });
                        }
                        break;
                    default:
                        throw new Error(`Schedule transaction type "${type}" not supported`);
                }
            }
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign scheduled transaction
     * @param scheduleId scheduled transaction id (0.0.xxxxx)
     * @param accountId account id (0.0.xxxxx)
     * @param accountPrivateKey optional field if you need specify account key (hex encoded privateKey with DER-prefix)
     * @param receiverAccountId account id of receiver for additional validation in case of dApp freeSchedule transactions configured
     * @param usePaymaster if true, Paymaster account will pay transaction fee (also dApp had to be configured for free schedules)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const scheduleId = "0.0.754583634";
     * const senderAccountId = "0.0.10002";
     * const senderAccountPrivateKey = "302e020100300506032b65700422042043234DEADBEEF255...";
     * const receiverAccountId = "0.0.10001";
     * const receipt = await bladeSdk.signScheduleId(scheduleId, senderAccountId, senderAccountPrivateKey, receiverAccountId, false);
     */
    async signScheduleId(
        scheduleId: string,
        accountId: string,
        accountPrivateKey: string,
        receiverAccountId?: string,
        usePaymaster: boolean = false,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            if (accountId && accountPrivateKey) {
                await this.setUser(AccountProvider.Hedera, accountId, accountPrivateKey);
            }

            usePaymaster = usePaymaster && (await getConfig("freeSchedules")).toLowerCase() === "true";
            if (usePaymaster) {
                if (!receiverAccountId) {
                    throw new Error("Receiver account id required for free schedule transaction");
                }
                const { scheduleSignTransactionBytes } = await signScheduleRequest(
                    this.network,
                    scheduleId,
                    receiverAccountId
                );
                const buffer = Buffer.from(scheduleSignTransactionBytes, "base64");
                const receipt = await Transaction.fromBytes(buffer)
                    .signWithSigner(this.signer)
                    .then((signedTx) => signedTx.executeWithSigner(this.signer))
                    .then((result) => result.getReceiptWithSigner(this.signer));
                console.log("scheduleSignTransactionBytes receipt", receipt);
                return this.sendMessageToNative(completionKey, formatReceipt(receipt));
            } else {
                return await new ScheduleSignTransaction()
                    .setScheduleId(scheduleId)
                    .freezeWithSigner(this.signer)
                    .then((tx) => tx.signWithSigner(this.signer))
                    .then((tx) => tx.executeWithSigner(this.signer))
                    .then((result) => result.getReceiptWithSigner(this.signer))
                    .then((data) => {
                        return this.sendMessageToNative(completionKey, formatReceipt(data));
                    })
                    .catch((error) => {
                        throw this.sendMessageToNative(completionKey, null, error);
                    });
            }
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Create new Hedera account (ECDSA). Only for configured dApps. Depending on dApp config Blade create account, associate tokens, etc.
     * In case of not using pre-created accounts pool and network high load, this method can return transactionId and no accountId.
     * In that case account creation added to queue, and you should wait some time and call `getPendingAccount()` method.
     * @param privateKey optional field if you need specify account key (hex encoded privateKey with DER-prefix)
     * @param deviceId optional field for headers for backend check
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {CreateAccountData}
     * @example
     * const account = await bladeSdk.createAccount();
     */
    async createAccount(privateKey?: string, deviceId?: string, completionKey?: string): Promise<CreateAccountData> {
        try {
            let seedPhrase = "";
            let key: PrivateKey;
            if (privateKey) {
                key = PrivateKey.fromStringDer(privateKey);
            } else {
                // https://github.com/hashgraph/hedera-sdk-js/issues/1396
                let valid = false;
                do {
                    const mnemonic = await Mnemonic.generate12();
                    key = await mnemonic.toStandardECDSAsecp256k1PrivateKey();
                    seedPhrase = mnemonic.toString();
                    valid = await checkSeedPhrase(mnemonic);
                } while (!valid);
            }

            const options = {
                visitorId: this.visitorId,
                dAppCode: this.dAppCode,
                deviceId,
                publicKey: key.publicKey.toStringDer(),
            };

            const { id, transactionBytes, updateAccountTransactionBytes, associationPresetTokenStatus, transactionId } =
                await createAccount(this.network, options);

            const client = this.getClient();
            await executeUpdateAccountTransactions(client, key, updateAccountTransactionBytes, transactionBytes);

            if (associationPresetTokenStatus === "FAILED") {
                // if token association failed on backend, fetch /tokens and execute transactionBytes
                try {
                    const tokenTransaction = await getTokenAssociateTransaction(AssociationAction.FREE, null, id);
                    if (!tokenTransaction.transactionBytes) {
                        throw new Error("Token association failed");
                    }
                    const buffer = Buffer.from(tokenTransaction.transactionBytes, "base64");
                    const transaction = await Transaction.fromBytes(buffer).sign(key);
                    await transaction.execute(client);
                } catch (error: any) {
                    // ignore this error, continue
                }
            }

            if (updateAccountTransactionBytes) {
                await confirmAccountUpdate({
                    accountId: id,
                    network: this.network,
                    visitorId: this.visitorId,
                    dAppCode: this.dAppCode,
                }).catch(() => {
                    // ignore this error, continue
                });
            }

            const evmAddress = ethers.computeAddress(`0x${key.publicKey.toStringRaw()}`);

            const result = {
                transactionId,
                status: transactionId ? "PENDING" : "SUCCESS",
                seedPhrase: seedPhrase.toString(),
                publicKey: key.publicKey.toStringDer(),
                privateKey: key.toStringDer(),
                accountId: id || null,
                evmAddress: evmAddress.toLowerCase(),
            };
            return this.sendMessageToNative(completionKey, result);
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
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
     * @example
     * const account = await bladeSdk.createAccount();
     * if (account.status === "PENDING") {
     *   // wait some time and call getPendingAccount method
     *   account = await bladeSdk.getPendingAccount(account.transactionId, account.seedPhrase);
     * }
     */
    async getPendingAccount(
        transactionId: string,
        mnemonic: string,
        completionKey?: string
    ): Promise<CreateAccountData> {
        try {
            const seedPhrase = await Mnemonic.fromString(mnemonic);
            const privateKey = await seedPhrase.toEcdsaPrivateKey();
            const publicKey = privateKey.publicKey.toStringDer();
            let evmAddress = ethers.computeAddress(`0x${privateKey.publicKey.toStringRaw()}`);

            const result = {
                transactionId: transactionId || null,
                status: AccountStatus.PENDING,
                seedPhrase: seedPhrase.toString(),
                publicKey,
                privateKey: privateKey.toStringDer(),
                accountId: null,
                evmAddress: evmAddress.toLowerCase(),
                queueNumber: 0,
            };

            const params = {
                visitorId: this.visitorId,
                network: this.network.toLowerCase(),
                dAppCode: this.dAppCode,
            };
            const { status, queueNumber } = await checkAccountCreationStatus(transactionId, this.network, params);
            if (status === AccountStatus.SUCCESS) {
                const { id, transactionBytes, updateAccountTransactionBytes, originalPublicKey } =
                    await getPendingAccountData(transactionId, this.network, params);

                await executeUpdateAccountTransactions(
                    this.getClient(),
                    privateKey,
                    updateAccountTransactionBytes,
                    transactionBytes
                );

                await confirmAccountUpdate({
                    accountId: id,
                    network: this.network,
                    visitorId: this.visitorId,
                    dAppCode: this.dAppCode,
                });

                evmAddress = ethers.computeAddress(
                    `0x${originalPublicKey ? originalPublicKey.slice(-66) : privateKey.publicKey.toStringRaw()}`
                );

                result.transactionId = null;
                result.status = status;
                result.accountId = id;
                result.evmAddress = evmAddress.toLowerCase();
            } else {
                result.queueNumber = queueNumber;
            }

            return this.sendMessageToNative(completionKey, result);
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Delete Hedera account. This method requires account private key and operator private key. Operator is the one who paying fees
     * @param deleteAccountId account id of account to delete (0.0.xxxxx)
     * @param deletePrivateKey account private key (DER encoded hex string)
     * @param transferAccountId if any funds left on account, they will be transferred to this account (0.0.xxxxx)
     * @param operatorAccountId operator account id (0.0.xxxxx). Used for fee
     * @param operatorPrivateKey operator's account private key (DER encoded hex string)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const receipt = await bladeSdk.deleteAccount(accountToDelete.accountId, accountToDelete.privateKey, "0.0.10001", "0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...");
     */
    async deleteAccount(
        deleteAccountId: string,
        deletePrivateKey: string,
        transferAccountId: string,
        operatorAccountId: string,
        operatorPrivateKey: string,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const client = this.getClient();
            const deleteAccountKey = PrivateKey.fromString(deletePrivateKey);
            const operatorAccountKey = PrivateKey.fromString(operatorPrivateKey);
            client.setOperator(operatorAccountId, operatorAccountKey);

            const transaction = new AccountDeleteTransaction()
                .setAccountId(deleteAccountId)
                .setTransferAccountId(transferAccountId)
                .freezeWith(client);
            const signTx = await transaction.sign(deleteAccountKey);
            const txResponse = await signTx.execute(client);
            const txReceipt = await txResponse.getReceipt(client);

            return this.sendMessageToNative(completionKey, formatReceipt(txReceipt));
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get account info.
     * EvmAddress is address of Hedera account if exists. Else accountId will be converted to solidity address.
     * CalculatedEvmAddress is calculated from account public key. May be different from evmAddress.
     * @param accountId Hedera account id (0.0.xxxxx)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {AccountInfoData}
     * @example
     * const accountInfo = await bladeSdk.getAccountInfo("0.0.10001");
     */
    async getAccountInfo(accountId: string, completionKey?: string): Promise<AccountInfoData> {
        try {
            if (!accountId) {
                accountId = this.getUser().accountId;
            }
            const account = await getAccountInfo(this.network, accountId);

            const publicKey =
                account.key._type === CryptoKeyType.ECDSA_SECP256K1
                    ? PublicKey.fromStringECDSA(account.key.key)
                    : PublicKey.fromStringED25519(account.key.key);
            return this.sendMessageToNative(completionKey, {
                accountId,
                publicKey: publicKey.toStringDer(),
                evmAddress: account.evm_address,
                stakingInfo: {
                    pendingReward: account.pending_reward,
                    stakedNodeId: account.staked_node_id,
                    stakePeriodStart: account.stake_period_start,
                },
                calculatedEvmAddress: ethers.computeAddress(`0x${publicKey.toStringRaw()}`).toLowerCase(),
            } as AccountInfoData);
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get Node list
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {NodeListData}
     * @example
     * const nodeList = await bladeSdk.getNodeList();
     */
    async getNodeList(completionKey?: string): Promise<NodeListData> {
        try {
            const nodeList = await getNodeList(this.network);
            return this.sendMessageToNative(completionKey, { nodes: nodeList });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Stake/unstake account
     * @param accountId Hedera account id (0.0.xxxxx)
     * @param accountPrivateKey account private key (DER encoded hex string)
     * @param nodeId node id to stake to. If negative or null, account will be unstaked
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const receipt = await bladeSdk.stakeToNode("0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", 3);
     */
    async stakeToNode(
        accountId: string,
        accountPrivateKey: string,
        nodeId: number,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            if (accountId && accountPrivateKey) {
                await this.setUser(AccountProvider.Hedera, accountId, accountPrivateKey);
            }
            accountId = this.getUser().accountId;

            const transaction = new AccountUpdateTransaction().setAccountId(accountId);

            if (nodeId < 0 || nodeId === null) {
                transaction.clearStakedNodeId();
            } else {
                transaction.setStakedNodeId(nodeId);
            }
            return transaction
                .freezeWithSigner(this.signer)
                .then((tx) => tx.signWithSigner(this.signer))
                .then((tx) => tx.executeWithSigner(this.signer))
                .then((result) => result.getReceiptWithSigner(this.signer))
                .then((data) => {
                    return this.sendMessageToNative(completionKey, formatReceipt(data));
                })
                .catch((error) => {
                    throw this.sendMessageToNative(completionKey, null, error);
                });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * @deprecated Will be removed in version 0.8, switch to `searchAccounts` method
     * Get private key and accountId from mnemonic. Supported standard and legacy key derivation.
     * If account not found, standard ECDSA key will be returned.
     * Keys returned with DER header. EvmAddress computed from Public key.
     * @param mnemonicRaw BIP39 mnemonic
     * @param lookupNames not used anymore, account search is mandatory
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {PrivateKeyData}
     * @example
     * const result = await bladeSdk.getKeysFromMnemonic("purity slab doctor swamp tackle rebuild summer bean craft toddler blouse switch");
     */
    async getKeysFromMnemonic(
        mnemonicRaw: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        lookupNames: boolean = true,
        completionKey?: string
    ): Promise<PrivateKeyData> {
        try {
            const accounts = await getAccountsFromMnemonic(mnemonicRaw, this.network);
            return this.sendMessageToNative(completionKey, {
                privateKey: accounts[0].privateKey,
                publicKey: accounts[0].publicKey,
                accounts: accounts.map((acc) => acc.address),
                evmAddress: accounts[0].evmAddress,
            });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get accounts list and keys from private key or mnemonic
     * Supporting standard and legacy key derivation.
     * Every key with account will be returned.
     * @param keyOrMnemonic BIP39 mnemonic, private key with DER header
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {AccountPrivateData}
     * @example
     * const resultKey = await bladeSdk.searchAccounts("302e020100300506032b65700422042043234DEADBEEF255...");
     * const resultSeed = await bladeSdk.searchAccounts("purity slab doctor swamp tackle rebuild summer bean craft toddler blouse switch");
     */
    async searchAccounts(keyOrMnemonic: string, completionKey?: string): Promise<AccountPrivateData> {
        try {
            const accounts: AccountPrivateRecord[] = [];
            if (keyOrMnemonic.trim().split(" ").length > 1) {
                // mnemonic
                accounts.push(...(await getAccountsFromMnemonic(keyOrMnemonic, this.network)));
            } else {
                accounts.push(...(await getAccountsFromPrivateKey(keyOrMnemonic, this.network)));
            }
            return this.sendMessageToNative(completionKey, {
                accounts,
            });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Bladelink drop to account
     * @param accountId Hedera account id (0.0.xxxxx)
     * @param accountPrivateKey account private key (DER encoded hex string)
     * @param secretNonce configured for dApp. Should be kept in secret
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TokenDropData}
     * @example
     * const drop = await bladeSdk.dropTokens("0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", "secret-nonce");
     */
    async dropTokens(
        accountId: string,
        accountPrivateKey: string,
        secretNonce: string,
        completionKey?: string
    ): Promise<TokenDropData> {
        try {
            if (accountId && accountPrivateKey) {
                await this.setUser(AccountProvider.Hedera, accountId, accountPrivateKey);
            }
            accountId = this.getUser().accountId;

            const signatures = await this.signer.sign([Buffer.from(secretNonce)]);
            return this.sendMessageToNative(
                completionKey,
                await dropTokens(this.network, {
                    visitorId: this.visitorId,
                    dAppCode: this.dAppCode,
                    accountId,
                    signedNonce: Buffer.from(signatures[0].signature).toString("base64"),
                })
            );
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign base64-encoded message with private key. Returns hex-encoded signature.
     * @param messageString base64-encoded message to sign
     * @param privateKey hex-encoded private key with DER header
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignMessageData}
     * @example
     * const signed = await bladeSdk.sign(btoa("Hello"), "302e020100300506032b65700422042043234DEADBEEF255...");
     */
    sign(messageString: string, privateKey: string, completionKey?: string): SignMessageData {
        try {
            const key = PrivateKey.fromString(privateKey);
            const signed = key.sign(Buffer.from(messageString, "base64"));

            return this.sendMessageToNative(completionKey, {
                signedMessage: Buffer.from(signed).toString("hex"),
            });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Verify message signature by public key
     * @param messageString base64-encoded message (same as provided to `sign()` method)
     * @param signature hex-encoded signature (result from `sign()` method)
     * @param publicKey hex-encoded public key with DER header
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignVerifyMessageData}
     * @example
     * const signature = "27cb9d51434cf1e76d7ac515b19442c619f641e6fccddbf4a3756b14466becb6992dc1d2a82268018147141fc8d66ff9ade43b7f78c176d070a66372d655f942";
     * const publicKey = "302d300706052b8104000a032200029dc73991b0d9cdbb59b2cd0a97a0eaff6de...";
     * const valid = await bladeSdk.signVerify(btoa("Hello"), signature, publicKey);
     */
    signVerify(
        messageString: string,
        signature: string,
        publicKey: string,
        completionKey?: string
    ): SignVerifyMessageData {
        try {
            const valid = PublicKey.fromString(publicKey).verify(
                Buffer.from(messageString, "base64"),
                Buffer.from(signature, "hex")
            );
            return this.sendMessageToNative(completionKey, { valid });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign base64-encoded message with private key using ethers lib. Returns hex-encoded signature.
     * @param messageString base64-encoded message to sign
     * @param privateKey hex-encoded private key with DER header
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignMessageData}
     * @example
     * const signed = await bladeSdk.ethersSign(btoa("Hello"), "302e020100300506032b65700422042043234DEADBEEF255...");
     */
    ethersSign(messageString: string, privateKey: string, completionKey?: string): Promise<SignMessageData> {
        try {
            const key = PrivateKey.fromString(privateKey);
            const wallet = new ethers.Wallet(key.toStringRaw());
            return wallet.signMessage(Buffer.from(messageString, "base64")).then((signedMessage) => {
                return this.sendMessageToNative(completionKey, {
                    signedMessage,
                });
            });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Split signature to v-r-s format.
     * @param signature hex-encoded signature
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SplitSignatureData}
     * @example
     * const signature = "27cb9d51434cf1e76d7ac515b19442c619f641e6fccddbf4a3756b14466becb6992dc1d2a82268018147141fc8d66ff9ade43b7f78c176d070a66372d655f942";
     * const {v, r, s} = await bladeSdk.splitSignature(signature);
     */
    splitSignature(signature: string, completionKey?: string): SplitSignatureData {
        try {
            const { v, r, s } = ethers.Signature.from(signature);
            return this.sendMessageToNative(completionKey, { v, r, s });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get v-r-s signature of contract function params
     * @param paramsEncoded data to sign. Can be string or ParametersBuilder
     * @param privateKey signer private key (hex-encoded with DER header)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SplitSignatureData}
     * @example
     * const params = new ParametersBuilder().addAddress(accountId).addString("Hello");
     * const result = await bladeSdk.getParamsSignature(params, "302e020100300506032b65700422042043234DEADBEEF255...");
     */
    async getParamsSignature(
        paramsEncoded: string | ParametersBuilder,
        privateKey: string,
        completionKey?: string
    ): Promise<SplitSignatureData> {
        try {
            const { types, values } = await parseContractFunctionParams(paramsEncoded);
            const hash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(types, values));
            const key = PrivateKey.fromStringDer(privateKey);
            const wallet = new ethers.Wallet(key.toStringRaw());
            const signature = await wallet.signMessage(ethers.getBytes(hash));
            const { v, r, s } = ethers.Signature.from(signature);
            return this.sendMessageToNative(completionKey, { v, r, s });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
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
     * @example
     * const transactions = await bladeSdk.getTransactions("0.0.10001");
     */
    async getTransactions(
        accountId: string,
        transactionType: string = "",
        nextPage: string,
        transactionsLimit: string = "10",
        completionKey?: string
    ): Promise<TransactionsHistoryData> {
        try {
            if (!accountId) {
                accountId = this.getUser().accountId;
            }
            const transactionData = await getTransactionsFrom(
                this.network,
                accountId,
                transactionType,
                nextPage,
                transactionsLimit
            );
            return this.sendMessageToNative(completionKey, transactionData);
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get configured url for C14 integration (iframe or popup)
     * @param asset name (USDC or HBAR)
     * @param account receiver account id (0.0.xxxxx)
     * @param amount preset amount. May be overwritten if out of range (min/max)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {IntegrationUrlData}
     * @example
     * const {url} = await bladeSdk.getC14url("HBAR", "0.0.10001", "100");
     */
    async getC14url(
        asset: string,
        account: string,
        amount: string,
        completionKey?: string
    ): Promise<IntegrationUrlData> {
        try {
            let clientId;
            if (this.dAppCode.includes("karate")) {
                clientId = "17af1a19-2729-4ecc-8683-324a52eca6fc";
            } else {
                const { token } = await getC14token({
                    network: this.network,
                    visitorId: this.visitorId,
                    dAppCode: this.dAppCode,
                });
                clientId = token;
            }

            const url = new URL("https://pay.c14.money/");
            const purchaseParams: C14WidgetConfig = {
                clientId,
            };

            switch (asset.toUpperCase()) {
                case "USDC":
                    {
                        purchaseParams.targetAssetId = "b0694345-1eb4-4bc4-b340-f389a58ee4f3";
                        purchaseParams.targetAssetIdLock = true;
                    }
                    break;
                case "HBAR":
                    {
                        purchaseParams.targetAssetId = "d9b45743-e712-4088-8a31-65ee6f371022";
                        purchaseParams.targetAssetIdLock = true;
                    }
                    break;
                case "KARATE":
                    {
                        purchaseParams.targetAssetId = "057d6b35-1af5-4827-bee2-c12842faa49e";
                        purchaseParams.targetAssetIdLock = true;
                    }
                    break;
                default:
                    {
                        // check if asset is an uuid
                        if (asset.split("-").length === 5) {
                            purchaseParams.targetAssetId = asset;
                            purchaseParams.targetAssetIdLock = true;
                        }
                    }
                    break;
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
            return this.sendMessageToNative(completionKey, { url: url.toString() });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get quotes from different services for buy, sell or swap
     * @param sourceCode name (HBAR, KARATE, other token code)
     * @param sourceAmount amount to swap, buy or sell
     * @param targetCode name (HBAR, KARATE, USDC, other token code)
     * @param strategy one of enum CryptoFlowServiceStrategy (Buy, Sell, Swap)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SwapQuotesData}
     * @example
     * const quotes = await bladeSdk.exchangeGetQuotes("EUR", 100, "HBAR", CryptoFlowServiceStrategy.BUY);
     */
    async exchangeGetQuotes(
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        strategy: CryptoFlowServiceStrategy,
        completionKey?: string
    ): Promise<SwapQuotesData> {
        try {
            const useTestnet = this.network === Network.Testnet;
            const chainId = parseInt(
                KnownChainIds[useTestnet ? KnownChain.HEDERA_TESTNET : KnownChain.HEDERA_MAINNET],
                10
            );

            const assets = (await getCryptoFlowData(
                this.network,
                this.visitorId,
                CryptoFlowRoutes.ASSETS,
                {
                    sourceCode,
                    targetCode,
                    useTestnet,
                    targetChainId: chainId,
                    sourceChainId: chainId,
                },
                strategy
            )) as ICryptoFlowAssets;

            const sourceAddress = assets.source.find((asset) => asset.code === sourceCode)?.address;
            const targetAddress = assets.target.find((asset) => asset.code === targetCode)?.address;

            const params: ICryptoFlowQuoteParams = {
                sourceCode,
                sourceAmount,
                targetCode,
                useTestnet,
                walletAddress: HbarTokenId,
                slippage: "0.5",
                sourceAddress,
                targetAddress,
            };

            switch (strategy.toLowerCase()) {
                case CryptoFlowServiceStrategy.BUY.toLowerCase(): {
                    params.targetChainId = chainId;
                    break;
                }
                case CryptoFlowServiceStrategy.SELL.toLowerCase(): {
                    params.sourceChainId = chainId;
                    const assets = (await getCryptoFlowData(
                        this.network,
                        this.visitorId,
                        CryptoFlowRoutes.ASSETS,
                        params,
                        strategy
                    )) as ICryptoFlowAssets;

                    if (assets?.limits?.rates && assets.limits.rates.length > 0) {
                        (params as ICryptoFlowQuoteParams).targetAmount = assets.limits.rates[0] * sourceAmount;
                    }
                    break;
                }
                case CryptoFlowServiceStrategy.SWAP.toLowerCase(): {
                    params.sourceChainId = chainId;
                    params.targetChainId = chainId;
                    break;
                }
            }

            const quotes = await getCryptoFlowData(
                this.network,
                this.visitorId,
                CryptoFlowRoutes.QUOTES,
                params,
                strategy
            ) as ICryptoFlowQuote[];
            return this.sendMessageToNative(completionKey, { quotes });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Swap tokens
     * @param accountId account id
     * @param accountPrivateKey account private key
     * @param sourceCode name (HBAR, KARATE, other token code)
     * @param sourceAmount amount to swap
     * @param targetCode name (HBAR, KARATE, other token code)
     * @param slippage slippage in percents. Transaction will revert if the price changes unfavorably by more than this percentage.
     * @param serviceId service id to use for swap (saucerswap, etc)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {StatusResult}
     * @example
     * const result = await bladeSdk.swapTokens("0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...", "HBAR", 1, "SAUCE", 0.5, "saucerswapV2");
     */
    async swapTokens(
        accountId: string,
        accountPrivateKey: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: number,
        serviceId: string,
        completionKey?: string
    ): Promise<StatusResult> {
        try {
            if (accountId && accountPrivateKey) {
                await this.setUser(AccountProvider.Hedera, accountId, accountPrivateKey);
            }
            accountId = this.getUser().accountId;

            const useTestnet = this.network === Network.Testnet;
            const chainId = +KnownChainIds[useTestnet ? KnownChain.HEDERA_TESTNET : KnownChain.HEDERA_MAINNET];

            const assets = (await getCryptoFlowData(
                this.network,
                this.visitorId,
                CryptoFlowRoutes.ASSETS,
                {
                    sourceCode,
                    targetCode,
                    useTestnet,
                    targetChainId: chainId,
                    sourceChainId: chainId,
                },
                CryptoFlowServiceStrategy.SWAP
            )) as ICryptoFlowAssets;

            const sourceAddress = assets.source.find((asset) => asset.code === sourceCode)?.address;
            const targetAddress = assets.target.find((asset) => asset.code === targetCode)?.address;

            const quotes = (await getCryptoFlowData(
                this.network,
                this.visitorId,
                CryptoFlowRoutes.QUOTES,
                {
                    sourceCode,
                    sourceChainId: chainId,
                    sourceAmount,
                    targetCode,
                    targetChainId: chainId,
                    useTestnet,
                    sourceAddress,
                    targetAddress,
                },
                CryptoFlowServiceStrategy.SWAP
            )) as ICryptoFlowQuote[];
            const selectedQuote = quotes.find((quote) => quote.service.id === serviceId);
            if (!selectedQuote) {
                throw new Error("Quote not found");
            }

            const stringifiedSlippage = slippage.toString();
            const txData: ICryptoFlowTransaction = (await getCryptoFlowData(
                this.network,
                this.visitorId,
                CryptoFlowRoutes.TRANSACTION,
                {
                    serviceId,
                    sourceCode,
                    sourceChainId: chainId,
                    sourceAddress: selectedQuote.source.asset.address,
                    sourceAmount,
                    targetCode,
                    targetChainId: chainId,
                    targetAddress: selectedQuote.target.asset.address,
                    walletAddress: accountId,
                    slippage: stringifiedSlippage,
                    useTestnet,
                }
            )) as ICryptoFlowTransaction;

            if (await CryptoFlowService.validateMessage(txData)) {
                await CryptoFlowService.executeAllowanceApprove(
                    selectedQuote,
                    accountId,
                    this.network,
                    this.signer,
                    true,
                    txData.allowanceTo
                );
                try {
                    await CryptoFlowService.executeHederaSwapTx(txData.calldata, this.signer);
                } catch (e) {
                    await CryptoFlowService.executeAllowanceApprove(
                        selectedQuote,
                        accountId,
                        this.network,
                        this.signer,
                        false,
                        txData.allowanceTo
                    );
                    throw e;
                }
                await CryptoFlowService.executeHederaBladeFeeTx(selectedQuote, accountId, this.network, this.signer);
            } else {
                throw new Error("Invalid signature of txData");
            }
            return this.sendMessageToNative(completionKey, { success: true });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get configured url to buy or sell tokens or fiat
     * @param strategy Buy / Sell
     * @param accountId account id
     * @param sourceCode name (HBAR, KARATE, USDC, other token code)
     * @param sourceAmount amount to buy/sell
     * @param targetCode name (HBAR, KARATE, USDC, other token code)
     * @param slippage slippage in percents. Transaction will revert if the price changes unfavorably by more than this percentage.
     * @param serviceId service id to use for swap (saucerswap, onmeta, etc)
     * @param redirectUrl optional url to redirect after final step
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {IntegrationUrlData}
     * @example
     * const {url} = await bladeSdk.getTradeUrl(CryptoFlowServiceStrategy.BUY, "0.0.10001", "EUR", 50, "HBAR", 0.5, "saucerswapV2", redirectUrl);
     */
    async getTradeUrl(
        strategy: CryptoFlowServiceStrategy,
        accountId: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: number,
        serviceId: string,
        redirectUrl: string = "",
        completionKey?: string
    ): Promise<IntegrationUrlData> {
        try {
            if (!accountId) {
                accountId = this.getUser().accountId;
            }
            const useTestnet = this.network === Network.Testnet;
            const chainId = KnownChainIds[useTestnet ? KnownChain.HEDERA_TESTNET : KnownChain.HEDERA_MAINNET];
            const stringifiedSlippage = slippage.toString();
            const params: ICryptoFlowAssetsParams | ICryptoFlowQuoteParams | ICryptoFlowTransactionParams = {
                sourceCode,
                sourceAmount,
                targetCode,
                useTestnet,
                walletAddress: accountId,
                slippage: stringifiedSlippage,
            };

            switch (strategy.toLowerCase()) {
                case CryptoFlowServiceStrategy.BUY.toLowerCase(): {
                    params.targetChainId = +chainId;
                    break;
                }
                case CryptoFlowServiceStrategy.SELL.toLowerCase(): {
                    params.sourceChainId = +chainId;
                    const assets = (await getCryptoFlowData(
                        this.network,
                        this.visitorId,
                        CryptoFlowRoutes.ASSETS,
                        params,
                        strategy
                    )) as ICryptoFlowAssets;

                    if (assets?.limits?.rates && assets.limits.rates.length > 0) {
                        params.targetAmount = assets.limits.rates[0] * sourceAmount;
                    }
                    break;
                }
            }

            params.redirectUrl = redirectUrl;

            const quotes = (await getCryptoFlowData(
                this.network,
                this.visitorId,
                CryptoFlowRoutes.QUOTES,
                params,
                strategy
            )) as ICryptoFlowQuote[];
            const selectedQuote = quotes.find((quote) => quote.service.id === serviceId);
            if (!selectedQuote) {
                throw new Error("Quote not found");
            }

            return this.sendMessageToNative(completionKey, { url: selectedQuote.widgetUrl });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Create token (NFT or Fungible Token)
     * @param treasuryAccountId treasury account id
     * @param supplyPrivateKey supply account private key
     * @param tokenName token name (string up to 100 bytes)
     * @param tokenSymbol token symbol (string up to 100 bytes)
     * @param isNft set token type NFT
     * @param keys token keys
     * @param decimals token decimals (0 for nft)
     * @param initialSupply token initial supply (0 for nft)
     * @param maxSupply token max supply
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {CreateTokenResult}
     * @example
     * const keys: KeyRecord[] = [
     *     {type: KeyType.admin, privateKey: adminKey},
     *     {type: KeyType.wipe, privateKey: wipeKey},
     *     {type: KeyType.pause, privateKey: pauseKey},
     * ];
     * const treasuryAccountId = "0.0.10001";
     * const supplyKey = "302e020100300506032b65700422042043234DEADBEEF255...";
     * const result = await bladeSdk.createToken(
     *     treasuryAccountId, // treasuryAccountId
     *     supplyKey, // supplyPrivateKey
     *     tokenName,
     *     tokenSymbol,
     *     true, // isNft
     *     keys,
     *     0, // decimals
     *     0, // initialSupply
     *     250, // maxSupply
     * );
     */
    async createToken(
        treasuryAccountId: string,
        supplyPrivateKey: string,
        tokenName: string,
        tokenSymbol: string,
        isNft: boolean,
        keys: KeyRecord[] | string,
        decimals: number,
        initialSupply: number,
        maxSupply: number = 250,
        completionKey?: string
    ): Promise<CreateTokenResult> {
        try {
            if (treasuryAccountId && supplyPrivateKey) {
                await this.setUser(AccountProvider.Hedera, treasuryAccountId, supplyPrivateKey);
            }
            treasuryAccountId = this.getUser().accountId;
            const supplyPublicKey = PublicKey.fromString(this.getUser().publicKey);

            let adminKey: PrivateKey | null = null;

            const tokenType = isNft ? TokenType.NonFungibleUnique : TokenType.FungibleCommon;
            if (isNft) {
                decimals = 0;
                initialSupply = 0;
            }

            if (typeof keys === "string") {
                keys = JSON.parse(keys) as KeyRecord[];
            }

            let nftCreate = new TokenCreateTransaction()
                .setTokenName(tokenName)
                .setTokenSymbol(tokenSymbol)
                .setTokenType(tokenType)
                .setDecimals(decimals)
                .setInitialSupply(initialSupply)
                .setTreasuryAccountId(treasuryAccountId)
                .setSupplyType(TokenSupplyType.Finite)
                .setMaxSupply(maxSupply)
                .setSupplyKey(supplyPublicKey);
            for (const key of keys) {
                const privateKey = PrivateKey.fromString(key.privateKey);

                switch (key.type) {
                    case KeyType.admin:
                        nftCreate.setAdminKey(privateKey);
                        adminKey = privateKey;
                        break;
                    case KeyType.kyc:
                        nftCreate.setKycKey(privateKey);
                        break;
                    case KeyType.freeze:
                        nftCreate.setFreezeKey(privateKey);
                        break;
                    case KeyType.wipe:
                        nftCreate.setWipeKey(privateKey);
                        break;
                    case KeyType.pause:
                        nftCreate.setPauseKey(privateKey);
                        break;
                    case KeyType.feeSchedule:
                        nftCreate.setFeeScheduleKey(privateKey);
                        break;
                    default:
                        throw new Error("Unknown key type");
                }
            }
            nftCreate = await nftCreate.freezeWithSigner(this.signer);
            let nftCreateTxSign;

            if (adminKey) {
                nftCreateTxSign = await nftCreate.sign(adminKey);
            } else {
                nftCreateTxSign = await nftCreate.signWithSigner(this.signer);
            }

            const nftCreateSubmit = await nftCreateTxSign.executeWithSigner(this.signer);
            const nftCreateRx = await nftCreateSubmit.getReceiptWithSigner(this.signer);

            const tokenId = nftCreateRx.tokenId!.toString();
            return this.sendMessageToNative(completionKey, { tokenId }, null);
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Associate token to account. Association fee will be covered by PayMaster, if tokenId configured in dApp
     *
     * @param tokenIdOrCampaign token id to associate. Empty to associate all tokens configured in dApp. Campaign name to associate on demand
     * @param accountId account id to associate token
     * @param accountPrivateKey account private key
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const result = await bladeSdk.associateToken("0.0.1337", "0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...");
     * const result = await bladeSdk.associateToken("CampaignName", "0.0.10001", "302e020100300506032b65700422042043234DEADBEEF255...");
     */
    async associateToken(
        tokenIdOrCampaign: string,
        accountId: string,
        accountPrivateKey: string,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            if (accountId && accountPrivateKey) {
                await this.setUser(AccountProvider.Hedera, accountId, accountPrivateKey);
            }
            accountId = this.getUser().accountId;

            let transaction: Transaction;
            const freeAssociationTokens = (await getConfig("tokens"))[this.network.toLowerCase()]?.association || [];
            if (freeAssociationTokens.includes(tokenIdOrCampaign) || !tokenIdOrCampaign) {
                const result = await getTokenAssociateTransaction(AssociationAction.FREE, tokenIdOrCampaign, accountId);
                if (!result.transactionBytes) {
                    throw new Error("Failed to get transaction bytes for free association. Token already associated?");
                }
                const buffer = Buffer.from(result.transactionBytes, "base64");
                transaction = Transaction.fromBytes(buffer);
            } else if (!/^\d+.\d+.\d+$/g.test(tokenIdOrCampaign)) {
                // if not valid tokenId provided, we assume that campaignName is provided, try to AssociateOnDemand
                const result = await getTokenAssociateTransaction(AssociationAction.DEMAND, tokenIdOrCampaign, accountId);
                if (!result.transactionBytes) {
                    throw new Error("Failed to get transaction bytes for campaign association");
                }

                const buffer = Buffer.from(result.transactionBytes, "base64");
                transaction = await Transaction.fromBytes(buffer)
                    .signWithSigner(this.signer)
                    .then((tx) => tx.freezeWithSigner(this.signer));
            } else {
                transaction = await new TokenAssociateTransaction()
                    .setAccountId(accountId)
                    .setTokenIds([tokenIdOrCampaign])
                    .freezeWithSigner(this.signer);
            }
            return transaction
                .signWithSigner(this.signer)
                .then((tx) => tx.executeWithSigner(this.signer))
                .then((result) => result.getReceiptWithSigner(this.signer))
                .then((txReceipt) => {
                    if (txReceipt.status !== Status.Success) {
                        throw new Error(`Association failed`);
                    }
                    return this.sendMessageToNative(completionKey, formatReceipt(txReceipt));
                })
                .catch((error) => {
                    throw this.sendMessageToNative(completionKey, null, error);
                });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Mint one NFT
     *
     * @param tokenId token id to mint NFT
     * @param accountId token supply account id
     * @param accountPrivateKey token supply private key
     * @param file image to mint (File or base64 DataUrl image, eg.: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAA...)
     * @param metadata NFT metadata (JSON object)
     * @param storageConfig {NFTStorageConfig} IPFS provider config
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const receipt = await bladeSdk.nftMint(
     *     tokenId,
     *     treasuryAccountId,
     *     supplyKey,
     *     "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAARUlEQVR42u3PMREAAAgEIO1fzU5vBlcPGtCVTD3QIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIXCyqyi6fIALs1AAAAAElFTkSuQmCC", // TODO upload file base64
     *     {
     *         author: "GaryDu",
     *         other: "metadata",
     *         some: "more properties"
     *     },
     *     {
     *         provider: NFTStorageProvider.nftStorage,
     *         apiKey: nftStorageApiKey,
     *     }
     * );
     */
    async nftMint(
        tokenId: string,
        accountId: string,
        accountPrivateKey: string,
        file: File | string,
        metadata: object,
        storageConfig: NFTStorageConfig,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            if (typeof file === "string") {
                file = dataURLtoFile(file, "filename");
            }
            if (typeof metadata === "string") {
                metadata = JSON.parse(metadata);
            }

            const groupSize = 1;
            const amount = 1;

            if (accountId && accountPrivateKey) {
                await this.setUser(AccountProvider.Hedera, accountId, accountPrivateKey);
            }

            let storageClient: NFTStorage;
            if (storageConfig.provider === NFTStorageProvider.nftStorage) {
                // TODO implement through interfaces
                storageClient = new NFTStorage({ token: storageConfig.apiKey });
            } else {
                throw new Error("Unknown nft storage provider");
            }

            const fileName = file.name;
            const dirCID = await storageClient.storeDirectory([file]);

            metadata = {
                name: fileName,
                type: file.type,
                creator: "Blade Labs",
                ...metadata,
                image: `ipfs://${dirCID}/${encodeURIComponent(fileName)}`,
            };
            const metadataCID = await storageClient.storeBlob(
                new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" })
            );

            const CIDs = [metadataCID];
            const mdArray = new Array(amount).fill(0).map((el, index) => Buffer.from(CIDs[index % CIDs.length]));
            const mdGroup = mdArray.splice(0, groupSize);

            return new TokenMintTransaction()
                .setTokenId(tokenId)
                .setMetadata(mdGroup)
                .setMaxTransactionFee(Hbar.from(2 * groupSize, HbarUnit.Hbar))
                .freezeWithSigner(this.signer)
                .then((tx) => tx.signWithSigner(this.signer))
                .then((tx) => tx.executeWithSigner(this.signer))
                .then((result) => result.getReceiptWithSigner(this.signer))
                .then((txReceipt) => {
                    if (txReceipt.status !== Status.Success) {
                        throw new Error(`Mint failed`);
                    }
                    return this.sendMessageToNative(completionKey, formatReceipt(txReceipt));
                })
                .catch((error) => {
                    throw this.sendMessageToNative(completionKey, null, error);
                });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get token info. Fungible or NFT. Also get NFT metadata if serial provided
     * @param tokenId token id
     * @param serial serial number for NFT
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TokenInfoData}
     * @example
     * const tokenInfo = await bladeSdk.getTokenInfo("0.0.1234", "3");
     */
    async getTokenInfo(tokenId: string, serial: string = "", completionKey?: string): Promise<TokenInfoData> {
        try {
            const token = await requestTokenInfo(this.network, tokenId);
            let nft = null;
            let metadata = null;
            if (token.type === TokenType.NonFungibleUnique.toString() && serial) {
                nft = await getNftInfo(this.network, tokenId, serial);
                metadata = await getNftMetadataFromIpfs(Buffer.from(nft.metadata, "base64").toString());
            }
            return this.sendMessageToNative(completionKey, {
                token,
                nft,
                metadata,
            });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Emergency balance transfer from broken mnemonic account to new account
     * Accounts with broken mnemonic sometimes were created because of hedera-sdk issue
     * To transfer funds from broken mnemonic account to new account a couple of steps required:
     * 1. Create new account
     * 2. Associate all tokens with new account that you want to transfer
     * 3. Call this method to transfer funds to new account
     * 4. Send some HBAR to broken mnemonic account to cover fees if needed
     *
     * @param seedPhrase mnemonic from account
     * @param accountId account id (broken)
     * @param receiverId new account id
     * @param hbarAmount amount of HBAR to resque. Can be 0
     * @param tokenList list of token ids to transfer all tokens. Can be empty
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const receipt = await bladeSdk.brokenMnemonicEmergencyTransfer(brokenSeed, resqueAccountId, newAccountId, "0.5", ["0.0.1337"]);
     */
    async brokenMnemonicEmergencyTransfer(seedPhrase: string, accountId: string, receiverId: string, hbarAmount: string, tokenList: string[], completionKey?: string): Promise<TransactionReceiptData> {
        try {
            const mnemonic = await Mnemonic.fromString(seedPhrase);
            // check if mnemonic is actually broken
            const isValid = await checkSeedPhrase(mnemonic);
            if (isValid) {
                throw new Error("Account mnemonic is valid. No need for emergency transfer");
            }
            const key = await mnemonic.toStandardECDSAsecp256k1PrivateKey();

            // send funds to receiverId
            const client = this.getClient();
            client.setOperator(accountId, key);
            const parsedAmount = parseFloat(hbarAmount);
            const tx = new TransferTransaction().setTransactionMemo("Resque funds from broken mnemonic account using BladeSDK");

            if (parsedAmount > 0) {
                tx.addHbarTransfer(accountId, -1 * parsedAmount)
                    .addHbarTransfer(receiverId, parsedAmount)
            }

            if (tokenList.length > 0) {
                const accountBalance = await getAccountBalance(accountId)
                for (const tokenId of tokenList) {
                    const tokenBalance = accountBalance.tokens.find((t) => t.tokenId === tokenId)
                    if (tokenBalance) {
                        tx.addTokenTransfer(tokenId, accountId, -1 * tokenBalance.balance)
                        tx.addTokenTransfer(tokenId, receiverId, tokenBalance.balance)
                    }
                }
            }

            return tx.freezeWith(client)
                .execute(client)
                // .then((tx) => tx.execute(client))
                .then((result) => result.getReceipt(client))
                .then((data) => {
                    return this.sendMessageToNative(completionKey, formatReceipt(data));
                })
                .catch((error) => {
                    throw this.sendMessageToNative(completionKey, null, error);
                });
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }

    }

    private async initMagic() {
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        this.magic = new Magic(await getConfig("magicLinkPublicKey"), {
            extensions: [
                new HederaExtension({
                    network: this.network.toLowerCase(),
                }),
            ],
        });
    }

    private getUser(): UserInfo {
        if (!this.signer) {
            throw new Error("No user, please call setUser() first");
        }
        return {
            signer: this.signer,
            accountId: this.userAccountId,
            privateKey: this.userPrivateKey,
            publicKey: this.userPublicKey,
        };
    }

    private getClient() {
        return this.network === Network.Testnet ? Client.forTestnet() : Client.forMainnet();
    }

    /**
     * Message that sends response back to native handler
     */
    private sendMessageToNative<T>(
        completionKey: string | undefined,
        data: T,
        error: Partial<CustomError> | any | null = null
    ): T {
        if (!this.webView || !completionKey) {
            if (error) {
                throw error;
            }
            return data;
        }

        // web-view bridge response
        const responseObject: BridgeResponse<T> = {
            completionKey: completionKey || "",
            data,
        };
        if (error) {
            responseObject.error = {
                name: error?.name || "Error",
                reason: error.reason || error.message || JSON.stringify(error),
            };
        }

        // IOS or Android
        // @ts-expect-error eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const bladeMessageHandler = window?.webkit?.messageHandlers?.bladeMessageHandler || window?.bladeMessageHandler;
        if (bladeMessageHandler) {
            bladeMessageHandler.postMessage(JSON.stringify(responseObject));
        }
        return JSON.parse(JSON.stringify(responseObject)) as T;
    }
}
