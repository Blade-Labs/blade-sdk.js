import {TransactionData} from "../models/Common";

export const filterAndFormatTransactions = (transactions: TransactionData[], transactionType: string): TransactionData[] => {

    switch (transactionType) {
        case "CRYPTOTRANSFERTOKEN": {
            transactions = transactions
                .filter(tx => {
                    if (tx.type !== "CRYPTOTRANSFER") {
                        return false;
                    }
                    const tokenTransfer = tx.transfers.find(transfer => transfer.token_id);
                    if (tokenTransfer) {
                        tx.plainData = {
                            type: transactionType,
                            token_id: tokenTransfer.token_id,
                            account: tokenTransfer.account,
                            amount: tokenTransfer.amount
                        }
                        return true;
                    } else {
                        return false;
                    }
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


