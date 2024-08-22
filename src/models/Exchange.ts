import BigNumber from "bignumber.js";
import {FeeType} from "./Common";

export enum ExchangeNetworkType {
    ETHEREUM = "Ethereum",
    HEDERA = "Hedera"
}

export interface ExchangeTransaction {
    network: ExchangeNetworkType; // string
    calldata: string; // base64 - actual transaction
    signature: string; // base64 - signature of transaction bytes
    trackUrl?: string; // url to redirect user to (status page)
    allowanceTo?: string; // address to give allowance to, hedera case
}

export enum ExchangeRoutes {
    ASSETS = "assets",
    QUOTES = "quotes",
    TRANSACTION = "transaction"
}

export enum ExchangeStrategy {
    BUY = "Buy",
    SELL = "Sell",
    SWAP = "Swap"
}

export interface ExchangeAssetsParams {
    sourceCode?: string;
    sourceChainId?: number;
    targetCode?: string;
    targetChainId?: number;
    countryCode?: string;
    useTestnet?: boolean;
    limitedByChain?: number; // chain id number
}

export interface ExchangeQuoteParams {
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
    redirectUrl?: string; // redirect user to this url after action
}

export interface ExchangeTransactionParams {
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

export interface ExchangeAssets {
    source: ExchangeAsset[];
    target: ExchangeAsset[];
    countries?: ExchangeCountry[];
    limits?: IAssetTransactionLimits;
}

export interface ExchangeAsset {
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

export interface ExchangeCountry {
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

export interface ExchangeQuote {
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
    path?: {
        tokenId: string;
        fee?: number;
    }[];
}

export interface IAssetQuote {
    asset: ExchangeAsset;
    amountExpected: number;
    totalFee: number | null;
}

export type FeeManualOptions = {
    type: FeeType;
    amount: BigNumber;
    amountTokenId: string;
};


