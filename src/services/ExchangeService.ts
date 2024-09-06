import {injectable, inject} from "inversify";
import "reflect-metadata";
import {
    ExchangeRoutes,
    ExchangeStrategy,
    ExchangeAssets,
    ExchangeQuote,
    ExchangeQuoteParams,
    ExchangeTransaction
} from "../models/Exchange";
import {ChainMap, ChainServiceStrategy, KnownChains} from "../models/Chain";
import {IntegrationUrlData, SwapQuotesData} from "../models/Common";
import ApiService from "../services/ApiService";
import TokenServiceContext from "../contexts/TokenServiceContext";
import StringHelpers from "../helpers/StringHelpers";
import {getContainer} from "../container";
import {ChainContextRegistry, ServiceContextTypes} from "../ChainContextRegistry";

@injectable()
export default class ExchangeService {
    private chainContextRegistry: ChainContextRegistry;
    constructor(
        @inject("apiService") private readonly apiService: ApiService
    ) {
        const container = getContainer()
        this.chainContextRegistry = container.get<ChainContextRegistry>("chainContextRegistry");
    }

    async exchangeGetQuotes(
        chain: KnownChains,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        strategy: ExchangeStrategy
    ): Promise<SwapQuotesData> {
        const useTestnet = ChainMap[chain].isTestnet;
        const chainId = StringHelpers.getChainId(chain);
        const assets = (await this.apiService.getExchangeServiceData(
            ExchangeRoutes.ASSETS,
            {
                sourceCode,
                targetCode,
                useTestnet,
                targetChainId: chainId,
                sourceChainId: chainId,
            },
            strategy
        )) as ExchangeAssets;

        const sourceAddress = assets.source.find((asset) => asset.code === sourceCode)?.address;
        const targetAddress = assets.target.find((asset) => asset.code === targetCode)?.address;

        const walletAddress = ChainMap[chain].serviceStrategy === ChainServiceStrategy.Hedera ? "0.0.0" : "0x0000000000000000000000000000000000000000";

        const params: ExchangeQuoteParams = {
            sourceCode,
            sourceAmount,
            targetCode,
            useTestnet,
            walletAddress,
            slippage: "0.5",
            sourceAddress,
            targetAddress,
        };

        switch (strategy.toLowerCase()) {
            case ExchangeStrategy.BUY.toLowerCase(): {
                params.targetChainId = chainId;
                break;
            }
            case ExchangeStrategy.SELL.toLowerCase(): {
                params.sourceChainId = chainId;
                const assets = (await this.apiService.getExchangeServiceData(
                    ExchangeRoutes.ASSETS,
                    params,
                    strategy
                )) as ExchangeAssets;

                if (assets?.limits?.rates && assets.limits.rates.length > 0) {
                    params.targetAmount = assets.limits.rates[0] * sourceAmount;
                }
                break;
            }
            case ExchangeStrategy.SWAP.toLowerCase(): {
                params.sourceChainId = chainId;
                params.targetChainId = chainId;
                break;
            }
        }

        const quotes = (await this.apiService.getExchangeServiceData(
            ExchangeRoutes.QUOTES,
            params,
            strategy
        )) as ExchangeQuote[];
        return {quotes};
    }

    async getTradeUrl(
        chain: KnownChains,
        strategy: ExchangeStrategy,
        accountAddress: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string,
        redirectUrl: string
    ): Promise<IntegrationUrlData> {
        const useTestnet = ChainMap[chain].isTestnet;
        const chainId = StringHelpers.getChainId(chain);
        const params: ExchangeQuoteParams = {
            sourceCode,
            sourceAmount,
            targetCode,
            useTestnet,
            walletAddress: accountAddress,
            slippage
        };

        switch (strategy.toLowerCase()) {
            case ExchangeStrategy.BUY.toLowerCase(): {
                params.targetChainId = chainId;
                break;
            }
            case ExchangeStrategy.SELL.toLowerCase(): {
                params.sourceChainId = chainId;
                const assets = (await this.apiService.getExchangeServiceData(
                    ExchangeRoutes.ASSETS,
                    params,
                    strategy
                )) as ExchangeAssets;

                if (assets?.limits?.rates && assets.limits.rates.length > 0) {
                    params.targetAmount = assets.limits.rates[0] * sourceAmount;
                }
                break;
            }
        }
        params.redirectUrl = redirectUrl;

        const quotes = (await this.apiService.getExchangeServiceData(
            ExchangeRoutes.QUOTES,
            params,
            strategy
        )) as ExchangeQuote[];
        const selectedQuote = quotes.find(quote => quote.service.id === serviceId);
        if (!selectedQuote) {
            throw new Error("Quote not found");
        }

        return {url: selectedQuote.widgetUrl || ""};
    }

    async swapTokens(
        chain: KnownChains,
        accountAddress: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string
    ): Promise<{success: boolean}> {
        const useTestnet = ChainMap[chain].isTestnet;
        const chainId = StringHelpers.getChainId(chain);
        const assets = (await this.apiService.getExchangeServiceData(
            ExchangeRoutes.ASSETS,
            {
                sourceCode,
                targetCode,
                useTestnet,
                targetChainId: chainId,
                sourceChainId: chainId,
            },
            ExchangeStrategy.SWAP
        )) as ExchangeAssets;

        const sourceAddress = assets.source.find((asset) => asset.code === sourceCode)?.address;
        const targetAddress = assets.target.find((asset) => asset.code === targetCode)?.address;

        const quotes = (await this.apiService.getExchangeServiceData(
            ExchangeRoutes.QUOTES,
            {
                sourceCode,
                sourceChainId: chainId,
                sourceAmount,
                targetCode,
                targetChainId: chainId,
                useTestnet,
                sourceAddress,
                targetAddress
            },
            ExchangeStrategy.SWAP
        )) as ExchangeQuote[];
        const selectedQuote = quotes.find(quote => quote.service.id === serviceId);
        if (!selectedQuote) {
            throw new Error("Quote not found");
        }

        const txData: ExchangeTransaction = (await this.apiService.getExchangeServiceData(ExchangeRoutes.TRANSACTION, {
            serviceId,
            sourceCode,
            sourceChainId: chainId,
            sourceAddress: selectedQuote.source.asset.address,
            sourceAmount,
            targetCode,
            targetChainId: chainId,
            targetAddress: selectedQuote.target.asset.address,
            walletAddress: accountAddress,
            slippage,
            useTestnet
        })) as ExchangeTransaction;

        const tokenServiceContext = this.chainContextRegistry.getContext<TokenServiceContext>(chain, ServiceContextTypes.TokenServiceContext);
        return tokenServiceContext.swapTokens(accountAddress, selectedQuote, txData);
    }
}
