import { injectable } from 'inversify';
import 'reflect-metadata';

import {Buffer} from "buffer";
import {PublicKey} from "@hashgraph/sdk";
import {Network} from "../models/Networks";
import {
    AccountInfo,
    AccountInfoMirrorResponse,
    APIPagination,
    MirrorNodeListResponse,
    NftTransferDetail,
    NodeInfo,
    TokenInfo,
    TransactionDetails,
    TransactionDetailsResponse
} from "../models/MirrorNode";
import {
    ApiAccount,
    BladeConfig,
    CoinData,
    CoinInfoRaw,
    DAppConfig,
    IMirrorNodeServiceNetworkConfigs,
    SdkEnvironment,
    TokenBalanceData,
    TransactionData
} from "../models/Common";
import {ChainMap, KnownChainIds} from "../models/Chain";
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
    private chainId: KnownChainIds = KnownChainIds.HEDERA_TESTNET;
    private tokenInfoCache: {[key in Network]: { [key: string]: TokenInfo }} = {
        [Network.Mainnet]: {},
        [Network.Testnet]: {}
    };
    private dAppConfigCached: DAppConfig | null = null;

    initApiService(
        apiKey: string,
        dAppCode: string,
        environment: SdkEnvironment,
        sdkVersion: string,
        chainId: KnownChainIds,
        visitorId: string
    ) {
        this.apiKey = apiKey;
        this.dAppCode = dAppCode;
        this.environment = environment;
        this.sdkVersion = sdkVersion;
        this.chainId = chainId;
        this.network = ChainMap[this.chainId].isTestnet ? Network.Testnet : Network.Mainnet;
        this.visitorId = visitorId;
        this.dAppConfigCached = null;
    }

    setVisitorId(fingerprint: string) {
        this.visitorId = fingerprint;
    }

    getDappCode() {
        return this.dAppCode;
    }

    async getTvteHeader() {
        // "X-SDK-TVTE-API" - type-version-timestamp-encrypted

        const [platform, version] = this.sdkVersion.split("@");
        const encryptedVersion = await encrypt(`${version}@${Date.now()}`, this.apiKey);
        return `${platform}@${encryptedVersion}`;
    }

    getApiUrl(isPublic = false): string {
        const publicPart = isPublic ? "/public" : "";
        if (this.environment === SdkEnvironment.Prod) {
            return `https://rest.prod.bladewallet.io/openapi${publicPart}/v7`;
        }
        if (process.env.NODE_ENV === "test" && this.environment === SdkEnvironment.Test) {
            return `https://localhost:8080/openapi${publicPart}/v7`;
        }
        // CI
        return `https://api.bld-dev.bladewallet.io/openapi${publicPart}/v7`;
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
            let error = await res.text();
            try {
                error = JSON.parse(error);
                error._code = res.status
                error._url = res.url
            } catch (e) {
                error = `${res.status} (${res.url}): ${error}`;
            }
            throw error;
        }
        return res;
    };

    async GET(network: Network, route: string) {
        const options: Partial<RequestInit> = {}
        if (route.indexOf("/api/v1") === 0) {
            route = route.replace("/api/v1", "");
        }

        let hederaMirrorNodeConfig: IMirrorNodeServiceNetworkConfigs;
        try {
            if (!this.dAppConfigCached) { // check if dAppConfig is empty
                this.dAppConfigCached = await this.getDappConfig();
            }
            // load config from dApp config
            hederaMirrorNodeConfig = this.dAppConfigCached.mirrorNode;
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
                return await this.fetchWithRetry(`${service.url}${route}`, options)
                    .then(this.statusCheck)
                    .then(x => x.json());
            } catch (e) {
                // console.log(`Mirror node service (${service.name}) failed to make request: ${service.url}${route}`);
            }
        }
        throw new Error(`All mirror node services failed to make request to: ${route}`);
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

    async createAccount(params: { deviceId: string, publicKey: string }) {
        const url = `${this.getApiUrl()}/accounts`;
        const headers: any = {
            "X-NETWORK": this.network.toUpperCase(),
            "X-VISITOR-ID": this.visitorId, // fingerprint (visitorId) (eg.: YoZoVL4XZspaCtLH4GoL)
            "X-DAPP-CODE":  this.dAppCode,
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

        return fetch(url, options)
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async checkAccountCreationStatus(transactionId: string): Promise<any> {
        const url = `${this.getApiUrl()}/accounts/status?transactionId=${transactionId}`;
        const options = {
            method: "GET",
            headers: new Headers({
                "X-NETWORK": this.network.toUpperCase(),
                "X-VISITOR-ID": this.visitorId,
                "X-DAPP-CODE": this.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
                "Content-Type": "application/json"
            })
        };

        return fetch(url, options)
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async getPendingAccountData(transactionId: string) {
        const url = `${this.getApiUrl()}/accounts/details?transactionId=${transactionId}`;
        const options = {
            method: "GET",
            headers: new Headers({
                "X-NETWORK": this.network.toUpperCase(),
                "X-VISITOR-ID": this.visitorId,
                "X-DAPP-CODE": this.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
                "Content-Type": "application/json"
            })
        };

        return fetch(url, options)
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async confirmAccountUpdate(accountId: string): Promise<Response> {
        const url = `${this.getApiUrl()}/accounts/confirm`;
        const options = {
            method: "PATCH",
            headers: new Headers({
                "X-NETWORK": this.network.toUpperCase(),
                "X-VISITOR-ID": this.visitorId,
                "X-DAPP-CODE": this.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({
                id: accountId
            })
        };

        return fetch(url, options)
            .then(this.statusCheck);
    };

    async getTokenAssociateTransactionForAccount(tokenId: string|null, accountId: string): Promise<ApiAccount> {
        const url = `${this.getApiUrl()}/tokens`;
        const body: any = {
            id: accountId,
        };
        if (tokenId) {
            body.token = tokenId;
        }

        const options = {
          method: "PATCH",
          headers: new Headers({
              "X-NETWORK": this.network.toUpperCase(),
              "X-VISITOR-ID": this.visitorId,
              "X-DAPP-CODE": this.dAppCode,
              "X-SDK-TVTE-API": await this.getTvteHeader(),
              "Content-Type": "application/json"
          }),
          body: JSON.stringify(body)
        };

        return fetch(url, options)
          .then(this.statusCheck)
          .then(x => x.json());
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

    async getAccountTokens(accountId: string): Promise<TokenBalanceData[]> {
        const result: TokenBalanceData[] = [];
        let nextPage = `/accounts/${accountId}/tokens`;
        while (nextPage != null) {
            const response = await this.GET(this.network, nextPage);
            nextPage = response.links.next ?? null;

            const tokenInfosReq = [];
            for (const token of response.tokens) {
                tokenInfosReq.push(this.requestTokenInfo(token.token_id));
            }
            const tokenInfos: TokenInfo[] = await Promise.all(tokenInfosReq);
            for (let i = 0; i < tokenInfos.length; i++) {
                const token = response.tokens[i];
                const info = tokenInfos[i];
                result.push({
                    address: token.token_id,
                    balance: (token.balance / 10 ** parseInt(info.decimals, 10)).toString(),
                    rawBalance: token.balance.toString(),
                    decimals: parseInt(info.decimals, 10),
                    name: info.name,
                    symbol: info.symbol,
                });
            }
        }
        return result;
    };

    async requestTokenInfo(tokenId: string): Promise<TokenInfo> {
        if (!this.tokenInfoCache[this.network][tokenId]) {
            this.tokenInfoCache[this.network][tokenId] = await this.GET(this.network,`/tokens/${tokenId}`);
        }
        return this.tokenInfoCache[this.network][tokenId];
    };

    async transferTokens(params: any) {
        const url = `${this.getApiUrl()}/tokens/transfers`;

        const options = {
            method: "POST",
            headers: new Headers({
                "X-NETWORK": this.network.toUpperCase(),
                "X-VISITOR-ID": params.visitorId || this.visitorId,
                "X-DAPP-CODE": params.dAppCode || this.dAppCode,
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

    async signContractCallTx(params: any) {
        const url = `${this.getApiUrl()}/smart/contract/sign`;
        const options = {
            method: "POST",
            headers: new Headers({
                "X-NETWORK": this.network.toUpperCase(),
                "X-VISITOR-ID": this.visitorId,
                "X-DAPP-CODE": this.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
                "Content-Type": "application/json"
            }),
            body: JSON.stringify({
                functionParametersHash: Buffer.from(params.contractFunctionParameters).toString("base64"),
                contractId: params.contractAddress,
                functionName: params.functionName,
                gas: params.gas
            })
        };

        return fetch(url, options)
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async apiCallContractQuery(params: any) {
        const url = `${this.getApiUrl()}/smart/contract/call`;
        const options = {
            method: "POST",
            headers: new Headers({
                "X-NETWORK": this.network.toUpperCase(),
                "X-VISITOR-ID": this.visitorId,
                "X-DAPP-CODE": this.dAppCode,
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

    async getC14token() {
        const url = `${this.getApiUrl()}/c14/data`;
        const options = {
            method: "GET",
            headers: new Headers({
                "X-NETWORK": this.network.toUpperCase(),
                "X-VISITOR-ID": this.visitorId, // fingerprint (visitorId) (eg.: YoZoVL4XZspaCtLH4GoL)
                "X-DAPP-CODE": this.dAppCode,
                "X-SDK-TVTE-API": await this.getTvteHeader(),
                "Content-Type": "application/json"
            }),
        };

        return fetch(url, options)
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async getCryptoFlowData(
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
                "X-NETWORK": this.network.toUpperCase(),
                "X-VISITOR-ID": this.visitorId,
                // "X-DAPP-CODE": params.dAppCode,
                // "X-SDK-TVTE-API": await getTvteHeader(),
                "Content-Type": "application/json"
            })
        };

        return fetch(url, options)
            .then(this.statusCheck)
            .then(x => x.json());
    };

    async getAccountsFromPublicKey(publicKey: PublicKey): Promise<string[]> {
        const formatted = publicKey.toStringRaw();
        return this.GET(this.network, `/accounts?account.publickey=${formatted}`)
            .then((x: AccountInfoMirrorResponse) => x.accounts.map(acc => acc.account))
            .catch(() => {
                return [];
            });
    };

    async getAccountInfo(accountId: string): Promise<APIPagination & AccountInfo> {
        return await this.GET(this.network, `/accounts/${accountId}`);
    }

    async getNodeList(): Promise<NodeInfo[]> {
        const list: NodeInfo[] = [];
        let nextPage = "/network/nodes";

        while (nextPage) {
            const response: APIPagination & MirrorNodeListResponse = await this.GET(this.network, nextPage);
            list.push(...response.nodes);
            nextPage = response.links.next ?? "";
        }
        return list;
    }

    async getTransactionsFrom(
        accountAddress: string,
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
                info = await this.GET(this.network, nextPage);
            } else {
                info = await this.GET(this.network, `/transactions/?account.id=${accountAddress}&limit=${pageLimit}`);
            }
            nextPage = info.links.next ?? null;

            const groupedTransactions: {[key: string]: TransactionData[]} = {};

            await Promise.all(info.transactions.map(async(t: any) => {
                groupedTransactions[t.transaction_id] = await this.getTransaction(this.network, t.transaction_id, accountAddress);
            }));

            let transactions: TransactionData[] = flatArray(Object.values(groupedTransactions))
                .sort((a, b) => new Date(b.time).valueOf() - new Date(a.time).valueOf());

            transactions = filterAndFormatTransactions(transactions, transactionType, accountAddress);

            result.push(...transactions);

            if (result.length >= limit) {
                nextPage = `/transactions?account.id=${accountAddress}&timestamp=lt:${result[limit-1].consensusTimestamp}&limit=${pageLimit}`;
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

    async getTransaction(network: Network, transactionId: string, accountId: string): Promise<TransactionData[]> {
        try {
            const response: TransactionDetailsResponse = await this.GET(network, `/transactions/${transactionId}`);
            return response.transactions.map((tx: TransactionDetails) => {
                return {
                    transactionId: tx.transaction_id,
                    type: tx.name,
                    time: new Date(parseFloat(tx.consensus_timestamp) * 1000),
                    transfers: ([...(tx.token_transfers || []), ...(tx.transfers || [])])
                        .map(transfer => {
                            return {
                                amount: !transfer.token_id ? transfer.amount / 10 ** 8 : transfer.amount,
                                account: transfer.account,
                                ...(transfer.token_id && {tokenAddress: transfer.token_id}),
                                asset: ""
                            }
                        }),
                    nftTransfers: tx.nft_transfers.map((nftTransfer: NftTransferDetail) => {
                        return {
                            tokenAddress: nftTransfer.token_id,
                            serial: nftTransfer.serial_number.toString(),
                            senderAddress: nftTransfer.sender_account_id,
                            receiverAddress: nftTransfer.receiver_account_id
                        }
                    }) || [],
                    memo: global.atob(tx.memo_base64),
                    fee: tx.charged_tx_fee,
                    consensusTimestamp: tx.consensus_timestamp
                };
            })
        } catch (e) {
            return []
        }
    }
}
