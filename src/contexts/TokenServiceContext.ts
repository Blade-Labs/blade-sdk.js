import {
    BalanceData,
    KeyRecord,
    NFTStorageConfig,
    TokenDropData,
    TransactionReceiptData,
    TransactionResponseData
} from "../models/Common";
import {ExchangeQuote, ExchangeTransaction} from "../models/Exchange";

export interface ITokenService {
    getBalance(address: string): Promise<BalanceData>;
    transferBalance(transferData: TransferInitData): Promise<TransactionResponseData>;
    transferToken(transferData: TransferTokenInitData): Promise<TransactionResponseData>;
    associateToken(tokenId: string, accountId: string): Promise<TransactionReceiptData>;
    createToken(
        tokenName: string,
        tokenSymbol: string,
        isNft: boolean,
        treasuryAccountId: string,
        supplyPublicKey: string,
        keys: KeyRecord[] | string,
        decimals: number,
        initialSupply: number,
        maxSupply: number
    ): Promise<{tokenId: string}>;
    nftMint(
        tokenId: string,
        file: File | string,
        metadata: object,
        storageConfig: NFTStorageConfig
    ): Promise<TransactionReceiptData>;
    dropTokens(accountId: string, secretNonce: string): Promise<TokenDropData>;
    swapTokens(
        accountAddress: string,
        selectedQuote: ExchangeQuote,
        txData: ExchangeTransaction
    ): Promise<{success: boolean}>;
}

export type TransferInitData = {
    from: string;
    to: string;
    amount: string;
    memo?: string;
};

export type TransferTokenInitData = {
    tokenAddress: string;
    from: string;
    to: string;
    amountOrSerial: string;
    memo?: string;
    usePaymaster: boolean;
};

export default class TokenServiceContext implements ITokenService {
    constructor(private strategy: ITokenService) {}

    getBalance(accountId: string): Promise<BalanceData> {
        return this.strategy.getBalance(accountId);
    }

    transferBalance(transferData: TransferInitData): Promise<TransactionResponseData> {
        return this.strategy.transferBalance(transferData);
    }

    transferToken(transferData: TransferTokenInitData): Promise<TransactionResponseData> {
        return this.strategy.transferToken(transferData);
    }

    associateToken(tokenId: string, accountId: string): Promise<TransactionReceiptData> {
        return this.strategy.associateToken(tokenId, accountId);
    }

    createToken(
        tokenName: string,
        tokenSymbol: string,
        isNft: boolean,
        treasuryAccountId: string,
        supplyPublicKey: string,
        keys: KeyRecord[] | string,
        decimals: number,
        initialSupply: number,
        maxSupply: number
    ): Promise<{tokenId: string}> {
        return this.strategy.createToken(
            tokenName,
            tokenSymbol,
            isNft,
            treasuryAccountId,
            supplyPublicKey,
            keys,
            decimals,
            initialSupply,
            maxSupply
        );
    }

    nftMint(
        tokenId: string,
        file: File | string,
        metadata: object,
        storageConfig: NFTStorageConfig
    ): Promise<TransactionReceiptData> {
        return this.strategy.nftMint(tokenId, file, metadata, storageConfig);
    }

    dropTokens(accountId: string, secretNonce: string): Promise<TokenDropData> {
        return this.strategy.dropTokens(accountId, secretNonce);
    }

    swapTokens(
        accountAddress: string,
        selectedQuote: ExchangeQuote,
        txData: ExchangeTransaction
    ): Promise<{success: boolean}> {
        return this.strategy.swapTokens(accountAddress, selectedQuote, txData);
    }
}
