import { Buffer } from "buffer";
import { PublicKey } from "@hashgraph/sdk";
import { Network } from "../models/Networks";
import {
    AccountInfo,
    AccountInfoMirrorResponse,
    APIPagination,
    MirrorNodeListResponse,
    NftInfo,
    NftMetadata,
    NodeInfo,
    TokenInfo,
} from "../models/MirrorNode";
import {
    ApiAccount,
    AssociationAction,
    BalanceData,
    BladeConfig,
    CoinData,
    CoinInfoRaw,
    ConfirmUpdateAccountData,
    DAppConfig,
    IMirrorNodeServiceNetworkConfigs,
    ScheduleTransactionTransfer,
    ScheduleTransactionType,
    SdkEnvironment,
    TransactionData,
} from "../models/Common";
import { flatArray } from "../helpers/ArrayHelpers";
import { filterAndFormatTransactions } from "../helpers/TransactionHelpers";
import { encrypt } from "../helpers/SecurityHelper";
import {
    CryptoFlowRoutes,
    CryptoFlowServiceStrategy,
    ICryptoFlowAssets,
    ICryptoFlowAssetsParams,
    ICryptoFlowQuote,
    ICryptoFlowQuoteParams,
    ICryptoFlowTransaction,
    ICryptoFlowTransactionParams,
} from "../models/CryptoFlow";
import { getConfig } from "./ConfigService";

let sdkVersion = ``;
let apiKey = ``;
let dAppCode = ``;
let visitorId = ``;
let environment: SdkEnvironment = SdkEnvironment.Prod;
let network: Network = Network.Testnet;

const tokenInfoCache: { [key in Network]: { [key: string]: any } } = {
    [Network.Mainnet]: {},
    [Network.Testnet]: {},
};

export const initApiService = (
    token: string,
    code: string,
    sdkEnvironment: SdkEnvironment,
    version: string,
    net: Network,
    fingerprint: string
) => {
    apiKey = token;
    dAppCode = code;
    environment = sdkEnvironment;
    sdkVersion = version;
    network = net;
    visitorId = fingerprint;
};

export const setVisitorId = (fingerprint: string) => {
    visitorId = fingerprint;
};

const getTvteHeader = async () => {
    // "X-SDK-TVTE-API" - type-version-timestamp-encrypted

    const [platform, version] = sdkVersion.split("@");
    const encryptedVersion = await encrypt(`${version}@${Date.now()}`, apiKey);
    return `${platform}@${encryptedVersion}`;
};

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
};

export const getIpfsGatewayUrl = (): string => {
    return "https://trustless-gateway.link/ipfs";
};

const fetchWithRetry = async (url: string, options: RequestInit, maxAttempts = 3): Promise<Response> => {
    return new Promise((resolve, reject) => {
        let attemptCounter = 0;

        const interval = 5000;
        // tslint:disable-next-line:no-shadowed-variable
        const makeRequest = (fetchUrl: string, options: RequestInit) => {
            attemptCounter += 1;
            fetch(fetchUrl, options)
                .then(async (res) => {
                    if (!res.ok) {
                        // Request timeout check
                        if ((res.status === 408 || res.status === 429) && attemptCounter < maxAttempts) {
                            /* istanbul ignore next */
                            setTimeout(() => {
                                makeRequest(fetchUrl, options);
                            }, interval * attemptCounter);
                        } else {
                            const rawData = await res.text();
                            try {
                                reject({
                                    url: res.url,
                                    ...JSON.parse(rawData),
                                });
                            } catch (e) {
                                reject({
                                    url: res.url,
                                    error: rawData,
                                });
                            }
                        }
                    } else {
                        resolve(res);
                    }
                })
                .catch((e) => {
                    reject({
                        url: fetchUrl,
                        error: e.message,
                    });
                });
        };
        makeRequest(url, options);
    });
};

const statusCheck = async (res: Response): Promise<Response> => {
    if (!res.ok) {
        let error: any = await res.text();
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
    const options: Partial<RequestInit> = {};
    if (route.indexOf("/api/v1") === 0) {
        route = route.replace("/api/v1", "");
    }
    let hederaMirrorNodeConfig: IMirrorNodeServiceNetworkConfigs;
    try {
        // load config from dApp config
        hederaMirrorNodeConfig = await getConfig("mirrorNode");
        if (!hederaMirrorNodeConfig.testnet && !hederaMirrorNodeConfig.mainnet) {
            throw new Error("No mirror node config found");
        }
    } catch (e) {
        hederaMirrorNodeConfig = {
            testnet: [
                {
                    name: "Mirror Nodes",
                    url: "https://testnet.mirrornode.hedera.com/api/v1",
                    priority: 1,
                },
            ],
            mainnet: [
                {
                    name: "Mirror Nodes",
                    url: "https://mainnet-public.mirrornode.hedera.com/api/v1",
                    priority: 1,
                },
            ],
        };
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
                    "x-api-key": service.apikey,
                };
            }
            return await fetchWithRetry(`${service.url}${route}`, options)
                .then(statusCheck)
                .then((x) => x.json());
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
            "Content-Type": "application/json",
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
};

