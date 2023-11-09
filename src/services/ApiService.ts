import {Buffer} from "buffer";
import {AccountId, PublicKey} from "@hashgraph/sdk";
import {Network, NetworkMirrorNodes} from "../models/Networks";
import {AccountInfoMirrorResponse} from "../models/MirrorNode";
import {BladeConfig, ConfirmUpdateAccountData, DAppConfig, SdkEnvironment, TransactionData} from "../models/Common";
import {flatArray} from "../helpers/ArrayHelpers";
import {filterAndFormatTransactions} from "../helpers/TransactionHelpers";
import {encrypt} from "../helpers/SecurityHelper";
import {
    CryptoFlowRoutes, CryptoFlowServiceStrategy, ICryptoFlowAssets,
    ICryptoFlowAssetsParams, ICryptoFlowQuote,
    ICryptoFlowQuoteParams,
    ICryptoFlowTransaction, ICryptoFlowTransactionParams
} from "../models/CryptoFlow";

let sdkVersion = ``;
let apiKey = ``;
let dAppCode = ``;
let visitorId = ``;
let environment: SdkEnvironment = SdkEnvironment.Prod;
let network: Network = Network.Testnet;

const tokenInfoCache: {[key in Network]: { [key: string]: any }} = {
    [Network.Mainnet]: {},
    [Network.Testnet]: {}
};

export const initApiService = (token: string, code: string, sdkEnvironment: SdkEnvironment, version: string, net: Network, fingerprint: string) => {
    apiKey = token;
    dAppCode = code;
    environment = sdkEnvironment;
    sdkVersion = version;
    network = net;
    visitorId = fingerprint;
}

export const setVisitorId = (fingerprint: string) => {
    visitorId = fingerprint;
}

const getTvteHeader = async () => {
    // "X-SDK-TVTE-API" - type-version-timestamp-encrypted

    const [platform, version] = sdkVersion.split("@");
    const encryptedVersion = await encrypt(`${version}@${Date.now()}`, apiKey);
    return `${platform}@${encryptedVersion}`;
}

const getApiUrl = (): string => {
    return environment === SdkEnvironment.Prod
        ? "https://rest.prod.bladewallet.io/openapi/v7"
        : "https://api.bld-dev.bladewallet.io/openapi/v7";
}

const fetchWithRetry = async (url: string, options: RequestInit, maxAttempts = 3) => {
    return new Promise((resolve, reject) => {
        let attemptCounter = 0;

        const interval = 5000;
        // tslint:disable-next-line:no-shadowed-variable
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
    if (route.indexOf("/") === 0) {
        route = route.slice(1);
    }
    return fetchWithRetry(`${NetworkMirrorNodes[network]}/${route}`, {})
        .then(statusCheck)
        .then(x => x.json());
};

export const getBladeConfig = async (): Promise<BladeConfig> => {
    const url = `${getApiUrl()}/sdk/config`;
    const options = {
        method: "GET",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            // "X-VISITOR-ID": params.visitorId,
            "X-DAPP-CODE": dAppCode,
            "X-SDK-VERSION": sdkVersion,
            "Content-Type": "application/json"
        })
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json());
}

export const getDappConfig = async (): Promise<DAppConfig> => {
    const url = `${getApiUrl()}/${dAppCode}/config`;
    const options = {
        method: "GET",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-VISITOR-ID": visitorId,
            "X-SDK-TVTE-API": await getTvteHeader(),
            "Content-Type": "application/json"
        })
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json())
        .then(config => {
            return config[dAppCode];
        })
}

export const createAccount = async (network: Network, params: any) => {
    const url = `${getApiUrl()}/accounts`;
    const headers: any = {
        "X-NETWORK": network.toUpperCase(),
        "X-VISITOR-ID": params.visitorId, // fingerprint (visitorId) (eg.: YoZoVL4XZspaCtLH4GoL)
        "X-DAPP-CODE": params.dAppCode,
        "X-SDK-TVTE-API": await getTvteHeader(),
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
            "X-NETWORK": network.toUpperCase(),
            "X-VISITOR-ID": params.visitorId,
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
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
            "X-NETWORK": network.toUpperCase(),
            "X-VISITOR-ID": params.visitorId,
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
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
            "X-NETWORK": params.network.toUpperCase(),
            "X-VISITOR-ID": params.visitorId,
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
            "Content-Type": "application/json"
        }),
        body: JSON.stringify({
            id: params.accountId
        })
    };

    return fetchWithRetry(url, options)
        .then(statusCheck);
};

