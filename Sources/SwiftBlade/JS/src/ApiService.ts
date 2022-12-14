import {Buffer} from "buffer";
import {PublicKey} from "@hashgraph/sdk";
import {flattenDeep} from "lodash";
import {Network, NetworkMirrorNodes} from "./models/Networks";
import {TransactionData} from "./models/Common";

const ApiUrl = "https://rest.prod.bladewallet.io/openapi/v7";

const fetchWithRetry = async (url, options, maxAttempts = 3) => {
    return new Promise((resolve, reject) => {
        let attemptCounter = 0;

        const interval = 5000;
        const makeRequest = (url, options) => {
            attemptCounter += 1;
            fetch(url, options)
                .then(async (res) => {
                    if (!res.ok) {
                        // Request timeout check
                        if ((res.status === 408 || res.status === 429) && attemptCounter < maxAttempts) {
                            setTimeout(() => {
                                makeRequest(url, options);
                            }, interval * attemptCounter);
                        } else {
                            reject(await res.json());
                        }
                    } else {
                        resolve(res);
                    }
                });
        };
        makeRequest(url, options);
    });
};

const statusCheck = async (res) => {
    if (!res.ok) {
        throw await res.json();
    }
    return res;
};

export const GET = (network: Network, route: string) => {
    return fetchWithRetry(`${NetworkMirrorNodes[network]}/${route}`, {})
        .then(statusCheck)
        .then(x => x.json());
};

export const createAccount = async (network: Network, params: any) => {
    const url = `${ApiUrl}/accounts`;
    const options = {
        method: "POST",
        headers: new Headers({
            "X-SDK-TOKEN": params.apiKey,
            "X-FINGERPRINT": params.fingerprint,
            "X-NETWORK": network.toUpperCase(),
            "X-DAPP-CODE": params.dAppCode,
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            publicKey: params.publicKey
        })
    };

    return fetchWithRetry(url, options)
        .then(statusCheck)
        .then(x => x.json());
};

export const requestTokenInfo = async (network: Network, tokenId: string) => {
    return GET(network,`api/v1/tokens/${tokenId}`);
};

export const signContractCallTx = async (network: Network, params: any) => {
    const url = `${ApiUrl}/smart/contract/sign`;
    const options = {
        method: "POST",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TOKEN": params.apiKey,
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            functionParametersHash: Buffer.from(params.paramBytes).toString("base64"),
            contractId: params.contractId,
            functionName: params.functionName
        })
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json());
};

export const getAccountsFromPublicKey = async (network: Network, publicKey: PublicKey): Promise<string[]> => {
    const formatted = publicKey.toStringRaw();
    return GET(network, `api/v1/accounts?account.publickey=${formatted}`)
        .then(x => x.accounts.map(acc => acc.account))
        .catch(error => {
            return [];
        });
};

export const getTransactionsFrom = async (
    network: Network,
    accountId: string,
    nextPage?: string | null
): Promise<{ nextPage: string | null, transactions: TransactionData[] }> => {
    let info;
    if (nextPage) {
        info = await GET(network, nextPage);
    } else {
        info = await GET(network, `api/v1/transactions/?account.id=${accountId}`);
    }

    const groupedTransactions: {[key: string]: TransactionData[]} = {};

    await Promise.all(info.transactions.map(async(t: any) => {
        groupedTransactions[t.transaction_id] = await getTransaction(network, t.transaction_id, accountId);
    }));

    const transactions: TransactionData[] = flattenDeep(Object.values(groupedTransactions))
        .sort((a, b) => new Date(b.time).valueOf() - new Date(a.time).valueOf())
    ;

    return {
        nextPage: info.links.next?.substring(1) ?? null,
        transactions: transactions
    };

};

const getTransaction = (network: Network, transactionId: string, accountId: string): Promise<TransactionData[]> => {
    return GET(network, `api/v1/transactions/${transactionId}`)
        .then(x => x.transactions.map((t: any) => {
            return {
                time: new Date(parseFloat(t.consensus_timestamp) * 1000),
                transfers: ([...(t.token_transfers || []), ...(t.transfers || [])])
                    .filter(tt => tt.account !== accountId)
                    .map(tt => {
                        tt.amount = !tt.token_id ? tt.amount / 10 ** 8 : tt.amount; return tt;
                    }),
                nftTransfers: t.nft_transfers || null,
                memo: global.atob(t.memo_base64),
                transactionId: t.transaction_id,
                fee: t.charged_tx_fee,
                type: t.name
            };
        }))
        .catch(err => {
            return [];
        });
}
