import {ICryptoFlowQuote} from "./CryptoFlow";
import {CryptoKeyType, KnownChainIds} from "./Chain";
import {NftInfo, NftMetadata, TokenInfo, MirrorNodeTransactionType, NodeInfo} from "./MirrorNode";
import {DropStatus, JobStatus} from "./BladeApi";
import {Magic} from "magic-sdk";
import {HederaExtension} from "@magic-ext/hedera";
import {Signer} from "@hashgraph/sdk";
import {ethers} from "ethers";

export enum SdkEnvironment {
    Prod = "Prod",
    CI = "CI",
    Test = "Test"
}

export enum AccountProvider {
    PrivateKey = "PrivateKey",
    Magic = "Magic"
}

export enum KeyType {
    admin = "admin",
    kyc = "kyc",
    freeze = "freeze",
    wipe = "wipe",
    pause = "pause",
    feeSchedule = "feeSchedule"
}

export enum NFTStorageProvider {
    nftStorage = "nftStorage"
}

export enum AssociationAction {
    FREE = "FREE",
    DEMAND = "DEMAND",
}

export enum SupportedEncoding {
    base64 = "base64",
    hex = "hex",
    utf8 = "utf8"
}

export interface BladeConfig {
    fpApiKey: string;
    fpSubdomain: string;
    exchangeServiceSignerPubKey: string;
    swapContract: string; // '{ "Testnet": "0.0.123", "Mainnet": "0.0.123" }'
    swapWrapHbar: string; // '{ "Testnet": ["0.0.1337"], "Mainnet": ["0.0.1337"] }'
    saucerswapApi: string; // '{"Testnet":"https://test-api.saucerswap.finance/","Mainnet":"https://api.saucerswap.finance/"}',
    magicLinkPublicKey: string;
    refreshTaskPeriodSeconds: number;
    feesConfig: string; // '{"Mainnet":{"AccountCreate":{"collector":"0.0.123","min":0.01,"amount":0,"max":0.5,"limitsCurrency":"usd"},"TradeNFT":{...}, ...}}',

    // // TODO add alchemy keys in backend config
    alchemyTestnetRPC: string;
    alchemyTestnetAPIKey: string;
    alchemyMainnetRPC: string;
    alchemyMainnetAPIKey: string;
    ipfsGateway: string;

    [key: string]: string | number | undefined; // Index signature
}

export interface FeeFeatureConfig {
    collector: string; // "0.0.1753455"
    min: number; // 0.44
    amount: number; // 0
    max: number; // 0.44,
    limitsCurrency: string; // "usd"
}

export interface FeeConfig {
    AccountCreate: FeeFeatureConfig;
    TradeNFT: FeeFeatureConfig;
    TransferHBAR: FeeFeatureConfig;
    TransferToken: FeeFeatureConfig;
    TransferNFT: FeeFeatureConfig;
    ScheduledTransferHBAR: FeeFeatureConfig;
    ScheduledTransferToken: FeeFeatureConfig;
    StakingClaim: FeeFeatureConfig;
    Swap: FeeFeatureConfig;
    Default: FeeFeatureConfig;
}

export interface TokensConfig {
    association: string[];
    ftTransfer: string[];
    nftTransfer: string[];
    kycNeeded: string[];
}

export interface DAppConfig {
    dappCode: string;
    displayName: string;
    network: string;
    tokenAssociate: boolean;
    kycGrant: boolean;
    tokenTransfer: boolean;
    scheduleSign: boolean;
    contractExecute: boolean;
    maxAutoTokenAssociation: number;
    createAccountWithAlias: boolean;
    urlEncodeParams: boolean;
    activeDrop: boolean;
    fees: FeeConfig;
    tokens: TokensConfig;
    mirrorNode: IMirrorNodeServiceConfig[];
    [key: string]: unknown; // Index signature
}

export interface IMirrorNodeServiceConfig {
    name: string;
    url: string;
    priority: number;
    apikey?: string;
}

export interface IMirrorNodeServiceConfig {
    name: string;
    url: string;
    priority: number;
    apikey?: string;
}

export interface ActiveUser {
    accountAddress: string,
    privateKey: string,
    publicKey: string,
    provider: AccountProvider,
    signer: Signer | ethers.Signer
}

export interface KeyRecord {
    privateKey: string;
    type: KeyType;
}

export interface NFTStorageConfig {
    provider: NFTStorageProvider;
    apiKey: string;
}

export interface BridgeResponse<T> {
    completionKey: string;
    data: T;
    error?: any;
}

export interface InfoData {
    apiKey: string;
    dAppCode: string;
    isTestnet: boolean;
    chainId: KnownChainIds;
    visitorId: string;
    sdkEnvironment: SdkEnvironment;
    sdkVersion: string;
    nonce: number;
    user: UserInfoData;
}

export interface UserInfoData {
    address: string;
    accountProvider: AccountProvider | null;
    privateKey: string;
    publicKey: string;
}

