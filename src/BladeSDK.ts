import {inject, injectable} from "inversify";
import "reflect-metadata";
import {Buffer} from "buffer";
import {Client, PrivateKey, Signer, TokenType} from "@hashgraph/sdk";
import {ethers} from "ethers";
import ApiService from "./services/ApiService";
import CryptoFlowService from "./services/CryptoFlowService";
import {HbarTokenId} from "./services/FeeService";
import ConfigService from "./services/ConfigService";
import AccountService from "./services/AccountService";
import {Network} from "./models/Networks";
import StringHelpers from "./helpers/StringHelpers";
import {CustomError} from "./models/Errors";
import {
    AccountInfoData,
    AccountPrivateData,
    AccountPrivateRecord,
    AccountProvider,
    BalanceData,
    BridgeResponse,
    CoinData,
    CoinInfoData,
    CoinInfoRaw,
    CoinListData,
    ContractCallQueryRecordsData,
    CreateAccountData,
    InfoData,
    IntegrationUrlData,
    KeyRecord,
    NFTStorageConfig,
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
    UserInfoData
} from "./models/Common";
import {ChainMap, ChainServiceStrategy, KnownChainIds} from "./models/Chain";
import config from "./config";
import {ParametersBuilder} from "./ParametersBuilder";
import {CryptoFlowServiceStrategy} from "./models/CryptoFlow";
import {NftInfo, NftMetadata, NodeInfo} from "./models/MirrorNode";
import * as FingerprintJS from "@fingerprintjs/fingerprintjs-pro";
import {File} from "nft.storage";
import {decrypt, encrypt} from "./helpers/SecurityHelper";
import {Magic, MagicSDKAdditionalConfiguration} from "magic-sdk";
import {HederaExtension} from "@magic-ext/hedera";
import {MagicSigner} from "./signers/magic/MagicSigner";
import {HederaProvider, HederaSigner} from "./signers/hedera";
import TokenServiceContext from "./strategies/TokenServiceContext";
import AccountServiceContext from "./strategies/AccountServiceContext";
import SignServiceContext from "./strategies/SignServiceContext";
import ContractServiceContext from "./strategies/ContractServiceContext";
import TradeServiceContext from "./strategies/TradeServiceContext";

@injectable()
export class BladeSDK {
    // todo update method annotations

    private apiKey: string = "";
    private network: Network = Network.Testnet;
    private chainId: KnownChainIds = KnownChainIds.HEDERA_TESTNET;
    private dAppCode: string = "";
    private visitorId: string = "";
    private sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod;
    private sdkVersion: string = config.sdkVersion;
    private readonly webView: boolean = false;
    private accountProvider: AccountProvider | null = null;
    private signer: Signer | ethers.Signer | null = null;
    private magic: any;
    private userAccountId: string = "";
    private userPublicKey: string = "";
    private userPrivateKey: string = "";

    /**
     * BladeSDK constructor.
     * @param accountService - instance of AccountService
     * @param configService - instance of ConfigService
     * @param apiService - instance of ApiService
     * @param accountServiceContext - instance of AccountServiceContext
     * @param tokenServiceContext - instance of TokenServiceContext
     * @param signServiceContext - instance of SignServiceContext
     * @param contractServiceContext - instance of ContractServiceContext
     * @param tradeServiceContext - instance of TradeServiceContext
     * @param cryptoFlowService - instance of CryptoFlowService
     * @param isWebView - true if you are using this SDK in webview of native app. It changes the way of communication with native app.
     */
    constructor(
        @inject("accountService") private readonly accountService: AccountService,
        @inject("configService") private readonly configService: ConfigService,
        @inject("apiService") private readonly apiService: ApiService,
        @inject("accountServiceContext") private readonly accountServiceContext: AccountServiceContext,
        @inject("tokenServiceContext") private readonly tokenServiceContext: TokenServiceContext,
        @inject("signServiceContext") private readonly signServiceContext: SignServiceContext,
        @inject("contractServiceContext") private readonly contractServiceContext: ContractServiceContext,
        @inject("tradeServiceContext") private readonly tradeServiceContext: TradeServiceContext,

        @inject("cryptoFlowService") private readonly cryptoFlowService: CryptoFlowService,
        @inject("isWebView") private readonly isWebView: boolean
    ) {
        this.webView = isWebView;
    }

