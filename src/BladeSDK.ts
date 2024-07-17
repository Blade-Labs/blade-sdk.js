import {inject, injectable} from "inversify";
import "reflect-metadata";
import {Buffer} from "buffer";
import {Signer, TokenType} from "@hashgraph/sdk";
import {ethers} from "ethers";
import ApiService from "./services/ApiService";
import {HbarTokenId} from "./services/FeeService";
import ConfigService from "./services/ConfigService";
import AuthService from "./services/AuthService";
import {Network} from "./models/Networks";
import StringHelpers from "./helpers/StringHelpers";
import {CustomError} from "./models/Errors";
import {
    AccountInfoData,
    AccountPrivateData,
    AccountProvider, ActiveUser,
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
    UserInfoData, WebViewWindow
} from "./models/Common";
import {ChainMap, KnownChainIds} from "./models/Chain";
import config from "./config";
import {ParametersBuilder} from "./ParametersBuilder";
import {CryptoFlowServiceStrategy} from "./models/CryptoFlow";
import {NftInfo, NftMetadata, NodeInfo} from "./models/MirrorNode";
import {File} from "nft.storage";
import TokenServiceContext from "./strategies/TokenServiceContext";
import AccountServiceContext from "./strategies/AccountServiceContext";
import SignServiceContext from "./strategies/SignServiceContext";
import ContractServiceContext from "./strategies/ContractServiceContext";
import TradeService from "./services/TradeService";

@injectable()
export class BladeSDK {
    // todo update method annotations

    private apiKey: string = "";
    private chainId: KnownChainIds = KnownChainIds.HEDERA_TESTNET;
    private dAppCode: string = "";
    private visitorId: string = "";
    private sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod;
    private sdkVersion: string = config.sdkVersion;
    private readonly webView: boolean = false;
    private user: ActiveUser | null = null;

    /**
     * BladeSDK constructor.
     * @param configService - instance of ConfigService
     * @param apiService - instance of ApiService
     * @param authService - instance of AuthService
     * @param accountServiceContext - instance of AccountServiceContext
     * @param tokenServiceContext - instance of TokenServiceContext
     * @param signServiceContext - instance of SignServiceContext
     * @param contractServiceContext - instance of ContractServiceContext
     * @param TradeService - instance of TradeService
     * @param isWebView - true if you are using this SDK in webview of native app. It changes the way of communication with native app.
     */
    constructor(
        @inject("configService") private readonly configService: ConfigService,
        @inject("apiService") private readonly apiService: ApiService,
        @inject("authService") private readonly authService: AuthService,
        @inject("accountServiceContext") private readonly accountServiceContext: AccountServiceContext,
        @inject("tokenServiceContext") private readonly tokenServiceContext: TokenServiceContext,
        @inject("signServiceContext") private readonly signServiceContext: SignServiceContext,
        @inject("contractServiceContext") private readonly contractServiceContext: ContractServiceContext,
        @inject("tradeService") private readonly tradeService: TradeService,
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
        this.dAppCode = dAppCode;
        this.sdkEnvironment = sdkEnvironment;
        this.sdkVersion = sdkVersion;
        this.visitorId = visitorId;

        this.apiService.initApiService(apiKey, dAppCode, sdkEnvironment, sdkVersion, this.chainId, visitorId);
        this.visitorId = await this.authService.getVisitorId(this.visitorId, this.apiKey, this.sdkEnvironment);
        this.accountServiceContext.init(this.chainId, null); // init without signer, to be able to create account
        this.tokenServiceContext.init(this.chainId, null); // init without signer, to be able to getBalance

        return this.sendMessageToNative(completionKey, this.getInfoData());
    }

    /**
     * Returns information about initialized instance of BladeSDK.
     * @returns {InfoData}
     */
    getInfo(completionKey?: string): InfoData {
        return this.sendMessageToNative(completionKey, this.getInfoData());
    }

