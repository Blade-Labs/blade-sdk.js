import {
    Client,
    AccountBalanceQuery,
    AccountInfoQuery,
    AccountRecordsQuery,
    TransactionReceiptQuery,
    Provider,
} from "@hashgraph/sdk";

export class MagicProvider implements Provider {
    _client: Client;

    constructor(hederaNetwork) {
        if (!hederaNetwork) {
            throw new Error(
                "LocalProvider requires the `HEDERA_NETWORK` environment variable to be set"
            );
        }

        this._client = Client.forName(hederaNetwork.toLowerCase());
    }

    getLedgerId() {
        return this._client.ledgerId;
    }

    getNetwork() {
        return this._client.network;
    }

    getMirrorNetwork() {
        return this._client.mirrorNetwork;
    }

    getAccountBalance(accountId) {
        return new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(this._client);
    }

    getAccountInfo(accountId) {
        return new AccountInfoQuery()
            .setAccountId(accountId)
            .execute(this._client);
    }

    getAccountRecords(accountId) {
        return new AccountRecordsQuery()
            .setAccountId(accountId)
            .execute(this._client);
    }

    getTransactionReceipt(transactionId) {
        return new TransactionReceiptQuery()
            .setTransactionId(transactionId)
            .execute(this._client);
    }

    waitForReceipt(response) {
        return new TransactionReceiptQuery()
            .setNodeAccountIds([response.nodeId])
            .setTransactionId(response.transactionId)
            .execute(this._client);
    }

    call(request) {
        return request.execute(this._client);
    }
}