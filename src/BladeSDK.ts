import {Container, inject, injectable} from "inversify";
import "reflect-metadata";
import {Buffer} from "buffer";
import {TokenType} from "@hashgraph/sdk";
import ApiService from "./services/ApiService";
import {HbarTokenId} from "./strategies/hedera/FeeServiceHedera";
import ConfigService from "./services/ConfigService";
import StringHelpers from "./helpers/StringHelpers";
import {CustomError} from "./models/Errors";
import {
    AccountInfoData,
    AccountPrivateData,
    AccountProvider,
    ActiveUser,
    BalanceData,
    BridgeResponse,
    CoinData,
    CoinInfoData,
    CoinInfoRaw,
    CoinListData,
    ContractCallQueryRecordsData,
    CreateAccountData,
    CreateScheduleData,
    CreateTokenData,
    InfoData,
    IntegrationUrlData,
    KeyRecord,
    NFTStorageConfig,
    NodeListData,
    ResultData,
    ScheduleTransactionTransfer,
    ScheduleTransactionType,
    SdkEnvironment,
    SignMessageData,
    SignVerifyMessageData,
    SplitSignatureData,
    SupportedEncoding,
    SwapQuotesData,
    TokenDropData,
    TokenInfoData,
    TransactionReceiptData,
    TransactionResponseData,
    TransactionsHistoryData,
    UserInfoData,
    WebViewWindow
} from "./models/Common";
import {ChainMap, KnownChains} from "./models/Chain";
import config from "./config";
import {ParametersBuilder} from "./ParametersBuilder";
import {ExchangeStrategy} from "./models/Exchange";
import {NftInfo, NftMetadata} from "./models/MirrorNode";
import {File} from "nft.storage";
import TokenServiceContext from "./contexts/TokenServiceContext";
import AccountServiceContext from "./contexts/AccountServiceContext";
import SignServiceContext from "./contexts/SignServiceContext";
import ContractServiceContext from "./contexts/ContractServiceContext";
import ExchangeService from "./services/ExchangeService";
import AuthServiceContext from "./contexts/AuthServiceContext";
import {ChainContextRegistry, ServiceContextTypes} from "./ChainContextRegistry";
import {getContainer} from "./container";

@injectable()
export class BladeSDK {
    private apiKey: string = "";
    private chain: KnownChains = KnownChains.HEDERA_TESTNET;
    private dAppCode: string = "";
    private visitorId: string = "";
    private sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod;
    private sdkVersion: string = config.sdkVersion;
    private readonly webView: boolean = false;
    private user: ActiveUser | null = null;
    private readonly container: Container;

    /**
     * BladeSDK constructor.
     * @param configService - instance of ConfigService
     * @param apiService - instance of ApiService
     * @param chainContextRegistry - instance of ChainContextRegistry
     * @param exchangeService - instance of ExchangeService
     * @param isWebView - true if you are using this SDK in webview of native app. It changes the way of communication with native app.
     */
    constructor(
        @inject("configService") private readonly configService: ConfigService,
        @inject("apiService") private readonly apiService: ApiService,
        @inject("chainContextRegistry") private readonly chainContextRegistry: ChainContextRegistry,
        @inject("exchangeService") private readonly exchangeService: ExchangeService,
        @inject("isWebView") private readonly isWebView: boolean
    ) {
        this.container = getContainer();
        this.webView = isWebView;
    }

    /**
     * Init instance of BladeSDK for correct work with Blade API and other endpoints.
     * @param apiKey Unique key for API provided by Blade team.
     * @param chain one of supported chains from KnownChains
     * @param dAppCode your dAppCode - request specific one by contacting BladeLabs team
     * @param visitorId client unique id. If not provided, SDK will try to get it using fingerprintjs-pro library
     * @param sdkEnvironment environment to choose BladeAPI server (Prod, CI). Prod used by default.
     * @param sdkVersion used for header X-SDK-VERSION
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {InfoData} status: "success" or "error"
     * @example
     * const info = await bladeSdk.init("apiKey", KnownChains.HEDERA_MAINNET, "dAppCode");
     */
    async init(
        apiKey: string,
        chain: string | KnownChains,
        dAppCode: string,
        visitorId: string,
        sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod,
        sdkVersion: string = config.sdkVersion,
        completionKey?: string
    ): Promise<InfoData> {
        this.apiKey = apiKey;
        this.chain = StringHelpers.stringToChain(chain);
        this.dAppCode = dAppCode;
        this.sdkEnvironment = sdkEnvironment;
        this.sdkVersion = sdkVersion;
        this.visitorId = visitorId;
        if (this.user) {
            await this.resetUser();
        }

        this.apiService.initApiService(apiKey, dAppCode, sdkEnvironment, sdkVersion, this.chain, visitorId);
        const authServiceContext = this.chainContextRegistry.getContext<AuthServiceContext>(this.chain, ServiceContextTypes.AuthServiceContext);
        this.visitorId = await authServiceContext.getVisitorId(this.visitorId, this.apiKey, this.sdkEnvironment);
        return this.sendMessageToNative(completionKey, this.getInfoData());
    }

