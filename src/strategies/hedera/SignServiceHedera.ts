import {
    AccountId,
    Hbar,
    PublicKey,
    ScheduleCreateTransaction,
    ScheduleSignTransaction,
    Signer,
    SignerSignature,
    Transaction,
    TransferTransaction
} from "@hashgraph/sdk";
import secp256k1 from "secp256k1";

import {ISignService} from "../SignServiceContext";
import {
    ScheduleTransactionTransfer,
    ScheduleTransactionType,
    ScheduleTransferType,
    SignMessageData,
    SignVerifyMessageData,
    SupportedEncoding,
    TransactionReceiptData
} from "../../models/Common";
import {CryptoKeyType, KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {formatReceipt} from "../../helpers/TransactionHelpers";
import {Buffer} from "buffer";
import {JobAction, JobStatus} from "../../models/BladeApi";
import {sleep} from "../../helpers/ApiHelper";
import {ethers} from "ethers";

export default class SignServiceHedera implements ISignService {
    private readonly chainId: KnownChainIds;
    private readonly signer: Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(chainId: KnownChainIds, signer: Signer, apiService: ApiService, configService: ConfigService) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async sign(encodedMessage: string, encoding: SupportedEncoding, likeEthers: boolean, publicKeyDer: string): Promise<SignMessageData> {
        const message = Buffer.from(encodedMessage, encoding);
        let signedMessage: string = "";
        if (likeEthers) {
            // to sign like ethers, we need to prefix the message with the length of the message - "\x19Ethereum Signed Message:\n" + message.length
            const prefix = Buffer.from("\x19Ethereum Signed Message:\n" + message.length);
            const prefixedMessage = Buffer.concat([prefix, message]);
            const messageBuffer = Buffer.from(prefixedMessage);
            const signatures: SignerSignature[] = await this.signer.sign([messageBuffer]);

            // also we need to add recovery id to the signature (27 or 28, last byte)
            // we need to recover the public key from the signature and compare it with the provided public key
            const publicKey = PublicKey.fromString(publicKeyDer);
            if (publicKey._key._type === CryptoKeyType.ED25519.toString()) {
                throw new Error("ED25519 public key is not supported for Ethereum signing.");
            }
            let recoveryId = -1;
            const messageHash = ethers.utils.keccak256(messageBuffer);
            for (let i = 0; i < 2; i++) {
                const recoveredPubKey = secp256k1.ecdsaRecover(
                    Uint8Array.from(signatures[0].signature),
                    i, // recovery id
                    Buffer.from(messageHash.slice(2), 'hex'), // message hash without 0x
                    true
                );

                if (Buffer.from(recoveredPubKey).toString("hex") === publicKey.toStringRaw()) {
                    recoveryId = i + 27; // Ethereum uses 27 and 28 for recovery id
                    break;
                }
            }

            if (recoveryId === -1) {
                throw new Error("Failed to find a valid recovery id.");
            }

            // concat signature and recovery id
            signedMessage = Buffer.concat([Buffer.from(signatures[0].signature), Uint8Array.from([recoveryId])] ).toString("hex");
        } else {
            const signatures: SignerSignature[] = await this.signer.sign([message]);
            signedMessage = Buffer.from(signatures[0].signature).toString("hex");
        }

        return {
            signedMessage
        };
    }

    async verify(
        encodedMessage: string,
        encoding: SupportedEncoding,
        signature: string,
        addressOrPublicKey: string
    ): Promise<SignVerifyMessageData> {
        let publicKey: PublicKey;
        // if address - get public key
        try {
            const accountId = AccountId.fromString(addressOrPublicKey).toString();
            const accountInfo = await this.apiService.getAccountInfo(accountId);
            if (accountInfo.key._type === CryptoKeyType.ED25519) {
                publicKey = PublicKey.fromStringED25519(accountInfo.key.key);
            } else {
                publicKey = PublicKey.fromStringECDSA(accountInfo.key.key);
            }
        } catch (err) {
            publicKey = PublicKey.fromString(addressOrPublicKey);
        }

        const valid = publicKey.verify(Buffer.from(encodedMessage, encoding), Buffer.from(signature, "hex"));
        return {
            valid
        };
    }

    async createScheduleTransaction(
        type: ScheduleTransactionType,
        transfers: ScheduleTransactionTransfer[],
        usePaymaster: boolean = false
    ): Promise<{scheduleId: string}> {
        usePaymaster = usePaymaster && (await this.configService.getConfig("scheduleSign"));
        if (usePaymaster) {
            let createScheduleRequestJob = await this.apiService.createScheduleRequestJob(JobAction.INIT, "", {
                type,
                transfers
            });
            while (true) {
                if (createScheduleRequestJob.status === JobStatus.SUCCESS) {
                    break;
                }
                if (createScheduleRequestJob.status === JobStatus.FAILED) {
                    throw new Error(createScheduleRequestJob.errorMessage);
                }
                await sleep((await this.configService.getConfig("refreshTaskPeriodSeconds")) * 1000);
                createScheduleRequestJob = await this.apiService.createScheduleRequestJob(
                    JobAction.CHECK,
                    createScheduleRequestJob.taskId
                );
            }

            if (!createScheduleRequestJob.result) {
                throw new Error("No result from backend");
            }
            return createScheduleRequestJob.result;
        } else {
            switch (type) {
                case ScheduleTransactionType.TRANSFER: {
                    const transactionToSchedule = new TransferTransaction();
                    transfers.forEach(transfer => {
                        switch (transfer.type) {
                            case ScheduleTransferType.HBAR:
                                if (!transfer.value) {
                                    throw new Error("Value required for HBAR transfer");
                                }
                                const amount = Hbar.fromTinybars(transfer.value!);
                                transactionToSchedule
                                    .addHbarTransfer(transfer.sender, amount.negated())
                                    .addHbarTransfer(transfer.receiver, amount);
                                break;
                            case ScheduleTransferType.FT:
                                if (!transfer.value || !transfer.tokenId) {
                                    throw new Error("Token id and value required for FT transfer");
                                }
                                transactionToSchedule
                                    .addTokenTransfer(transfer.tokenId!, transfer.sender, -transfer.value!)
                                    .addTokenTransfer(transfer.tokenId!, transfer.receiver, transfer.value!);
                                break;
                            case ScheduleTransferType.NFT:
                                if (!transfer.tokenId || !transfer.serial) {
                                    throw new Error("Token id and serial required for NFT transfer");
                                }
                                transactionToSchedule.addNftTransfer(
                                    transfer.tokenId!,
                                    transfer.serial!,
                                    transfer.sender,
                                    transfer.receiver
                                );
                                break;
                            default:
                                throw new Error(`Schedule transaction transfer type "${type}" not supported`);
                        }
                    });

                    return new ScheduleCreateTransaction()
                        .setScheduledTransaction(transactionToSchedule)
                        .freezeWithSigner(this.signer)

                        .then(tx => tx.executeWithSigner(this.signer))
                        .then(result => result.getReceiptWithSigner(this.signer))
                        .then(data => {
                            return {
                                scheduleId: data.scheduleId?.toString() || ""
                            };
                        });
                }
                default:
                    throw new Error(`Schedule transaction type "${type}" not supported`);
            }
        }
    }

    async signScheduleId(
        scheduledTransactionId: string,
        receiverAccountId: string,
        usePaymaster: boolean = false
    ): Promise<TransactionReceiptData> {
        usePaymaster = usePaymaster && (await this.configService.getConfig("scheduleSign"));
        if (usePaymaster) {
            if (!receiverAccountId) {
                throw new Error("Receiver account id required for free schedule transaction");
            }

            let signScheduleRequestJob = await this.apiService.signScheduleRequestJob(JobAction.INIT, "", {
                receiverAccountId,
                scheduledTransactionId
            });
            while (true) {
                if (signScheduleRequestJob.status === JobStatus.SUCCESS) {
                    break;
                }
                if (signScheduleRequestJob.status === JobStatus.FAILED) {
                    throw new Error(signScheduleRequestJob.errorMessage);
                }
                await sleep((await this.configService.getConfig("refreshTaskPeriodSeconds")) * 1000);
                signScheduleRequestJob = await this.apiService.signScheduleRequestJob(
                    JobAction.CHECK,
                    signScheduleRequestJob.taskId
                );
            }
            if (!signScheduleRequestJob.result) {
                throw new Error("No result from backend");
            }

            const buffer = Buffer.from(signScheduleRequestJob.result.scheduleSignTransactionBytes, "base64");
            const receipt = await Transaction.fromBytes(buffer)
                .signWithSigner(this.signer)
                .then(signedTx => signedTx.executeWithSigner(this.signer))
                .then(result => result.getReceiptWithSigner(this.signer));
            await this.apiService.signScheduleRequestJob(JobAction.CONFIRM, signScheduleRequestJob.taskId).catch(e => {
                // ignore this error, continue (no content)
            });
            return formatReceipt(receipt);
        } else {
            return new ScheduleSignTransaction()
                .setScheduleId(scheduledTransactionId)
                .freezeWithSigner(this.signer)
                .then(tx => tx.signWithSigner(this.signer))
                .then(tx => tx.executeWithSigner(this.signer))
                .then(result => result.getReceiptWithSigner(this.signer))
                .then(data => {
                    return formatReceipt(data);
                });
        }
    }
}
