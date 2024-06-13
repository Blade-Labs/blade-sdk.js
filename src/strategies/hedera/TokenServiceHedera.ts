import {
    Hbar,
    HbarUnit,
    PrivateKey,
    PublicKey,
    Signer,
    Status,
    TokenAssociateTransaction,
    TokenCreateTransaction,
    TokenMintTransaction,
    TokenSupplyType,
    TokenType,
    Transaction,
    TransactionResponse as TransactionResponseHedera,
    TransferTransaction
} from "@hashgraph/sdk";
import {Buffer} from "buffer";

import {ITokenService, TransferInitData, TransferTokenInitData} from "../TokenServiceContext";
import {
    BalanceData,
    DAppConfig,
    KeyRecord,
    KeyType,
    NFTStorageConfig,
    NFTStorageProvider,
    TokenDropData,
    TransactionReceiptData,
    TransactionResponseData
} from "../../models/Common";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {formatReceipt} from "../../helpers/TransactionHelpers";
import {dataURLtoFile} from "../../helpers/FileHelper";
import {NFTStorage} from "nft.storage";
import {ChainMap, KnownChainIds} from "../../models/Chain";
import {JobAction, JobStatus} from "../../models/BladeApi";
import {sleep} from "../../helpers/ApiHelper";

export default class TokenServiceHedera implements ITokenService {
    private readonly chainId: KnownChainIds;
    private readonly signer: Signer | null;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(chainId: KnownChainIds, signer: Signer | null, apiService: ApiService, configService: ConfigService) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async getBalance(address: string): Promise<BalanceData> {
        const [account, tokenBalances] = await Promise.all([
            this.apiService.getAccountInfo(address),
            this.apiService.getAccountTokens(address)
        ]);

        return {
            balance: (account.balance.balance / 10 ** 8).toString(),
            rawBalance: account.balance.balance.toString(),
            decimals: 8,
            tokens: tokenBalances
        };
    }

    async transferBalance({from, to, amount, memo}: TransferInitData): Promise<TransactionResponseData> {
        const txAmount = Hbar.fromString(amount, HbarUnit.Hbar);
        return new TransferTransaction()
            .addHbarTransfer(from, txAmount.negated())
            .addHbarTransfer(to, txAmount)
            .setTransactionMemo(memo || "")
            .freezeWithSigner(this.signer!)
            .then(tx => tx.signWithSigner(this.signer!))
            .then(tx => tx.executeWithSigner(this.signer!))
            .then((response: TransactionResponseHedera) => {
                return {
                    transactionId: response.transactionId.toString(),
                    transactionHash: response.transactionHash.toString()
                };
            });
    }

    async transferToken({
        amountOrSerial,
        from,
        to,
        tokenAddress,
        memo,
        freeTransfer
    }: TransferTokenInitData): Promise<TransactionResponseData> {
        const meta = await this.apiService.requestTokenInfo(tokenAddress);
        let isNFT = false;
        if (meta.type === "NON_FUNGIBLE_UNIQUE") {
            isNFT = true;
            if (freeTransfer) {
                throw new Error("NFT free transfer is not supported");
            }
        }
        freeTransfer = freeTransfer && (await this.configService.getConfig("tokenTransfer"));
        const correctedAmount = parseFloat(amountOrSerial) * 10 ** parseInt(meta.decimals, 10);

        if (freeTransfer) {
            const options = {
                receiverAccountId: to,
                senderAccountId: from,
                amount: correctedAmount,
                decimals: null,
                memo,
                tokenAddress
            };

            let transferTokenJob = await this.apiService.transferTokens(JobAction.INIT, "", options);

            while (true) {
                if (transferTokenJob.status === JobStatus.SUCCESS) {
                    break;
                }
                if (transferTokenJob.status === JobStatus.FAILED) {
                    throw new Error(transferTokenJob.errorMessage);
                }

                // TODO set timeout from sdk-config
                await sleep(1000);
                transferTokenJob = await this.apiService.transferTokens(JobAction.CHECK, transferTokenJob.taskId);
            }

            const buffer = Buffer.from(transferTokenJob.result.transactionBytes, "base64");
            const transaction = Transaction.fromBytes(buffer);

            return transaction
                .freezeWithSigner(this.signer!)
                .then(tx => tx.signWithSigner(this.signer!))
                .then(tx => tx.executeWithSigner(this.signer!))
                .then(async data => {

                    await this.apiService.transferTokens(JobAction.CONFIRM, transferTokenJob.taskId).catch(() => {
                        // ignore this error, continue (no content)
                    });

                    return {
                        transactionId: data.transactionId.toString(),
                        transactionHash: data.transactionHash.toString()
                    };
                });
        } else {
            const tokenTransferTx = new TransferTransaction().setTransactionMemo(memo || "");

            if (isNFT) {
                tokenTransferTx.addNftTransfer(tokenAddress, parseInt(amountOrSerial, 10), from, to);
            } else {
                tokenTransferTx
                    .addTokenTransfer(tokenAddress, to, correctedAmount)
                    .addTokenTransfer(tokenAddress, from, -1 * correctedAmount);
            }

            // TODO add fees if needed
            // tx = await this.feesService.addBladeFee(tx, chain, address);

            return tokenTransferTx
                .freezeWithSigner(this.signer!)
                .then(tx => tx.signWithSigner(this.signer!))
                .then(tx => tx.executeWithSigner(this.signer!))
                .then(data => {
                    return {
                        transactionId: data.transactionId.toString(),
                        transactionHash: data.transactionHash.toString()
                    };
                });
        }
    }