    /**
     * Inits instance of BladeSDK for correct work with Blade API and other endpoints.
     * @param apiKey Unique key for API provided by Blade team.
     * @param chainId https://github.com/ethereum-lists/chains
     * @param dAppCode your dAppCode - request specific one by contacting us
     * @param visitorId client unique id. If not provided, SDK will try to get it using fingerprintjs-pro library
     * @param sdkEnvironment environment to choose BladeAPI server (Prod, CI)
     * @param sdkVersion used for header X-SDK-VERSION
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {InfoData} status: "success" or "error"
     */
    async init(
        apiKey: string,
        chainId: string | KnownChainIds,
        dAppCode: string,
        visitorId: string,
        sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod,
        sdkVersion: string = config.sdkVersion,
        completionKey?: string
    ): Promise<InfoData> {
        // TODO make service and variable values cleanup on init (in case of re-init)

        this.apiKey = apiKey;
        this.chainId = StringHelpers.stringToChainId(chainId);
        this.network = ChainMap[this.chainId].isTestnet ? Network.Testnet : Network.Mainnet;
        this.dAppCode = dAppCode;
        this.sdkEnvironment = sdkEnvironment;
        this.sdkVersion = sdkVersion;
        this.visitorId = visitorId;

        // TODO
        // set account on init
        // remove accountId and privateKey fields from methods

        this.apiService.initApiService(apiKey, dAppCode, sdkEnvironment, sdkVersion, this.chainId, visitorId);
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
                    apiKey: "key", // the valid key is passed on the backend side, and ".get()" does not require the key as well
                    scriptUrlPattern: `${this.apiService.getApiUrl(true)}/fpjs/<version>/<loaderVersion>`,
                    endpoint: [
                        await this.configService.getConfig(`fingerprintSubdomain`),
                        FingerprintJS.defaultEndpoint
                    ]
                };
                const fpPromise = await FingerprintJS.load(fpConfig);
                this.visitorId = (await fpPromise.get()).visitorId;
                localStorage.setItem(
                    "BladeSDK.visitorId",
                    await encrypt(`${this.visitorId}@${Date.now()}@${this.sdkEnvironment}`, this.apiKey)
                );
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.log("failed to get visitor id", error);
            }
        }
        this.apiService.setVisitorId(this.visitorId);
        this.accountServiceContext.init(this.chainId, null); // init without signer, to be able to create account
        this.tokenServiceContext.init(this.chainId, null); // init without signer, to be able to getBalance
        this.tradeServiceContext.init(this.chainId, null); // init without signer, to be able to get14Url

        return this.sendMessageToNative(completionKey, this.getInfoData());
    }

    /**
     * Returns information about initialized instance of BladeSDK.
     * @returns {InfoData}
     */
    async getInfo(completionKey?: string): Promise<InfoData> {
        return this.sendMessageToNative(completionKey, this.getInfoData());
    }

    async setUser(
        accountProvider: AccountProvider,
        accountIdOrEmail: string,
        privateKey?: string,
        completionKey?: string
    ): Promise<UserInfoData> {
        try {
            switch (accountProvider) {
                case AccountProvider.PrivateKey:
                    if (ChainMap[this.chainId].serviceStrategy === ChainServiceStrategy.Hedera) {
                        const key = PrivateKey.fromStringDer(privateKey!);
                        const client = ChainMap[this.chainId].isTestnet ? Client.forTestnet() : Client.forMainnet();
                        this.userAccountId = accountIdOrEmail;
                        this.userPrivateKey = privateKey!;
                        this.userPublicKey = key.publicKey.toStringDer();
                        const provider = new HederaProvider({client});
                        this.signer = new HederaSigner(this.userAccountId, key, provider);
                    } else if (ChainMap[this.chainId].serviceStrategy === ChainServiceStrategy.Ethereum) {
                        const key = PrivateKey.fromStringECDSA(privateKey!);
                        this.userPrivateKey = `0x${key.toStringRaw()}`;
                        this.userPublicKey = `0x${key.publicKey.toStringRaw()}`;

                        this.userAccountId = ethers.utils.computeAddress(this.userPublicKey);
                        const alchemyRpc = await this.configService.getConfig(`alchemy${this.network}RPC`);
                        const alchemyApiKey = await this.configService.getConfig(`alchemy${this.network}APIKey`);

                        const provider = new ethers.providers.JsonRpcProvider(alchemyRpc + alchemyApiKey);
                        this.signer = new ethers.Wallet(this.userPrivateKey, provider);
                    } else {
                        throw new Error("Unsupported chain");
                    }
                    break;
                case AccountProvider.Magic:
                    let userInfo;
                    if (!this.magic) {
                        await this.initMagic(this.chainId);
                    }

                    if (await this.magic?.user.isLoggedIn()) {
                        userInfo = await this.magic.user.getInfo();
                        if (userInfo.email !== accountIdOrEmail) {
                            this.magic.user.logout();
                            await this.magic.auth.loginWithMagicLink({email: accountIdOrEmail, showUI: false});
                            userInfo = await this.magic.user.getInfo();
                        }
                    } else {
                        await this.magic?.auth.loginWithMagicLink({email: accountIdOrEmail, showUI: false});
                        userInfo = await this.magic?.user.getInfo();
                    }

                    if (!(await this.magic?.user.isLoggedIn())) {
                        throw new Error("Not logged in Magic. Please call magicLogin() first");
                    }

                    this.userAccountId = userInfo.publicAddress;
                    if (ChainMap[this.chainId].serviceStrategy === ChainServiceStrategy.Hedera) {
                        const {publicKeyDer} = await this.magic.hedera.getPublicKey();
                        this.userPublicKey = publicKeyDer;
                        const magicSign = (message: any) => this.magic.hedera.sign(message);
                        this.signer = new MagicSigner(this.userAccountId, this.network, publicKeyDer, magicSign);
                    } else if (ChainMap[this.chainId].serviceStrategy === ChainServiceStrategy.Ethereum) {
                        const provider = new ethers.providers.Web3Provider(this.magic.rpcProvider);
                        this.signer = provider.getSigner();
                        // TODO check how to get public key from magic
                        this.userPublicKey = "";
                    }
                    break;
                default:
                    break;
            }
            this.tokenServiceContext.init(this.chainId, this.signer!);
            this.accountServiceContext.init(this.chainId, this.signer!);
            this.signServiceContext.init(this.chainId, this.signer!);
            this.contractServiceContext.init(this.chainId, this.signer!);
            this.tradeServiceContext.init(this.chainId, this.signer!);
            this.accountProvider = accountProvider;

            return this.sendMessageToNative(completionKey, {
                accountId: this.userAccountId,
                accountProvider: this.accountProvider,
                userPrivateKey: this.userPrivateKey,
                userPublicKey: this.userPublicKey
            });
        } catch (error: any) {
            this.userAccountId = "";
            this.userPrivateKey = "";
            this.userPublicKey = "";
            this.signer = null;
            this.magic = null;
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    async resetUser(completionKey?: string): Promise<{success: boolean}> {
        try {
            this.userPublicKey = "";
            this.userPrivateKey = "";
            this.userAccountId = "";
            this.signer = null;
            if (this.accountProvider === AccountProvider.Magic) {
                if (!this.magic) {
                    await this.initMagic(this.chainId);
                }
                await this.magic.user.logout();
            }
            this.accountProvider = null;

            return this.sendMessageToNative(completionKey, {
                success: true
            });
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get balance and token balances for specific account.
     * @param accountAddress Hedera account id (0.0.xxxxx) or Ethereum address (0x...) or empty string to use current user account
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {BalanceData} hbars: number, tokens: [{tokenId: string, balance: number}]
     */
    async getBalance(accountAddress: string, completionKey?: string): Promise<BalanceData> {
        try {
            if (!accountAddress) {
                accountAddress = this.getUser().accountId;
            }
            return this.sendMessageToNative(completionKey, await this.tokenServiceContext.getBalance(accountAddress));
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Send HBAR/ETH to specific account.
     * @param receiverAddress receiver account id (0.0.xxxxx)
     * @param amount of hbars to send (decimal number)
     * @param memo transaction memo
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns Promise<TransactionResponseData>
     */
    async transferBalance(
        receiverAddress: string,
        amount: string,
        memo: string,
        completionKey?: string
    ): Promise<TransactionResponseData> {
        try {
            const result = await this.tokenServiceContext.transferBalance({
                from: this.userAccountId,
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
     * Send token to specific account.
     * @param tokenAddress token id to send (0.0.xxxxx or 0x123456789abcdef...)
     * @param receiverAddress receiver account address (0.0.xxxxx or 0x123456789abcdef...)
     * @param amountOrSerial amount of fungible tokens to send (with token-decimals correction) on NFT serial number. (e.g. amount 0.01337 when token decimals 8 will send 1337000 units of token)
     * @param memo transaction memo
     * @param freeTransfer if true, Blade will pay fee transaction. Only for single dApp configured fungible-token. In that case tokenId not used
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns Promise<TransactionResponseData>
     */
    async transferTokens(
        tokenAddress: string,
        receiverAddress: string,
        amountOrSerial: string,
        memo: string,
        freeTransfer: boolean = false,
        completionKey?: string
    ): Promise<TransactionResponseData> {
        try {
            // TODO send NFT for Ethereum tokens
            const result = await this.tokenServiceContext.transferToken({
                from: this.userAccountId,
                to: receiverAddress,
                amountOrSerial,
                tokenAddress,
                memo,
                freeTransfer
            });
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

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
     * Call contract function. Directly or via Blade Payer account (fee will be paid by Blade), depending on your dApp configuration.
     * @param contractId - contract id (0.0.xxxxx)
     * @param functionName - name of the contract function to call
     * @param paramsEncoded - function argument. Can be generated with {@link ParametersBuilder} object
     * @param gas - gas limit for the transaction
     * @param bladePayFee - if true, fee will be paid by Blade (note: msg.sender inside the contract will be Blade Payer account)
     * @param completionKey - optional field bridge between mobile webViews and native apps
     * @returns {Partial<TransactionReceipt>}
     */
    async contractCallFunction(
        contractId: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number = 100000,
        bladePayFee: boolean = false,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const result = await this.contractServiceContext.contractCallFunction(
                contractId,
                functionName,
                paramsEncoded,
                gas,
                bladePayFee
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Call query on contract function. Similar to {@link contractCallFunction} can be called directly or via Blade Payer account.
     * @param contractId - contract id (0.0.xxxxx)
     * @param functionName - name of the contract function to call
     * @param paramsEncoded - function argument. Can be generated with {@link ParametersBuilder} object
     * @param gas - gas limit for the transaction
     * @param bladePayFee - if true, fee will be paid by Blade (note: msg.sender inside the contract will be Blade Payer account)
     * @param resultTypes - array of result types. Currently supported only plain data types
     * @param completionKey - optional field bridge between mobile webViews and native apps
     * @returns {ContractCallQueryRecordsData}
     */
    async contractCallQueryFunction(
        contractId: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number = 100000,
        bladePayFee: boolean = false,
        resultTypes: string[],
        completionKey?: string
    ): Promise<ContractCallQueryRecordsData> {
        try {
            const result = await this.contractServiceContext.contractCallQueryFunction(
                contractId,
                functionName,
                paramsEncoded,
                gas,
                bladePayFee,
                resultTypes
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Create scheduled transaction
     * @param accountId account id (0.0.xxxxx)
     * @param accountPrivateKey optional field if you need specify account key (hex encoded privateKey with DER-prefix)
     * @param type schedule transaction type (currently only TRANSFER supported)
     * @param transfers array of transfers to schedule (HBAR, FT, NFT)
     * @param freeSchedule if true, Blade will pay transaction fee (also dApp had to be configured for free schedules)
     * @param completionKey optional field bridge between mobile webViews and native apps
     */
    async createScheduleTransaction(
        freeSchedule: boolean = false,
        type: ScheduleTransactionType,
        transfers: ScheduleTransactionTransfer[],
        completionKey?: string
    ): Promise<{scheduleId: string}> {
        try {
            const result = await this.signServiceContext.createScheduleTransaction(freeSchedule, type, transfers);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign scheduled transaction
     * @param scheduleId scheduled transaction id (0.0.xxxxx)
     * @param accountId account id (0.0.xxxxx)
     * @param accountPrivateKey optional field if you need specify account key (hex encoded privateKey with DER-prefix)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignMessageData}
     */
    async signScheduleId(
        scheduleId: string,
        freeSchedule: boolean = false,
        receiverAccountId?: string,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const result = await this.signServiceContext.signScheduleId(scheduleId, freeSchedule, receiverAccountId);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Create Hedera account (ECDSA). Only for configured dApps. Depending on dApp config Blade create account, associate tokens, etc.
     * In case of not using pre-created accounts pool and network high load, this method can return transactionId and no accountId.
     * In that case account creation added to queue, and you should wait some time and call `getPendingAccount()` method.
     * @param privateKey optional field if you need specify account key (hex encoded privateKey with DER-prefix)
     * @param deviceId optional field for headers for backend check
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {CreateAccountData}
     */
    async createAccount(privateKey?: string, deviceId?: string, completionKey?: string): Promise<CreateAccountData> {
        try {
            const result = await this.accountServiceContext.createAccount(privateKey, deviceId);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
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
     */
    async getPendingAccount(
        transactionId: string,
        mnemonic: string,
        completionKey?: string
    ): Promise<CreateAccountData> {
        try {
            const result = await this.accountServiceContext.getPendingAccount(transactionId, mnemonic);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Delete Hedera account
     * @param deleteAccountId account id of account to delete (0.0.xxxxx)
     * @param deletePrivateKey account private key (DER encoded hex string)
     * @param transferAccountId if any funds left on account, they will be transferred to this account (0.0.xxxxx)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     */
    async deleteAccount(
        deleteAccountId: string,
        deletePrivateKey: string,
        transferAccountId: string,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const result = await this.accountServiceContext.deleteAccount(
                deleteAccountId,
                deletePrivateKey,
                transferAccountId
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
     * @param accountId Hedera account id (0.0.xxxxx)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {AccountInfoData}
     */
    async getAccountInfo(accountId: string, completionKey?: string): Promise<AccountInfoData> {
        try {
            if (!accountId) {
                accountId = this.userAccountId;
            }
            const result = await this.accountServiceContext.getAccountInfo(accountId);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    // TODO move to BladeSDK.utils.getNodeList
    /**
     * Get Node list
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {nodes: NodeList[]}
     */
    async getNodeList(completionKey?: string): Promise<{nodes: NodeInfo[]}> {
        try {
            const result = await this.accountServiceContext.getNodeList();
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Stake/unstake account
     * @param nodeId node id to stake to. If negative or null, account will be unstaked
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionReceiptData}
     */
    async stakeToNode(nodeId: number, completionKey?: string): Promise<TransactionReceiptData> {
        try {
            const result = await this.accountServiceContext.stakeToNode(this.userAccountId, nodeId);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * @deprecated Will be removed in version 0.7, switch to `searchAccounts` method
     * Get ECDSA private key from mnemonic. Also try to find accountIds based on public key if lookupNames is true.
     * Returned keys with DER header.
     * EvmAddress computed from Public key.
     * @param mnemonicRaw BIP39 mnemonic
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {AccountPrivateData}
     */
    async getKeysFromMnemonic(mnemonicRaw: string, completionKey?: string): Promise<AccountPrivateData> {
        try {
            const result = await this.accountServiceContext.getKeysFromMnemonic(mnemonicRaw);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    // TODO implement `searchAccounts` method
    /**
     * Get accounts list and keys from private key or mnemonic
     * Returned keys with DER header.
     * EvmAddress computed from ECDSA Public key.
     * @param keyOrMnemonic BIP39 mnemonic, private key with DER header
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {AccountPrivateData}
    */

    async searchAccounts(keyOrMnemonic: string, completionKey?: string): Promise<AccountPrivateData> {
        try {
            const accounts: AccountPrivateRecord[] = [];
            if (keyOrMnemonic.trim().split(" ").length > 1) {
                // mnemonic
                accounts.push(...(await this.accountService.getAccountsFromMnemonic(keyOrMnemonic, this.network)));
            } else {
                accounts.push(...(await this.accountService.getAccountsFromPrivateKey(keyOrMnemonic, this.network)));
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
     * @param secretNonce configured for dApp. Should be kept in secret
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TokenDropData}
     */
    async dropTokens(accountId: string, secretNonce: string, completionKey?: string): Promise<TokenDropData> {
        try {
            const result = await this.tokenServiceContext.dropTokens(
                accountId,
                secretNonce,
                this.dAppCode,
                this.visitorId
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign base64-encoded message with private key. Returns hex-encoded signature.
     * @param encodedMessage encoded message to sign
     * @param encoding one of the supported encodings (hex/base64/utf8)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignMessageData}
     */
    async sign(encodedMessage: string, encoding: SupportedEncoding, completionKey?: string): Promise<SignMessageData> {
        try {
            const result = await this.signServiceContext.sign(encodedMessage, encoding);
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
     */
    async verify(
        encodedMessage: string,
        encoding: SupportedEncoding,
        signature: string,
        addressOrPublicKey: string,
        completionKey?: string
    ): Promise<SignVerifyMessageData> {
        try {
            if (!addressOrPublicKey) {
                addressOrPublicKey = this.getUser().publicKey;
            }
            const result = await this.signServiceContext.verify(
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

    // TODO check if method `ethersSign` is needed

    /**
     * Split signature to v-r-s format.
     * @param signature hex-encoded signature
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SplitSignatureData}
     */
    async splitSignature(signature: string, completionKey?: string): Promise<SplitSignatureData> {
        try {
            return this.sendMessageToNative(completionKey, await this.signServiceContext.splitSignature(signature));
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get v-r-s signature of contract function params
     * @param paramsEncoded - data to sign. Can be string or ParametersBuilder
     * @param privateKey - signer private key (hex-encoded with DER header)
     * @param completionKey - optional field bridge between mobile webViews and native apps
     * @returns {SplitSignatureData}
     */
    async getParamsSignature(
        paramsEncoded: string | ParametersBuilder,
        privateKey: string,
        completionKey?: string
    ): Promise<SplitSignatureData> {
        try {
            const result = await this.signServiceContext.getParamsSignature(paramsEncoded, privateKey);
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
     * @param accountAddress account id to get transactions for (0.0.xxxxx)
     * @param transactionType one of enum MirrorNodeTransactionType or "CRYPTOTRANSFERTOKEN"
     * @param nextPage link to next page of transactions from previous request
     * @param transactionsLimit number of transactions to return. Speed of request depends on this value if transactionType is set.
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionsHistoryData}
     */
    async getTransactions(
        accountAddress: string,
        transactionType: string = "",
        nextPage: string,
        transactionsLimit: string = "10",
        completionKey?: string
    ): Promise<TransactionsHistoryData> {
        try {
            if (!accountAddress) {
                accountAddress = this.userAccountId;
            }
            const result = await this.accountServiceContext.getTransactions(
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

    // TODO migrate to `getTradeUrl` method
    /**
     * Get configured url for C14 integration (iframe or popup)
     * @param asset name (USDC or HBAR)
     * @param account receiver account id (0.0.xxxxx)
     * @param amount preset amount. May be overwritten if out of range (min/max)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {IntegrationUrlData}
     */
    async getC14url(
        asset: string,
        account: string,
        amount: string,
        completionKey?: string
    ): Promise<IntegrationUrlData> {
        try {
            const result = await this.tradeServiceContext.getC14url(asset, account, amount);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get swap quotes from different services
     * @param sourceCode name (HBAR, KARATE, other token code)
     * @param sourceAmount amount to swap, buy or sell
     * @param targetCode name (HBAR, KARATE, USDC, other token code)
     * @param strategy one of enum CryptoFlowServiceStrategy (Buy, Sell, Swap)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SwapQuotesData}
     */
    async exchangeGetQuotes(
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        strategy: CryptoFlowServiceStrategy,
        completionKey?: string
    ): Promise<SwapQuotesData> {
        try {
            const result = await this.tradeServiceContext.exchangeGetQuotes(
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
     * Swap tokens
     * @param sourceCode name (HBAR, KARATE, other token code)
     * @param sourceAmount amount to swap
     * @param targetCode name (HBAR, KARATE, other token code)
     * @param slippage slippage in percents. Transaction will revert if the price changes unfavorably by more than this percentage.
     * @param serviceId service id to use for swap (saucerswap, etc)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {success: boolean}
     */
    async swapTokens(
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: number,
        serviceId: string,
        completionKey?: string
    ): Promise<{success: boolean}> {
        try {
            const result = await this.tradeServiceContext.swapTokens(
                this.userAccountId,
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
     * Get configured url to buy or sell tokens or fiat
     * @param strategy Buy / Sell
     * @param accountId account id
     * @param sourceCode name (HBAR, KARATE, USDC, other token code)
     * @param sourceAmount amount to buy/sell
     * @param targetCode name (HBAR, KARATE, USDC, other token code)
     * @param slippage slippage in percents. Transaction will revert if the price changes unfavorably by more than this percentage.
     * @param serviceId service id to use for swap (saucerswap, onmeta, etc)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {IntegrationUrlData}
     */
    async getTradeUrl(
        strategy: CryptoFlowServiceStrategy,
        accountId: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: number,
        serviceId: string,
        completionKey?: string
    ): Promise<IntegrationUrlData> {
        try {
            const result = await this.tradeServiceContext.getTradeUrl(
                strategy,
                accountId,
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
     * @returns {tokenId: string}
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
    ): Promise<{tokenId: string}> {
        try {
            const result = await this.tokenServiceContext.createToken(
                tokenName,
                tokenSymbol,
                isNft,
                this.userAccountId,
                this.userPublicKey,
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
     * Associate token to account
     *
     * @param tokenId token id
     * @param completionKey optional field bridge between mobile webViews and native apps
     */
    async associateToken(tokenId: string, completionKey?: string): Promise<TransactionReceiptData> {
        try {
            const result = await this.tokenServiceContext.associateToken(tokenId, this.userAccountId!);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Mint one NFT
     *
     * @param tokenId token id to mint NFT
     * @param file image to mint (File or base64 DataUrl image, eg.: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAA...)
     * @param metadata NFT metadata (JSON object)
     * @param storageConfig {NFTStorageConfig} IPFS provider config
     * @param completionKey optional field bridge between mobile webViews and native apps
     */
    async nftMint(
        tokenId: string,
        file: File | string,
        metadata: object,
        storageConfig: NFTStorageConfig,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const result = await this.tokenServiceContext.nftMint(tokenId, file, metadata, storageConfig);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    async getTokenInfo(tokenId: string, serial: string = "", completionKey?: string): Promise<TokenInfoData | null> {
        try {
            const token = await this.apiService.requestTokenInfo(tokenId);
            let nft: NftInfo | null = null;
            let metadata: NftMetadata | null = null;
            if (token.type === TokenType.NonFungibleUnique.toString() && serial) {
                nft = await this.apiService.getNftInfo(tokenId, serial);
                metadata = await this.apiService.getNftMetadataFromIpfs(Buffer.from(nft.metadata, "base64").toString());
            }
            return this.sendMessageToNative(completionKey, {
                token,
                nft,
                metadata
            });
        } catch (error) {
            return this.sendMessageToNative(completionKey, null, error);
        }
    }

    private async initMagic(chainId: KnownChainIds) {
        const options: MagicSDKAdditionalConfiguration = {};
        if (ChainMap[chainId].serviceStrategy === ChainServiceStrategy.Hedera) {
            options.extensions = [
                new HederaExtension({
                    network: this.network.toLowerCase()
                })
            ];
        } else if (ChainMap[chainId].serviceStrategy === ChainServiceStrategy.Ethereum) {
            options.network = StringHelpers.networkToEthereum(this.network);
        }
        this.magic = new Magic(await this.configService.getConfig(`magicLinkPublicKey`), options);
    }

    private getUser(): {signer: Signer | ethers.Signer; accountId: string; privateKey: string; publicKey: string} {
        if (!this.signer) {
            throw new Error("No user, please call setUser() first");
        }
        return {
            signer: this.signer,
            accountId: this.userAccountId,
            privateKey: this.userPrivateKey,
            publicKey: this.userPublicKey
        };
    }

    private getInfoData(): InfoData {
        return {
            apiKey: this.apiKey,
            dAppCode: this.dAppCode,
            network: this.network,
            chainId: this.chainId,
            visitorId: this.visitorId,
            sdkEnvironment: this.sdkEnvironment,
            sdkVersion: this.sdkVersion,
            nonce: Math.round(Math.random() * 1000000000),
            user: {
                accountId: this.userAccountId,
                accountProvider: this.accountProvider,
                userPrivateKey: this.userPrivateKey,
                userPublicKey: this.userPublicKey
            }
        };
    }

    /**
     * Message that sends response back to native handler
     */
    private sendMessageToNative<T>(
        completionKey: string | undefined,
        data: T,
        error: Partial<CustomError> | null = null
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
            data
        };
        if (error) {
            responseObject.error = {
                name: error?.name || "Error",
                reason: error.reason || error.message || JSON.stringify(error)
            };
        }

        // @ts-ignore  // IOS or Android
        const bladeMessageHandler = window?.webkit?.messageHandlers?.bladeMessageHandler || window?.bladeMessageHandler;
        if (bladeMessageHandler) {
            bladeMessageHandler.postMessage(JSON.stringify(responseObject));
        }

        // TODO: change this to match method signature return type
        // return "data: T", instead of wrapper "{data: T, error: Error}"
        return JSON.parse(JSON.stringify(responseObject));
    }
}
