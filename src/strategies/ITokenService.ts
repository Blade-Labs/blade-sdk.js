import {BalanceData, TransactionResponseData} from "../models/Common";

export interface ITokenService {
    getBalance(address: string): Promise<BalanceData>;

    // associateToken(tokenId: string | TokenId): Promise<void>;
    // requestTokenInfo(tokenId: string | TokenId, network: Network): Promise<TokenInfo>;
    transferBalance(transferData: TransferInitData): Promise<TransactionResponseData>;
    transferToken(transferData: TransferTokenInitData): Promise<TransactionResponseData>;
}

export type TransferInitData = {
    from: string,
    to: string,
    amount: string,
    memo?: string
}

export type TransferTokenInitData = {
    tokenAddress: string
    from: string,
    to: string,
    amountOrSerial: string,
    memo?: string,
    freeTransfer: boolean
}