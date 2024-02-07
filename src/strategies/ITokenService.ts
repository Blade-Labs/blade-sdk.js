import {
    BalanceData,
    KeyRecord,
    NFTStorageConfig,
    TransactionReceiptData,
    TransactionResponseData
} from "../models/Common";

export interface ITokenService {
    getBalance(address: string): Promise<BalanceData>;
    transferBalance(transferData: TransferInitData): Promise<TransactionResponseData>;
    transferToken(transferData: TransferTokenInitData): Promise<TransactionResponseData>;
    associateToken(tokenId: string, accountId: string): Promise<TransactionReceiptData>;
    createToken(tokenName: string, tokenSymbol: string, isNft: boolean, treasuryAccountId: string, supplyPublicKey: string, keys: KeyRecord[] | string, decimals: number, initialSupply: number, maxSupply: number): Promise<{tokenId: string}>;
    nftMint(tokenId: string, file: File | string, metadata: {}, storageConfig: NFTStorageConfig): Promise<TransactionReceiptData>;
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