    /**
     * Returns information about initialized instance of BladeSDK.
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {InfoData}
     * @example
     * const info = bladeSdk.getInfo();
     */
    getInfo(completionKey?: string): InfoData {
        return this.sendMessageToNative(completionKey, this.getInfoData());
    }

    /**
     * Set active user for further operations.
     * @param accountProvider one of supported providers: PrivateKey or Magic
     * @param accountIdOrEmail account id (0.0.xxxxx, 0xABCDEF..., EMAIL) or empty string for some chains
     * @param privateKey private key for account (hex encoded privateKey with DER-prefix or 0xABCDEF...) In case of Magic provider - empty string
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {UserInfoData}
     * @example
     * // Set account for PrivateKey provider
     * const userInfo = await bladeSdk.setUser(AccountProvider.PrivateKey, "0.0.45467464", "302e020100300506032b6570042204204323472EA5374E80B07346243234DEADBEEF25235235...");
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
            const authServiceContext = this.chainContextRegistry.getContext<AuthServiceContext>(this.chain, ServiceContextTypes.AuthServiceContext);
            this.user = await authServiceContext.setUser(this.chain, accountProvider, accountIdOrEmail, privateKey);
            this.container.rebind("user").toConstantValue(this.user);

            return this.sendMessageToNative(completionKey, {
                address: this.user.accountAddress,
                accountProvider: this.user.provider,
                privateKey: this.user.privateKey,
                publicKey: this.user.publicKey
            });
        } catch (error: any) {
            this.user = null;
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Clear active user from SDK instance.
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {UserInfoData}
     * @example
     * const result = await bladeSdk.resetUser();
     */
    async resetUser(completionKey?: string): Promise<UserInfoData> {
        try {
            const authServiceContext = this.chainContextRegistry.getContext<AuthServiceContext>(this.chain, ServiceContextTypes.AuthServiceContext);
            this.user = await authServiceContext.resetUser(this.chain);

            return this.sendMessageToNative(completionKey, {
                address: "",
                accountProvider: null,
                privateKey: "",
                publicKey: ""
            });
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get balance and token balances for specific account.
     * @param accountAddress Hedera account id (0.0.xxxxx) or Ethereum address (0x00ABCD00...) or empty string to use current user account
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {BalanceData} balance and tokens
     * @example
     * const balance = await bladeSdk.getBalance("0.0.45467464");
     */
    async getBalance(accountAddress: string, completionKey?: string): Promise<BalanceData> {
        try {
            if (!accountAddress) {
                accountAddress = this.getUser().accountAddress;
            }
            const tokenService = this.chainContextRegistry.getContext<TokenServiceContext>(this.chain, ServiceContextTypes.TokenServiceContext);
            return this.sendMessageToNative(completionKey, await tokenService.getBalance(accountAddress));
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Send account balance (HBAR/ETH) to specific account.
     * @param receiverAddress receiver address (0.0.xxxxx, 0x123456789abcdef...)
     * @param amount amount of currency to send, as a string representing a decimal number (e.g., "211.3424324")
     * @param memo transaction memo (limited to 100 characters)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionResponseData}
     * @example
     * const transactionResponse = await bladeSdk.transferBalance("0.0.10002", "1.0", "test memo");
     */
    async transferBalance(
        receiverAddress: string,
        amount: string,
        memo: string,
        completionKey?: string
    ): Promise<TransactionResponseData> {
        try {
            const tokenService = this.chainContextRegistry.getContext<TokenServiceContext>(this.chain, ServiceContextTypes.TokenServiceContext);
            const result = await tokenService.transferBalance({
                from: this.getUser().accountAddress,
                to: receiverAddress,
                amount,
                memo
            });

            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Send token to specific address.
     * @param tokenAddress token address to send (0.0.xxxxx or 0x123456789abcdef...)
     * @param receiverAddress receiver account address (0.0.xxxxx or 0x123456789abcdef...)
     * @param amountOrSerial amount of fungible tokens to send (with token-decimals correction) or NFT serial number. (e.g. amount "0.01337" when token decimals 8 will send 1337000 units of token)
     * @param memo transaction memo (limited to 100 characters)
     * @param usePaymaster if true, Paymaster account will pay fee transaction. Only for single dApp configured fungible-token. In that case tokenId not used
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionResponseData}
     * @example
     * const transactionResponse = await bladeSdk.transferTokens("0.0.1337", "0.0.10002", "1", "test memo");
     */
    async transferTokens(
        tokenAddress: string,
        receiverAddress: string,
        amountOrSerial: string,
        memo: string,
        usePaymaster: boolean = false,
        completionKey?: string
    ): Promise<TransactionResponseData> {
        try {
            // TODO send NFT for Ethereum tokens
            const tokenService = this.chainContextRegistry.getContext<TokenServiceContext>(this.chain, ServiceContextTypes.TokenServiceContext);
            const result = await tokenService.transferToken({
                from: this.getUser().accountAddress,
                to: receiverAddress,
                amountOrSerial,
                tokenAddress,
                memo,
                usePaymaster
            });
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
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
            const coinList: CoinInfoRaw[] = await this.apiService.getCoins({
                dAppCode: this.dAppCode,
                visitorId: this.visitorId
            });

            const result: CoinListData = {
                coins: coinList.map(coin => {
                    return {
                        ...coin,
                        platforms: Object.keys(coin.platforms).map(name => {
                            return {
                                name,
                                address: coin.platforms[name]
                            };
                        })
                    };
                })
            };
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get coin price and coin info from CoinGecko. Search can be coin id or address in one of the coin platforms.
     * In addition to the price in USD, the price in the currency you specified is returned
     * @param search coinId (e.g. "hbar", "hedera-hashgraph"). You can get valid one using .getCoinList() method
     * @param currency currency to get price in (e.g. "uah", "pln", "usd")
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {CoinInfoData}
     * @example
     * const coinInfo = await bladeSdk.getCoinPrice("hedera-hashgraph", "uah");
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
                visitorId: this.visitorId
            };

            let coinInfo: CoinData | null = null;
            try {
                // try to get coin info from CoinGecko
                coinInfo = await this.apiService.getCoinInfo(search, params);
            } catch (error) {
                // on fail try to get coin info from CoinGecko and match by address
                const coinList: CoinInfoRaw[] = await this.apiService.getCoins(params);
                const coin = coinList.find(item => Object.values(item.platforms).includes(search));
                if (!coin) {
                    throw new Error(`Coin with address ${search} not found`);
                }
                coinInfo = await this.apiService.getCoinInfo(coin.id, params);
            }

            const result: CoinInfoData = {
                coin: coinInfo,
                priceUsd: coinInfo.market_data.current_price.usd,
                price: coinInfo.market_data.current_price[currency.toLowerCase()] || null,
                currency: currency.toLowerCase()
            };
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Call contract function. Directly or via BladeAPI using paymaster account (fee will be paid by Paymaster account), depending on your dApp configuration.
     * @param contractAddress - contract address (0.0.xxxxx or 0x123456789abcdef...)
     * @param functionName - name of the contract function to call
     * @param paramsEncoded - function argument. Can be generated with {@link ParametersBuilder} object
     * @param gas - gas limit for the transaction
     * @param usePaymaster - if true, fee will be paid by Paymaster account (note: msg.sender inside the contract will be Paymaster account)
     * @param completionKey - optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const params = new ParametersBuilder().addString("Hello");
     * const contractId = "0.0.123456";
     * const gas = 100000;
     * const receipt = await bladeSdk.contractCallFunction(contractId, "set_message", params, gas);
     */
    async contractCallFunction(
        contractAddress: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number = 100000,
        usePaymaster: boolean = false,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const contractService = this.chainContextRegistry.getContext<ContractServiceContext>(this.chain, ServiceContextTypes.ContractServiceContext);
            const result = await contractService.contractCallFunction(
                contractAddress,
                functionName,
                paramsEncoded,
                gas,
                usePaymaster
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Call query on contract function. Similar to {@link contractCallFunction} can be called directly or via BladeAPI using Paymaster account.
     * @param contractAddress contract address (0.0.xxxxx or 0x123456789abcdef...)
     * @param functionName name of the contract function to call
     * @param paramsEncoded function argument. Can be generated with {@link ParametersBuilder} object
     * @param gas gas limit for the transaction
     * @param usePaymaster if true, the fee will be paid by paymaster account (note: msg.sender inside the contract will be Paymaster account)
     * @param resultTypes array of result types. Currently supported only plain data types
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {ContractCallQueryRecordsData}
     * @example
     * const params = new ParametersBuilder();
     * const contractId = "0.0.123456";
     * const gas = 100000;
     * const result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, gas, false, ["string"]);
     */
    async contractCallQueryFunction(
        contractAddress: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number = 100000,
        usePaymaster: boolean = false,
        resultTypes: string[],
        completionKey?: string
    ): Promise<ContractCallQueryRecordsData> {
        try {
            const contractService = this.chainContextRegistry.getContext<ContractServiceContext>(this.chain, ServiceContextTypes.ContractServiceContext);
            const result = await contractService.contractCallQueryFunction(
                contractAddress,
                functionName,
                paramsEncoded,
                gas,
                usePaymaster,
                resultTypes
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Create scheduled transaction
     * @param type schedule transaction type (currently only TRANSFER supported)
     * @param transfers array of transfers to schedule (HBAR, FT, NFT)
     * @param usePaymaster if true, Paymaster account will pay transaction fee (also dApp had to be configured for free schedules)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {CreateScheduleData}
     * @example
     * const receiverAccountAddress = "0.0.10001";
     * const senderAccountAddress = "0.0.10002";
     * const tokenAddress = "0.0.1337";
     * const nftAddress = "0.0.1234";
     * const {scheduleId} = await bladeSdk.createScheduleTransaction(
     *     "TRANSFER",
     *     [
     *         {
     *             type: "HBAR",
     *             sender: senderAccountAddress,
     *             receiver: receiverAccountAddress,
     *             value: 1 * 10**8,
     *         },
     *         {
     *             type: "FT",
     *             sender: senderAccountAddress,
     *             receiver: receiverAccountAddress,
     *             tokenId: tokenAddress,
     *             value: 1
     *         },
     *         {
     *             type: "NFT",
     *             sender: senderAccountAddress,
     *             receiver: receiverAccountAddress,
     *             tokenId: nftAddress,
     *             serial: 4
     *         },
     *     ],
     *     false
     * );
     */
    async createScheduleTransaction(
        type: ScheduleTransactionType,
        transfers: ScheduleTransactionTransfer[],
        usePaymaster: boolean = false,
        completionKey?: string
    ): Promise<CreateScheduleData> {
        try {
            const signService = this.chainContextRegistry.getContext<SignServiceContext>(this.chain, ServiceContextTypes.SignServiceContext);
            const result = await signService.createScheduleTransaction(type, transfers, usePaymaster);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign scheduled transaction
     * @param scheduleId scheduled transaction id (0.0.xxxxx)
     * @param receiverAccountAddress account id of receiver for additional validation in case of dApp freeSchedule transactions configured
     * @param usePaymaster if true, Paymaster account will pay transaction fee (also dApp had to be configured for free schedules)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const scheduleId = "0.0.754583634";
     * const receiverAccountAddress = "0.0.10001";
     * const receipt = await bladeSdk.signScheduleId(scheduleId, receiverAccountId, false);
     */
    async signScheduleId(
        scheduleId: string,
        receiverAccountAddress?: string,
        usePaymaster?: boolean,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const signService = this.chainContextRegistry.getContext<SignServiceContext>(this.chain, ServiceContextTypes.SignServiceContext);
            const result = await signService.signScheduleId(
                scheduleId,
                receiverAccountAddress || "",
                !!usePaymaster
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Create new account (ECDSA by default). Depending on dApp config Blade will create an account, associate tokens, etc.
     * @param privateKey optional field if you need specify account key (hex encoded privateKey with DER-prefix)
     * @param deviceId optional field for headers for backend check
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {CreateAccountData}
     * @example
     * const account = await bladeSdk.createAccount();
     */
    async createAccount(privateKey?: string, deviceId?: string, completionKey?: string): Promise<CreateAccountData> {
        try {
            const accountService = this.chainContextRegistry.getContext<AccountServiceContext>(this.chain, ServiceContextTypes.AccountServiceContext);
            const result = await accountService.createAccount(privateKey, deviceId);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Delete Hedera account
     * @param deleteAccountAddress account address to delete (0.0.xxxxx)
     * @param deletePrivateKey account private key (DER encoded hex string)
     * @param transferAccountAddress if any funds left on account, they will be transferred to this account address (0.0.xxxxx)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const receipt = await bladeSdk.deleteAccount(accountToDelete.accountAddress, accountToDelete.privateKey, "0.0.10001");
     */
    async deleteAccount(
        deleteAccountAddress: string,
        deletePrivateKey: string,
        transferAccountAddress: string,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const accountService = this.chainContextRegistry.getContext<AccountServiceContext>(this.chain, ServiceContextTypes.AccountServiceContext);
            const result = await accountService.deleteAccount(
                deleteAccountAddress,
                deletePrivateKey,
                transferAccountAddress
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get account info.
     * EvmAddress is address of Hedera account if exists. Else accountId will be converted to solidity address.
     * CalculatedEvmAddress is calculated from account public key. May be different from evmAddress.
     * @param accountAddress account address (0.0.xxxxx)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {AccountInfoData}
     * @example
     * const accountInfo = await bladeSdk.getAccountInfo("0.0.10001");
     */
    async getAccountInfo(accountAddress: string, completionKey?: string): Promise<AccountInfoData> {
        try {
            accountAddress = accountAddress || this.getUser().accountAddress;

            const accountService = this.chainContextRegistry.getContext<AccountServiceContext>(this.chain, ServiceContextTypes.AccountServiceContext);
            const result = await accountService.getAccountInfo(accountAddress);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get Hedera node list available for stake
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {NodeListData}
     * @example
     * const nodeList = await bladeSdk.getNodeList();
     */
    async getNodeList(completionKey?: string): Promise<NodeListData> {
        try {
            const accountService = this.chainContextRegistry.getContext<AccountServiceContext>(this.chain, ServiceContextTypes.AccountServiceContext);
            const result = await accountService.getNodeList();
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Stake/unstake hedera account
     * @param nodeId node id to stake to. If negative or null, account will be unstaked
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const receipt = await bladeSdk.stakeToNode(3);
     */
    async stakeToNode(nodeId: number, completionKey?: string): Promise<TransactionReceiptData> {
        try {
            const accountService = this.chainContextRegistry.getContext<AccountServiceContext>(this.chain, ServiceContextTypes.AccountServiceContext);
            const result = await accountService.stakeToNode(this.getUser().accountAddress, nodeId);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get accounts list and keys from private key or mnemonic
     * Supporting standard and legacy key derivation.
     * Returned keys with DER header.
     * EvmAddress computed from ECDSA Public key.
     * @param keyOrMnemonic BIP39 mnemonic, private key with DER header
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {AccountPrivateData}
     * @example
     * const resultKey = await bladeSdk.searchAccounts("302e020100300506032b65700422042043234DEADBEEF255...");
     * const resultSeed = await bladeSdk.searchAccounts("purity slab doctor swamp tackle rebuild summer bean craft toddler blouse switch");
     */
    async searchAccounts(keyOrMnemonic: string, completionKey?: string): Promise<AccountPrivateData> {
        try {
            const accountService = this.chainContextRegistry.getContext<AccountServiceContext>(this.chain, ServiceContextTypes.AccountServiceContext);
            const result = await accountService.searchAccounts(keyOrMnemonic);
            return this.sendMessageToNative(completionKey, result);
        } catch (error: any) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Bladelink drop to account
     * @param secretNonce configured for dApp. Should be kept in secret
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TokenDropData}
     * @example
     * const drop = await bladeSdk.dropTokens("secret-nonce");
     */
    async dropTokens(secretNonce: string, completionKey?: string): Promise<TokenDropData> {
        try {
            const tokenService = this.chainContextRegistry.getContext<TokenServiceContext>(this.chain, ServiceContextTypes.TokenServiceContext);
            const result = await tokenService.dropTokens(this.getUser().accountAddress, secretNonce);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign encoded message with private key. Returns hex-encoded signature.
     * @param encodedMessage encoded message to sign
     * @param encoding one of the supported encodings (hex/base64/utf8)
     * @param likeEthers to get signature in ethers format. Works only for ECDSA keys. Ignored on chains other than Hedera
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignMessageData}
     * @example
     * const signResult = await bladeSdk.sign("Hello", SupportedEncoding.utf8, false);
     */
    async sign(
        encodedMessage: string,
        encoding: SupportedEncoding,
        likeEthers: boolean,
        completionKey?: string
    ): Promise<SignMessageData> {
        try {
            const signService = this.chainContextRegistry.getContext<SignServiceContext>(this.chain, ServiceContextTypes.SignServiceContext);
            const result = await signService.sign(encodedMessage, encoding, likeEthers);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Verify message signature by public key
     * @param encodedMessage encoded message (same as provided to `sign()` method)
     * @param encoding one of the supported encodings (hex/base64/utf8)
     * @param signature hex-encoded signature (result from `sign()` method)
     * @param addressOrPublicKey EVM-address, publicKey, or Hedera address (0x11f8D856FF2aF6700CCda4999845B2ed4502d8fB, 0x0385a2fa81f8acbc47fcfbae4aeee6608c2d50ac2756ed88262d102f2a0a07f5b8, 0.0.1512, or empty for current account)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignVerifyMessageData}
     * @example
     * const signature = "27cb9d51434cf1e76d7ac515b19442c619f641e6fccddbf4a3756b14466becb6992dc1d2a82268018147141fc8d66ff9ade43b7f78c176d070a66372d655f942";
     * const publicKey = "302d300706052b8104000a032200029dc73991b0d9cdbb59b2cd0a97a0eaff6de...";
     * const valid = await bladeSdk.verify("Hello", SupportedEncoding.utf8, signature, publicKey);
     */
    async verify(
        encodedMessage: string,
        encoding: SupportedEncoding,
        signature: string,
        addressOrPublicKey: string,
        completionKey?: string
    ): Promise<SignVerifyMessageData> {
        try {
            addressOrPublicKey = addressOrPublicKey || this.getUser().publicKey;
            const signService = this.chainContextRegistry.getContext<SignServiceContext>(this.chain, ServiceContextTypes.SignServiceContext);
            const result = await signService.verify(
                encodedMessage,
                encoding,
                signature,
                addressOrPublicKey
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
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
    async splitSignature(signature: string, completionKey?: string): Promise<SplitSignatureData> {
        try {
            const signService = this.chainContextRegistry.getContext<SignServiceContext>(this.chain, ServiceContextTypes.SignServiceContext);
            return this.sendMessageToNative(completionKey, await signService.splitSignature(signature));
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get v-r-s signature of contract function params
     * @param paramsEncoded - data to sign. Can be string or ParametersBuilder
     * @param completionKey - optional field bridge between mobile webViews and native apps
     * @returns {SplitSignatureData}
     * @example
     * const params = new ParametersBuilder().addAddress(accountId).addString("Hello");
     * const result = await bladeSdk.getParamsSignature(params, "302e020100300506032b65700422042043234DEADBEEF255...");
     */
    async getParamsSignature(
        paramsEncoded: string | ParametersBuilder,
        completionKey?: string
    ): Promise<SplitSignatureData> {
        try {
            const signService = this.chainContextRegistry.getContext<SignServiceContext>(this.chain, ServiceContextTypes.SignServiceContext);
            const result = await signService.getParamsSignature(paramsEncoded);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get transactions history for account. Can be filtered by transaction type.
     * Transaction requested from mirror node. Every transaction requested for child transactions. Result are flattened.
     * If transaction type is not provided, all transactions will be returned.
     * If transaction type is CRYPTOTRANSFERTOKEN records will additionally contain plainData field with decoded data.
     * @param accountAddress account address (0.0.xxxxx or 0x123456789abcdef...) or empty string for current user
     * @param transactionType one of enum MirrorNodeTransactionType or "CRYPTOTRANSFERTOKEN"
     * @param nextPage link to next page of transactions from previous request
     * @param transactionsLimit number of transactions to return. Speed of request depends on this value if transactionType is set.
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionsHistoryData}
     * @example
     * const transactions = await bladeSdk.getTransactions("0.0.10001");
     */
    async getTransactions(
        accountAddress: string,
        transactionType: string = "",
        nextPage: string,
        transactionsLimit: string = "10",
        completionKey?: string
    ): Promise<TransactionsHistoryData> {
        try {
            accountAddress = accountAddress || this.getUser().accountAddress;

            const accountService = this.chainContextRegistry.getContext<AccountServiceContext>(this.chain, ServiceContextTypes.AccountServiceContext);
            const result = await accountService.getTransactions(
                accountAddress,
                transactionType,
                nextPage,
                transactionsLimit
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get quotes from different services for buy, sell or swap
     * @param sourceCode name (HBAR, KARATE, other token code)
     * @param sourceAmount amount to swap, buy or sell
     * @param targetCode name (HBAR, KARATE, USDC, other token code)
     * @param strategy one of enum ExchangeStrategy (Buy, Sell, Swap)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SwapQuotesData}
     * @example
     * const quotes = await bladeSdk.exchangeGetQuotes("EUR", 100, "HBAR", ExchangeStrategy.BUY);
     */
    async exchangeGetQuotes(
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        strategy: ExchangeStrategy,
        completionKey?: string
    ): Promise<SwapQuotesData> {
        try {
            const result = await this.exchangeService.exchangeGetQuotes(
                this.chain,
                sourceCode,
                sourceAmount,
                targetCode,
                strategy
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get configured url to buy or sell tokens or fiat
     * @param strategy Buy / Sell
     * @param accountAddress account address (0.0.xxxxx or 0x123456789abcdef...) or empty string for current user
     * @param sourceCode name (HBAR, KARATE, USDC, other token code)
     * @param sourceAmount amount to buy/sell
     * @param targetCode name (HBAR, KARATE, USDC, other token code)
     * @param slippage slippage in percents. Transaction will revert if the price changes unfavorably by more than this percentage.
     * @param serviceId service id to use for swap (saucerswap, onmeta, etc)
     * @param redirectUrl url to redirect after final step
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {IntegrationUrlData}
     * @example
     * const {url} = await bladeSdk.getTradeUrl(ExchangeStrategy.BUY, "0.0.10001", "EUR", 50, "HBAR", 0.5, "saucerswapV2", redirectUrl);
     */
    async getTradeUrl(
        strategy: ExchangeStrategy,
        accountAddress: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string,
        redirectUrl: string,
        completionKey?: string
    ): Promise<IntegrationUrlData> {
        try {
            accountAddress = accountAddress || this.getUser().accountAddress;
            const result = await this.exchangeService.getTradeUrl(
                this.chain,
                strategy,
                accountAddress,
                sourceCode,
                sourceAmount,
                targetCode,
                slippage,
                serviceId,
                redirectUrl
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Swap tokens
     * @param sourceCode name (HBAR, KARATE, other token code)
     * @param sourceAmount amount to swap
     * @param targetCode name (HBAR, KARATE, other token code)
     * @param slippage slippage in percents. Transaction will revert if the price changes unfavorably by more than this percentage.
     * @param serviceId service id to use for swap (saucerswap, etc)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {ResultData}
     * @example
     * const result = await bladeSdk.swapTokens("HBAR", 1, "SAUCE", 0.5, "saucerswapV2");
     */
    async swapTokens(
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string,
        completionKey?: string
    ): Promise<ResultData> {
        try {
            const result = await this.exchangeService.swapTokens(
                this.chain,
                this.getUser().accountAddress,
                sourceCode,
                sourceAmount,
                targetCode,
                slippage,
                serviceId
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Create token (NFT or Fungible Token)
     * @param tokenName token name (string up to 100 bytes)
     * @param tokenSymbol token symbol (string up to 100 bytes)
     * @param isNft set token type NFT
     * @param keys token keys
     * @param decimals token decimals (0 for nft)
     * @param initialSupply token initial supply (0 for nft)
     * @param maxSupply token max supply
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {CreateTokenData}
     * @example
     * const keys: KeyRecord[] = [
     *     {type: KeyType.admin, privateKey: adminKey},
     *     {type: KeyType.wipe, privateKey: wipeKey},
     *     {type: KeyType.pause, privateKey: pauseKey},
     * ];
     * const result = await bladeSdk.createToken(
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
        tokenName: string,
        tokenSymbol: string,
        isNft: boolean,
        keys: KeyRecord[] | string,
        decimals: number,
        initialSupply: number,
        maxSupply: number = 250,
        completionKey?: string
    ): Promise<CreateTokenData> {
        try {
            const {accountAddress, publicKey} = this.getUser();

            const tokenService = this.chainContextRegistry.getContext<TokenServiceContext>(this.chain, ServiceContextTypes.TokenServiceContext);
            const result = await tokenService.createToken(
                tokenName,
                tokenSymbol,
                isNft,
                accountAddress,
                publicKey,
                keys,
                decimals,
                initialSupply,
                maxSupply
            );
            return this.sendMessageToNative(completionKey, result, null);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Associate token to hedera account. Association fee will be covered by PayMaster, if tokenId configured in dApp
     * @param tokenIdOrCampaign token id to associate. Empty to associate all tokens configured in dApp. Campaign name to associate on demand
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const result = await bladeSdk.associateToken("0.0.1337");
     * const result = await bladeSdk.associateToken("CampaignName");
     */
    async associateToken(tokenIdOrCampaign: string, completionKey?: string): Promise<TransactionReceiptData> {
        try {
            const tokenService = this.chainContextRegistry.getContext<TokenServiceContext>(this.chain, ServiceContextTypes.TokenServiceContext);
            const result = await tokenService.associateToken(tokenIdOrCampaign, this.getUser().accountAddress);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Mint one NFT
     *
     * @param tokenAddress token id to mint NFT
     * @param file image to mint (File or base64 DataUrl image, eg.: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAARUlEQVR42u3PMREAAAgEIO1fzU5vBlcPGtCVTD3QIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIXCyqyi6fIALs1AAAAAElFTkSuQmCC)
     * @param metadata NFT metadata (JSON object)
     * @param storageConfig {NFTStorageConfig} IPFS provider config
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     * @example
     * const receipt = await bladeSdk.nftMint(
     *     tokenId,
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
        tokenAddress: string,
        file: File | string,
        metadata: object,
        storageConfig: NFTStorageConfig,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const tokenService = this.chainContextRegistry.getContext<TokenServiceContext>(this.chain, ServiceContextTypes.TokenServiceContext);
            const result = await tokenService.nftMint(tokenAddress, file, metadata, storageConfig);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get FT or NFT token info
     * @param tokenAddress token address (0.0.xxxxx or 0x123456789abcdef...)
     * @param serial serial number in case of NFT token
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TokenInfoData}
     * @example
     * const tokenInfo = await bladeSdk.getTokenInfo("0.0.1234", "3");
     */
    async getTokenInfo(
        tokenAddress: string,
        serial: string = "",
        completionKey?: string
    ): Promise<TokenInfoData | null> {
        try {
            const token = await this.apiService.requestTokenInfo(tokenAddress);
            let nft: NftInfo | null = null;
            let metadata: NftMetadata | null = null;
            if (token.type === TokenType.NonFungibleUnique.toString() && serial) {
                nft = await this.apiService.getNftInfo(tokenAddress, serial);
                const ipfsGateway = await this.configService.getConfig("ipfsGateway");
                metadata = await this.apiService.getNftMetadataFromIpfs(
                    ipfsGateway,
                    Buffer.from(nft.metadata, "base64").toString()
                );
            }
            return this.sendMessageToNative(completionKey, {
                token,
                nft,
                metadata
            });
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    private getUser(): ActiveUser {
        if (!this.user || !this.user.signer) {
            throw new Error("No user, please call setUser() first");
        }
        return {
            signer: this.user.signer,
            accountAddress: this.user.accountAddress,
            provider: this.user.provider,
            privateKey: this.user.privateKey,
            publicKey: this.user.publicKey
        };
    }

    private getInfoData(): InfoData {
        return {
            apiKey: this.apiKey,
            dAppCode: this.dAppCode,
            isTestnet: ChainMap[this.chain].isTestnet,
            chain: this.chain,
            visitorId: this.visitorId,
            sdkEnvironment: this.sdkEnvironment,
            sdkVersion: this.sdkVersion,
            nonce: Math.round(Math.random() * 1000000000),
            user: {
                address: this.user?.accountAddress || "",
                accountProvider: this.user?.provider || null,
                privateKey: this.user?.privateKey || "",
                publicKey: this.user?.publicKey || ""
            }
        };
    }

    /**
     * Message that sends response back to native handler
     */
    private sendMessageToNative<T>(completionKey: string | undefined, data: T, error: unknown = null): T {
        let errorObj: Partial<CustomError> | null = null;
        if (error) {
            errorObj = {name: "Error"};

            if (error instanceof Error) {
                errorObj = {
                    ...error,
                    name: error.name,
                    reason: error.message
                };
            } else if (typeof error === "string") {
                errorObj.reason = error;
            } else if (typeof error === "object") {
                errorObj = {
                    ...error,
                    name: (error as CustomError).name || "Error",
                    reason:
                        (errorObj as CustomError).reason || (errorObj as CustomError).message || JSON.stringify(error)
                };
            } else {
                errorObj.reason = JSON.stringify(error);
            }
        }

        if (!this.webView || !completionKey) {
            if (errorObj) {
                throw errorObj;
            }
            return data;
        }

        // web-view bridge response
        const responseObject: BridgeResponse<T> = {
            completionKey: completionKey || "",
            data
        };
        if (error) {
            responseObject.error = errorObj;
        }

        // IOS or Android
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
        const bladeMessageHandler =
            (window as unknown as WebViewWindow)?.webkit?.messageHandlers?.bladeMessageHandler ||
            (window as unknown as WebViewWindow)?.bladeMessageHandler;
        if (bladeMessageHandler) {
            bladeMessageHandler.postMessage(JSON.stringify(responseObject));
        }

        // TODO: change this to match method signature return type
        // still same to make tests work
        // return "data: T", instead of wrapper "{data: T, error: Error}"
        return JSON.parse(JSON.stringify(responseObject)) as T;
    }
}
