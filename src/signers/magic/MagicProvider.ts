import {
    Client,
    AccountBalanceQuery,
    AccountInfoQuery,
    AccountRecordsQuery,
    TransactionReceiptQuery,
    Provider,
    Executable,
    TransactionReceipt,
    TransactionResponse,
    TransactionId,
    AccountId
} from "@hashgraph/sdk";

export class MagicProvider implements Provider {
    _client: Client;

    constructor(hederaNetwork: string) {
        if (!hederaNetwork) {
            throw new Error("LocalProvider requires the `HEDERA_NETWORK` environment variable to be set");
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

    getAccountBalance(accountId: AccountId | string) {
        return new AccountBalanceQuery().setAccountId(accountId).execute(this._client);
    }

    getAccountInfo(accountId: AccountId | string) {
        return new AccountInfoQuery().setAccountId(accountId).execute(this._client);
    }

    getAccountRecords(accountId: AccountId | string) {
        return new AccountRecordsQuery().setAccountId(accountId).execute(this._client);
    }

    getTransactionReceipt(transactionId: TransactionId | string) {
        return new TransactionReceiptQuery().setTransactionId(transactionId).execute(this._client);
    }

    waitForReceipt(response: TransactionResponse): Promise<TransactionReceipt> {
        return new TransactionReceiptQuery()
            .setNodeAccountIds([response.nodeId])
            .setTransactionId(response.transactionId)
            .execute(this._client);
    }

    call<RequestT, ResponseT, OutputT>(request: Executable<RequestT, ResponseT, OutputT>): Promise<OutputT> {
        return request.execute(this._client);
    }
}
