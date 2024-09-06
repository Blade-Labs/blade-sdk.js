import {
    AccountInfoData,
    AccountPrivateData,
    CreateAccountData,
    TransactionReceiptData,
    TransactionsHistoryData,
} from "../models/Common";
import {NodeInfo} from "../models/MirrorNode";

export interface IAccountService {
    createAccount(privateKey?: string, deviceId?: string): Promise<CreateAccountData>;
    deleteAccount(
        deleteAccountId: string,
        deletePrivateKey: string,
        transferAccountId: string
    ): Promise<TransactionReceiptData>;
    getAccountInfo(accountId: string): Promise<AccountInfoData>;
    getNodeList(): Promise<{nodes: NodeInfo[]}>;
    stakeToNode(accountId: string, nodeId: number): Promise<TransactionReceiptData>;
    getTransactions(
        accountAddress: string,
        transactionType: string,
        nextPage: string,
        transactionsLimit: string
    ): Promise<TransactionsHistoryData>;
    searchAccounts(keyOrMnemonic: string): Promise<AccountPrivateData>;
}

export default class AccountServiceContext implements IAccountService {
    constructor(private strategy: IAccountService) {}

    createAccount(privateKey?: string, deviceId?: string): Promise<CreateAccountData> {
        return this.strategy.createAccount(privateKey, deviceId);
    }

    deleteAccount(
        deleteAccountAddress: string,
        deletePrivateKey: string,
        transferAccountAddress: string
    ): Promise<TransactionReceiptData> {
        return this.strategy.deleteAccount(deleteAccountAddress, deletePrivateKey, transferAccountAddress);
    }

    getAccountInfo(accountId: string): Promise<AccountInfoData> {
        return this.strategy.getAccountInfo(accountId);
    }

    getNodeList(): Promise<{nodes: NodeInfo[]}> {
        return this.strategy.getNodeList();
    }

    stakeToNode(accountId: string, nodeId: number): Promise<TransactionReceiptData> {
        return this.strategy.stakeToNode(accountId, nodeId);
    }

    getTransactions(
        accountAddress: string,
        transactionType: string,
        nextPage: string,
        transactionsLimit: string
    ): Promise<TransactionsHistoryData> {
        return this.strategy.getTransactions(accountAddress, transactionType, nextPage, transactionsLimit);
    }

    searchAccounts(keyOrMnemonic: string): Promise<AccountPrivateData> {
        return this.strategy.searchAccounts(keyOrMnemonic);
    }
}
