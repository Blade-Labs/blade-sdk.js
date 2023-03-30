import {MirrorNodeTransactionType} from "./TransactionType";

export interface BridgeResponse {
    completionKey: string,
    data: any,
    error?: any
}

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
