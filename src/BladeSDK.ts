import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import {
    Client,
    PrivateKey,
    Signer,
    TransactionReceipt,
} from "@hashgraph/sdk";
import {ethers} from "ethers";
import ApiService from "./services/ApiService";
import CryptoFlowService from "./services/CryptoFlowService";
import {HbarTokenId} from "./services/FeeService";
import ConfigService from "./services/ConfigService";
import {Network} from "./models/Networks";
import StringHelpers from "./helpers/StringHelpers";
import {CustomError} from "./models/Errors";
import {
    AccountInfoData,
    AccountProvider,
    BalanceData,
    BridgeResponse,
    ChainType,
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
    PrivateKeyData,
    SdkEnvironment,
    SignMessageData,
    SignVerifyMessageData,
    SplitSignatureData,
    SwapQuotesData,
    TransactionReceiptData, TransactionResponseData,
    TransactionsHistoryData,
    UserInfoData
} from "./models/Common";
import config from "./config";
import {ParametersBuilder} from "./ParametersBuilder";
import {CryptoFlowServiceStrategy} from "./models/CryptoFlow";
import {NodeInfo} from "./models/MirrorNode";
import * as FingerprintJS from '@fingerprintjs/fingerprintjs-pro'
import {File} from 'nft.storage';
import {decrypt, encrypt} from "./helpers/SecurityHelper";
import {Magic, MagicSDKAdditionalConfiguration} from 'magic-sdk';
import {HederaExtension} from '@magic-ext/hedera';
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
    private chainType: ChainType = ChainType.Hedera;
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
     * @param configService - instance of ConfigService
     * @param apiService - instance of ApiService
     * @param accountService - instance of AccountServiceContext
     * @param tokenService - instance of TokenServiceContext
     * @param signService - instance of SignServiceContext
     * @param contractService - instance of ContractServiceContext
     * @param tradeService - instance of TradeServiceContext
     * @param cryptoFlowService - instance of CryptoFlowService
     * @param isWebView - true if you are using this SDK in webview of native app. It changes the way of communication with native app.
     */
    constructor(
        @inject('configService') private readonly configService: ConfigService,
        @inject('apiService') private readonly apiService: ApiService,
        @inject('accountService') private readonly accountService: AccountServiceContext,
        @inject('tokenService') private readonly tokenService: TokenServiceContext,
        @inject('signService') private readonly signService: SignServiceContext,
        @inject('contractService') private readonly contractService: ContractServiceContext,
        @inject('tradeService') private readonly tradeService: TradeServiceContext,

        @inject('cryptoFlowService') private readonly cryptoFlowService: CryptoFlowService,
        @inject("isWebView") private readonly isWebView: boolean
    ) {
        this.webView = isWebView;
    }

    /**
     * Inits instance of BladeSDK for correct work with Blade API and Hedera network.
     * @param apiKey Unique key for API provided by Blade team.
     * @param chainType "Hedera" or "Ethereum"
     * @param network "Mainnet" or "Testnet" of Hedera network
     * @param dAppCode your dAppCode - request specific one by contacting us
     * @param visitorId client unique id. If not provided, SDK will try to get it using fingerprintjs-pro library
     * @param sdkEnvironment environment to choose BladeAPI server (Prod, CI)
     * @param sdkVersion used for header X-SDK-VERSION
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {InfoData} status: "success" or "error"
     */
    async init(
        apiKey: string,
        chainType: string | ChainType, // TODO replace with ChainId and remove Network
        network: string | Network,
        dAppCode: string,
        visitorId: string,
        sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod,
        sdkVersion: string = config.sdkVersion,
        completionKey?: string
    ): Promise<InfoData> {
        this.apiKey = apiKey;
        this.network = StringHelpers.stringToNetwork(network);
        this.chainType = StringHelpers.stringToChainType(chainType);
        this.dAppCode = dAppCode;
        this.sdkEnvironment = sdkEnvironment;
        this.sdkVersion = sdkVersion;
        this.visitorId = visitorId;

        // TODO
        // set account on init
        // remove accountId and privateKey fields from methods
        // on init also set network by KnownChainId

        this.apiService.initApiService(apiKey, dAppCode, sdkEnvironment, sdkVersion, this.network, this.chainType, visitorId);
        if (!this.visitorId) {
            try {
                const [decryptedVisitorId, timestamp] = (await decrypt(localStorage.getItem("BladeSDK.visitorId") || "", this.apiKey)).split("@");
                this.visitorId = decryptedVisitorId;
            } catch (e) {
                // console.log("failed to decrypt visitor id", e);
            }
        }
        if (!this.visitorId) {
            try {
                const fpConfig = {
                    apiKey: "key",
                    scriptUrlPattern: `${this.apiService.getApiUrl(true)}/fpjs/<version>/<loaderVersion>`,
                    endpoint: [
                        await this.configService.getConfig(`fingerprintSubdomain`),
                        FingerprintJS.defaultEndpoint
                    ]
                };
                const fpPromise = await FingerprintJS.load(fpConfig)
                this.visitorId = (await fpPromise.get()).visitorId;
                localStorage.setItem("BladeSDK.visitorId", await encrypt(`${this.visitorId}@${Date.now()}`, this.apiKey));
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.log("failed to get visitor id", error);
            }
        }
        this.apiService.setVisitorId(this.visitorId);
        this.accountService.init(this.chainType, this.network, null); // init without signer, to be able to create account

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
                    if (this.chainType === ChainType.Hedera) {
                        const key = PrivateKey.fromString(privateKey!);
                        this.userAccountId = accountIdOrEmail;
                        this.userPrivateKey = privateKey!;
                        this.userPublicKey = key.publicKey.toStringDer();
                        const provider = new HederaProvider({client: this.getClient()})
                        this.signer = new HederaSigner(this.userAccountId, key, provider);
                    } else if (this.chainType === ChainType.Ethereum) {
                        const key = PrivateKey.fromStringECDSA(privateKey!);
                        this.userPrivateKey = `0x${key.toStringRaw()}`;
                        this.userPublicKey = `0x${key.publicKey.toStringRaw()}`;
                        
                        this.userAccountId = ethers.utils.computeAddress(this.userPublicKey);
                        const alchemyRpc = await this.configService.getConfig(`alchemy${this.network}RPC`);
                        const alchemyApiKey = await this.configService.getConfig(`alchemy${this.network}APIKey`);

                        const provider = new ethers.providers.JsonRpcProvider(alchemyRpc + alchemyApiKey);
                        this.signer = new ethers.Wallet(this.userPrivateKey, provider);
                    }
                    break;
                case AccountProvider.Magic:
                    let userInfo;
                    if (!this.magic) {
                        await this.initMagic(this.chainType);
                    }

                    if (await this.magic?.user.isLoggedIn()) {
                        userInfo = await this.magic.user.getInfo()
                        if (userInfo.email !== accountIdOrEmail) {
                            this.magic.user.logout()
                            await this.magic.auth.loginWithMagicLink({ email: accountIdOrEmail, showUI: false })
                            userInfo = await this.magic.user.getInfo()
                        }
                    } else {
                        await this.magic?.auth.loginWithMagicLink({ email: accountIdOrEmail, showUI: false })
                        userInfo = await this.magic?.user.getInfo()
                    }

                    if (!await this.magic?.user.isLoggedIn()) {
                        throw new Error('Not logged in Magic. Please call magicLogin() first');
                    }

                    this.userAccountId = userInfo.publicAddress;
                    if (this.chainType === ChainType.Hedera) {
                        const { publicKeyDer } = await this.magic.hedera.getPublicKey();
                        this.userPublicKey = publicKeyDer;
                        const magicSign = (message: any) => this.magic.hedera.sign(message);
                        this.signer = new MagicSigner(this.userAccountId, this.network, publicKeyDer, magicSign);
                    } else if (this.chainType === ChainType.Ethereum) {
                        const provider = new ethers.providers.Web3Provider(this.magic.rpcProvider);
                        this.signer = provider.getSigner();
                        // TODO check how to get public key from magic
                        this.userPublicKey = "";
                    }
                    break;
                default:
                    break;
            }
            this.tokenService.init(this.chainType, this.network, this.signer!);
            this.accountService.init(this.chainType, this.network, this.signer!);
            this.signService.init(this.chainType, this.network, this.signer!);
            this.contractService.init(this.chainType, this.network, this.signer!);
            this.tradeService.init(this.chainType, this.network, this.signer!);
            this.accountProvider = accountProvider;

            return this.sendMessageToNative(completionKey, {
                accountId: this.userAccountId,
                accountProvider: this.accountProvider,
                userPrivateKey: this.userPrivateKey,
                userPublicKey: this.userPublicKey
            });

        } catch (error) {
            this.userAccountId = "";
            this.userPrivateKey = "";
            this.userPublicKey = "";
            this.signer = null;
            this.magic = null;
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    async resetUser(completionKey?: string): Promise<{ success: boolean }> {
        try {
            this.userPublicKey = '';
            this.userPrivateKey = '';
            this.userAccountId = '';
            this.signer = null;
            if (this.accountProvider === AccountProvider.Magic) {
                if (!this.magic) {
                    await this.initMagic(this.chainType);
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
     * @param accountId Hedera account id (0.0.xxxxx) or Ethereum address (0x...) or empty string to use current user account
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {BalanceData} hbars: number, tokens: [{tokenId: string, balance: number}]
     */
    async getBalance(accountId: string, completionKey?: string): Promise<BalanceData> {
        try {
            if (!accountId) {
                accountId = this.getUser().accountId;
            }
            return this.sendMessageToNative(completionKey, await this.tokenService.getBalance(accountId));
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Send HBAR/ETH to specific account.
     * @param receiverId receiver account id (0.0.xxxxx)
     * @param amount of hbars to send (decimal number)
     * @param memo transaction memo
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns Promise<TransactionResponseData>
     */
    async transferBalance(receiverId: string, amount: string, memo: string, completionKey?: string): Promise<TransactionResponseData> {
        try {
            const result = await this.tokenService.transferBalance({
                from: this.userAccountId,
                to: receiverId,
                amount,
                memo,
            })

            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    async getCoinList(completionKey?: string): Promise<CoinListData> {
        try {
            const coinList: CoinInfoRaw[] = await this.apiService.getCoins({
                dAppCode: this.dAppCode,
                visitorId: this.visitorId,
            });

            const result: CoinListData = {
                coins: coinList.map(coin => {
                    return {
                        ...coin,
                        platforms: Object.keys(coin.platforms).map(name => {
                            return {
                                name,
                                address: coin.platforms[name]
                            }
                        })
                    }
                })
            };
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    async getCoinPrice(search: string = "hbar", completionKey?: string): Promise<CoinInfoData> {
        try {
            if (search === HbarTokenId || search.toLowerCase() === "hbar") {
                search = "hedera-hashgraph"
            }

            const params = {
                dAppCode: this.dAppCode,
                visitorId: this.visitorId,
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
                priceUsd: coinInfo.market_data.current_price.usd,
                coin: coinInfo
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
            const result = await this.contractService.contractCallFunction(contractId, functionName, paramsEncoded, gas, bladePayFee);
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
        completionKey?: string): Promise<ContractCallQueryRecordsData> {
        try {
            const result = await this.contractService.contractCallQueryFunction(contractId, functionName, paramsEncoded, gas, bladePayFee, resultTypes);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Send token to specific account.
     * @param tokenAddress token id to send (0.0.xxxxx or 0x123456789abcdef...)
     * @param receiverId receiver account address (0.0.xxxxx or 0x123456789abcdef...)
     * @param amountOrSerial amount of fungible tokens to send (with token-decimals correction) on NFT serial number. (e.g. amount 0.01337 when token decimals 8 will send 1337000 units of token)
     * @param memo transaction memo
     * @param freeTransfer if true, Blade will pay fee transaction. Only for single dApp configured fungible-token. In that case tokenId not used
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns Promise<TransactionResponseData>
     */
    async transferTokens(
        tokenAddress: string,
        receiverId: string,
        amountOrSerial: string,
        memo: string,
        freeTransfer: boolean = false,
        completionKey?: string
    ): Promise<TransactionResponseData> {
        try {
            // TODO send NFT for Ethereum tokens
            const result = await this.tokenService.transferToken({
                from: this.userAccountId,
                to: receiverId,
                amountOrSerial,
                tokenAddress,
                memo,
                freeTransfer
            })
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Create Hedera account (ECDSA). Only for configured dApps. Depending on dApp config Blade create account, associate tokens, etc.
     * In case of not using pre-created accounts pool and network high load, this method can return transactionId and no accountId.
     * In that case account creation added to queue, and you should wait some time and call `getPendingAccount()` method.
     * @param deviceId optional field for headers for backend check
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {CreateAccountData}
     */
    async createAccount(deviceId?: string, completionKey?: string): Promise<CreateAccountData> {
        try {
            const result = await this.accountService.createAccount(deviceId);
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
    async getPendingAccount(transactionId: string, mnemonic: string, completionKey?: string): Promise<CreateAccountData> {
        try {
            const result = await this.accountService.getPendingAccount(transactionId, mnemonic);
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
    async deleteAccount(deleteAccountId: string, deletePrivateKey: string, transferAccountId: string, completionKey?: string): Promise<TransactionReceiptData> {
        try {
            const result = await this.accountService.deleteAccount(deleteAccountId, deletePrivateKey, transferAccountId);
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
            const result = await this.accountService.getAccountInfo(accountId);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Get Node list
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {nodes: NodeList[]}
     */
    async getNodeList(completionKey?: string): Promise<{nodes: NodeInfo[]}> {
        try {
            const result = await this.accountService.getNodeList();
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
            const result = await this.accountService.stakeToNode(this.userAccountId, nodeId);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
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
            const result = await this.accountService.getKeysFromMnemonic(mnemonicRaw, lookupNames);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign base64-encoded message with private key. Returns hex-encoded signature.
     * @param messageString base64-encoded message to sign
     * @param privateKey hex-encoded private key with DER header
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignMessageData}
     */
    async sign(messageString: string, privateKey: string, completionKey?: string): Promise<SignMessageData> {
        // TODO add `encoding` argument (hex/base64/string)
        try {
            const result = await this.signService.sign(messageString, privateKey);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
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
     */
    async signVerify(messageString: string, signature: string, publicKey: string, completionKey?: string): Promise<SignVerifyMessageData> {
        try {
            const result = await this.signService.signVerify(messageString, signature, publicKey);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Sign base64-encoded message with private key using ethers lib. Returns hex-encoded signature.
     * @param messageString base64-encoded message to sign
     * @param privateKey hex-encoded private key with DER header
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {SignMessageData}
     */
    ethersSign(messageString: string, privateKey: string, completionKey?: string): Promise<SignMessageData> {
        try {
            const result = this.signService.ethersSign(messageString, privateKey);
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
            return this.sendMessageToNative(completionKey, await this.signService.splitSignature(signature));
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
    async getParamsSignature(paramsEncoded: string | ParametersBuilder, privateKey: string, completionKey?: string): Promise<SplitSignatureData> {
        try {
            const result = await this.signService.getParamsSignature(paramsEncoded, privateKey);
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
     * @param accountId account id to get transactions for (0.0.xxxxx)
     * @param transactionType one of enum MirrorNodeTransactionType or "CRYPTOTRANSFERTOKEN"
     * @param nextPage link to next page of transactions from previous request
     * @param transactionsLimit number of transactions to return. Speed of request depends on this value if transactionType is set.
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TransactionsHistoryData}
     */
    async getTransactions(accountId: string, transactionType: string = "", nextPage: string, transactionsLimit: string = "10", completionKey?: string): Promise<TransactionsHistoryData> {
        try {
            if (!accountId) {
                accountId = this.userAccountId;
            }
            const result = await this.accountService.getTransactions(accountId, transactionType, nextPage, transactionsLimit);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
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
     */
    async getC14url(asset: string, account: string, amount: string, completionKey?: string): Promise<IntegrationUrlData> {
        try {
            const result = await this.tradeService.getC14url(asset, account, amount);
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
    ):Promise<SwapQuotesData> {
        try {
            const result = await this.tradeService.exchangeGetQuotes(sourceCode, sourceAmount, targetCode, strategy);
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
            const result = await this.tradeService.swapTokens(this.userAccountId, sourceCode, sourceAmount, targetCode, slippage, serviceId);
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
            const result = await this.tradeService.getTradeUrl(strategy, accountId, sourceCode, sourceAmount, targetCode, slippage, serviceId);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Create token (NFT or Fungible Token)
     * @param tokenName: token name (string up to 100 bytes)
     * @param tokenSymbol: token symbol (string up to 100 bytes)
     * @param isNft: set token type NFT
     * @param keys: token keys
     * @param decimals: token decimals (0 for nft)
     * @param initialSupply: token initial supply (0 for nft)
     * @param maxSupply: token max supply
     * @param completionKey: optional field bridge between mobile webViews and native apps
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
            const result = await this.tokenService.createToken(tokenName, tokenSymbol, isNft, this.userAccountId, this.userPublicKey, keys, decimals, initialSupply, maxSupply);
            return this.sendMessageToNative(completionKey, result, null);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Associate token to account
     *
     * @param tokenId: token id
     * @param completionKey: optional field bridge between mobile webViews and native apps
     */
    async associateToken(
        tokenId: string,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const result = await this.tokenService.associateToken(tokenId, this.userAccountId!);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    /**
     * Mint one NFT
     *
     * @param tokenId: token id to mint NFT
     * @param file: image to mint (File or base64 DataUrl image, eg.: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAA...)
     * @param metadata: NFT metadata (JSON object)
     * @param storageConfig: {NFTStorageConfig} IPFS provider config
     * @param completionKey: optional field bridge between mobile webViews and native apps
     */
    async nftMint(
        tokenId: string,
        file: File | string,
        metadata: {},
        storageConfig: NFTStorageConfig,
        completionKey?: string
    ): Promise<TransactionReceiptData> {
        try {
            const result = await this.tokenService.nftMint(tokenId, file, metadata, storageConfig);
            return this.sendMessageToNative(completionKey, result);
        } catch (error) {
            throw this.sendMessageToNative(completionKey, null, error);
        }
    }

    private async initMagic(chainType: ChainType) {
        const options: MagicSDKAdditionalConfiguration = {};
        if (chainType === ChainType.Hedera) {
            options.extensions = [new HederaExtension({
                network: this.network.toLowerCase()
            })];
        } else if (chainType === ChainType.Ethereum) {
            options.network = StringHelpers.networkToEthereum(this.network);
        }
        this.magic = new Magic(await this.configService.getConfig(`magicLinkPublicKey`), options);
    }

    private getUser(): {signer: Signer | ethers.Signer, accountId: string, privateKey: string, publicKey: string} {
        if (!this.signer) {
            throw new Error("No user, please call setUser() first");
        }
        return {
            signer: this.signer,
            accountId: this.userAccountId,
            privateKey: this.userPrivateKey,
            publicKey: this.userPublicKey
        }
    }

    private getInfoData(): InfoData {
        return {
            apiKey: this.apiKey,
            dAppCode: this.dAppCode,
            network: this.network,
            chainType: this.chainType,
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

    // TODO try to remove this method at all
    private getClient() {
        return this.network === Network.Testnet ? Client.forTestnet() : Client.forMainnet();
    }

    /**
     * Message that sends response back to native handler
     */
    private sendMessageToNative<T>(completionKey: string | undefined, data: T, error: Partial<CustomError>|any|null = null): T {
        if (!this.webView || !completionKey) {
            if (error) {
                throw error;
            }
            return data;
        }

        // web-view bridge response
        const responseObject: BridgeResponse = {
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
        return JSON.parse(JSON.stringify(responseObject));
    }
}
