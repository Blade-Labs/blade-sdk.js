import { injectable } from 'inversify';
import 'reflect-metadata';

import {Buffer} from "buffer";
import {PublicKey} from "@hashgraph/sdk";
import {Network, NetworkMirrorNodes} from "../models/Networks";
import {
    AccountInfo,
    AccountInfoMirrorResponse,
    APIPagination,
    MirrorNodeListResponse,
    NodeInfo
} from "../models/MirrorNode";
import {
    BladeConfig,
    CoinData,
    CoinInfoRaw,
    ConfirmUpdateAccountData,
    DAppConfig,
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

@injectable()
export default class ApiService {
    private sdkVersion = ``;
    private apiKey = ``;
    private dAppCode = ``;
    private visitorId = ``;
    private environment: SdkEnvironment = SdkEnvironment.Prod;
    private network: Network = Network.Testnet;
    private tokenInfoCache: {[key in Network]: { [key: string]: any }} = {
        [Network.Mainnet]: {},
        [Network.Testnet]: {}
    };

    initApiService(token: string, code: string, sdkEnvironment: SdkEnvironment, version: string, net: Network, fingerprint: string) {
        this.apiKey = token;
        this.dAppCode = code;
        this.environment = sdkEnvironment;
        this.sdkVersion = version;
        this.network = net;
        this.visitorId = fingerprint;
    }

    setVisitorId(fingerprint: string) {
        this.visitorId = fingerprint;
    }

    async getTvteHeader() {
        // "X-SDK-TVTE-API" - type-version-timestamp-encrypted

        const [platform, version] = this.sdkVersion.split("@");
        const encryptedVersion = await encrypt(`${version}@${Date.now()}`, this.apiKey);
        return `${platform}@${encryptedVersion}`;
    }

    getApiUrl(): string {
        if (this.environment === SdkEnvironment.Prod) {
            return "https://rest.prod.bladewallet.io/openapi/v7";
        }
        if (process.env.NODE_ENV === "test" && this.environment === SdkEnvironment.Test) {
            return "https://localhost:8080/openapi/v7";
        }
        // CI
        return "https://api.bld-dev.bladewallet.io/openapi/v7";
    }

    async fetchWithRetry(url: string, options: RequestInit, maxAttempts = 3) {
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

    async statusCheck (res: Response|any): Promise<Response> {
        if (!res.ok) {
            throw await res.json();
        }
        return res;
    };

    GET(network: Network, route: string) {
        if (route.indexOf("/") === 0) {
            route = route.slice(1);
        }
        return this.fetchWithRetry(`${NetworkMirrorNodes[network]}/${route}`, {})
            .then(this.statusCheck)
            .then(x => x.json());
    };


    async getBladeConfig(): Promise<BladeConfig> {
        const url = `${this.getApiUrl()}/sdk/config`;
        const options = {
            method: "GET",
            headers: new Headers({
                "X-NETWORK": this.network.toUpperCase(),
                // "X-VISITOR-ID": params.visitorId,
                "X-DAPP-CODE": this.dAppCode,
                "X-SDK-VERSION": this.sdkVersion,
                "Content-Type": "application/json"
            })
        };

        return fetch(url, options)
            .then(this.statusCheck)
            .then(x => x.json());
    }

    async getDappConfig(): Promise<DAppConfig> {
        const url = `${this.getApiUrl()}/${this.dAppCode}/config`;
        const options = {
            method: "GET",
            headers: new Headers({
                "X-NETWORK": this.network.toUpperCase(),
                "X-VISITOR-ID": this.visitorId,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
                "Content-Type": "application/json"
            })
        };

        return fetch(url, options)
            .then(this.statusCheck)
            .then(x => x.json())
            .then(config => {
                return config[this.dAppCode];
            })
    }

    async createAccount(network: Network, params: any) {
        const url = `${this.getApiUrl()}/accounts`;
        const headers: any = {
            "X-NETWORK": network.toUpperCase(),
            "X-VISITOR-ID": params.visitorId, // fingerprint (visitorId) (eg.: YoZoVL4XZspaCtLH4GoL)
            "X-DAPP-CODE": params.dAppCode,
            "X-SDK-TVTE-API": await this.getTvteHeader(),
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

        return this.fetchWithRetry(url, options)
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async checkAccountCreationStatus(transactionId: string, network: Network, params: any): Promise<any> {
        const url = `${this.getApiUrl()}/accounts/status?transactionId=${transactionId}`;
        const options = {
            method: "GET",
            headers: new Headers({
                "X-NETWORK": network.toUpperCase(),
                "X-VISITOR-ID": params.visitorId,
                "X-DAPP-CODE": params.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
                "Content-Type": "application/json"
            })
        };

        return fetch(url, options)
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async getPendingAccountData(transactionId: string, network: Network, params: any) {
        const url = `${this.getApiUrl()}/accounts/details?transactionId=${transactionId}`;
        const options = {
            method: "GET",
            headers: new Headers({
                "X-NETWORK": network.toUpperCase(),
                "X-VISITOR-ID": params.visitorId,
                "X-DAPP-CODE": params.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
                "Content-Type": "application/json"
            })
        };

        return fetch(url, options)
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async confirmAccountUpdate(params: ConfirmUpdateAccountData): Promise<Response> {
        const url = `${this.getApiUrl()}/accounts/confirm`;
        const options = {
            method: "PATCH",
            headers: new Headers({
                "X-NETWORK": params.network.toUpperCase(),
                "X-VISITOR-ID": params.visitorId,
                "X-DAPP-CODE": params.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({
                id: params.accountId
            })
        };

        return this.fetchWithRetry(url, options)
            .then(this.statusCheck);
    };

    async getAccountBalance(accountId: string) {
        const account = await this.GET(this.network, `api/v1/accounts/${accountId}`);
        const tokens = await this.getAccountTokens(accountId);
        return {
            hbars: account.balance.balance / 10 ** 8,
            tokens
        };
    }

    async getCoins(params: any): Promise<CoinInfoRaw[]> {
        const url = `${this.getApiUrl()}/prices/coins/list?include_platform=true`;
        const options = {
            method: "GET",
            headers: new Headers({
                "X-NETWORK": this.network.toUpperCase(),
                "X-VISITOR-ID": params.visitorId,
                "X-DAPP-CODE": params.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
                "Content-Type": "application/json"
            })
        };

        return fetch(url, options)
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async getCoinInfo(coinId: string, params: any): Promise<CoinData> {
        const url = `${this.getApiUrl()}/prices/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
        const options = {
            method: "GET",
            headers: new Headers({
                "X-NETWORK": this.network.toUpperCase(),
                "X-VISITOR-ID": params.visitorId,
                "X-DAPP-CODE": params.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
                "Content-Type": "application/json"
            })
        };

        return fetch(url, options)
            .then(this.statusCheck)
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

    async getAccountTokens(accountId: string) {
        const result = [];
        let nextPage = `api/v1/accounts/${accountId}/tokens`;
        while (nextPage != null) {
            const response = await this.GET(this.network, nextPage);
            nextPage = response.links.next ?? null;

            for (const token of response.tokens) {
                const tokenInfo = await this.requestTokenInfo(this.network, token.token_id);
                // @ts-ignore
                result.push({
                    tokenId: token.token_id,
                    balance: token.balance / 10 ** tokenInfo.decimals,
                });
            }
        }
        return result;
    };

    async requestTokenInfo(network: Network, tokenId: string) {
        if (!this.tokenInfoCache[network][tokenId]) {
            this.tokenInfoCache[network][tokenId] = await this.GET(network,`api/v1/tokens/${tokenId}`);
        }
        return this.tokenInfoCache[network][tokenId];
    };

    async transferTokens(network: Network, params: any) {
        const url = `${this.getApiUrl()}/tokens/transfers`;

        const options = {
            method: "POST",
            headers: new Headers({
                "X-NETWORK": network.toUpperCase(),
                "X-VISITOR-ID": params.visitorId,
                "X-DAPP-CODE": params.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
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
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async signContractCallTx(network: Network, params: any) {
        const url = `${this.getApiUrl()}/smart/contract/sign`;
        const options = {
            method: "POST",
            headers: new Headers({
                "X-NETWORK": network.toUpperCase(),
                "X-VISITOR-ID": params.visitorId,
                "X-DAPP-CODE": params.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
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
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async apiCallContractQuery(network: Network, params: any) {
        const url = `${this.getApiUrl()}/smart/contract/call`;
        const options = {
            method: "POST",
            headers: new Headers({
                "X-NETWORK": network.toUpperCase(),
                "X-VISITOR-ID": params.visitorId,
                "X-DAPP-CODE": params.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
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
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async getC14token(params: any) {
        const url = `${this.getApiUrl()}/c14/data`;
        const options = {
            method: "GET",
            headers: new Headers({
                "X-NETWORK": params.network.toUpperCase(),
                "X-VISITOR-ID": params.visitorId, // fingerprint (visitorId) (eg.: YoZoVL4XZspaCtLH4GoL)
                "X-DAPP-CODE": params.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
                "Content-Type": "application/json"
            }),
        };

        return fetch(url, options)
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async getCryptoFlowData(
        network: Network,
        visitorId: string,
        route: CryptoFlowRoutes,
        params: ICryptoFlowAssetsParams | ICryptoFlowQuoteParams | ICryptoFlowTransactionParams | any,
        strategy?: CryptoFlowServiceStrategy
    ): Promise<ICryptoFlowAssets | ICryptoFlowQuote[] | ICryptoFlowTransaction> {
        const url = new URL(`${this.getApiUrl()}/exchange/v2/`);
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
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async getAccountsFromPublicKey(network: Network, publicKey: PublicKey): Promise<string[]> {
        const formatted = publicKey.toStringRaw();
        return this.GET(network, `api/v1/accounts?account.publickey=${formatted}`)
            .then((x: AccountInfoMirrorResponse) => x.accounts.map(acc => acc.account))
            .catch(() => {
                return [];
            });
    };

    async getAccountInfo(network: Network, accountId: string): Promise<APIPagination & AccountInfo> {
        return await this.GET(network, `api/v1/accounts/${accountId}`);
    }

    async getNodeList(network: Network): Promise<NodeInfo[]> {
        const list: NodeInfo[] = [];
        let nextPage = "api/v1/network/nodes";

        while (nextPage) {
            const response: APIPagination & MirrorNodeListResponse = await this.GET(network, nextPage);
            list.push(...response.nodes);
            nextPage = response.links.next ?? "";
        }
        return list;
    }

    async getTransactionsFrom(
        network: Network,
        accountId: string,
        transactionType: string = "",
        nextPage: string | null = null,
        transactionsLimit: string = "10"
    ): Promise<{ nextPage: string | null, transactions: TransactionData[] }> {
        const limit = parseInt(transactionsLimit, 10);
        let info;
        const result: TransactionData[] = [];
        const pageLimit = limit >= 100 ? 100 : 25;

        while (result.length < limit) {
            if (nextPage) {
                info = await this.GET(network, nextPage);
            } else {
                info = await this.GET(network, `api/v1/transactions/?account.id=${accountId}&limit=${pageLimit}`);
            }
            nextPage = info.links.next?.substring(1) ?? null;

            const groupedTransactions: {[key: string]: TransactionData[]} = {};

            await Promise.all(info.transactions.map(async(t: any) => {
                groupedTransactions[t.transaction_id] = await this.getTransaction(network, t.transaction_id, accountId);
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

    getTransaction(network: Network, transactionId: string, accountId: string): Promise<TransactionData[]> {
        return this.GET(network, `api/v1/transactions/${transactionId}`)
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
}
