import {
    AccountDeleteTransaction,
    AccountUpdateTransaction,
    Client,
    Mnemonic,
    PrivateKey,
    PublicKey,
    Signer,
    Transaction,
    HEDERA_PATH
} from "@hashgraph/sdk";

import {IAccountService} from "../AccountServiceContext";

import {
    AccountInfoData,
    AccountPrivateData,
    AccountPrivateRecord,
    CreateAccountData,
    TransactionReceiptData,
    TransactionsHistoryData
} from "../../models/Common";
import {ChainMap, CryptoKeyType, KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {AccountInfo, NodeInfo} from "../../models/MirrorNode";
import {ethers} from "ethers";
import StringHelpers from "../../helpers/StringHelpers";
import {executeUpdateAccountTransactions} from "../../helpers/AccountHelpers";
import {getReceipt} from "../../helpers/TransactionHelpers";
import {sleep} from "../../helpers/ApiHelper";
import {JobAction, JobStatus} from "../../models/BladeApi";
import {Buffer} from "buffer";

export default class AccountServiceHedera implements IAccountService {
    private readonly chainId: KnownChainIds;
    private readonly signer: Signer | null = null;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(chainId: KnownChainIds, signer: Signer | null, apiService: ApiService, configService: ConfigService) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async createAccount(privateKey: string, deviceId: string): Promise<CreateAccountData> {
        let key: PrivateKey;
        let seedPhrase = "";
        if (privateKey) {
            key = PrivateKey.fromString(privateKey);
        } else {
            const mnemonic = await Mnemonic.generate12();
            seedPhrase = mnemonic.toString();
            key = await mnemonic.toStandardECDSAsecp256k1PrivateKey();
        }

        let accountCreateJob= await this.apiService.createAccount(JobAction.INIT, "",{deviceId, publicKey: key.publicKey.toStringDer()});

        while (true) {
            if (accountCreateJob.status === JobStatus.SUCCESS) {
                break;
            }
            if (accountCreateJob.status === JobStatus.FAILED) {
                throw new Error(accountCreateJob.errorMessage);
            }
            await sleep(await this.configService.getConfig("refreshTaskPeriodSeconds") * 1000)
            accountCreateJob = await this.apiService.createAccount(JobAction.CHECK, accountCreateJob.taskId);
        }

        const {accountId, transactionBytes} = accountCreateJob.result!;

        const client = this.getClient();
        if (transactionBytes) {
            await executeUpdateAccountTransactions(client, key, transactionBytes);
            await this.apiService.createAccount(JobAction.CONFIRM, accountCreateJob.taskId).catch(() => {
                // ignore this error, continue (no content)
            });
        }

        const tokensConfig = await this.configService.getConfig("tokens");
        try {
            let tokenAssociationJob = await this.apiService.tokenAssociation(JobAction.INIT, "", {accountId, tokenIds: tokensConfig.association});
            while (true) {
                if (tokenAssociationJob.status === JobStatus.SUCCESS) {
                    break;
                }
                if (tokenAssociationJob.status === JobStatus.FAILED) {
                    throw new Error(tokenAssociationJob.errorMessage);
                }
                await sleep(await this.configService.getConfig("refreshTaskPeriodSeconds") * 1000);
                tokenAssociationJob = await this.apiService.tokenAssociation(JobAction.CHECK, tokenAssociationJob.taskId);
            }

            if (!tokenAssociationJob.result?.transactionBytes) {
                throw new Error("Token association failed");
            }
            const buffer = Buffer.from(tokenAssociationJob.result.transactionBytes, "base64");
            const transaction = await Transaction.fromBytes(buffer).sign(key);
            await transaction.execute(client);

            await this.apiService.tokenAssociation(JobAction.CONFIRM, tokenAssociationJob.taskId).catch(() => {
                // ignore this error, continue (no content)
            });
        } catch (error) {
            // ignore this error, continue
            console.log(error);
        }

        // KYC
        if (tokensConfig.kycNeeded && tokensConfig.kycNeeded.length) {
            const kycGrantJob = await this.apiService.kycGrant(JobAction.INIT, "", {accountId, tokenIds: tokensConfig.kycNeeded});
            while (true) {
                if (kycGrantJob.status === JobStatus.SUCCESS) {
                    break;
                }
                if (kycGrantJob.status === JobStatus.FAILED) {
                    throw new Error(kycGrantJob.errorMessage);
                }
                await sleep(await this.configService.getConfig("refreshTaskPeriodSeconds") * 1000);
                await this.apiService.kycGrant(JobAction.CHECK, kycGrantJob.taskId);
            }
        }
        const evmAddress = ethers.computeAddress(`0x${key.publicKey.toStringRaw()}`);
        return {
            status: JobStatus.SUCCESS,
            seedPhrase,
            publicKey: key.publicKey.toStringDer(),
            privateKey: key.toStringDer(),
            accountId: accountId.toString(),
            evmAddress: evmAddress.toLowerCase()
        };
    }

    // TODO check if this method is needed
    async deleteAccount(
        deleteAccountId: string,
        deletePrivateKey: string,
        transferAccountId: string
    ): Promise<TransactionReceiptData> {
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
        const publicKey =
            account.key._type === CryptoKeyType.ECDSA_SECP256K1
                ? PublicKey.fromStringECDSA(account.key.key)
                : PublicKey.fromStringED25519(account.key.key);
        const calculatedEvmAddress =
            account.key._type === CryptoKeyType.ECDSA_SECP256K1
                ? ethers.computeAddress(`0x${publicKey.toStringRaw()}`).toLowerCase()
                : "";
        return {
            accountId,
            publicKey: publicKey.toStringDer(),
            evmAddress: account.evm_address,
            stakingInfo: {
                pendingReward: account.pending_reward,
                stakedNodeId: account.staked_node_id,
                stakePeriodStart: account.stake_period_start
            },
            calculatedEvmAddress
        } as AccountInfoData;
    }

    async getNodeList(): Promise<{nodes: NodeInfo[]}> {
        const nodeList = await this.apiService.getNodeList();
        return {nodes: nodeList};
    }

    stakeToNode(accountId: string, nodeId: number): Promise<TransactionReceiptData> {
        const transaction = new AccountUpdateTransaction().setAccountId(accountId);

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

    async getTransactions(
        accountAddress: string,
        transactionType: string,
        nextPage: string,
        transactionsLimit: string
    ): Promise<TransactionsHistoryData> {
        return await this.apiService.getTransactionsFrom(accountAddress, transactionType, nextPage, transactionsLimit);
    }

    async searchAccounts(keyOrMnemonic: string): Promise<AccountPrivateData> {
        const accounts: AccountPrivateRecord[] = [];
        if (keyOrMnemonic.trim().split(" ").length > 1) {
            // mnemonic
            accounts.push(...(await this.getAccountsFromMnemonic(keyOrMnemonic)));
        } else {
            accounts.push(...(await this.getAccountsFromPrivateKey(keyOrMnemonic)));
        }

        return {
            accounts
        }
    }

    private async getAccountsFromMnemonic(
        mnemonicRaw: string
    ): Promise<AccountPrivateRecord[]> {
        const mnemonic = await Mnemonic.fromString(
            mnemonicRaw
                .toLowerCase()
                .trim()
                .split(" ")
                .filter((word) => word)
                .join(" ")
        );

        // derive to ECDSA Standard - find account
        // derive to ECDSA Legacy - find account
        // derive to ED25519 Standard - find account
        // derive to ED25519 Legacy - find account
        // return all records with account found. If no account show ECDSA Standard keys
    
        const promises: Promise<AccountPrivateRecord[]>[] = [];
        let key: PrivateKey;
    
        for (const keyType of Object.values(CryptoKeyType)) {
            for (let standard = 1; standard >= 0; standard--) {
                if (keyType === CryptoKeyType.ECDSA_SECP256K1) {
                    key = standard 
                        ? await mnemonic.toStandardECDSAsecp256k1PrivateKey() 
                        : await mnemonic.toEcdsaPrivateKey();
                } else {
                    key = standard 
                        ? await mnemonic.toStandardEd25519PrivateKey() 
                        : await mnemonic.toEd25519PrivateKey();
                }
                promises.push(this.prepareAccountRecord(key, keyType));
            }
        }
    
        const recordsArray = await Promise.all(promises);
        const records: AccountPrivateRecord[] = recordsArray.flat();
    
        if (!records.length) {
            // if no accounts found, derive to ECDSA Standard, and return record with empty address
            const key = await mnemonic.toStandardECDSAsecp256k1PrivateKey();
            const fallbackRecords = await this.prepareAccountRecord(key, CryptoKeyType.ECDSA_SECP256K1, true);
            records.push(...fallbackRecords);
        }
    
        return records;
    }

    private async getAccountsFromPrivateKey(
        privateKeyRaw: string
    ): Promise<AccountPrivateRecord[]> {
        const privateKey = privateKeyRaw.toLowerCase().trim().replace("0x", "");
        const privateKeys: PrivateKey[] = [];

        if (privateKey.length >= 96) {
            // 96 chars - hex encoded ED25519 with DER header without 0x prefix
            // 100 chars - hex encoded ECDSA with DER header without 0x prefix
            privateKeys.push(PrivateKey.fromStringDer(privateKey));
        } else {
            // try to parse as ECDSA and ED25519 private key, and find account by public key
            privateKeys.push(
                PrivateKey.fromStringECDSA(privateKey),
                PrivateKey.fromStringED25519(privateKey)
            );
        }
    
        const promises = privateKeys.map(async (key) => {
            const keyType = key.type === "ED25519" ? CryptoKeyType.ED25519 : CryptoKeyType.ECDSA_SECP256K1;
            return this.prepareAccountRecord(key, keyType);
        });
    
        const recordsArray = await Promise.all(promises);
        const records: AccountPrivateRecord[] = recordsArray.flat();

        if (!records.length) {
            // if no accounts found, return record with empty address
            const keyType = privateKeys[0].type === "ED25519" ? CryptoKeyType.ED25519 : CryptoKeyType.ECDSA_SECP256K1;
            const fallbackRecords = await this.prepareAccountRecord(privateKeys[0], keyType, true);
            records.push(...fallbackRecords);
        }

        return records;
    }

    private async prepareAccountRecord(
        privateKey: PrivateKey,
        keyType: CryptoKeyType,
        force: boolean = false
    ): Promise<AccountPrivateRecord[]> {
        const accounts: Partial<AccountInfo>[] = await this.apiService.getAccountsFromPublicKey(privateKey.publicKey);
    
        if (!accounts.length && force) {
            accounts.push({});
        }
    
        return accounts.map((record) => {
            const evmAddress =
                keyType === CryptoKeyType.ECDSA_SECP256K1
                    ? ethers.computeAddress(`0x${privateKey.publicKey.toStringRaw()}`).toLowerCase()
                    : record?.evm_address || "";
            return {
                privateKey: privateKey.toStringDer(),
                publicKey: privateKey.publicKey.toStringDer(),
                evmAddress: evmAddress || "",
                address: record?.account || "",
                path: StringHelpers.pathArrayToString(HEDERA_PATH),
                keyType,
            };
        });
    }

    private getClient() {
        return ChainMap[this.chainId].isTestnet ? Client.forTestnet() : Client.forMainnet();
    }
}
