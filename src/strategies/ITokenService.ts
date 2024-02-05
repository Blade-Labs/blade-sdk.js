import type {
    TransactionResponse as TransactionResponseHedera,
    TransactionReceipt as TransactionReceiptHedera,
    AccountId, TokenId, TokenInfo
} from "@hashgraph/sdk";
import type {TransactionResponse} from "@ethersproject/abstract-provider";

export interface ITokenService {
    // associateToken(tokenId: string | TokenId): Promise<void>;
    // requestTokenInfo(tokenId: string | TokenId, network: Network): Promise<TokenInfo>;
    transferBalance(transferData: TransferInitData): Promise<TransactionResponse | TransactionResponseHedera>;
    // transferToken(transferData: TransferTokenInitData): Promise<TransactionResponse | TransactionResponseHedera>;
}

export type TransferInitData = {
    from: string,
    to: string,
    amount: string,
    memo?: string
}

export type TransferTokenInitData = TransferInitData & {
    tokenAddress: string
}