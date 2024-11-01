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
    allowanceTo?: string; // address to give allowance to, hedera case
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
    redirectUrl?: string; // redirect user to this url after action
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
    widgetUrl: string;
    paymentMethods?: string[];
    path?: { tokenId: string, fee?: number }[];
}

export interface IAssetQuote {
    asset: ICryptoFlowAsset;
    amountExpected: number;
    totalFee: number | null;
}

export type FeeManualOptions = {
    type: FeeType;
    amount: BigNumber;
    amountTokenId: string | undefined;
};

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
    Default = "Default",
}

export interface TransakOrderInfo {
    meta: {
        orderId: string;
    };
    data: {
        id: string;
        createdAt: string;
        status: string;
        fiatCurrency: string;
        cryptoCurrency: string;
        isBuyOrSell: string;
        fiatAmount: number;
        amountPaid: number;
        paymentOptionId: string;
        quoteId: string;
        network: string;
        conversionPriceData: {
            conversionPrice: number;
            cryptoAmount: number;
            fiatAmountInUsd: number;
            id: string;
            createdAt: string;
            fiatCurrency: string;
            cryptoCurrency: string;
            paymentMethod: string;
            fiatAmount: number;
            network: string;
            isBuyOrSell: string;
            marketConversionPrice: number;
            slippage: number;
            cryptoLiquidityProvider:  string;
            sourceTokenAmount: number;
            sourceToken: string;
            fiatFeeAmount: number;
            feeDecimal: number;
            internalFees: {
                name: string;
                id: string;
                value: number;
            }[];
        };
        autoExpiresAt: string;
        stateCode: string;
        orderChannelType: string;
        userKycType: string;
        cardId: string;
        conversionPrice: number;
        cryptoAmount: number;
        totalFeeInFiat: number;
        fiatAmountInUsd: number;
        countryCode: string;
        cryptoPaymentData: {
            paymentAddress: string;
        },
        cardDetails: {
            _id: string;
            userId: string;
            id: string;
            issuer: string;
            issuer_country: string;
            scheme: string;
            last4: string;
            card_type: string;
            expiry_month: number;
            expiry_year: number;
            moneyTransferType: string;
            isPayoutAllowed: boolean;
        };
        statusHistories: {
            status: string;
            createdAt: string;
            message: string;
            isEmailSentToUser: boolean;
            partnerEventId: string;
        }[];
    };
}