export const getDappConfig = async (): Promise<DAppConfig> => {
    const url = `${getApiUrl()}/${dAppCode}/config`;
    const options = {
        method: "GET",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-VISITOR-ID": visitorId,
            "X-SDK-TVTE-API": await getTvteHeader(),
            "Content-Type": "application/json",
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json())
        .then((config) => {
            return config[dAppCode];
        });
};

export const createAccount = async (network: Network, params: any) => {
    const url = `${getApiUrl()}/accounts`;
    const headers: any = {
        "X-NETWORK": network.toUpperCase(),
        "X-VISITOR-ID": params.visitorId, // fingerprint (visitorId) (eg.: YoZoVL4XZspaCtLH4GoL)
        "X-DAPP-CODE": params.dAppCode,
        "X-SDK-TVTE-API": await getTvteHeader(),
        "Content-Type": "application/json",
    };
    if (params.deviceId) {
        headers["X-DID-API"] = params.deviceId;
    }

    const options = {
        method: "POST",
        headers: new Headers(headers),
        body: JSON.stringify({
            publicKey: params.publicKey,
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
};

export const checkAccountCreationStatus = async (
    transactionId: string,
    network: Network,
    params: any
): Promise<any> => {
    const url = `${getApiUrl()}/accounts/status?transactionId=${transactionId}`;
    const options = {
        method: "GET",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-VISITOR-ID": params.visitorId,
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
            "Content-Type": "application/json",
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
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
            "Content-Type": "application/json",
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
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
            "Content-Type": "application/json",
        }),
        body: JSON.stringify({
            id: params.accountId,
        }),
    };

    return fetch(url, options).then(statusCheck);
};

export const getTokenAssociateTransaction = async (
    action: AssociationAction,
    tokenIdOrCampaign: string | null,
    accountId: string
): Promise<ApiAccount> => {
    let url: string;
    let body: {
        [key: string]: any;
    }

    switch (action) {
        case AssociationAction.FREE:
            url = `${getApiUrl()}/tokens`;
            body = {
                id: accountId,
            };
            if (tokenIdOrCampaign) {
                body.token = tokenIdOrCampaign;
            }
            break;
        case AssociationAction.DEMAND:
            url = `${getApiUrl()}/tokens/demand`;
            body = {
                id: accountId,
                action: tokenIdOrCampaign
            };
            break;
        default:
            throw new Error("Unknown association action");
    }

    const options = {
        method: "PATCH",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-VISITOR-ID": visitorId,
            "X-DAPP-CODE": dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
            "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
};

export const getAccountBalance = async (accountId: string): Promise<BalanceData> => {
    const account = await getAccountInfo(network, accountId); // GET(network, `/accounts/${accountId}`);
    const tokens = await getAccountTokens(accountId);
    return {
        hbars: account.balance.balance / 10 ** 8,
        tokens,
    };
};

export const getCoins = async (params: any): Promise<CoinInfoRaw[]> => {
    const url = `${getApiUrl()}/prices/coins/list?include_platform=true`;
    const options = {
        method: "GET",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-VISITOR-ID": params.visitorId,
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
            "Content-Type": "application/json",
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
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
            "Content-Type": "application/json",
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json())
        .then((coinInfo) => {
            return {
                ...coinInfo,
                platforms: Object.keys(coinInfo.platforms).map((name) => ({
                    name,
                    address: coinInfo.platforms[name],
                })),
            };
        });
};

const getAccountTokens = async (accountId: string) => {
    const result: {tokenId: string; balance: number}[] = [];
    let nextPage = `/accounts/${accountId}/tokens`;
    while (nextPage != null) {
        const response = await GET(network, nextPage);
        nextPage = response.links.next ?? null;

        for (const token of response.tokens) {
            const tokenInfo = await requestTokenInfo(network, token.token_id);
            result.push({
                tokenId: token.token_id,
                balance: token.balance / 10 ** parseInt(tokenInfo.decimals, 10),
            });
        }
    }
    return result;
};

export const requestTokenInfo = async (network: Network, tokenId: string): Promise<TokenInfo> => {
    if (!tokenInfoCache[network][tokenId]) {
        tokenInfoCache[network][tokenId] = await GET(network, `/tokens/${tokenId}`);
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
            "Content-Type": "application/json",
        }),
        body: JSON.stringify({
            receiverAccountId: params.receiverAccountId,
            senderAccountId: params.senderAccountId,
            amount: params.amount,
            decimals: params.decimals,
            memo: params.memo,
            tokenId: params.tokenId,
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
};

export const createScheduleRequest = async (network: Network, type: ScheduleTransactionType, transfers: ScheduleTransactionTransfer[]): Promise<any> => {
    const url = `${getApiUrl()}/tokens/schedules`;
    const options = {
        method: "POST",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-VISITOR-ID": visitorId,
            "X-DAPP-CODE": dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
            "Content-Type": "application/json",
        }),
        body: JSON.stringify({
            transaction: {
                type,
                transfers,
            }
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
}

export const signScheduleRequest = async (network: Network, scheduledTransactionId: string, receiverAccountId: string): Promise<{ scheduleSignTransactionBytes: string }> => {
    const url = `${getApiUrl()}/tokens/schedules`;
    const options = {
        method: "PATCH",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-VISITOR-ID": visitorId,
            "X-DAPP-CODE": dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
            "Content-Type": "application/json",
        }),
        body: JSON.stringify({scheduledTransactionId, receiverAccountId}),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
}

export const signContractCallTx = async (network: Network, params: any) => {
    const url = `${getApiUrl()}/smart/contract/sign`;
    const options = {
        method: "POST",
        headers: new Headers({
            "X-NETWORK": network.toUpperCase(),
            "X-VISITOR-ID": params.visitorId,
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
            "Content-Type": "application/json",
        }),
        body: JSON.stringify({
            functionParametersHash: Buffer.from(params.contractFunctionParameters).toString("base64"),
            contractId: params.contractId,
            functionName: params.functionName,
            gas: params.gas,
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
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
            "Content-Type": "application/json",
        }),
        body: JSON.stringify({
            functionParametersHash: Buffer.from(params.contractFunctionParameters).toString("base64"),
            contractId: params.contractId,
            functionName: params.functionName,
            gas: params.gas,
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
};

export const dropTokens = async (
    network: Network,
    params: { accountId: string; signedNonce: string; dAppCode: string; visitorId: string }
) => {
    const url = `${getApiUrl()}/tokens/drop`;
    const headers: any = {
        "X-NETWORK": network.toUpperCase(),
        "X-VISITOR-ID": params.visitorId,
        "X-DAPP-CODE": params.dAppCode,
        "X-SDK-TVTE-API": await getTvteHeader(),
        "Content-Type": "application/json",
    };

    const options = {
        method: "POST",
        headers: new Headers(headers),
        body: JSON.stringify({
            accountId: params.accountId,
            signedNonce: params.signedNonce,
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
};

export const getC14token = async (params: { network: Network; visitorId: string; dAppCode: string }) => {
    const url = `${getApiUrl()}/c14/data`;
    const options = {
        method: "GET",
        headers: new Headers({
            "X-NETWORK": params.network.toUpperCase(),
            "X-VISITOR-ID": params.visitorId, // fingerprint (visitorId) (eg.: YoZoVL4XZspaCtLH4GoL)
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TVTE-API": await getTvteHeader(),
            "Content-Type": "application/json",
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
};

export const getCryptoFlowData = async (
    network: Network,
    visitorId: string,
    route: CryptoFlowRoutes,
    params: ICryptoFlowAssetsParams | ICryptoFlowQuoteParams | ICryptoFlowTransactionParams,
    strategy?: CryptoFlowServiceStrategy
): Promise<ICryptoFlowAssets | ICryptoFlowQuote[] | ICryptoFlowTransaction> => {
    const url = new URL(`${getApiUrl()}/exchange/v3/`);
    const searchParams = new URLSearchParams();

    for (const key in params) {
        const typedKey = key as Extract<keyof typeof params, string>;
        if (params.hasOwnProperty(typedKey) && params[typedKey] !== undefined && params[typedKey] !== "") {
            searchParams.append(typedKey, params[typedKey]!.toString());
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
            "Content-Type": "application/json",
        }),
    };

    return fetch(url, options)
        .then(statusCheck)
        .then((x) => x.json());
};

export const getAccountsFromPublicKey = async (
    network: Network,
    publicKey: PublicKey
): Promise<Partial<AccountInfo>[]> => {
    const formatted = publicKey.toStringRaw();
    return GET(network, `/accounts?account.publickey=${formatted}`)
        .then((x: AccountInfoMirrorResponse) => x.accounts)
        .catch(() => {
            return [];
        });
};

export const getAccountInfo = async (network: Network, accountId: string): Promise<APIPagination & AccountInfo> => {
    return await GET(network, `/accounts/${accountId}`);
};

export const getNodeList = async (network: Network): Promise<NodeInfo[]> => {
    const list: NodeInfo[] = [];
    let nextPage = "/network/nodes";

    while (nextPage) {
        const response: APIPagination & MirrorNodeListResponse = await GET(network, nextPage);
        list.push(...response.nodes);
        nextPage = response.links.next ?? "";
    }
    return list;
};

export const getTransactionsFrom = async (
    network: Network,
    accountId: string,
    transactionType: string = "",
    nextPage: string | null = null,
    transactionsLimit: string = "10"
): Promise<{ nextPage: string | null; transactions: TransactionData[] }> => {
    const limit = parseInt(transactionsLimit, 10);
    let info: any;
    const result: TransactionData[] = [];
    const pageLimit = limit >= 100 ? 100 : 25;

    while (result.length < limit) {
        if (nextPage) {
            info = await GET(network, nextPage);
        } else {
            info = await GET(network, `/transactions/?account.id=${accountId}&limit=${pageLimit}`);
        }
        nextPage = info.links.next ?? null;

        const groupedTransactions: { [key: string]: TransactionData[] } = {};

        await Promise.all(
            info.transactions.map(async (t: any) => {
                groupedTransactions[t.transaction_id] = await getTransaction(network, t.transaction_id, accountId);
            })
        );

        let transactions: TransactionData[] = flatArray(Object.values(groupedTransactions)).sort(
            (a, b) => new Date(b.time).valueOf() - new Date(a.time).valueOf()
        );

        transactions = filterAndFormatTransactions(transactions, transactionType, accountId);

        result.push(...transactions);

        if (result.length >= limit) {
            nextPage = `/transactions?account.id=${accountId}&timestamp=lt:${
                result[limit - 1].consensusTimestamp
            }&limit=${pageLimit}`;
        }

        if (!nextPage) {
            break;
        }
    }

    return {
        nextPage,
        transactions: result.slice(0, limit),
    };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getTransaction = (
    network: Network,
    transactionId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    accountId: string
): Promise<TransactionData[]> => {
    return GET(network, `/transactions/${transactionId}`)
        .then((x) =>
            x.transactions.map((t: any) => {
                return {
                    time: new Date(parseFloat(t.consensus_timestamp) * 1000),
                    transfers: [...(t.token_transfers || []), ...(t.transfers || [])].map((tt) => {
                        tt.amount = !tt.token_id ? tt.amount / 10 ** 8 : tt.amount;
                        return tt;
                    }),
                    nftTransfers: t.nft_transfers || null,
                    memo: global.atob(t.memo_base64),
                    transactionId: t.transaction_id,
                    fee: t.charged_tx_fee,
                    type: t.name,
                    consensusTimestamp: t.consensus_timestamp,
                };
            })
        )
        .catch(() => {
            return [];
        });
};

export const getNftInfo = async (network: Network, tokenId: string, serial: string): Promise<NftInfo> => {
    return GET(network, `/tokens/${tokenId}/nfts/${serial}`);
};

export const getNftMetadataFromIpfs = async (cid: string): Promise<NftMetadata> => {
    const response = await fetch(`${getIpfsGatewayUrl()}/${cid}?format=raw`);

    return response.json();
};

export const getContractErrorMessage = async (network: Network, param: string, contractId: string) => {
    const MAX_ATTEMPTS = 5;
    const INTERVAL_MS = 1500;
    
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            let response: any = await new Promise((resolve, reject) => {
                setTimeout(async () => {
                    try {
                        const result = await GET(network, `/transactions/${param}`);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                }, INTERVAL_MS);
            });

            if (response && response.transactions && response.transactions.length > 0) {
                const consensusTimestamp = response.transactions[0].consensus_timestamp;

                let contractResponse: any = await new Promise((resolve, reject) => {
                    try {
                        const result = GET(network, `/contracts/${contractId}/results/${consensusTimestamp}`);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                });

                return contractResponse?.error_message;
            } else {
                return null
            }
        } catch (error) {
            if (attempt === MAX_ATTEMPTS) {
                return null
            }
        }
    }
};
