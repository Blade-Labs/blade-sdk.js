import BigNumber from "bignumber.js";

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
    amountTokenId?: string
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