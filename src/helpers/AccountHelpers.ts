import {
    AccountBalance, Client,
    PrivateKey, Status, Transaction
} from "@hashgraph/sdk";
import {Buffer} from "buffer";

export const executeUpdateAccountTransactions = async (
    client: Client,
    privateKey: PrivateKey,
    updateAccountTransactionBytes: string,
    transactionBytes: string
): Promise<void> => {
    if (updateAccountTransactionBytes) {

        let attemptsLeft = 3;
        while (attemptsLeft-- > 0) {
            const buffer = Buffer.from(updateAccountTransactionBytes, "base64");
            const transaction = await Transaction.fromBytes(buffer).sign(privateKey);
            const response = await transaction.execute(client);

            const receipt = await response.getReceipt(client);

            if (receipt.status === Status.Success) {
                break;
            } else {
                if (attemptsLeft === 0) {

                    throw new Error("UpdateAccountTransaction failed");
                }
            }
        }
    }

    if (transactionBytes) {
        let attemptsLeft = 3;
        while (attemptsLeft-- > 0) {
            const buffer = Buffer.from(transactionBytes, "base64");
            const transaction = await Transaction.fromBytes(buffer).sign(privateKey);
            const response = await transaction.execute(client);
            const receipt = await response.getReceipt(client);

            if (receipt.status === Status.Success) {
                break;
            }
            // skip error, continue creating account
        }
    }
}

