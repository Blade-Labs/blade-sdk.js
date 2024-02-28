import {IAccountService} from "../AccountServiceContext";

import {
    AccountInfoData,
    AccountPrivateData,
    AccountPrivateRecord,
    CreateAccountData,
    TransactionReceiptData,
    TransactionsHistoryData
} from "../../models/Common";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {NodeInfo} from "../../models/MirrorNode";
import {ethers} from "ethers";
import {CryptoKeyType, KnownChainIds} from "../../models/Chain";

export default class AccountServiceEthereum implements IAccountService {
    private readonly chainId: KnownChainIds;
    private readonly signer: ethers.Signer | null = null;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(
        chainId: KnownChainIds,
        signer: ethers.Signer | null,
        apiService: ApiService,
        configService: ConfigService,
    ) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    createAccount(deviceId?: string): Promise<CreateAccountData> {
        throw new Error("Method not implemented.");
    }

    getPendingAccount(transactionId: string, mnemonic: string): Promise<CreateAccountData> {
        throw new Error("Method not supported for this chain");
    }

    deleteAccount(deleteAccountId: string, deletePrivateKey: string, transferAccountId: string): Promise<TransactionReceiptData> {
        throw new Error("Method not supported for this chain");
    }

    getAccountInfo(accountId: string): Promise<AccountInfoData> {
        throw new Error("Method not implemented.");
    }

    getNodeList(): Promise<{nodes: NodeInfo[]}> {
        throw new Error("Method not supported for this chain");
    }

    stakeToNode(accountId: string, nodeId: number): Promise<TransactionReceiptData> {
        throw new Error("Method not supported for this chain");
    }

    async getKeysFromMnemonic(mnemonicRaw: string): Promise<AccountPrivateData> {
        const hdNode = ethers.utils.HDNode.fromMnemonic(mnemonicRaw);
        const numAccounts = 10;
        const accounts: AccountPrivateRecord[] = [];

        // Loop to derive accounts
        for (let i = 0; i < numAccounts; i++) {
            // Derive the wallet at the specified index
            const path = `m/44'/60'/0'/0/${i}`;
            const wallet = hdNode.derivePath(path);
            accounts.push({
                privateKey: wallet.privateKey,
                publicKey: wallet.publicKey,
                evmAddress: wallet.address,
                address: wallet.address,
                path: wallet.path,
                keyType: CryptoKeyType.ECDSA_SECP256K1
            });
        }
        return {
            accounts
        };
    }

    getTransactions(accountId: string, transactionType: string, nextPage: string, transactionsLimit: string): Promise<TransactionsHistoryData> {
        throw new Error("Method not implemented.");
    }
}
