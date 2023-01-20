import {MirrorNodeTransactionType} from "./TransactionType";

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

export enum AccountStatus {
    PENDING = "PENDING",
    SUCCESS = "SUCCESS",
    RETRY = "RETRY",
    FAILED ="FAILED"
}
