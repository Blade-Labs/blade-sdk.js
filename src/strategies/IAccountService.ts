import {
    AccountInfoData,
    CreateAccountData, PrivateKeyData, TransactionReceiptData, TransactionsHistoryData,
} from "../models/Common";
import {NodeInfo} from "../models/MirrorNode";

export interface IAccountService {
    createAccount(deviceId?: string): Promise<CreateAccountData>
    getPendingAccount(transactionId: string, mnemonic: string): Promise<CreateAccountData>
    deleteAccount(deleteAccountId: string, deletePrivateKey: string, transferAccountId: string): Promise<TransactionReceiptData>
    getAccountInfo(accountId: string): Promise<AccountInfoData>
    getNodeList(): Promise<{nodes: NodeInfo[]}>
    stakeToNode(accountId: string, nodeId: number): Promise<TransactionReceiptData>
    getKeysFromMnemonic(mnemonicRaw: string, lookupNames: boolean): Promise<PrivateKeyData>
    getTransactions(accountId: string, transactionType: string, nextPage: string, transactionsLimit: string): Promise<TransactionsHistoryData>
}
