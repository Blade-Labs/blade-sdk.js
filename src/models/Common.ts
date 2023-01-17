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
    plainData?: any
}

export interface TransferData {
    amount: number,
    account: string,
    token_id?: string
}
