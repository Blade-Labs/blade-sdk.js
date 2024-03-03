import {MirrorNodeTransactionType} from "./TransactionType";
import {ICryptoFlowQuote} from "./CryptoFlow";
import {CryptoKeyType, KnownChainIds} from "./Chain";

export enum SdkEnvironment {
    Prod = "Prod",
    CI = "CI",
    Test = "Test"
}

export enum AccountProvider {
    PrivateKey = "PrivateKey",
    Magic = "Magic",
}

export enum KeyType {
    admin = "admin",
    kyc = "kyc",
    freeze = "freeze",
    wipe = "wipe",
    pause = "pause",
    feeSchedule = "feeSchedule",
}

export enum NFTStorageProvider {
    nftStorage = "nftStorage"
}

export enum SupportedEncoding {
    base64 = "base64",
    hex = "hex",
    utf8 = "utf8",
}

export interface BladeConfig {
    fpApiKey?: string,
    exchangeServiceSignerPubKey?: string,
    swapContract?: string,
    swapWrapHbar?: string,
    saucerswapApi?: string,
    magicLinkPublicKey?: string,
    [key: string]: string | undefined; // Index signature
}

export interface FeeFeatureConfig {
    collector: string, // "0.0.1753455"
    min: number, // 0.44
    amount: number, // 0
    max: number, // 0.44,
    limitsCurrency: string, // "usd"
}

export interface FeeConfig {
    AccountCreate: FeeFeatureConfig,
    TradeNFT: FeeFeatureConfig,
    TransferHBAR: FeeFeatureConfig,
    TransferToken: FeeFeatureConfig,
    TransferNFT: FeeFeatureConfig,
    ScheduledTransferHBAR: FeeFeatureConfig,
    ScheduledTransferToken: FeeFeatureConfig,
    StakingClaim: FeeFeatureConfig,
    Swap: FeeFeatureConfig,
    Default: FeeFeatureConfig
}

export interface TokensConfig {
    association: string[],
    ftTransfer: string[],
    nftTransfer: string[],
    kycNeeded: string[]
}

export interface DAppConfig {
    autoAssociate: string, // boolean
    displayName: string,
    keyType: string, // "ECDSA" | "ED25519"
    redirectUrl: string,
    smartContract: string, // boolean
    freeSchedules: string, // boolean
    freeAssociate: string, // boolean
    freeTransfer: string, // boolean
    autoAssociatePresetTokens: string, // boolean
    automaticTokenAssociations: string, // boolean
    fees: {
        mainnet: FeeConfig,
        testnet: FeeConfig
    },
    tokens: {
        mainnet: TokensConfig,
        testnet: TokensConfig
    },
    redirectSameWindow: string, // boolean
    closeAfterSuccess: string, // boolean
    mirrorNode: IMirrorNodeServiceNetworkConfigs,
    [key: string]: any | undefined; // Index signature
}

export interface IMirrorNodeServiceNetworkConfigs {
    "mainnet": IMirrorNodeServiceConfig[],
    "testnet": IMirrorNodeServiceConfig[]
}

export interface IMirrorNodeServiceConfig {
    name: string;
    url: string;
    priority: number;
    apikey?: string;
}

export type ApiAccount = {
    id: string,
    publicKey: string,
    network: "MAINNET" | "TESTNET",
    transactionBytes?: string,
    maxAutoTokenAssociation?: number,
    associationPresetTokenStatus?: "NEEDLESS"|"PENDING"|"FAILED"|"SUCCESSFUL",
    updateAccountTransactionBytes?: string,
    transactionId?: string | null
}

export interface KeyRecord {
    privateKey: string,
    type: KeyType
}

export interface NFTStorageConfig {
    provider: NFTStorageProvider,
    apiKey: string
}

export interface BridgeResponse<T> {
    completionKey: string,
    data: T,
    error?: any
}

export interface InfoData {
    apiKey: string,
    dAppCode: string,
    network: string,
    chainId: KnownChainIds,
    visitorId: string,
    sdkEnvironment: SdkEnvironment,
    sdkVersion: string,
    nonce: number,
    user: UserInfoData
}

