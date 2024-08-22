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
import {NodeInfo, MirrorNodeTransactionType} from "../../models/MirrorNode";
import {ethers} from "ethers";
import {ChainMap, CryptoKeyType, KnownChains} from "../../models/Chain";
import {
    Alchemy,
    AssetTransfersCategory,
    AssetTransfersWithMetadataParams,
    AssetTransfersWithMetadataResponse,
    AssetTransfersWithMetadataResult,
    SortingOrder
} from "alchemy-sdk";
import {JobStatus} from "../../models/BladeApi";
import {getAlchemyInstance} from "../../helpers/InitHelpers";

export default class AccountServiceEthereum implements IAccountService {
    private readonly chain: KnownChains;
    private readonly signer: ethers.Signer | null = null;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;
    private alchemy: Alchemy | null = null;

    constructor(
        chain: KnownChains,
        signer: ethers.Signer | null,
        apiService: ApiService,
        configService: ConfigService
    ) {
        this.chain = chain;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async createAccount(privateKey: string): Promise<CreateAccountData> {
        let wallet: ethers.Wallet | ethers.HDNodeWallet;
        let seedPhrase: string = "";


        if (privateKey) {
            wallet = new ethers.Wallet(privateKey)
        } else {
            wallet = ethers.Wallet.createRandom();
            seedPhrase = wallet?.mnemonic?.phrase || "";
        }

        return {
            seedPhrase,
            publicKey: wallet.signingKey.publicKey,
            privateKey: wallet.privateKey,
            accountAddress: wallet.address,
            evmAddress: wallet.address,
            status: JobStatus.SUCCESS
        }
    }

    deleteAccount(): Promise<TransactionReceiptData> {
        throw new Error("Method not supported for this chain");
    }

    getAccountInfo(): Promise<AccountInfoData> {
        throw new Error("Method not implemented.");
    }

    getNodeList(): Promise<{nodes: NodeInfo[]}> {
        throw new Error("Method not supported for this chain");
    }

    stakeToNode(): Promise<TransactionReceiptData> {
        throw new Error("Method not supported for this chain");
    }

    async searchAccounts(keyOrMnemonic: string): Promise<AccountPrivateData> {
        const accounts: AccountPrivateRecord[] = [];
        if (keyOrMnemonic.trim().split(" ").length > 1) {
            // mnemonic
            accounts.push(...this.getAccountsFromMnemonic(keyOrMnemonic));
        } else {
            accounts.push(...this.getAccountsFromPrivateKey(keyOrMnemonic));
        }
        return {
            accounts
        }
    }

    async getTransactions(
        accountAddress: string,
        transactionType: string,
        nextPage: string,
        transactionsLimit: string
    ): Promise<TransactionsHistoryData> {
        if (transactionType && transactionType !== "CRYPTOTRANSFER") {
            throw new Error("Transaction type not supported for this chain");
        }

        await this.initAlchemy();
        const maxCount = Math.min(parseInt(transactionsLimit, 10), 1000);
        const params: AssetTransfersWithMetadataParams = {
            withMetadata: true,
            order: SortingOrder.DESCENDING,
            category: [
                AssetTransfersCategory.EXTERNAL,
                AssetTransfersCategory.INTERNAL,
                AssetTransfersCategory.ERC20,
                AssetTransfersCategory.ERC721,
                AssetTransfersCategory.ERC1155
                // AssetTransfersCategory.SPECIALNFT
            ],
            maxCount,
            ...(nextPage && {toBlock: nextPage})
            // pageKey?: string;
        };

        let dataToPool: AssetTransfersWithMetadataResponse | null = null;
        let dataFromPool: AssetTransfersWithMetadataResponse | null = null;
        const transfers: AssetTransfersWithMetadataResult[] = [];

        while (transfers.length < maxCount) {
            if (!dataToPool || (!dataToPool.transfers.length && dataToPool.pageKey)) {
                // fetch next To
                dataToPool = await this.alchemy!.core.getAssetTransfers({
                    ...params,
                    ...(dataToPool && dataToPool?.pageKey ? {pageKey: dataToPool.pageKey} : {}),
                    toAddress: accountAddress
                });
            }

            if (!dataFromPool || (!dataFromPool.transfers.length && dataFromPool.pageKey)) {
                // fetch next From
                dataFromPool = await this.alchemy!.core.getAssetTransfers({
                    ...params,
                    ...(dataFromPool && dataFromPool?.pageKey ? {pageKey: dataFromPool.pageKey} : {}),
                    fromAddress: accountAddress
                });
            }

            if (dataToPool.transfers.length && dataFromPool.transfers.length) {
                // find max blockNum and shift to transfers
                if (parseInt(dataToPool.transfers[0].blockNum, 16) > parseInt(dataFromPool.transfers[0].blockNum, 16)) {
                    transfers.push(dataToPool.transfers.shift()!);
                } else {
                    transfers.push(dataFromPool.transfers.shift()!);
                }
                continue;
            }

            if (
                (!dataToPool.transfers.length && !dataToPool.pageKey) ||
                (!dataFromPool.transfers.length && !dataFromPool.pageKey)
            ) {
                // unshift to transfers from existing one by one
                if (dataToPool.transfers.length) {
                    transfers.push(dataToPool.transfers.shift()!);
                } else if (dataFromPool.transfers.length) {
                    transfers.push(dataFromPool.transfers.shift()!);
                }
            }

            if (
                !dataToPool.transfers.length &&
                !dataToPool.pageKey &&
                !dataFromPool.transfers.length &&
                !dataFromPool.pageKey
            )
                break;
        }

        if (transfers.length === maxCount) {
            nextPage = `0x${(parseInt(transfers[transfers.length - 1].blockNum, 16) - 1).toString(16)}`;
        } else {
            nextPage = "";
        }

        return {
            transactions: transfers.map(transfer => {
                return {
                    transactionId: transfer.hash,
                    type: MirrorNodeTransactionType.CRYPTOTRANSFER, // ?????
                    time: new Date(transfer.metadata.blockTimestamp),
                    transfers: !transfer.tokenId
                        ? [
                              {
                                  amount: transfer.value || 0,
                                  account: transfer.to || "",
                                  ...(transfer.rawContract.address && {tokenAddress: transfer.rawContract.address}),
                                  asset: transfer.asset || ""
                              }
                          ]
                        : [],
                    nftTransfers: transfer.tokenId
                        ? [
                              {
                                  tokenAddress: transfer.rawContract.address || "",
                                  serial: transfer.tokenId,
                                  senderAddress: transfer.from,
                                  receiverAddress: transfer.to || ""
                              }
                          ]
                        : [],
                    consensusTimestamp: transfer.metadata.blockTimestamp
                };
            }),
            nextPage
        };
    }

    private getAccountsFromMnemonic(
        mnemonicRaw: string
    ): AccountPrivateRecord[] {
        const mnemonic = ethers.Mnemonic.fromPhrase(mnemonicRaw);
        const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic, "m/44'/60'/0'/0");
        const numAccounts = 10;
        const accounts: AccountPrivateRecord[] = [];

        // Loop to derive accounts
        for (let i = 0; i < numAccounts; i++) {
            // Derive the wallet at the specified index
            const wallet = hdNode.derivePath(`${i}`);
            accounts.push({
                privateKey: wallet.privateKey,
                publicKey: wallet.publicKey,
                evmAddress: wallet.address,
                address: wallet.address,
                path: wallet.path!,
                keyType: CryptoKeyType.ECDSA_SECP256K1
            });
        }
        return accounts;
    }

    private getAccountsFromPrivateKey(privateKey: string): AccountPrivateRecord[] {
        const wallet = new ethers.Wallet(privateKey);
        return [
            {
                privateKey: wallet.privateKey,
                publicKey: wallet.signingKey.publicKey,
                evmAddress: wallet.address,
                address: wallet.address,
                path: ChainMap[this.chain].defaultPath,
                keyType: ChainMap[this.chain].defaultCryptoKeyType
            }
        ]
    }

    private async initAlchemy() {
        if (!this.alchemy) {
            this.alchemy = await getAlchemyInstance(this.chain, this.configService);
        }
    }
}
