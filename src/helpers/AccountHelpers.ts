import NodeClient from "@hashgraph/sdk/lib/client/NodeClient";

import {
    AccountBalance,
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

/**
 * Object to parse balance response
 *
 * @param {JSON} data
 * @returns {JSON}
 */
export const processBalanceData = (data: AccountBalance) => {
    const hbars = data.hbars.toBigNumber().toNumber();
    const tokens: any[] = [];
    const dataJson = data.toJSON();
    dataJson.tokens.forEach(token => {
        var balance = Number(token.balance);
        const tokenDecimals = Number(token.decimals);
        if (tokenDecimals) balance = balance / (10 ** tokenDecimals);
        tokens.push({
            tokenId: token.tokenId,
            balance: balance
        });
    });
    return {
        hbars: hbars,
        tokens: tokens
    };
}
