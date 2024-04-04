# Data types

```
export interface InitData {
    status: string
}

export interface BalanceData {
    hbars: number,
    tokens: [{
        tokenId: string,
        balance: number
    }]
}

export interface CreateAccountData {
    seedPhrase: string,
    publicKey: string,
    privateKey: string,
    accountId?: string,
    evmAddress: string,
    transactionId?: string,
    status: string,
    queueNumber?: number
}

export interface AccountInfoData {
    accountId: string,
    evmAddress: string,
    calculatedEvmAddress: string
}

export interface PrivateKeyData {
    privateKey: string,
    publicKey: string,
    accounts: [string],
    evmAddress: string
}

export interface TransactionsHistoryData {
    transactions: TransactionData[],
    nextPage?: string
}

export interface TransactionData {
    transactionId: string,
    type: MirrorNodeTransactionType,
    time: Date,
    transfers: TransferData[],
    nftTransfers?: [],
    memo?: string,
    fee?: number,
    showDetailed?: boolean,
    plainData?: any,
    consensusTimestamp: string
}

export interface TransferData {
    amount: number,
    account: string,
    token_id?: string
}

export interface ContractCallQueryRecord {
    type: string,
    value: string | number | boolean
}

export interface SplitSignatureData {
    v: number,
    r: string,
    s: string
}

export interface SignMessageData {
    signedMessage: string
}

export interface SignVerifyMessageData {
    valid: boolean
}

export interface IntegrationUrlData {
    url: string
}

export interface ContractFunctionParameter {
    type: string,
    value: string[]
}

export interface BridgeResponse {
    completionKey: string,
    data: any,
    error?: any
}

export interface CustomError extends Error {
    name: string;
    reason: string;
}

export interface SwapQuotesData {
    quotes: ICryptoFlowQuote[]
}

export enum ICryptoFlowNetworkType {
    ETHEREUM = "Ethereum",
    HEDERA = "Hedera",
}

export interface ICryptoFlowTransaction {
    network: ICryptoFlowNetworkType; // string
    calldata: string; // base64 - actual transaction
    signature: string; // base64 - signature of transaction bytes
    trackUrl?: string; // url to redirect user to (status page)
}

export enum CryptoFlowRoutes {
    ASSETS = "assets",
    QUOTES = "quotes",
    TRANSACTION = "transaction",
}

export enum CryptoFlowServiceStrategy {
    BUY = "Buy",
    SELL = "Sell",
    SWAP = "Swap",
}

export interface ICryptoFlowAssetsParams {
    sourceCode?: string;
    sourceChainId?: number;
    targetCode?: string;
    targetChainId?: number;
    countryCode?: string;
    useTestnet?: boolean;
    limitedByChain?: number; // chain id number
}

export interface ICryptoFlowQuoteParams {
    sourceCode: string;
    sourceAddress?: string;
    sourceChainId?: number;
    sourceAmount?: number;

    targetCode: string;
    targetAddress?: string;
    targetChainId?: number;
    targetAmount?: number;

    slippage?: string;
    countryCode?: string;
    walletAddress: string;

    useTestnet?: boolean;
}

export interface ICryptoFlowTransactionParams {
    serviceId: string; // service id

    sourceCode: string;
    sourceChainId: number;
    sourceAddress?: string;
    sourceAmount: number;

    targetCode: string;
    targetChainId: number;
    targetAddress?: string;

    walletAddress: string;
    walletAddressTo?: string;

    slippage?: string;
    useTestnet?: boolean;
}

export interface ICryptoFlowAssets {
    source: ICryptoFlowAsset[];
    target: ICryptoFlowAsset[];
    countries?: ICryptoFlowCountry[];
    limits?: IAssetTransactionLimits;
}

export interface ICryptoFlowAsset {
    name: string;
    code: string;
    type: string;
    // crypto only
    address?: string;
    chainId?: number;
    decimals?: number;
    minAmount?: number;
    maxAmount?: number;
    // fiat only
    symbol?: string;
    // both
    imageUrl?: string;
}

export interface ICryptoFlowCountry {
    code: string; // ISO Country Code
    name: string;
}

export interface IAssetLimits {
    code: string;
    min: number;
    max: number;
}

export interface IAssetTransactionLimits {
    source: IAssetLimits;
    target: IAssetLimits;
    rate?: number; // 1 crypto unit equals fiat
    rates?: number[];
}

export interface ICryptoFlowQuote {
    service: {
        id: string;
        name: string;
        logo: string;
        description?: string;
    };
    source: IAssetQuote;
    target: IAssetQuote;
    rate: number | null;
    widgetUrl?: string;
    paymentMethods?: string[];
}

export interface IAssetQuote {
    asset: ICryptoFlowAsset;
    amountExpected: number;
    totalFee: number | null;
}

export type FeeManualOptions = {
    type: FeeType,
    amount: BigNumber,
    amountTokenId: string
}

export enum FeeType {
    TradeNFT = "TradeNFT",
    TransferHBAR = "TransferHBAR",
    TransferToken = "TransferToken",
    TransferNFT = "TransferNFT",
    ScheduledTransferHBAR = "ScheduledTransferHBAR",
    ScheduledTransferToken = "ScheduledTransferToken",
    StakingClaim = "StakingClaim",
    Swap = "Swap",
    AccountCreate = "AccountCreate",
    Default = "Default"
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
    market_data: {
        current_price: {
            [key: string]: number
        },
    },
}

export interface CoinInfoData {
    coin: CoinData,
    priceUsd: number,
    price: number | null,
    currency: string
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

export interface KeyRecord {
    privateKey: string,
    type: KeyType
}

export interface NFTStorageConfig {
    provider: NFTStorageProvider,
    apiKey: string
}

export interface TransactionReceiptData {
    status: string,
    contractId?: string,
    topicSequenceNumber?: string,
    totalSupply?: string,
    serials: string[],
}
```
