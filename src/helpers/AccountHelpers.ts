import NodeClient from "@hashgraph/sdk/lib/client/NodeClient";

import {
    PrivateKey, Transaction
} from "@hashgraph/sdk";
import {Buffer} from "buffer";

export const executeUpdateAccountTransactions = async (
    client: NodeClient,
    privateKey: PrivateKey,
    updateAccountTransactionBytes: string,
    transactionBytes: string
): Promise<void> => {
    if (updateAccountTransactionBytes) {
        const buffer = Buffer.from(updateAccountTransactionBytes, "base64");
        const transaction = await Transaction.fromBytes(buffer).sign(privateKey);
        await transaction.execute(client);
    }

    if (transactionBytes) {
        const buffer = Buffer.from(transactionBytes, "base64");
        const transaction = await Transaction.fromBytes(buffer).sign(privateKey);
        await transaction.execute(client);
    }

}

