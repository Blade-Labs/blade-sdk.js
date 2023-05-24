import {Buffer} from "buffer";
import {AccountId, PublicKey} from "@hashgraph/sdk";
import {Network, NetworkMirrorNodes} from "./models/Networks";
import {AccountInfoMirrorResponse} from "./models/MirrorNode";
import {ConfirmUpdateAccountData, SdkEnvironment, TransactionData} from "./models/Common";
import {flatArray} from "./helpers/ArrayHelpers";
import {filterAndFormatTransactions} from "./helpers/TransactionHelpers";

let sdkVersion = ``;
let environment: SdkEnvironment = SdkEnvironment.Prod;

export const setSDKVersion = (version: string) => {
    sdkVersion = version;
}

export const setEnvironment = (sdkEnvironment: SdkEnvironment) => {
    environment = sdkEnvironment;
}

const getApiUrl = (): string => {
    return environment === SdkEnvironment.Prod
        ? "https://rest.prod.bladewallet.io/openapi/v7"
        : "https://rest.ci.bladewallet.io/openapi/v7";
}

const fetchWithRetry = async (url: string, options: RequestInit, maxAttempts = 3) => {
    return new Promise((resolve, reject) => {
        let attemptCounter = 0;

        const interval = 5000;
        const makeRequest = (url: string, options: RequestInit) => {
            attemptCounter += 1;
            fetch(url, options)
                .then(async (res) => {
                    if (!res.ok) {
                        // Request timeout check
                        if ((res.status === 408 || res.status === 429) && attemptCounter < maxAttempts) {
                            /* istanbul ignore next */
                            setTimeout(() => {
                                makeRequest(url, options);
                            }, interval * attemptCounter);
                        } else {
                            const rawData = await res.text();
                            try {
                                reject({
                                    url: res.url,
                                    ...JSON.parse(rawData)
                                });
                            } catch (e) {
                                reject({
                                    url: res.url,
                                    error: rawData
                                });
                            }
                        }
                    } else {
                        resolve(res);
                    }
                })
                .catch(e => {
                    reject({
                        url,
                        error: e.message
                    });
                });
        };
        makeRequest(url, options);
    });
};

const statusCheck = async (res: Response|any): Promise<Response> => {
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
    const url = `${getApiUrl()}/accounts`;
    const headers: any = {
        "X-SDK-TOKEN": params.apiKey,
        "X-FINGERPRINT": params.deviceUuid, // uuid
        "X-VISITOR-ID": params.visitorId, // fingerprint (visitorId) (eg.: YoZoVL4XZspaCtLH4GoL)
        "X-NETWORK": network.toUpperCase(),
        "X-DAPP-CODE": params.dAppCode,
        "X-SDK-VERSION": sdkVersion,
        "Content-Type": "application/json"
    };
    if (params.deviceId) {
        headers["X-DID-API"] = params.deviceId;
    }

    const options = {
        method: "POST",
        headers: new Headers(headers),
        body: JSON.stringify({
            publicKey: params.publicKey
        })
    };

    return fetchWithRetry(url, options)
        .then(statusCheck)
        .then(x => x.json());
};

export const checkAccountCreationStatus = async (transactionId: string, network: Network, params: any): Promise<any> => {
    const url = `${getApiUrl()}/accounts/status?transactionId=${transactionId}`;
    const options = {
        method: "GET",
        headers: new Headers({
            "X-SDK-TOKEN": params.apiKey,
            "X-FINGERPRINT": params.deviceUuid,
            "X-VISITOR-ID": params.visitorId,
            "X-NETWORK": network.toUpperCase(),
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-VERSION": sdkVersion,
            "Content-Type": "application/json"
        })
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json());
};

export const getPendingAccountData = async (transactionId: string, network: Network, params: any) => {
    const url = `${getApiUrl()}/accounts/details?transactionId=${transactionId}`;
    const options = {
        method: "GET",
        headers: new Headers({
            "X-SDK-TOKEN": params.apiKey,
            "X-FINGERPRINT": params.deviceUuid,
            "X-VISITOR-ID": params.visitorId,
            "X-NETWORK": network.toUpperCase(),
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-VERSION": sdkVersion,
            "Content-Type": "application/json"
        })
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json());
};

export const confirmAccountUpdate = async (params: ConfirmUpdateAccountData): Promise<Response> => {
    const url = `${getApiUrl()}/accounts/confirm`;
    const options = {
        method: "PATCH",
        headers: new Headers({
            "X-SDK-TOKEN": params.apiKey,
            "X-FINGERPRINT": params.deviceUuid,
            "X-VISITOR-ID": params.visitorId,
            "X-NETWORK": params.network.toUpperCase(),
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-VERSION": sdkVersion,
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            id: params.accountId
        })
    };

    return fetchWithRetry(url, options)
        .then(statusCheck);
};


