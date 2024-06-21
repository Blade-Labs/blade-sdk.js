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
import {KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {formatReceipt} from "../../helpers/TransactionHelpers";

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

    async sign(encodedMessage: string, encoding: SupportedEncoding): Promise<SignMessageData> {
        const message = Buffer.from(encodedMessage, encoding);
        const signatures: SignerSignature[] = await this.signer.sign([message]);
        const signedMessage = Buffer.from(signatures[0].signature).toString("hex");

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
            if (accountInfo.key._type === "ECDSA_SECP256K1") {
                publicKey = PublicKey.fromStringECDSA(accountInfo.key.key);
            } else {
                publicKey = PublicKey.fromStringED25519(accountInfo.key.key);
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
        usePaymaster: boolean = false,
    ): Promise<{scheduleId: string}> {
        usePaymaster = usePaymaster && await this.configService.getConfig("scheduleSign");
        if (usePaymaster) {
            const result = await this.apiService.createScheduleRequest(type, transfers);
            return result;
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
        scheduleId: string,
        receiverAccountId: string,
        usePaymaster: boolean = false,
    ): Promise<TransactionReceiptData> {
        usePaymaster = usePaymaster && await this.configService.getConfig("scheduleSign");
        if (usePaymaster) {
            if (!receiverAccountId) {
                throw new Error("Receiver account id required for free schedule transaction");
            }
            const {scheduleSignTransactionBytes} = await this.apiService.signScheduleRequest(
                scheduleId,
                receiverAccountId
            );
            const buffer = Buffer.from(scheduleSignTransactionBytes, "base64");
            const receipt = await Transaction.fromBytes(buffer)
                .signWithSigner(this.signer)
                .then(signedTx => signedTx.executeWithSigner(this.signer))
                .then(result => result.getReceiptWithSigner(this.signer));
            console.log("scheduleSignTransactionBytes receipt", receipt);
            return formatReceipt(receipt);
        } else {
            return new ScheduleSignTransaction()
                .setScheduleId(scheduleId)
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
