import {injectable} from "inversify";
import "reflect-metadata";

import {Buffer} from "buffer";
import {PublicKey} from "@hashgraph/sdk";
import {Network} from "../models/Networks";
import {
    AccountInfo,
    AccountInfoMirrorResponse,
    APIPagination,
    ContractResponseMirrorResponse,
    NftInfo,
    NftMetadata,
    NftTransferDetail,
    NodeInfo,
    NodeListMirrorResponse,
    TokenInfo,
    TokenRelationshipMirrorResponse,
    TransactionMirrorDetails,
    TransactionsMirrorResponse
} from "../models/MirrorNode";
import {
    AssociationAction,
    BladeConfig,
    CoinData,
    CoinInfoRaw,
    DAppConfig,
    IMirrorNodeServiceConfig,
    ScheduleTransactionTransfer,
    ScheduleTransactionType,
    SdkEnvironment,
    TokenBalanceData,
    TransactionData
} from "../models/Common";
import {ChainMap, KnownChainIds} from "../models/Chain";
import {flatArray} from "../helpers/ArrayHelpers";
import {fetchWithRetry, sleep, statusCheck} from "../helpers/ApiHelper";
import {filterAndFormatTransactions} from "../helpers/TransactionHelpers";
import {encrypt} from "../helpers/SecurityHelper";
import {
    CryptoFlowRoutes,
    CryptoFlowServiceStrategy,
    ICryptoFlowAssets,
    ICryptoFlowAssetsParams,
    ICryptoFlowQuote,
    ICryptoFlowQuoteParams,
    ICryptoFlowTransaction,
    ICryptoFlowTransactionParams
} from "../models/CryptoFlow";
import {
    AccountCreateJob,
    ContractCallJob,
    ContractCallQueryJob,
    DropJob,
    JobAction,
    KycGrandJob,
    ScheduleRequestJob,
    SignScheduleRequestJob,
    TokenAssociateJob,
    TransferTokensJob
} from "../models/BladeApi";

