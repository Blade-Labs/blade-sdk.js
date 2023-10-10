import {MirrorNodeTransactionType} from "./TransactionType";
import {Network} from "./Networks";
import {ICryptoFlowQuote} from "@/models/CryptoFlow";

export enum SdkEnvironment {
    Prod = "Prod",
    CI = "CI"
}

export enum KnownChain {
    ETHEREUM_MAINNET,
    ETHEREUM_SEPOLIA,
    HEDERA_MAINNET,
    HEDERA_TESTNET
}

export const KnownChainIds = {
    [KnownChain.ETHEREUM_MAINNET]: "1",
    [KnownChain.ETHEREUM_SEPOLIA]: "11155111",
    [KnownChain.HEDERA_MAINNET]: "295",
    [KnownChain.HEDERA_TESTNET]: "296"
};

export const KnownChainNames = {
    [KnownChainIds[KnownChain.ETHEREUM_MAINNET]]: "Ethereum Mainnet",
    [KnownChainIds[KnownChain.ETHEREUM_SEPOLIA]]: "Ethereum Sepolia",
    [KnownChainIds[KnownChain.HEDERA_MAINNET]]: "Hedera Mainnet",
    [KnownChainIds[KnownChain.HEDERA_TESTNET]]: "Hedera Testnet"
}


export interface BridgeResponse {
    completionKey: string,
    data: any,
    error?: any
}

export interface InfoData {
    apiKey: string,
    dAppCode: string,
    network: string,
    visitorId: string,
    sdkEnvironment: SdkEnvironment,
    sdkVersion: string,
    nonce: number
}

export interface BalanceData {
    hbars: number,
    tokens: [{
        tokenId: string,
        balance: number
    }]
}

export interface ContractCallQueryRecord {
    type: string,
    value: string | number | boolean
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

export interface IntegrationUrlData {
    url: string
}

export interface TransferData {
    amount: number,
    account: string,
    token_id?: string
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

export interface ConfirmUpdateAccountData {
    network: Network,
    accountId: string,
    dAppCode: string
    visitorId: string
}

export interface SwapQuotesData {
    quotes: ICryptoFlowQuote[]
}
