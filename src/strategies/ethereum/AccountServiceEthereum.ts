import {IAccountService} from "../AccountServiceContext";

import {
    AccountInfoData,
    CreateAccountData,
    PrivateKeyData,
    TransactionReceiptData,
    TransactionsHistoryData
} from "../../models/Common";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {Network} from "../../models/Networks";
import {NodeInfo} from "../../models/MirrorNode";
import { ethers } from "ethers";

export default class AccountServiceEthereum implements IAccountService {
    private readonly network: Network;
    private readonly signer: ethers.Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(
        network: Network,
        signer: ethers.Signer,
        apiService: ApiService,
        configService: ConfigService,
    ) {
        this.network = network;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }


    createAccount(deviceId?: string): Promise<CreateAccountData> {
        throw new Error("Method not implemented.");
    }

    getPendingAccount(transactionId: string, mnemonic: string): Promise<CreateAccountData> {
        throw new Error("Method not implemented.");
    }

    deleteAccount(deleteAccountId: string, deletePrivateKey: string, transferAccountId: string): Promise<TransactionReceiptData> {
        throw new Error("Method not implemented.");
    }

    getAccountInfo(accountId: string): Promise<AccountInfoData> {
        throw new Error("Method not implemented.");
    }

    getNodeList(): Promise<{nodes: NodeInfo[]}> {
        throw new Error("Method not implemented.");
    }

    stakeToNode(accountId: string, nodeId: number): Promise<TransactionReceiptData> {
        throw new Error("Method not implemented.");
    }

    getKeysFromMnemonic(mnemonicRaw: string, lookupNames: boolean): Promise<PrivateKeyData> {
        throw new Error("Method not implemented.");
    }

    getTransactions(accountId: string, transactionType: string, nextPage: string, transactionsLimit: string): Promise<TransactionsHistoryData> {
        throw new Error("Method not implemented.");
    }
}
