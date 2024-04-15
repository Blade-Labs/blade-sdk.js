import { TransactionReceipt } from "@hashgraph/sdk";
import { TransactionData, TransactionReceiptData } from "../models/Common";
import { MirrorNodeTransactionType } from "../models/TransactionType";

export const filterAndFormatTransactions = (
    transactions: TransactionData[],
    transactionType: string,
    accountId: string
): TransactionData[] => {
    switch (transactionType) {
        case "CRYPTOTRANSFERTOKEN":
            {
                transactions = transactions.filter((tx) => {
                    if (tx.type !== MirrorNodeTransactionType.CRYPTOTRANSFER) {
                        return false;
                    }
                    const tokenTransfers = tx.transfers.filter((transfer) => transfer.token_id);
                    if (tokenTransfers.length === 0) {
                        return false;
                    }

                    const senderAccounts: string[] = [];
                    const receiverAccounts: string[] = [];
                    let amount = 0;

                    tokenTransfers.forEach((transfer) => {
                        if (accountId === transfer.account) {
                            amount = transfer.amount;
                        }

                        if (transfer.amount > 0) {
                            receiverAccounts.push(transfer.account.toString());
                        } else {
                            senderAccounts.push(transfer.account.toString());
                        }
                    });

                    tx.plainData = {
                        type: transactionType,
                        token_id: tokenTransfers[0].token_id,
                        senders: senderAccounts,
                        receivers: receiverAccounts,
                        amount,
                    };
                    return true;
                });
            }
            break;
        default: {
            if (transactionType) {
                transactions = transactions.filter((tx) => tx.type === (transactionType as MirrorNodeTransactionType));
            }
        }
    }

    return transactions;
};

export const formatReceipt = (txReceipt: TransactionReceipt): TransactionReceiptData => {
    return {
        status: txReceipt.status?.toString(),
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        contractId: txReceipt.contractId?.toString(),
        topicSequenceNumber: txReceipt.topicSequenceNumber?.toString(),
        totalSupply: txReceipt.totalSupply?.toString(),
        serials: txReceipt.serials?.map((serial) => serial.toString()),
    };
};
