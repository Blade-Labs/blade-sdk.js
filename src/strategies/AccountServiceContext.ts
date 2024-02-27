import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import {Signer} from "@hashgraph/sdk"

import {
    AccountInfoData,
    AccountPrivateData,
    CreateAccountData,
    TransactionReceiptData,
    TransactionsHistoryData
} from "../models/Common";
import {
    ChainMap, ChainServiceStrategy,
    KnownChainIds
} from "../models/Chain";
import AccountServiceHedera from "./hedera/AccountServiceHedera";
import AccountServiceEthereum from "./ethereum/AccountServiceEthereum";
import { ethers } from "ethers";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import {NodeInfo} from "../models/MirrorNode";

export interface IAccountService {
    createAccount(deviceId?: string): Promise<CreateAccountData>
    getPendingAccount(transactionId: string, mnemonic: string): Promise<CreateAccountData>
    deleteAccount(deleteAccountId: string, deletePrivateKey: string, transferAccountId: string): Promise<TransactionReceiptData>
    getAccountInfo(accountId: string): Promise<AccountInfoData>
    getNodeList(): Promise<{nodes: NodeInfo[]}>
    stakeToNode(accountId: string, nodeId: number): Promise<TransactionReceiptData>
    getKeysFromMnemonic(mnemonicRaw: string, lookupNames: boolean): Promise<AccountPrivateData>
    getTransactions(accountId: string, transactionType: string, nextPage: string, transactionsLimit: string): Promise<TransactionsHistoryData>
}

@injectable()
export default class AccountServiceContext implements IAccountService {
    private chainId: KnownChainIds | null = null;
    private signer: Signer | ethers.Signer | null = null
    private strategy: IAccountService | null = null;

    constructor(
        @inject('apiService') private readonly apiService: ApiService,
        @inject('configService') private readonly configService: ConfigService,
    ) {}

    init(chainId: KnownChainIds, signer: Signer | ethers.Signer | null) {
        this.chainId = chainId;
        this.signer = signer; // may be null if BladeSDK.setUser() not called. Useful for createAccount() for example

        switch (ChainMap[this.chainId].serviceStrategy) {
            case ChainServiceStrategy.Hedera:
                this.strategy = new AccountServiceHedera(chainId, signer as Signer | null, this.apiService, this.configService);
                break;
            case ChainServiceStrategy.Ethereum:
                this.strategy = new AccountServiceEthereum(chainId, signer as ethers.Signer | null, this.apiService, this.configService);
                break;
            default:
                throw new Error(`Unsupported chain id: ${this.chainId}`);
        }
    }

    createAccount(deviceId?: string): Promise<CreateAccountData> {
        this.checkInit();
        return this.strategy!.createAccount(deviceId);
    }

    getPendingAccount(transactionId: string, mnemonic: string): Promise<CreateAccountData> {
        this.checkInit();
        return this.strategy!.getPendingAccount(transactionId, mnemonic);
    }

    deleteAccount(deleteAccountId: string, deletePrivateKey: string, transferAccountId: string): Promise<TransactionReceiptData> {
        this.checkSigner();
        return this.strategy!.deleteAccount(deleteAccountId, deletePrivateKey, transferAccountId);
    }

    getAccountInfo(accountId: string): Promise<AccountInfoData> {
        this.checkInit();
        return this.strategy!.getAccountInfo(accountId);
    }

    getNodeList(): Promise<{nodes: NodeInfo[]}> {
        this.checkInit();
        return this.strategy!.getNodeList();
    }

    stakeToNode(accountId: string, nodeId: number): Promise<TransactionReceiptData> {
        this.checkSigner();
        return this.strategy!.stakeToNode(accountId, nodeId);
    }

    getKeysFromMnemonic(mnemonicRaw: string, lookupNames: boolean): Promise<AccountPrivateData> {
        this.checkInit();
        return this.strategy!.getKeysFromMnemonic(mnemonicRaw, lookupNames);
    }

    getTransactions(accountId: string, transactionType: string, nextPage: string, transactionsLimit: string): Promise<TransactionsHistoryData> {
        this.checkInit();
        return this.strategy!.getTransactions(accountId, transactionType, nextPage, transactionsLimit);
    }

    private checkInit() {
        // check if strategy is initialized. Usefull for createAccount() for example
        if (!this.strategy) {
            throw new Error("AccountService not initialized");
        }
    }

    private checkSigner() {
        // next step. Signer required for transaction signing (stake, delete, etc)
        if (!this.signer) {
            throw new Error("AccountService not initialized (no signer, call setUser() first)");
        }
    }
}