export interface UserInfoData {
    accountId: string,
    accountProvider: AccountProvider | null,
    userPrivateKey: string,
    userPublicKey: string,
}

export interface BalanceData {
    balance: string,
    rawBalance: string,
    decimals: number,
    tokens: TokenBalanceData[]
}

export interface TokenBalanceData {
    balance: string,
    decimals: number,
    name: string,
    symbol: string,
    address: string,
    rawBalance: string,
}

export interface ContractCallQueryRecord {
    type: string,
    value: string | number | boolean
}

export interface ContractCallQueryRecordsData {
    values: ContractCallQueryRecord[],
    gasUsed: number
}

export interface CreateAccountData {
    seedPhrase: string,
    publicKey: string,
    privateKey: string,
    accountId: string | null,
    evmAddress: string,
    transactionId: string | null,
    status: string,
    queueNumber?: number
}

export interface AccountInfoData {
    accountId: string,
    publicKey: string,
    evmAddress: string,
    stakingInfo: {
        pendingReward: number,
        stakedNodeId: number | null,
        stakePeriodStart: string | null,
    },
    calculatedEvmAddress?: string
}

export interface AccountPrivateData {
    accounts: AccountPrivateRecord[]
}

export interface AccountPrivateRecord {
    privateKey: string,
    publicKey: string,
    evmAddress: string,
    address: string,
    path: string,
    keyType: CryptoKeyType
}

export interface SignMessageData {
    signedMessage: string
}

export interface SignVerifyMessageData {
    valid: boolean
}

export interface SplitSignatureData {
    v: number,
    r: string,
    s: string
}

export interface TransactionsHistoryData {
    transactions: TransactionData[],
    nextPage: string | null
}

export interface TransactionData {
    transactionId: string,
    type: MirrorNodeTransactionType,
    time: Date,
    transfers: TransferData[],
    nftTransfers: NftTransferData[],
    memo?: string,
    fee?: number,
    showDetailed?: boolean,
    plainData?: any,
    consensusTimestamp: string
}

export interface IntegrationUrlData {
    url: string
}

export interface TransferData {
    amount: number,
    account: string,
    tokenAddress?: string
    asset: string
}

export interface NftTransferData {
    receiverAddress: string,
    senderAddress: string,
    serial: string,
    tokenAddress: string
}

export enum AccountStatus {
    PENDING = "PENDING",
    SUCCESS = "SUCCESS",
    RETRY = "RETRY",
    FAILED ="FAILED"
}

export interface C14WidgetConfig {
    clientId?: string;
    sourceCurrencyCode?: string;
    targetAssetId?: string;
    sourceAmount?: string;
    targetAmount?: string;
    targetAddress?: string;
    sourceCurrencyCodeLock?: boolean;
    targetAssetIdLock?: boolean;
    quoteAmountLock?: boolean;
    targetAddressLock?: boolean;
}

export interface ContractFunctionParameter {
    type: string,
    value: string[]
}

export interface SwapQuotesData {
    quotes: ICryptoFlowQuote[]
}

export interface CoinInfoRaw {
    id: string,
    symbol: string,
    name: string,
    platforms: {[key: string]: string}
}

export interface CoinListData {
    coins: {
        id: string,
        symbol: string,
        name: string,
        platforms: {
            name: string,
            address: string
        }[],
    }[]
}

export interface CoinData { // partial
    id: string,
    symbol: string,
    name: string,
    web_slug: string,
    description: {
        en: string
    },
    image: {
        thumb: string,
        small: string,
        large: string
    },
    platforms: {
        name: string,
        address: string
    }[],
    market_data: {
        current_price: {
            [key: string]: number
        },
    },
}

export interface CoinInfoData {
    coin: CoinData,
    priceUsd: number
}

export interface TransactionReceiptData {
    status: string,
    contractAddress?: string,
    topicSequenceNumber?: string,
    totalSupply?: string,
    serials: string[],
    transactionHash: string,
}

export interface TransactionResponseData {
    transactionHash: string
    transactionId: string
}