@injectable()
export default class ApiService {
    private sdkVersion = ``;
    private apiKey = ``;
    private dAppCode = ``;
    private visitorId = ``;
    private environment: SdkEnvironment = SdkEnvironment.Prod;
    private network: Network = Network.Testnet;
    private chainId: KnownChainIds = KnownChainIds.HEDERA_TESTNET;
    private tokenInfoCache: {[key in Network]: {[key: string]: TokenInfo}} = {
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

    async getSecurityHeader(paramsHash: string, specialParams: string) {
        const [clientType, clientVersion] = this.sdkVersion.split("@");
        const tvteMain = `${clientType}@${this.dAppCode}@${this.network}\t`;
        const tvteMainEncoded = Buffer.from(tvteMain).toString("hex");
        const tvteSecret = `${clientVersion}@${Date.now()}@${this.visitorId}@${paramsHash}@${specialParams}`;

        const tvteSecretEncrypted = await encrypt(tvteSecret, this.apiKey);
        return `${tvteMainEncoded}${tvteSecretEncrypted}`;
    }

    async reqHeaders(headers: {[key: string]: string} = {}, specialParams: string = "null") {
        const tvteHeader = await this.getSecurityHeader("null", specialParams);
        const headersInit = {
            ...headers,
            "X-TVTE-API": tvteHeader,
            "Content-Type": "application/json",
            accept: "application/json"
        };
        return new Headers(headersInit);
    }

    getApiUrl(isPublic = false, forceV7: boolean = false): string {
        const publicPart = isPublic ? "/public" : "";
        if (this.environment === SdkEnvironment.Prod) {
            if (forceV7) {
                return `https://rest.prod.bladewallet.io/openapi${publicPart}/v7`;
            }
            throw new Error("Prod environment is not supported yet");
            // return `https://dapi.bld-dev.bladewallet.io/dapi${publicPart}/v8`;
        }
        // CI
        if (forceV7) {
            return `https://api.bld-dev.bladewallet.io/openapi${publicPart}/v7`;
        }
        return `https://dapi.bld-dev.bladewallet.io/dapi${publicPart}/v8`;
    }

    async GET<T>(network: Network, route: string): Promise<T> {
        const options: Partial<RequestInit> = {};
        if (route.indexOf("/api/v1") === 0) {
            route = route.replace("/api/v1", "");
        }
        let hederaMirrorNodeConfig: IMirrorNodeServiceConfig[];
        try {
            if (!this.dAppConfigCached) {
                // check if dAppConfig is empty
                this.dAppConfigCached = await this.getDappConfig();
            }
            // load config from dApp config
            hederaMirrorNodeConfig = this.dAppConfigCached.mirrorNode;
            if (!hederaMirrorNodeConfig || !hederaMirrorNodeConfig.length) {
                throw new Error("No mirror node config found");
            }
        } catch (e) {
            hederaMirrorNodeConfig = [
                {
                    name: "Mirror Nodes",
                    url: network === Network.Testnet
                        ? "https://testnet.mirrornode.hedera.com/api/v1"
                        : "https://mainnet-public.mirrornode.hedera.com/api/v1",
                    priority: 1
                }
            ];
        }

        // Sort by priority
        hederaMirrorNodeConfig.sort((a, b) => a.priority - b.priority);

        // Try each service until one succeeds
        for (const service of hederaMirrorNodeConfig) {
            try {
                if (service.apikey) {
                    options.headers = {
                        ...(options.headers || {}),
                        "x-api-key": service.apikey
                    };
                }
                return await fetchWithRetry(`${service.url}${route}`, options)
                    .then(statusCheck)
                    .then(x => x.json() as T);
            } catch (e) {
                // console.log(`Mirror node service (${service.name}) failed to make request: ${service.url}${route}`);
            }
        }
        throw new Error(`All mirror node services failed to make request to: ${route}`);
    }

    async getBladeConfig(): Promise<BladeConfig> {
        const url = `${this.getApiUrl(true)}/sdk/config`;
        const options = {
            method: "GET"
        };

        return fetch(url, options)
            .then(statusCheck)
            .then(x => x.json()) as Promise<BladeConfig>;
    }

    async getDappConfig(): Promise<DAppConfig> {
        const url = `${this.getApiUrl()}/client/config`;
        const options = {
            method: "GET",
            headers: await this.reqHeaders()
        };

        return fetch(url, options)
            .then(statusCheck)
            .then(x => x.json()) as Promise<DAppConfig>;
    }

    async createAccount(
        requestMode: JobAction,
        taskId: string,
        params?: {deviceId: string; publicKey: string}
    ): Promise<AccountCreateJob> {
        let url: string;
        let options: RequestInit;
        let retryCount = 3;
        switch (requestMode) {
            case JobAction.INIT:
                if (!params) {
                    throw new Error("Invalid params");
                }
                url = `${this.getApiUrl()}/accounts`;
                options = {
                    method: "POST",
                    headers: await this.reqHeaders({
                        ...(params.deviceId && {"X-DID-API": params.deviceId})
                    }),
                    body: JSON.stringify({
                        publicKey: params.publicKey
                    })
                };
                retryCount = 0;
                break;
            case JobAction.CHECK:
                url = `${this.getApiUrl()}/accounts/${taskId}`;
                options = {
                    method: "GET",
                    headers: await this.reqHeaders()
                };
                break;
            case JobAction.CONFIRM:
                url = `${this.getApiUrl()}/accounts/${taskId}/confirm`;
                options = {
                    method: "PATCH",
                    headers: await this.reqHeaders()
                };
                retryCount = 1;
                break;
            default:
                throw new Error("Invalid request mode");
        }

        return fetchWithRetry(url, options, retryCount)
            .then(statusCheck)
            .then(x => x.json()) as Promise<AccountCreateJob>;
    }

    async tokenAssociation(
        requestMode: JobAction,
        associationAction: AssociationAction,
        taskId: string,
        params?: {accountId: string; tokenIds: string[], action?: string}
    ): Promise<TokenAssociateJob> {
        let url: string;
        let options: RequestInit;
        let retryCount = 1;
        switch (requestMode) {
            case JobAction.INIT:
                let body: string;
                if (!params) {
                    throw new Error("Invalid params");
                }
                if (associationAction === AssociationAction.DEMAND) {
                    url = `${this.getApiUrl()}/tokens/associate/demand`;
                    body = JSON.stringify({
                        accountId: params.accountId,
                        action: params.action
                    });
                } else {
                    url = `${this.getApiUrl()}/tokens/associate`;
                    body = JSON.stringify({
                        accountId: params.accountId,
                        tokenIds: params.tokenIds
                    });
                }
                options = {
                    method: "POST",
                    headers: await this.reqHeaders(),
                    body
                };
                break;
            case JobAction.CHECK:
                url = `${this.getApiUrl()}/tokens/associate/${associationAction === AssociationAction.DEMAND ? 'demand/' : ''}${taskId}`;
                options = {
                    method: "GET",
                    headers: await this.reqHeaders()
                };
                retryCount = 3;
                break;
            case JobAction.CONFIRM:
                url = `${this.getApiUrl()}/tokens/associate/${associationAction === AssociationAction.DEMAND ? 'demand/' : ''}${taskId}/confirm`;
                options = {
                    method: "PATCH",
                    headers: await this.reqHeaders()
                };
                break;
            default:
                throw new Error("Invalid request mode");
        }

        return fetchWithRetry(url, options, retryCount)
            .then(statusCheck)
            .then(x => x.json()) as Promise<TokenAssociateJob>;
    }

    async kycGrant(
        requestMode: JobAction,
        taskId: string,
        params?: {tokenIds: string[]; accountId: string}
    ): Promise<KycGrandJob> {
        let url: string;
        let options: RequestInit;
        let retryCount = 1;
        switch (requestMode) {
            case JobAction.INIT:
                if (!params) {
                    throw new Error("Invalid params");
                }
                url = `${this.getApiUrl()}/tokens/kyc`;
                options = {
                    method: "POST",
                    headers: await this.reqHeaders(),
                    body: JSON.stringify({
                        accountId: params.accountId,
                        tokenIds: params.tokenIds
                    })
                };
                break;
            case JobAction.CHECK:
                url = `${this.getApiUrl()}/tokens/kyc/${taskId}`;
                options = {
                    method: "GET",
                    headers: await this.reqHeaders()
                };
                retryCount = 3;
                break;
            default:
                throw new Error("Invalid request mode");
        }

        return fetchWithRetry(url, options, retryCount)
            .then(statusCheck)
            .then(x => x.json()) as Promise<KycGrandJob>;
    }

    async getCoins(params: any): Promise<CoinInfoRaw[]> {
        const url = `${this.getApiUrl(false, true)}/prices/coins/list?include_platform=true`;
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
            .then(statusCheck)
            .then(x => x.json());
    }

    async getCoinInfo(coinId: string, params: any): Promise<CoinData> {
        const url = `${this.getApiUrl(false, true)}/prices/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
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
            });
    }

    async getAccountTokens(accountId: string): Promise<TokenBalanceData[]> {
        const result: TokenBalanceData[] = [];
        let nextPage: string | null = `/accounts/${accountId}/tokens`;
        while (nextPage != null) {
            const response: TokenRelationshipMirrorResponse = await this.GET<TokenRelationshipMirrorResponse>(
                this.network,
                nextPage
            );
            nextPage = response.links.next ?? null;

            const tokenInfosReq: Promise<TokenInfo>[] = [];
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
                    symbol: info.symbol
                });
            }
        }
        return result;
    }

    async requestTokenInfo(tokenId: string): Promise<TokenInfo> {
        if (!this.tokenInfoCache[this.network][tokenId]) {
            this.tokenInfoCache[this.network][tokenId] = await this.GET<TokenInfo>(this.network, `/tokens/${tokenId}`);
        }
        return this.tokenInfoCache[this.network][tokenId];
    }

    async transferTokens(
        requestMode: JobAction,
        taskId: string,
        params?: Partial<{
            visitorId: string;
            dAppCode: string;
            receiverAccountId: string;
            senderAccountId: string;
            amount: number;
            decimals: string | null;
            memo: string;
            tokenAddress: string;
        }>
    ): Promise<TransferTokensJob> {
        let url: string;
        let options: RequestInit;
        let retryCount = 1;
        switch (requestMode) {
            case JobAction.INIT:
                if (!params) {
                    throw new Error("Invalid params");
                }
                url = `${this.getApiUrl()}/tokens/transfers`;
                options = {
                    method: "POST",
                    headers: await this.reqHeaders(),
                    body: JSON.stringify({
                        receiverAccountId: params.receiverAccountId,
                        senderAccountId: params.senderAccountId,
                        amount: params.amount,
                        decimals: params.decimals,
                        memo: params.memo,
                        tokenId: params.tokenAddress
                    })
                };
                break;
            case JobAction.CHECK:
                url = `${this.getApiUrl()}/tokens/transfers/${taskId}`;
                options = {
                    method: "GET",
                    headers: await this.reqHeaders()
                };
                retryCount = 3;
                break;
            case JobAction.CONFIRM:
                url = `${this.getApiUrl()}/tokens/transfers/${taskId}/confirm`;
                options = {
                    method: "PATCH",
                    headers: await this.reqHeaders()
                };
                retryCount = 1;
                break;
            default:
                throw new Error("Invalid request mode");
        }

        return fetchWithRetry(url, options, retryCount)
            .then(statusCheck)
            .then(x => x.json()) as Promise<TransferTokensJob>;
    }

    async signContractCallTx(
        requestMode: JobAction,
        taskId: string,
        params?: {
            contractAddress: string;
            functionName: string;
            contractFunctionParameters: string;
            gas: number;
            memo: string;
        }
    ): Promise<ContractCallJob> {
        let url: string;
        let options: RequestInit;
        let retryCount = 1;
        switch (requestMode) {
            case JobAction.INIT:
                if (!params) {
                    throw new Error("Invalid params");
                }
                url = `${this.getApiUrl()}/contracts/execute`;
                options = {
                    method: "POST",
                    headers: await this.reqHeaders(),
                    body: JSON.stringify({
                        contractId: params.contractAddress,
                        functionName: params.functionName,
                        functionParametersHash: params.contractFunctionParameters,
                        gas: params.gas,
                        memo: params.memo
                    })
                };
                break;
            case JobAction.CHECK:
                url = `${this.getApiUrl()}/contracts/execute/${taskId}`;
                options = {
                    method: "GET",
                    headers: await this.reqHeaders()
                };
                retryCount = 3;
                break;
            case JobAction.CONFIRM:
                url = `${this.getApiUrl()}/contracts/execute/${taskId}/confirm`;
                options = {
                    method: "PATCH",
                    headers: await this.reqHeaders()
                };
                retryCount = 1;
                break;
            default:
                throw new Error("Invalid request mode");
        }

        return fetchWithRetry(url, options, retryCount)
            .then(statusCheck)
            .then(x => x.json()) as Promise<ContractCallJob>;
    }

    async apiCallContractQuery(
        requestMode: JobAction,
        taskId: string,
        params?: {
            contractAddress: string;
            functionName: string;
            contractFunctionParameters: string;
            gas: number;
            memo: string;
        }
    ): Promise<ContractCallQueryJob> {
        let url: string;
        let options: RequestInit;
        let retryCount = 1;
        switch (requestMode) {
            case JobAction.INIT:
                if (!params) {
                    throw new Error("Invalid params");
                }
                url = `${this.getApiUrl()}/contracts/call`;
                options = {
                    method: "POST",
                    headers: await this.reqHeaders(),
                    body: JSON.stringify({
                        contractId: params.contractAddress,
                        functionName: params.functionName,
                        functionParametersHash: params.contractFunctionParameters,
                        gas: params.gas,
                        memo: params.memo
                    })
                };
                break;
            case JobAction.CHECK:
                url = `${this.getApiUrl()}/contracts/call/${taskId}`;
                options = {
                    method: "GET",
                    headers: await this.reqHeaders()
                };
                retryCount = 3;
                break;
            default:
                throw new Error("Invalid request mode");
        }

        return fetchWithRetry(url, options, retryCount)
            .then(statusCheck)
            .then(x => x.json()) as Promise<ContractCallQueryJob>;
    }

    async dropTokens(
        requestMode: JobAction,
        taskId: string,
        params?: {accountId: string; signedNonce: string}
    ): Promise<DropJob> {
        let url: string;
        let options: RequestInit;
        let retryCount = 1;
        switch (requestMode) {
            case JobAction.INIT:
                if (!params) {
                    throw new Error("Invalid params");
                }
                url = `${this.getApiUrl()}/drop`;
                options = {
                    method: "POST",
                    headers: await this.reqHeaders({}, `signedNonce=${params.signedNonce}`),
                    body: JSON.stringify({
                        accountId: params.accountId
                    })
                };
                break;
            case JobAction.CHECK:
                url = `${this.getApiUrl()}/drop/${taskId}`;
                options = {
                    method: "GET",
                    headers: await this.reqHeaders()
                };
                retryCount = 3;
                break;
            default:
                throw new Error("Invalid request mode");
        }

        return fetchWithRetry(url, options, retryCount)
            .then(statusCheck)
            .then(x => x.json()) as Promise<DropJob>;
    }

    async getCryptoFlowData(
        route: CryptoFlowRoutes,
        params: ICryptoFlowAssetsParams | ICryptoFlowQuoteParams | ICryptoFlowTransactionParams,
        strategy?: CryptoFlowServiceStrategy
    ): Promise<ICryptoFlowAssets | ICryptoFlowQuote[] | ICryptoFlowTransaction> {
        const url = new URL(`${this.getApiUrl(false, true)}/exchange/v3/`);
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
                "X-NETWORK": this.network.toUpperCase(),
                "X-VISITOR-ID": this.visitorId,
                // "X-DAPP-CODE": params.dAppCode,
                // "X-SDK-TVTE-API": await getTvteHeader(),
                "Content-Type": "application/json"
            })
        };

        return fetch(url, options)
            .then(statusCheck)
            .then(x => x.json()) as Promise<ICryptoFlowAssets | ICryptoFlowQuote[] | ICryptoFlowTransaction>;
    }

    async getAccountsFromPublicKey(publicKey: PublicKey): Promise<Partial<AccountInfo>[]> {
        const formatted = publicKey.toStringRaw();
        return this.GET<AccountInfoMirrorResponse>(this.network, `/accounts?account.publickey=${formatted}`)
            .then((x: AccountInfoMirrorResponse) => x.accounts)
            .catch(() => {
                return [];
            });
    }

    async getAccountInfo(accountId: string): Promise<APIPagination & AccountInfo> {
        return await this.GET(this.network, `/accounts/${accountId}`);
    }

    async getNodeList(): Promise<NodeInfo[]> {
        const list: NodeInfo[] = [];
        let nextPage = "/network/nodes";

        while (nextPage) {
            const response: NodeListMirrorResponse = await this.GET<NodeListMirrorResponse>(this.network, nextPage);
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
    ): Promise<{nextPage: string | null; transactions: TransactionData[]}> {
        const limit = parseInt(transactionsLimit, 10);
        let info: TransactionsMirrorResponse;
        const result: TransactionData[] = [];
        const pageLimit = limit >= 100 ? 100 : 25;

        while (result.length < limit) {
            if (nextPage) {
                info = await this.GET<TransactionsMirrorResponse>(this.network, nextPage);
            } else {
                info = await this.GET<TransactionsMirrorResponse>(this.network, `/transactions/?account.id=${accountAddress}&limit=${pageLimit}`);
            }
            nextPage = info.links.next ?? null;

            const groupedTransactions: {[key: string]: TransactionData[]} = {};

            await Promise.all(
                info.transactions.map(async (t: TransactionMirrorDetails) => {
                    groupedTransactions[t.transaction_id] = await this.getTransaction(this.network, t.transaction_id);
                })
            );

            let transactions: TransactionData[] = flatArray(Object.values(groupedTransactions)).sort(
                (a: TransactionData, b: TransactionData) => new Date(b.time).valueOf() - new Date(a.time).valueOf()
            );

            transactions = filterAndFormatTransactions(transactions, transactionType, accountAddress);

            result.push(...transactions);

            if (result.length >= limit) {
                nextPage = `/transactions?account.id=${accountAddress}&timestamp=lt:${
                    result[limit - 1].consensusTimestamp
                }&limit=${pageLimit}`;
            }

            if (!nextPage) {
                break;
            }
        }

        return {
            nextPage,
            transactions: result.slice(0, limit)
        };
    }

    async getTransaction(network: Network, transactionId: string): Promise<TransactionData[]> {
        try {
            const response: TransactionsMirrorResponse = await this.GET(network, `/transactions/${transactionId}`);
            return response.transactions.map((tx: TransactionMirrorDetails) => {
                return {
                    transactionId: tx.transaction_id,
                    type: tx.name,
                    time: new Date(parseFloat(tx.consensus_timestamp) * 1000),
                    transfers: [...(tx.token_transfers || []), ...(tx.transfers || [])].map(transfer => {
                        return {
                            amount: !transfer.token_id ? transfer.amount / 10 ** 8 : transfer.amount,
                            account: transfer.account,
                            ...(transfer.token_id && {tokenAddress: transfer.token_id}),
                            asset: ""
                        };
                    }),
                    nftTransfers:
                        tx.nft_transfers.map((nftTransfer: NftTransferDetail) => {
                            return {
                                tokenAddress: nftTransfer.token_id || "",
                                serial: nftTransfer.serial_number.toString(),
                                senderAddress: nftTransfer.sender_account_id || "",
                                receiverAddress: nftTransfer.receiver_account_id || ""
                            };
                        }) || [],
                    memo: global.atob(tx.memo_base64 || ""),
                    fee: tx.charged_tx_fee,
                    consensusTimestamp: tx.consensus_timestamp
                };
            });
        } catch (e) {
            return [];
        }
    }

    getNftInfo(tokenId: string, serial: string): Promise<NftInfo> {
        return this.GET<NftInfo>(this.network, `/tokens/${tokenId}/nfts/${serial}`) as Promise<NftInfo>;
    }

    async getNftMetadataFromIpfs(ipfsGateway: string, cid: string): Promise<NftMetadata | null> {
        return fetchWithRetry(`${ipfsGateway}${cid}`, {})
            .then(res => res.json()) as Promise<NftMetadata>
    }

    async createScheduleRequestJob(
        requestMode: JobAction,
        taskId: string,
        params?: {type: ScheduleTransactionType; transfers: ScheduleTransactionTransfer[]}
    ): Promise<ScheduleRequestJob> {
        let url: string;
        let options: RequestInit;
        let retryCount = 3;
        switch (requestMode) {
            case JobAction.INIT:
                if (!params) {
                    throw new Error("Invalid params");
                }
                url = `${this.getApiUrl()}/tokens/schedules`;
                options = {
                    method: "POST",
                    headers: await this.reqHeaders(),
                    body: JSON.stringify({
                        transaction: {
                            type: params.type,
                            transfers: params.transfers
                        }
                    })
                };
                retryCount = 0;
                break;
            case JobAction.CHECK:
                url = `${this.getApiUrl()}/tokens/schedules/${taskId}`;
                options = {
                    method: "GET",
                    headers: await this.reqHeaders()
                };
                break;
            default:
                throw new Error("Invalid request mode");
        }

        return fetchWithRetry(url, options, retryCount)
            .then(statusCheck)
            .then(x => x.json()) as Promise<ScheduleRequestJob>;
    }

    async signScheduleRequestJob(
        requestMode: JobAction,
        taskId: string,
        params?: {scheduledTransactionId: string; receiverAccountId: string}
    ): Promise<SignScheduleRequestJob> {
        let url: string;
        let options: RequestInit;
        let retryCount = 3;
        switch (requestMode) {
            case JobAction.INIT:
                if (!params) {
                    throw new Error("Invalid params");
                }
                url = `${this.getApiUrl()}/tokens/schedules/sign`;
                options = {
                    method: "POST",
                    headers: await this.reqHeaders(),
                    body: JSON.stringify({
                        receiverAccountId: params.receiverAccountId,
                        scheduledTransactionId: params.scheduledTransactionId
                    })
                };
                retryCount = 0;
                break;
            case JobAction.CHECK:
                url = `${this.getApiUrl()}/tokens/schedules/sign/${taskId}`;
                options = {
                    method: "GET",
                    headers: await this.reqHeaders()
                };
                break;
            case JobAction.CONFIRM:
                url = `${this.getApiUrl()}/tokens/schedules/sign/${taskId}/confirm`;
                options = {
                    method: "PATCH",
                    headers: await this.reqHeaders()
                };
                retryCount = 1;
                break;
            default:
                throw new Error("Invalid request mode");
        }

        return fetchWithRetry(url, options, retryCount)
            .then(statusCheck)
            .then(x => x.json()) as Promise<SignScheduleRequestJob>;
    }

    async getContractErrorMessage(transactionId: string, contractId: string) {
        const MAX_ATTEMPTS = 5;
        const INTERVAL_MS = 1500;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            await sleep(INTERVAL_MS);
            try {
                const response = await this.GET<TransactionsMirrorResponse>(this.network, `/transactions/${transactionId}`)
                if (response && response.transactions && response.transactions.length > 0) {
                    const consensusTimestamp = response.transactions[0].consensus_timestamp;
                    const contractResponse = await this.GET<ContractResponseMirrorResponse>(this.network, `/contracts/${contractId}/results/${consensusTimestamp}`)
                    return contractResponse?.error_message;
                } else {
                    return null
                }
            } catch (error) {
                if (attempt >= MAX_ATTEMPTS) {
                    return null
                }
            }
        }
        return null
    };
}