    async setUser(
        accountProvider: AccountProvider,
        accountIdOrEmail: string,
        privateKey?: string,
        completionKey?: string
    ): Promise<UserInfoData> {
        try {
            this.user = await this.authService.setUser(this.chainId, accountProvider, accountIdOrEmail, privateKey);

            this.tokenServiceContext.init(this.chainId, this.user.signer);
            this.accountServiceContext.init(this.chainId, this.user.signer);
            this.signServiceContext.init(this.chainId, this.user.signer, this.user.publicKey);
            this.contractServiceContext.init(this.chainId, this.user.signer);

            return this.sendMessageToNative(completionKey, {
                accountId: this.user.accountId,
                accountProvider: this.user.provider,
                userPrivateKey: this.user.privateKey,
                userPublicKey: this.user.publicKey
            });
        } catch (error: any) {
            this.user = null;
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    async resetUser(completionKey?: string): Promise<{success: boolean}> {
        try {
            this.user = await this.authService.resetUser();

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
                from: this.getUser().accountId,
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
     * @param usePaymaster if true, Paymaster account will pay fee transaction. Only for single dApp configured fungible-token. In that case tokenId not used
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns Promise<TransactionResponseData>
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
            const result = await this.tokenServiceContext.transferToken({
                from: this.getUser().accountId,
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
     * @param usePaymaster - if true, fee will be paid by Paymaster account (note: msg.sender inside the contract will be Paymaster account)
     * @param completionKey - optional field bridge between mobile webViews and native apps
     * @returns {Partial<TransactionReceipt>}
     */
    async contractCallFunction(
        contractId: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number = 100000,
        usePaymaster: boolean = false,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const result = await this.contractServiceContext.contractCallFunction(
                contractId,
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
     * Call query on contract function. Similar to {@link contractCallFunction} can be called directly or via Blade Payer account.
     * @param contractId contract id (0.0.xxxxx)
     * @param functionName name of the contract function to call
     * @param paramsEncoded function argument. Can be generated with {@link ParametersBuilder} object
     * @param gas gas limit for the transaction
     * @param usePaymaster if true, the fee will be paid by paymaster account (note: msg.sender inside the contract will be Paymaster account)
     * @param resultTypes array of result types. Currently supported only plain data types
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {ContractCallQueryRecordsData}
     */
    async contractCallQueryFunction(
        contractId: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number = 100000,
        usePaymaster: boolean = false,
        resultTypes: string[],
        completionKey?: string
    ): Promise<ContractCallQueryRecordsData> {
        try {
            const result = await this.contractServiceContext.contractCallQueryFunction(
                contractId,
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
     */
    async createScheduleTransaction(
        type: ScheduleTransactionType,
        transfers: ScheduleTransactionTransfer[],
        usePaymaster: boolean = false,
        completionKey?: string
    ): Promise<{scheduleId: string}> {
        try {
            const result = await this.signServiceContext.createScheduleTransaction(type, transfers, usePaymaster);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign scheduled transaction
     * @param scheduleId scheduled transaction id (0.0.xxxxx)
     * @param receiverAccountId account id of receiver for additional validation in case of dApp freeSchedule transactions configured
     * @param usePaymaster if true, Paymaster account will pay transaction fee (also dApp had to be configured for free schedules)
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignMessageData}
     */
    async signScheduleId(
        scheduleId: string,
        receiverAccountId?: string,
        usePaymaster?: boolean,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const result = await this.signServiceContext.signScheduleId(scheduleId, receiverAccountId || "", !!usePaymaster);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Create Hedera account (ECDSA). Only for configured dApps. Depending on dApp config Blade create account, associate tokens, etc.
     * In case of not using pre-created accounts pool and network high load, this method can return transactionId and no accountId.
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
            accountId = accountId || this.getUser().accountId;

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
            const result = await this.accountServiceContext.stakeToNode(this.getUser().accountId, nodeId);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

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
            const result = await this.accountServiceContext.searchAccounts(keyOrMnemonic);
            return this.sendMessageToNative(completionKey, result);
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
                secretNonce
            );
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign base64-encoded message with private key. Returns hex-encoded signature.
     * @param encodedMessage encoded message to sign
     * @param encoding one of the supported encodings (hex/base64/utf8)
     * @param likeEthers to get signature in ethers format. Works only for ECDSA keys. Ignored on chains other than Hedera
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignMessageData}
     */
    async sign(encodedMessage: string, encoding: SupportedEncoding, likeEthers: boolean, completionKey?: string): Promise<SignMessageData> {
        try {
            const result = await this.signServiceContext.sign(encodedMessage, encoding, likeEthers);
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
            addressOrPublicKey = addressOrPublicKey || this.getUser().publicKey;

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
     * @param completionKey - optional field bridge between mobile webViews and native apps
     * @returns {SplitSignatureData}
     */
    async getParamsSignature(
        paramsEncoded: string | ParametersBuilder,
        completionKey?: string
    ): Promise<SplitSignatureData> {
        try {
            const result = await this.signServiceContext.getParamsSignature(paramsEncoded);
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
            accountAddress = accountAddress || this.getUser().accountId;

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
            const result = await this.tradeService.exchangeGetQuotes(
                this.chainId,
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
        slippage: string,
        serviceId: string,
        completionKey?: string
    ): Promise<{success: boolean}> {
        try {
            const result = await this.tradeService.swapTokens(
                this.chainId,
                this.getUser().accountId,
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
     * @param redirectUrl url to redirect after final step
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {IntegrationUrlData}
     */
    async getTradeUrl(
        strategy: CryptoFlowServiceStrategy,
        accountId: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string,
        redirectUrl: string,
        completionKey?: string
    ): Promise<IntegrationUrlData> {
        try {
            const result = await this.tradeService.getTradeUrl(
                this.chainId,
                strategy,
                accountId,
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
            const {accountId, publicKey} = this.getUser();

            const result = await this.tokenServiceContext.createToken(
                tokenName,
                tokenSymbol,
                isNft,
                accountId,
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
     * Associate token to account
     *
     * @param tokenId token id
     * @param completionKey optional field bridge between mobile webViews and native apps
     */
    async associateToken(tokenId: string, completionKey?: string): Promise<TransactionReceiptData> {
        try {
            const result = await this.tokenServiceContext.associateToken(tokenId, this.getUser().accountId);
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
                const ipfsGateway = await this.configService.getConfig("ipfsGateway")
                metadata = await this.apiService.getNftMetadataFromIpfs(ipfsGateway, Buffer.from(nft.metadata, "base64").toString());
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

    private getUser(): {signer: Signer | ethers.Signer; accountId: string; privateKey: string; publicKey: string} {
        if (!this.user || !this.user.signer) {
            throw new Error("No user, please call setUser() first");
        }
        return {
            signer: this.user.signer,
            accountId: this.user.accountId,
            privateKey: this.user.privateKey,
            publicKey: this.user.publicKey
        };
    }

    private getInfoData(): InfoData {
        return {
            apiKey: this.apiKey,
            dAppCode: this.dAppCode,
            network: ChainMap[this.chainId].isTestnet ? Network.Testnet : Network.Mainnet,
            chainId: this.chainId,
            visitorId: this.visitorId,
            sdkEnvironment: this.sdkEnvironment,
            sdkVersion: this.sdkVersion,
            nonce: Math.round(Math.random() * 1000000000),
            user: {
                accountId: this.user?.accountId || "",
                accountProvider: this.user?.provider || null,
                userPrivateKey: this.user?.privateKey || "",
                userPublicKey: this.user?.publicKey || ""
            }
        };
    }

    /**
     * Message that sends response back to native handler
     */
    private sendMessageToNative<T>(
        completionKey: string | undefined,
        data: T,
        error: unknown = null
    ): T {
        let errorObj: Partial<CustomError> | null = null;
        if (error) {
            errorObj = {name: "Error"}

            if (error instanceof Error) {
                errorObj = {
                    ...error,
                    name: error.name,
                    reason: error.message,
                };
            } else if (typeof error === "string") {
                errorObj.reason = error;
            } else if (typeof error === "object") {
                errorObj = {
                    ...error,
                    name: (error as CustomError).name || "Error",
                    reason: (errorObj as CustomError).reason || (errorObj as CustomError).message || JSON.stringify(error)
                };
            } else {
                errorObj.reason = JSON.stringify(error)
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
        const bladeMessageHandler = (window as unknown as WebViewWindow)?.webkit?.messageHandlers?.bladeMessageHandler || (window as unknown as WebViewWindow)?.bladeMessageHandler;
        if (bladeMessageHandler) {
            bladeMessageHandler.postMessage(JSON.stringify(responseObject));
        }

        // TODO: change this to match method signature return type
        // still same to make tests work
        // return "data: T", instead of wrapper "{data: T, error: Error}"
        return JSON.parse(JSON.stringify(responseObject)) as T;
    }
}
