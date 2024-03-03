import {
    AccountDeleteTransaction,
    AccountUpdateTransaction,
    Client,
    Mnemonic,
    PrivateKey,
    PublicKey,
    Signer,
    Transaction,
} from "@hashgraph/sdk";

import {IAccountService} from "../AccountServiceContext";

import {
    AccountInfoData,
    AccountPrivateData,
    AccountPrivateRecord,
    AccountStatus,
    CreateAccountData,
    TransactionReceiptData,
    TransactionsHistoryData
} from "../../models/Common";
import {ChainMap, CryptoKeyType, KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {NodeInfo} from "../../models/MirrorNode";
import {ethers} from "ethers";
import {executeUpdateAccountTransactions} from "../../helpers/AccountHelpers";
import {getReceipt} from "../../helpers/TransactionHelpers";

export default class AccountServiceHedera implements IAccountService {
    private readonly chainId: KnownChainIds;
    private readonly signer: Signer | null = null;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(
        chainId: KnownChainIds,
        signer: Signer | null,
        apiService: ApiService,
        configService: ConfigService,
    ) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async createAccount(deviceId?: string): Promise<CreateAccountData> {
        const seedPhrase = await Mnemonic.generate12();
        const privateKey = await seedPhrase.toStandardECDSAsecp256k1PrivateKey();
        const publicKey = privateKey.publicKey.toStringDer();

        const {
            id,
            transactionBytes,
            updateAccountTransactionBytes,
            associationPresetTokenStatus,
            transactionId
        } = await this.apiService.createAccount({deviceId, publicKey});
        const client = this.getClient();
        await executeUpdateAccountTransactions(client, privateKey, updateAccountTransactionBytes, transactionBytes);

        if (associationPresetTokenStatus === "FAILED") {
            // if token association failed on backend, fetch /tokens and execute transactionBytes
            try {
                const tokenTransaction = await this.apiService.getTokenAssociateTransactionForAccount(null, id);
                if (!tokenTransaction.transactionBytes) {
                    throw new Error("Token association failed");
                }
                const buffer = Buffer.from(tokenTransaction.transactionBytes, "base64");
                const transaction = await Transaction.fromBytes(buffer).sign(privateKey);
                await transaction.execute(client);
            } catch (error) {
                // ignore this error, continue
            }
        }

        if (updateAccountTransactionBytes) {
            await this.apiService.confirmAccountUpdate(id)
                .catch(() => {
                    // ignore this error, continue
                });
        }
        const evmAddress = ethers.utils.computeAddress(`0x${privateKey.publicKey.toStringRaw()}`);
        return {
            transactionId,
            status: transactionId ? "PENDING" : "SUCCESS",
            seedPhrase: seedPhrase.toString(),
            publicKey,
            privateKey: privateKey.toStringDer(),
            accountId: id || null,
            evmAddress: evmAddress.toLowerCase()
        }
    }

    // TODO check if this method is needed
    async getPendingAccount(transactionId: string, mnemonic: string): Promise<CreateAccountData> {
        const seedPhrase = await Mnemonic.fromString(mnemonic);
        const privateKey = await seedPhrase.toStandardECDSAsecp256k1PrivateKey();
        const publicKey = privateKey.publicKey.toStringDer();
        let evmAddress = ethers.utils.computeAddress(`0x${privateKey.publicKey.toStringRaw()}`);

        const result = {
            transactionId: transactionId || null,
            status: AccountStatus.PENDING,
            seedPhrase: seedPhrase.toString(),
            publicKey,
            privateKey: privateKey.toStringDer(),
            accountId: null,
            evmAddress: evmAddress.toLowerCase(),
            queueNumber: 0
        };

        const {status, queueNumber} = await this.apiService.checkAccountCreationStatus(transactionId);
        if (status === AccountStatus.SUCCESS) {
            const {
                id,
                transactionBytes,
                updateAccountTransactionBytes,
                originalPublicKey
            } = await this.apiService.getPendingAccountData(transactionId);
            await executeUpdateAccountTransactions(this.getClient(), privateKey, updateAccountTransactionBytes, transactionBytes);

            await this.apiService.confirmAccountUpdate(id);
            evmAddress = ethers.utils.computeAddress(`0x${originalPublicKey ? originalPublicKey.slice(-66) : privateKey.publicKey.toStringRaw()}`);
            result.transactionId = null;
            result.status = status;
            result.accountId = id;
            result.evmAddress = evmAddress.toLowerCase();
        } else {
            result.queueNumber = queueNumber;
        }
        return result;
    }

    // TODO check if this method is needed
    async deleteAccount(deleteAccountId: string, deletePrivateKey: string, transferAccountId: string): Promise<TransactionReceiptData> {
        // current user is operator. Account to be deleted is deleteAccountId
        const deleteAccountKey = PrivateKey.fromString(deletePrivateKey);

        return new AccountDeleteTransaction()
            .setAccountId(deleteAccountId)
            .setTransferAccountId(transferAccountId)
            .freezeWithSigner(this.signer!)
            .then(tx => tx.sign(deleteAccountKey))
            .then(tx => tx.signWithSigner(this.signer!))
            .then(tx => tx.executeWithSigner(this.signer!))
            .then(txResult => getReceipt(txResult, this.signer!));
    }

    async getAccountInfo(accountId: string): Promise<AccountInfoData> {
        const account = await this.apiService.getAccountInfo(accountId);
        const publicKey = account.key._type === CryptoKeyType.ECDSA_SECP256K1 ? PublicKey.fromStringECDSA(account.key.key) : PublicKey.fromStringED25519(account.key.key);
        const calculatedEvmAddress = account.key._type === CryptoKeyType.ECDSA_SECP256K1
            ? ethers.utils.computeAddress(`0x${publicKey.toStringRaw()}`).toLowerCase()
            : "";
        return {
            accountId,
            publicKey: publicKey.toStringDer(),
            evmAddress: account.evm_address,
            stakingInfo: {
                pendingReward: account.pending_reward,
                stakedNodeId: account.staked_node_id,
                stakePeriodStart: account.stake_period_start,
            },
            calculatedEvmAddress
        } as AccountInfoData;
    }

    async getNodeList(): Promise<{nodes: NodeInfo[]}> {
        const nodeList = await this.apiService.getNodeList();
        return {nodes: nodeList};
    }

    stakeToNode(accountId: string, nodeId: number): Promise<TransactionReceiptData> {
        const transaction = new AccountUpdateTransaction()
            .setAccountId(accountId);

        if (nodeId < 0 || nodeId === null) {
            transaction.clearStakedNodeId();
        } else {
            transaction.setStakedNodeId(nodeId);
        }
        return transaction
            .freezeWithSigner(this.signer!)
            .then(tx => tx.signWithSigner(this.signer!))
            .then(tx => tx.executeWithSigner(this.signer!))
            .then(txResult => getReceipt(txResult, this.signer!));
    }

    async getKeysFromMnemonic(mnemonicRaw: string): Promise<AccountPrivateData> {
        const mnemonic = await Mnemonic.fromString(mnemonicRaw
            .toLowerCase()
            .split(" ")
            .filter(word => word)
            .join(" ")
        );

        // derive to ECDSA Standard - find account
        // derive to ECDSA Legacy - find account
        // derive to ED25519 Standard - find account
        // derive to ED25519 Legacy - find account
        // return all records with account found. If no account show ECDSA Standard keys

        const prepareAccountRecord = async(privateKey: PrivateKey, keyType: CryptoKeyType, force: boolean = false) => {
            const accountIds: string[] = await this.apiService.getAccountsFromPublicKey(privateKey.publicKey);

            if (!accountIds.length && force) {
                accountIds.push("")
            }

            return accountIds.map(accountId => {
                const evmAddress = keyType === CryptoKeyType.ECDSA_SECP256K1
                    ? ethers.utils.computeAddress(`0x${privateKey.publicKey.toStringRaw()}`).toLowerCase()
                    : "";
                return {
                    privateKey: privateKey.toStringDer(),
                    publicKey: privateKey.publicKey.toStringDer(),
                    evmAddress,
                    address: accountId,
                    path: ChainMap[this.chainId].defaultPath,
                    keyType
                }
            })
        }

        const records: AccountPrivateRecord[] = [];
        let key: PrivateKey;
        for (const keyType of Object.values(CryptoKeyType)) {
            for (let standard = 1; standard >= 0; standard--) {
                if (keyType === CryptoKeyType.ECDSA_SECP256K1) {
                    if (standard) {
                        key = await mnemonic.toStandardECDSAsecp256k1PrivateKey();
                    } else {
                        key = await mnemonic.toEcdsaPrivateKey();
                    }
                } else {
                    if (standard) {
                        key = await mnemonic.toStandardEd25519PrivateKey()
                    } else {
                        key = await mnemonic.toEd25519PrivateKey();
                    }
                }
                records.push(...await prepareAccountRecord(key, keyType))
            }
        }

        if (!records.length) {
            // if no accounts found derive to ECDSA Standard, and return record with empty address
            key = await mnemonic.toStandardECDSAsecp256k1PrivateKey();
            records.push(...await prepareAccountRecord(key, CryptoKeyType.ECDSA_SECP256K1, true))
        }

        return {
            accounts: records
        }
    }

    async getTransactions(accountAddress: string, transactionType: string, nextPage: string, transactionsLimit: string): Promise<TransactionsHistoryData> {
        return await this.apiService.getTransactionsFrom(accountAddress, transactionType, nextPage, transactionsLimit);
    }

    private getClient() {
        return ChainMap[this.chainId].isTestnet ? Client.forTestnet() : Client.forMainnet();
    }
}
