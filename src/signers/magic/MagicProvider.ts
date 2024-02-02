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

    constructor(hederaNetwork: any) {
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

    getAccountBalance(accountId: any) {
        return new AccountBalanceQuery()
            .setAccountId(accountId)
            .execute(this._client);
    }

    getAccountInfo(accountId: any) {
        return new AccountInfoQuery()
            .setAccountId(accountId)
            .execute(this._client);
    }

    getAccountRecords(accountId: any) {
        return new AccountRecordsQuery()
            .setAccountId(accountId)
            .execute(this._client);
    }

    getTransactionReceipt(transactionId: any) {
        return new TransactionReceiptQuery()
            .setTransactionId(transactionId)
            .execute(this._client);
    }

    waitForReceipt(response: any) {
        return new TransactionReceiptQuery()
            .setNodeAccountIds([response.nodeId])
            .setTransactionId(response.transactionId)
            .execute(this._client);
    }

    call(request: any) {
        return request.execute(this._client);
    }
}