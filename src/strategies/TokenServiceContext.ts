import { injectable, inject } from "inversify";
import "reflect-metadata";

import { Signer } from "@hashgraph/sdk";
import {
    BalanceData,
    KeyRecord,
    NFTStorageConfig,
    TransactionReceiptData,
    TransactionResponseData,
} from "../models/Common";
import { ChainMap, ChainServiceStrategy, KnownChainIds } from "../models/Chain";
import TokenServiceHedera from "./hedera/TokenServiceHedera";
import TokenServiceEthereum from "./ethereum/TokenServiceEthereum";
import { ethers } from "ethers";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import { Network } from "../models/Networks";

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
    ): Promise<{ tokenId: string }>;
    nftMint(
        tokenId: string,
        file: File | string,
        metadata: {},
        storageConfig: NFTStorageConfig
    ): Promise<TransactionReceiptData>;
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
    freeTransfer: boolean;
};

@injectable()
export default class TokenServiceContext implements ITokenService {
    private chainId: KnownChainIds | null = null;
    private signer: Signer | ethers.Signer | null = null;
    private strategy: ITokenService | null = null;

    constructor(
        @inject("apiService") private readonly apiService: ApiService,
        @inject("configService") private readonly configService: ConfigService
    ) {}

    init(chainId: KnownChainIds, signer: Signer | ethers.Signer | null) {
        this.chainId = chainId;
        this.signer = signer;

        switch (ChainMap[this.chainId].serviceStrategy) {
            case ChainServiceStrategy.Hedera:
                this.strategy = new TokenServiceHedera(chainId, signer as Signer, this.apiService, this.configService);
                break;
            case ChainServiceStrategy.Ethereum:
                this.strategy = new TokenServiceEthereum(
                    chainId,
                    signer as ethers.Signer,
                    this.apiService,
                    this.configService
                );
                break;
            default:
                throw new Error(`Unsupported chain id: ${this.chainId}`);
        }
    }

    getBalance(accountId: string): Promise<BalanceData> {
        this.checkInit();
        return this.strategy!.getBalance(accountId);
    }

    transferBalance(transferData: TransferInitData): Promise<TransactionResponseData> {
        this.checkSigner();
        return this.strategy!.transferBalance(transferData);
    }

    transferToken(transferData: TransferTokenInitData): Promise<TransactionResponseData> {
        this.checkSigner();
        return this.strategy!.transferToken(transferData);
    }

    associateToken(tokenId: string, accountId: string): Promise<TransactionReceiptData> {
        this.checkSigner();
        return this.strategy!.associateToken(tokenId, accountId);
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
    ): Promise<{ tokenId: string }> {
        this.checkSigner();
        return this.strategy!.createToken(
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
        metadata: {},
        storageConfig: NFTStorageConfig
    ): Promise<TransactionReceiptData> {
        this.checkSigner();
        return this.strategy!.nftMint(tokenId, file, metadata, storageConfig);
    }

    private checkInit() {
        // check if strategy is initialized. Useful for getBalance() for example
        if (!this.strategy) {
            throw new Error("TokenService not initialized");
        }
    }

    private checkSigner() {
        // next step. Signer required for transaction signing (transfer, mint, etc)
        if (!this.signer) {
            throw new Error("TokenService not initialized (no signer, call setUser() first)");
        }
    }
}