    async associateToken(tokenId: string, accountId: string): Promise<TransactionReceiptData> {
        let result: TransactionResponseHedera;
        const tokensConfig = await (this.configService.getConfig("tokens") as Promise<DAppConfig["tokens"]>);
        if (tokensConfig.association.includes(tokenId) || !tokenId) {
            let tokenAssociationJob = await this.apiService.tokenAssociation(JobAction.INIT, "", {accountId, tokenIds: [tokenId]});
            while (true) {
                if (tokenAssociationJob.status === JobStatus.SUCCESS) {
                    break;
                }
                if (tokenAssociationJob.status === JobStatus.FAILED) {
                    throw new Error(tokenAssociationJob.errorMessage);
                }
                // TODO set timeout from sdk-config
                await sleep(1000);
                tokenAssociationJob = await this.apiService.tokenAssociation(JobAction.CHECK, tokenAssociationJob.taskId);
            }

            if (!tokenAssociationJob.result.transactionBytes) {
                throw new Error("Token association failed");
            }

            const buffer = Buffer.from(tokenAssociationJob.result.transactionBytes, "base64");
            const transaction = Transaction.fromBytes(buffer)

            result = await transaction.signWithSigner(this.signer!)
                .then(tx => tx.executeWithSigner(this.signer!))
                .then(async result => {
                    await this.apiService.tokenAssociation(JobAction.CONFIRM, tokenAssociationJob.taskId).catch(() => {
                        // ignore this error, continue (no content)
                    });
                    return result;
                });
        } else {
            const transaction = await new TokenAssociateTransaction()
                .setAccountId(accountId)
                .setTokenIds([tokenId])
                .freezeWithSigner(this.signer!);
            result = await transaction.signWithSigner(this.signer!).then(tx => tx.executeWithSigner(this.signer!));
        }

        return result.getReceiptWithSigner(this.signer!).then(txReceipt => {
            if (txReceipt.status !== Status.Success) {
                throw new Error(`Association failed`);
            }
            return formatReceipt(txReceipt, result.transactionHash.toString());
        });
    }

    async createToken(
        tokenName: string,
        tokenSymbol: string,
        isNft: boolean,
        treasuryAccountId: string,
        supplyPublicKey: string,
        keys: KeyRecord[] | string,
        decimals: number,
        initialSupply: number,
        maxSupply: number
    ): Promise<{tokenId: string}> {
        const supplyKey = PublicKey.fromString(supplyPublicKey);

        let adminKey: PrivateKey | null = null;

        const tokenType = isNft ? TokenType.NonFungibleUnique : TokenType.FungibleCommon;
        if (isNft) {
            decimals = 0;
            initialSupply = 0;
        }

        if (typeof keys === "string") {
            keys = JSON.parse(keys) as KeyRecord[];
        }

        let nftCreate = new TokenCreateTransaction()
            .setTokenName(tokenName)
            .setTokenSymbol(tokenSymbol)
            .setTokenType(tokenType)
            .setDecimals(decimals)
            .setInitialSupply(initialSupply)
            .setTreasuryAccountId(treasuryAccountId)
            .setSupplyType(TokenSupplyType.Finite)
            .setMaxSupply(maxSupply)
            .setSupplyKey(supplyKey);
        for (const key of keys) {
            const privateKey = PrivateKey.fromString(key.privateKey);

            switch (key.type) {
                case KeyType.admin:
                    nftCreate.setAdminKey(privateKey);
                    adminKey = privateKey;
                    break;
                case KeyType.kyc:
                    nftCreate.setKycKey(privateKey);
                    break;
                case KeyType.freeze:
                    nftCreate.setFreezeKey(privateKey);
                    break;
                case KeyType.wipe:
                    nftCreate.setWipeKey(privateKey);
                    break;
                case KeyType.pause:
                    nftCreate.setPauseKey(privateKey);
                    break;
                case KeyType.feeSchedule:
                    nftCreate.setFeeScheduleKey(privateKey);
                    break;
                default:
                    throw new Error("Unknown key type");
            }
        }
        nftCreate = await nftCreate.freezeWithSigner(this.signer!);
        let nftCreateTxSign: TokenCreateTransaction;

        if (adminKey) {
            nftCreateTxSign = await nftCreate.sign(adminKey);
        } else {
            nftCreateTxSign = await nftCreate.signWithSigner(this.signer!);
        }

        const nftCreateSubmit = await nftCreateTxSign.executeWithSigner(this.signer!);
        const nftCreateRx = await nftCreateSubmit.getReceiptWithSigner(this.signer!);

        const tokenId = nftCreateRx.tokenId?.toString();
        if (!tokenId) {
            throw nftCreateRx;
        }
        return {tokenId};
    }

