import {Signer, TransactionReceipt, TransactionResponse} from "@hashgraph/sdk";
import {TransactionData, TransactionReceiptData} from "../models/Common";
import {MirrorNodeTransactionType} from "../models/MirrorNode";

export const filterAndFormatTransactions = (
    transactions: TransactionData[],
    transactionType: string,
    accountId: string
): TransactionData[] => {
    switch (transactionType) {
        case "CRYPTOTRANSFERTOKEN":
            {
                transactions = transactions.filter(tx => {
                    if (tx.type !== MirrorNodeTransactionType.CRYPTOTRANSFER) {
                        return false;
                    }
                    const tokenTransfers = tx.transfers.filter(transfer => transfer.tokenAddress);
                    if (tokenTransfers.length === 0) {
                        return false;
                    }

                    const senderAccounts: string[] = [];
                    const receiverAccounts: string[] = [];
                    let amount = 0;

                    tokenTransfers.forEach(transfer => {
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
                        token_id: tokenTransfers[0].tokenAddress,
                        senders: senderAccounts,
                        receivers: receiverAccounts,
                        amount
                    };
                    return true;
                });
            }
            break;
        default: {
            if (transactionType) {
                transactions = transactions.filter(tx => tx.type === (transactionType as MirrorNodeTransactionType));
            }
        }
    }

    return transactions;
};

// todo refactor for multichain
export const formatReceipt = (txReceipt: TransactionReceipt, transactionHash?: string): TransactionReceiptData => {
    return {
        status: txReceipt.status?.toString(),
        contractAddress: txReceipt.contractId?.toString(),
        topicSequenceNumber: txReceipt.topicSequenceNumber?.toString(),
        totalSupply: txReceipt.totalSupply?.toString(),
        serials: txReceipt.serials?.map(serial => serial.toString()),
        transactionHash: transactionHash || ""
    };
};

// todo refactor for multichain
export const getReceipt = async (txResult: TransactionResponse, signer: Signer) => {
    const receipt = await txResult.getReceiptWithSigner(signer);
    return formatReceipt(receipt, txResult.transactionId.toString());
};