export const requestTokenInfo = async (network: Network, tokenId: string) => {
    return GET(network,`api/v1/tokens/${tokenId}`);
};

export const transferTokens = async (network: Network, params: any) => {
    const url = `${getApiUrl()}/tokens/transfers`;

    const options = {
        method: "POST",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TOKEN": params.apiKey,
            "X-SDK-VERSION": sdkVersion,
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            receiverAccountId: params.receiverAccountId,
            senderAccountId: params.senderAccountId,
            amount: params.amount,
            decimals: params.decimals,
            memo: params.memo
        })
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json());
};

export const signContractCallTx = async (network: Network, params: any) => {
    const url = `${getApiUrl()}/smart/contract/sign`;
    const options = {
        method: "POST",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TOKEN": params.apiKey,
            "X-SDK-VERSION": sdkVersion,
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            functionParametersHash: Buffer.from(params.contractFunctionParameters).toString("base64"),
            contractId: params.contractId,
            functionName: params.functionName,
            gas: params.gas
        })
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json());
};

export const apiCallContractQuery = async (network: Network, params: any) => {
    const url = `${getApiUrl()}/smart/contract/call`;
    const options = {
        method: "POST",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TOKEN": params.apiKey,
            "X-SDK-VERSION": sdkVersion,
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            functionParametersHash: Buffer.from(params.contractFunctionParameters).toString("base64"),
            contractId: params.contractId,
            functionName: params.functionName,
            gas: params.gas
        })
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json());
};

export const getC14token = async (params: any) => {
    const url = `${getApiUrl()}/c14/data`;
    const options = {
        method: "GET",
        headers: new Headers({
            "X-SDK-TOKEN": params.apiKey,
            "X-SDK-VERSION": sdkVersion,
            "Content-Type": "application/json"
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json());
};

export const getAccountsFromPublicKey = async (network: Network, publicKey: PublicKey): Promise<string[]> => {
    const formatted = publicKey.toStringRaw();
    return GET(network, `api/v1/accounts?account.publickey=${formatted}`)
        .then((x: AccountInfoMirrorResponse) => x.accounts.map(acc => acc.account))
        .catch(error => {
            return [];
        });
};

export const accountInfo = async (network: Network, accountId: string): Promise<{ evmAddress: string, publicKey: string }> => {
    const accountInfo = await GET(network, `api/v1/accounts/${accountId}`);
    return {
        evmAddress: accountInfo.evm_address ? accountInfo.evm_address : `0x${AccountId.fromString(accountId).toSolidityAddress()}`,
        publicKey: accountInfo.key.key
    };
}

export const getTransactionsFrom = async (
    network: Network,
    accountId: string,
    transactionType: string = "",
    nextPage: string | null = null,
    transactionsLimit: string = "10"
): Promise<{ nextPage: string | null, transactions: TransactionData[] }> => {
    const limit = parseInt(transactionsLimit, 10);
    let info;
    const result: TransactionData[] = [];
    const pageLimit = limit >= 100 ? 100 : 25;

    while (result.length < limit) {
        if (nextPage) {
            info = await GET(network, nextPage);
        } else {
            info = await GET(network, `api/v1/transactions/?account.id=${accountId}&limit=${pageLimit}`);
        }
        nextPage = info.links.next?.substring(1) ?? null;

        const groupedTransactions: {[key: string]: TransactionData[]} = {};

        await Promise.all(info.transactions.map(async(t: any) => {
            groupedTransactions[t.transaction_id] = await getTransaction(network, t.transaction_id, accountId);
        }));

        let transactions: TransactionData[] = flatArray(Object.values(groupedTransactions))
            .sort((a, b) => new Date(b.time).valueOf() - new Date(a.time).valueOf());

        transactions = filterAndFormatTransactions(transactions, transactionType);

        result.push(...transactions);

        if (result.length >= limit) {
            nextPage = `api/v1/transactions?account.id=${accountId}&timestamp=lt:${result[limit-1].consensusTimestamp}&limit=${pageLimit}`;
        }

        if (!nextPage) {
            break;
        }
    }

    return {
        nextPage,
        transactions: result.slice(0, limit)
    };
};

export const getTransaction = (network: Network, transactionId: string, accountId: string): Promise<TransactionData[]> => {
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
                type: t.name,
                consensusTimestamp: t.consensus_timestamp
            };
        }))
        .catch(err => {
            return [];
        });
}