    async nftMint(
        tokenId: string,
        file: File | string,
        metadata: object,
        storageConfig: NFTStorageConfig
    ): Promise<TransactionReceiptData> {
        if (typeof file === "string") {
            file = dataURLtoFile(file, "filename");
        }
        if (typeof metadata === "string") {
            metadata = JSON.parse(metadata) as object;
        }

        const groupSize = 1;
        const amount = 1;

        let storageClient: NFTStorage;
        if (storageConfig.provider === NFTStorageProvider.nftStorage) {
            // TODO implement through interfaces
            storageClient = new NFTStorage({token: storageConfig.apiKey});
        } else {
            throw new Error("Unknown nft storage provider");
        }

        const fileName = file.name;
        const dirCID = await storageClient.storeDirectory([file]);

        metadata = {
            name: fileName,
            type: file.type,
            creator: "Blade Labs",
            ...metadata,
            image: `ipfs://${dirCID}/${encodeURIComponent(fileName)}`
        };
        const metadataCID = await storageClient.storeBlob(
            new File([JSON.stringify(metadata)], "metadata.json", {type: "application/json"})
        );

        const CIDs = [metadataCID];
        const mdArray = new Array(amount).fill(0).map((el, index) => Buffer.from(CIDs[index % CIDs.length]));
        const mdGroup = mdArray.splice(0, groupSize);

        const txResult = await new TokenMintTransaction()
            .setTokenId(tokenId)
            .setMetadata(mdGroup)
            .setMaxTransactionFee(Hbar.from(2 * groupSize, HbarUnit.Hbar))
            .freezeWithSigner(this.signer!)
            .then(tx => tx.signWithSigner(this.signer!))
            .then(tx => tx.executeWithSigner(this.signer!));

        return txResult.getReceiptWithSigner(this.signer!).then(txReceipt => {
            if (txReceipt.status !== Status.Success) {
                throw new Error(`Mint failed`);
            }
            return formatReceipt(txReceipt, txResult.transactionHash.toString());
        });
    }
    /**
     * Bladelink drop to account
     * @param accountId Hedera account id (0.0.xxxxx)
     * @param accountPrivateKey account private key (DER encoded hex string)
     * @param secretNonce configured for dApp. Should be kept in secret
     * @param completionKey optional field bridge between mobile webViews and native apps
     * @returns {TokenDropData}
     */
    async dropTokens(accountId: string, secretNonce: string): Promise<TokenDropData> {
        const signatures = await this.signer.sign([Buffer.from(secretNonce)]);

        let dropJob = await this.apiService.dropTokens(JobAction.INIT, "", {
            accountId,
            signedNonce: Buffer.from(signatures[0].signature).toString("base64")
        });

        while (true) {
            console.log(dropJob);

            if (dropJob.status === JobStatus.SUCCESS) {
                break;
            }
            if (dropJob.status === JobStatus.FAILED) {
                throw new Error(dropJob.errorMessage);
            }
            // TODO set timeout from sdk-config
            await sleep(1000);
            dropJob = await this.apiService.dropTokens(JobAction.CHECK, dropJob.taskId);
        }

        console.log(dropJob)

        // TODO to implement
        return {
            status: dropJob.status,
            accountId: dropJob.result.accountId,
            dropStatuses: dropJob.result.dropStatuses,
            redirectUrl: "string"
        };
    }
}
