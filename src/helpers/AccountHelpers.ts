import { Client, PrivateKey, Status, Transaction } from "@hashgraph/sdk";
import { Buffer } from "buffer";

export const executeUpdateAccountTransactions = async (
    client: Client,
    privateKey: PrivateKey,
    updateAccountTransactionBytes: string,
    transactionBytes: string
): Promise<void> => {
    if (updateAccountTransactionBytes) {
        let buffer = Buffer.from(updateAccountTransactionBytes, "base64");
        let transaction = await Transaction.fromBytes(buffer).sign(privateKey);
        let response = await transaction.execute(client);

        let attemptsLeft = 3;
        while (attemptsLeft-- > 0) {
            const receipt = await response.getReceipt(client);
            if (receipt.status === Status.Success) {
                break;
            } else {
                if (attemptsLeft === 0) {
                    break;
                } else {
                    if (attemptsLeft === 0) {
                        throw new Error("UpdateAccountTransaction failed");
                    }
                }
            }
        }

        if (transactionBytes) {
            buffer = Buffer.from(transactionBytes, "base64");
            transaction = await Transaction.fromBytes(buffer).sign(privateKey);
            response = await transaction.execute(client);

            attemptsLeft = 3;
            while (attemptsLeft-- > 0) {
                const receipt = await response.getReceipt(client);
                if (receipt.status === Status.Success) {
                    break;
                }
                // skip error, continue creating account
            }
        }
    }
};