export const getAccountBalance = async (accountId: string) => {
    const account = await GET(network, `api/v1/accounts/${accountId}`);
    const tokens = await getAccountTokens(accountId);
    return {
        hbars: account.balance.balance / 10 ** 8,
        tokens
    };
}

const getAccountTokens = async (accountId: string) => {
    const result = [];
    let nextPage = `api/v1/accounts/${accountId}/tokens`;
    while (nextPage != null) {
        const response = await GET(network, nextPage);
        nextPage = response.links.next ?? null;

        for (const token of response.tokens) {
            const tokenInfo = await requestTokenInfo(network, token.token_id);
            result.push({
                tokenId: token.token_id,
                balance: token.balance / 10 ** tokenInfo.decimals,
            });
        }
    }
    return result;
};

export const requestTokenInfo = async (network: Network, tokenId: string) => {
    if (!tokenInfoCache[network][tokenId]) {
        tokenInfoCache[network][tokenId] = await GET(network,`api/v1/tokens/${tokenId}`);
    }
    return tokenInfoCache[network][tokenId];
};

export const transferTokens = async (network: Network, params: any) => {
    const url = `${getApiUrl()}/tokens/transfers`;

    const options = {
        method: "POST",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-VISITOR-ID": params.visitorId,
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
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
            "X-VISITOR-ID": params.visitorId,
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
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
            "X-VISITOR-ID": params.visitorId,
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
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
            "X-NETWORK": params.network.toUpperCase(),
            "X-VISITOR-ID": params.visitorId, // fingerprint (visitorId) (eg.: YoZoVL4XZspaCtLH4GoL)
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
            "Content-Type": "application/json"
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json());
};

export const getCryptoFlowData = async (
    network: Network,
    visitorId: string,
    route: CryptoFlowRoutes,
    params: ICryptoFlowAssetsParams | ICryptoFlowQuoteParams | ICryptoFlowTransactionParams | any,
    strategy?: CryptoFlowServiceStrategy
): Promise<ICryptoFlowAssets | ICryptoFlowQuote[] | ICryptoFlowTransaction> => {
    const url = new URL(`${getApiUrl()}/exchange/v2/`);
    const searchParams = new URLSearchParams();

    for (const key in params) {
      if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== "") {
        searchParams.append(key, params[key]);
      }
    }

    const path = strategy ? `${route}/${strategy.toLowerCase()}` : route;
    url.pathname += path;
    url.search = searchParams.toString();

    const options = {
      method: "GET",
      headers: new Headers({
        "X-NETWORK": network.toUpperCase(),
        "X-VISITOR-ID": visitorId,
        // "X-DAPP-CODE": params.dAppCode,
        // "X-SDK-TVTE-API": await getTvteHeader(),
        "Content-Type": "application/json"
      })
    };

    return fetch(url, options)
        .then(statusCheck)
        .then(x => x.json());
};

export const getAccountsFromPublicKey = async (network: Network, publicKey: PublicKey): Promise<string[]> => {
    const formatted = publicKey.toStringRaw();
    return GET(network, `api/v1/accounts?account.publickey=${formatted}`)
        .then((x: AccountInfoMirrorResponse) => x.accounts.map(acc => acc.account))
        .catch(() => {
            return [];
        });
};

export const accountInfo = async (network: Network, accountId: string): Promise<{ evmAddress: string, publicKey: string }> => {
    const info = await GET(network, `api/v1/accounts/${accountId}`);
    return {
        evmAddress: info.evm_address ? info.evm_address : `0x${AccountId.fromString(accountId).toSolidityAddress()}`,
        publicKey: info.key.key
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

        transactions = filterAndFormatTransactions(transactions, transactionType, accountId);

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
        .catch(() => {
            return [];
        });
}
