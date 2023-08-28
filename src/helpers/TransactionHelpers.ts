import {TransactionData} from "../models/Common";

export const filterAndFormatTransactions = (transactions: TransactionData[], transactionType: string, accountId: string): TransactionData[] => {

    switch (transactionType) {
        case "CRYPTOTRANSFERTOKEN": {
            transactions = transactions
                .filter(tx => {
                    if (tx.type !== "CRYPTOTRANSFER") {
                        return false;
                    }
                    const tokenTransfers = tx.transfers
                        .filter(transfer => transfer.token_id);
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
                        }   else {
                            senderAccounts.push(transfer.account.toString());
                        }
                    });

                    tx.plainData = {
                        type: transactionType,
                        token_id: tokenTransfers[0].token_id,
                        senders: senderAccounts,
                        receivers: receiverAccounts,
                        amount
                    }
                    return true;
                });
        } break;
        default: {
            if (transactionType) {
                transactions = transactions.filter(tx => tx.type === transactionType);
            }
        }
    }

    return  transactions;
};


