import {injectable, inject} from "inversify";
import "reflect-metadata";
import {
    CryptoFlowRoutes,
    CryptoFlowServiceStrategy,
    ICryptoFlowAssets,
    ICryptoFlowQuote,
    ICryptoFlowQuoteParams,
    ICryptoFlowTransaction
} from "../models/CryptoFlow";
import {HbarTokenId} from "./FeeService";
import {ChainMap, KnownChainIds} from "../models/Chain";
import {IntegrationUrlData, SwapQuotesData} from "../models/Common";
import ApiService from "../services/ApiService";
import TokenServiceContext from "../strategies/TokenServiceContext";

@injectable()
export default class TradeService {
    constructor(
        @inject("apiService") private readonly apiService: ApiService,
        @inject("tokenServiceContext") private readonly tokenServiceContext: TokenServiceContext,
    ) {}

    async exchangeGetQuotes(
        chainId: KnownChainIds,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        strategy: CryptoFlowServiceStrategy
    ): Promise<SwapQuotesData> {
        const useTestnet = ChainMap[chainId].isTestnet;
        const chainIdNumeric = parseInt(chainId, 10);
        const assets = (await this.apiService.getCryptoFlowData(
            CryptoFlowRoutes.ASSETS,
            {
                sourceCode,
                targetCode,
                useTestnet,
                targetChainId: chainIdNumeric,
                sourceChainId: chainIdNumeric,
            },
            strategy
        )) as ICryptoFlowAssets;

        const sourceAddress = assets.source.find((asset) => asset.code === sourceCode)?.address;
        const targetAddress = assets.target.find((asset) => asset.code === targetCode)?.address;


        const params: ICryptoFlowQuoteParams = {
            sourceCode,
            sourceAmount,
            targetCode,
            useTestnet,
            walletAddress: HbarTokenId,
            slippage: "0.5",
            sourceAddress,
            targetAddress,
        };

        switch (strategy.toLowerCase()) {
            case CryptoFlowServiceStrategy.BUY.toLowerCase(): {
                params.targetChainId = chainIdNumeric;
                break;
            }
            case CryptoFlowServiceStrategy.SELL.toLowerCase(): {
                params.sourceChainId = chainIdNumeric;
                const assets = (await this.apiService.getCryptoFlowData(
                    CryptoFlowRoutes.ASSETS,
                    params,
                    strategy
                )) as ICryptoFlowAssets;

                if (assets?.limits?.rates && assets.limits.rates.length > 0) {
                    params.targetAmount = assets.limits.rates[0] * sourceAmount;
                }
                break;
            }
            case CryptoFlowServiceStrategy.SWAP.toLowerCase(): {
                params.sourceChainId = chainIdNumeric;
                params.targetChainId = chainIdNumeric;
                break;
            }
        }

        const quotes = (await this.apiService.getCryptoFlowData(
            CryptoFlowRoutes.QUOTES,
            params,
            strategy
        )) as ICryptoFlowQuote[];
        return {quotes};
    }

    async getTradeUrl(
        chainId: KnownChainIds,
        strategy: CryptoFlowServiceStrategy,
        accountAddress: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string,
        redirectUrl: string
    ): Promise<IntegrationUrlData> {
        const useTestnet = ChainMap[chainId].isTestnet;
        const chainIdNumeric = parseInt(chainId, 10);
        const params: ICryptoFlowQuoteParams = {
            sourceCode,
            sourceAmount,
            targetCode,
            useTestnet,
            walletAddress: accountAddress,
            slippage
        };

        switch (strategy.toLowerCase()) {
            case CryptoFlowServiceStrategy.BUY.toLowerCase(): {
                params.targetChainId = chainIdNumeric;
                break;
            }
            case CryptoFlowServiceStrategy.SELL.toLowerCase(): {
                params.sourceChainId = chainIdNumeric;
                const assets = (await this.apiService.getCryptoFlowData(
                    CryptoFlowRoutes.ASSETS,
                    params,
                    strategy
                )) as ICryptoFlowAssets;

                if (assets?.limits?.rates && assets.limits.rates.length > 0) {
                    params.targetAmount = assets.limits.rates[0] * sourceAmount;
                }
                break;
            }
        }
        params.redirectUrl = redirectUrl;

        const quotes = (await this.apiService.getCryptoFlowData(
            CryptoFlowRoutes.QUOTES,
            params,
            strategy
        )) as ICryptoFlowQuote[];
        const selectedQuote = quotes.find(quote => quote.service.id === serviceId);
        if (!selectedQuote) {
            throw new Error("Quote not found");
        }

        return {url: selectedQuote.widgetUrl || ""};
    }

    async swapTokens(
        chainId: KnownChainIds,
        accountAddress: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string
    ): Promise<{success: boolean}> {
        const useTestnet = ChainMap[chainId].isTestnet;
        const chainIdNumeric = parseInt(chainId, 10);
        const assets = (await this.apiService.getCryptoFlowData(
            CryptoFlowRoutes.ASSETS,
            {
                sourceCode,
                targetCode,
                useTestnet,
                targetChainId: chainIdNumeric,
                sourceChainId: chainIdNumeric,
            },
            CryptoFlowServiceStrategy.SWAP
        )) as ICryptoFlowAssets;

        const sourceAddress = assets.source.find((asset) => asset.code === sourceCode)?.address;
        const targetAddress = assets.target.find((asset) => asset.code === targetCode)?.address;

        const quotes = (await this.apiService.getCryptoFlowData(
            CryptoFlowRoutes.QUOTES,
            {
                sourceCode,
                sourceChainId: chainIdNumeric,
                sourceAmount,
                targetCode,
                targetChainId: chainIdNumeric,
                useTestnet,
                sourceAddress,
                targetAddress
            },
            CryptoFlowServiceStrategy.SWAP
        )) as ICryptoFlowQuote[];
        const selectedQuote = quotes.find(quote => quote.service.id === serviceId);
        if (!selectedQuote) {
            throw new Error("Quote not found");
        }

        const txData: ICryptoFlowTransaction = (await this.apiService.getCryptoFlowData(CryptoFlowRoutes.TRANSACTION, {
            serviceId,
            sourceCode,
            sourceChainId: chainIdNumeric,
            sourceAddress: selectedQuote.source.asset.address,
            sourceAmount,
            targetCode,
            targetChainId: chainIdNumeric,
            targetAddress: selectedQuote.target.asset.address,
            walletAddress: accountAddress,
            slippage,
            useTestnet
        })) as ICryptoFlowTransaction;


        return this.tokenServiceContext.swapTokens(accountAddress, selectedQuote, txData);
    }
}