export interface BalanceData {
    balance: string;
    rawBalance: string;
    decimals: number;
    tokens: TokenBalanceData[];
}

export interface TokenBalanceData {
    balance: string;
    decimals: number;
    name: string;
    symbol: string;
    address: string;
    rawBalance: string;
}

export interface NodeListData {
    nodes: NodeInfo[];
}

export interface ContractCallQueryRecord {
    type: string;
    value: string | number | boolean;
}

export interface ContractCallQueryRecordsData {
    values: ContractCallQueryRecord[];
    gasUsed: number;
}

export interface CreateAccountData {
    seedPhrase: string;
    publicKey: string;
    privateKey: string;
    accountAddress: string;
    evmAddress: string;
    status: JobStatus;
}

export interface AccountInfoData {
    accountAddress: string;
    publicKey: string;
    evmAddress: string;
    stakingInfo: {
        pendingReward: number;
        stakedNodeId: number | null;
        stakePeriodStart: string | null;
    };
    calculatedEvmAddress?: string;
}

export interface AccountPrivateData {
    accounts: AccountPrivateRecord[];
}

export interface AccountPrivateRecord {
    privateKey: string;
    publicKey: string;
    evmAddress: string;
    address: string;
    path: string;
    keyType: CryptoKeyType;
}

export interface CreateScheduleData {
    scheduleId: string
}

export interface SignMessageData {
    signedMessage: string;
}

export interface SignVerifyMessageData {
    valid: boolean;
}

export interface SplitSignatureData {
    v: number;
    r: string;
    s: string;
}

export interface TransactionsHistoryData {
    transactions: TransactionData[];
    nextPage: string | null;
}

export interface TransactionData {
    transactionId: string;
    type: MirrorNodeTransactionType;
    time: Date;
    transfers: TransferData[];
    nftTransfers: NftTransferData[];
    memo?: string;
    fee?: number;
    plainData?: any;
    consensusTimestamp: string;
}

export interface IntegrationUrlData {
    url: string;
}

export interface ResultData {
    success: boolean;
}

export interface CreateTokenData {
    tokenId: string
}

export interface TransferData {
    account: string;
    amount: number;
    tokenAddress?: string;
    asset: string;
}

export interface NftTransferData {
    receiverAddress: string;
    senderAddress: string;
    serial: string;
    tokenAddress: string;
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
    type: string;
    value: string[];
}

export interface SwapQuotesData {
    quotes: ICryptoFlowQuote[];
}

export interface CoinInfoRaw {
    id: string;
    symbol: string;
    name: string;
    platforms: {[key: string]: string};
}

export interface CoinListData {
    coins: {
        id: string;
        symbol: string;
        name: string;
        platforms: {
            name: string;
            address: string;
        }[];
    }[];
}

export interface CoinData {
    // partial
    id: string;
    symbol: string;
    name: string;
    web_slug: string;
    description: {
        en: string;
    };
    image: {
        thumb: string;
        small: string;
        large: string;
    };
    platforms: {
        name: string;
        address: string;
    }[];
    market_data: {
        current_price: {
            [key: string]: number;
        };
    };
}

export interface CoinInfoData {
    coin: CoinData;
    priceUsd: number;
    price: number | null;
    currency: string;
}

export interface TransactionReceiptData {
    status: string;
    contractAddress?: string;
    topicSequenceNumber?: string;
    totalSupply?: string;
    serials: string[];
    transactionHash: string;
}

export interface TransactionResponseData {
    transactionHash: string;
    transactionId: string;
}

export interface TokenDropData {
    status: string;
    accountAddress: string;
    dropStatuses: {
       [key: string]: DropStatus;
    };
    redirectUrl: string;
}

export interface TokenInfoData {
    token: TokenInfo;
    nft: NftInfo | null;
    metadata: NftMetadata | null;
}

export interface ScheduleTransactionTransfer {
    type: ScheduleTransferType;
    sender: string;
    receiver: string;
    value?: number;
    tokenId?: string;
    serial?: number;
}

export enum ScheduleTransactionType {
    TRANSFER = "TRANSFER",
    SUBMIT_MESSAGE = "SUBMIT_MESSAGE",
    APPROVE_ALLOWANCE = "APPROVE_ALLOWANCE",
    TOKEN_MINT = "TOKEN_MINT",
    TOKEN_BURN = "TOKEN_BURN"
}

export enum ScheduleTransferType {
    HBAR = "HBAR",
    FT = "FT",
    NFT = "NFT"
}

export interface MagicWithHedera extends Magic {
    hedera: HederaExtension;
}

export interface WebViewWindow extends Window {
    webkit: {
        messageHandlers: {
            bladeMessageHandler: {
                postMessage: (data: string) => void;
            };
        };
    };
    bladeMessageHandler: {
        postMessage: (data: string) => void;
    };
}