import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import {Signer} from "@hashgraph/sdk"
import {IAccountService} from "./IAccountService";

import {
    AccountInfoData,
    ChainType, CreateAccountData,
    PrivateKeyData,
    TransactionReceiptData,
    TransactionsHistoryData
} from "../models/Common";
import AccountServiceHedera from "./hedera/AccountServiceHedera";
import AccountServiceEthereum from "./ethereum/AccountServiceEthereum";
import { ethers } from "ethers";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import {Network} from "../models/Networks";
import {NodeInfo} from "@/models/MirrorNode";

@injectable()
export default class AccountService implements IAccountService {
    private chainType: ChainType | null = null;
    private signer: Signer | ethers.Signer | null = null
    private strategy: IAccountService | null = null;

    constructor(
        @inject('apiService') private readonly apiService: ApiService,
        @inject('configService') private readonly configService: ConfigService,
    ) {}

    init(chainType: ChainType, network: Network, signer: Signer | ethers.Signer) {
        this.chainType = chainType;
        this.signer = signer;

        switch (chainType) {
            case ChainType.Hedera:
                this.strategy = new AccountServiceHedera(network, signer as Signer, this.apiService, this.configService);
                break;
            case ChainType.Ethereum:
                this.strategy = new AccountServiceEthereum(network, signer as ethers.Signer, this.apiService, this.configService);
                break;
            default:
                throw new Error("Unsupported chain type");
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
        this.checkInit();
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
        this.checkInit();
        return this.strategy!.stakeToNode(accountId, nodeId);
    }

    getKeysFromMnemonic(mnemonicRaw: string, lookupNames: boolean): Promise<PrivateKeyData> {
        this.checkInit();
        return this.strategy!.getKeysFromMnemonic(mnemonicRaw, lookupNames);
    }

    getTransactions(accountId: string, transactionType: string, nextPage: string, transactionsLimit: string): Promise<TransactionsHistoryData> {
        this.checkInit();
        return this.strategy!.getTransactions(accountId, transactionType, nextPage, transactionsLimit);
    }

    private checkInit() {
        if (!this.strategy) {
            throw new Error("AccountService not initialized");
        }
    }
}
