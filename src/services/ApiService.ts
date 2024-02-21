import {Buffer} from "buffer";
import {PublicKey} from "@hashgraph/sdk";
import {Network} from "../models/Networks";
import {
    AccountInfo,
    AccountInfoMirrorResponse,
    APIPagination,
    MirrorNodeListResponse,
    NodeInfo
} from "../models/MirrorNode";
import {
    ApiAccount,
    BladeConfig,
    CoinData,
    CoinInfoRaw,
    ConfirmUpdateAccountData,
    DAppConfig,
    IMirrorNodeServiceNetworkConfigs,
    SdkEnvironment,
    TransactionData
} from "../models/Common";
import {flatArray} from "../helpers/ArrayHelpers";
import {filterAndFormatTransactions} from "../helpers/TransactionHelpers";
import {encrypt} from "../helpers/SecurityHelper";
import {
    CryptoFlowRoutes, CryptoFlowServiceStrategy, ICryptoFlowAssets,
    ICryptoFlowAssetsParams, ICryptoFlowQuote,
    ICryptoFlowQuoteParams,
    ICryptoFlowTransaction, ICryptoFlowTransactionParams
} from "../models/CryptoFlow";
import {getConfig} from "./ConfigService";

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

export const getApiUrl = (isPublic = false): string => {
    const publicPart = isPublic ? "/public" : "";
    if (environment === SdkEnvironment.Prod) {
        return `https://rest.prod.bladewallet.io/openapi${publicPart}/v7`;
    }
    if (process.env.NODE_ENV === "test" && environment === SdkEnvironment.Test) {
        return `https://localhost:8080/openapi${publicPart}/v7`;
    }
    // CI
    return `https://api.bld-dev.bladewallet.io/openapi${publicPart}/v7`;
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
        let error = await res.text();
        try {
            error = JSON.parse(error);
            error._code = res.status;
            error._url = res.url;
        } catch (e) {
            error = `${res.status} (${res.url}): ${error}`;
        }
        throw error;
    }
    return res;
};

export const GET = async (network: Network, route: string) => {
    const options: Partial<RequestInit> = {}
    if (route.indexOf("/api/v1") === 0) {
        route = route.replace("/api/v1", "");
    }
    let hederaMirrorNodeConfig: IMirrorNodeServiceNetworkConfigs;
    try {
        // load config from dApp config
        hederaMirrorNodeConfig = await getConfig('mirrorNode');
        if (!hederaMirrorNodeConfig.testnet && !hederaMirrorNodeConfig.mainnet) {
            throw new Error("No mirror node config found");
        }
    } catch (e) {
        hederaMirrorNodeConfig = {
            testnet: [{
                name: "Mirror Nodes",
                url: "https://testnet.mirrornode.hedera.com/api/v1",
                priority: 1
            }],
            mainnet: [{
                name: "Mirror Nodes",
                url: "https://mainnet-public.mirrornode.hedera.com/api/v1",
                priority: 1
            }]
        }
    }

    const networkConfig = hederaMirrorNodeConfig[network.toLowerCase() as keyof IMirrorNodeServiceNetworkConfigs];
    // Sort by priority
    networkConfig.sort((a, b) => a.priority - b.priority);

    // Try each service until one succeeds
    for (const service of networkConfig) {
        try {
            if (service.apikey) {
                options.headers = {
                    ...(options.headers || {}),
                    "x-api-key": service.apikey
                };
            }
            return await fetchWithRetry(`${service.url}${route}`, options)
                .then(statusCheck)
                .then(x => x.json());
        } catch (e) {
            // console.log(`Mirror node service (${service.name}) failed to make request: ${service.url}${route}`);
        }
    }
    throw new Error(`All mirror node services failed to make request to: ${route}`);
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

    return fetch(url, options)
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

    return fetch(url, options)
        .then(statusCheck);
};

export const getTokenAssociateTransactionForAccount = async (tokenId: string|null, accountId: string): Promise<ApiAccount> => {
    const url = `${await getApiUrl()}/tokens`;
    const body: any = {
        id: accountId,
    };
    if (tokenId) {
        body.token = tokenId;
    }

    const options = {
      method: "PATCH",
      headers: new Headers({
          "X-NETWORK": network.toUpperCase(),
          "X-VISITOR-ID": visitorId,
          "X-DAPP-CODE": dAppCode,
          "X-SDK-TVTE-API": await getTvteHeader(),
          "Content-Type": "application/json"
      }),
      body: JSON.stringify(body)
    };

    return fetch(url, options)
      .then(statusCheck)
      .then(x => x.json());
  }

export const getAccountBalance = async (accountId: string) => {
    const account = await GET(network, `/accounts/${accountId}`);
    const tokens = await getAccountTokens(accountId);
    return {
        hbars: account.balance.balance / 10 ** 8,
        tokens
    };
}

export const getCoins = async (params: any): Promise<CoinInfoRaw[]> => {
    const url = `${getApiUrl()}/prices/coins/list?include_platform=true`;
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

export const getCoinInfo = async (coinId: string, params: any): Promise<CoinData> => {
    const url = `${getApiUrl()}/prices/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
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
        .then(x => x.json())
        .then(coinInfo => {
            return {
                ...coinInfo,
                platforms: Object.keys(coinInfo.platforms).map(name => ({
                    name,
                    address: coinInfo.platforms[name]
                }))
            };
        })
};

const getAccountTokens = async (accountId: string) => {
    const result = [];
    let nextPage = `/accounts/${accountId}/tokens`;
    while (nextPage != null) {
        const response = await GET(network, nextPage);
        nextPage = response.links.next ?? null;

        for (const token of response.tokens) {
            const tokenInfo = await requestTokenInfo(network, token.token_id);
            // @ts-ignore
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
        tokenInfoCache[network][tokenId] = await GET(network,`/tokens/${tokenId}`);
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
    return GET(network, `/accounts?account.publickey=${formatted}`)
        .then((x: AccountInfoMirrorResponse) => x.accounts.map(acc => acc.account))
        .catch(() => {
            return [];
        });
};

export const getAccountInfo = async (network: Network, accountId: string): Promise<APIPagination & AccountInfo> => {
    return await GET(network, `/accounts/${accountId}`);
}

export const getNodeList = async (network: Network): Promise<NodeInfo[]> => {
    const list: NodeInfo[] = [];
    let nextPage = "/network/nodes";

    while (nextPage) {
        const response: APIPagination & MirrorNodeListResponse = await GET(network, nextPage);
        list.push(...response.nodes);
        nextPage = response.links.next ?? "";
    }
    return list;
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
            info = await GET(network, `/transactions/?account.id=${accountId}&limit=${pageLimit}`);
        }
        nextPage = info.links.next ?? null;

        const groupedTransactions: {[key: string]: TransactionData[]} = {};

        await Promise.all(info.transactions.map(async(t: any) => {
            groupedTransactions[t.transaction_id] = await getTransaction(network, t.transaction_id, accountId);
        }));

        let transactions: TransactionData[] = flatArray(Object.values(groupedTransactions))
            .sort((a, b) => new Date(b.time).valueOf() - new Date(a.time).valueOf());

        transactions = filterAndFormatTransactions(transactions, transactionType, accountId);

        result.push(...transactions);

        if (result.length >= limit) {
            nextPage = `/transactions?account.id=${accountId}&timestamp=lt:${result[limit-1].consensusTimestamp}&limit=${pageLimit}`;
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
    return GET(network, `/transactions/${transactionId}`)
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
