import {Signer} from "@hashgraph/sdk";

import {IntegrationUrlData, SwapQuotesData} from "../../models/Common";
import {ChainMap, KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {ITradeService} from "../TradeServiceContext";
import {
    CryptoFlowRoutes,
    CryptoFlowServiceStrategy,
    ICryptoFlowAssets,
    ICryptoFlowAssetsParams,
    ICryptoFlowQuote,
    ICryptoFlowQuoteParams,
    ICryptoFlowTransaction,
    ICryptoFlowTransactionParams
} from "../../models/CryptoFlow";
import CryptoFlowService from "../../services/CryptoFlowService";
import {HbarTokenId} from "../../services/FeeService";

export default class TradeServiceHedera implements ITradeService {
    private readonly chainId: KnownChainIds;
    private readonly signer: Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;
    private readonly cryptoFlowService: CryptoFlowService;

    constructor(
        chainId: KnownChainIds,
        signer: Signer,
        apiService: ApiService,
        configService: ConfigService,
        cryptoFlowService: CryptoFlowService
    ) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
        this.cryptoFlowService = cryptoFlowService;
    }

    async exchangeGetQuotes(
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        strategy: CryptoFlowServiceStrategy
    ): Promise<SwapQuotesData> {
        const useTestnet = ChainMap[this.chainId].isTestnet;
        const chainId = parseInt(this.chainId, 10);
        const assets = (await this.apiService.getCryptoFlowData(
            CryptoFlowRoutes.ASSETS,
            {
                sourceCode,
                targetCode,
                useTestnet,
                targetChainId: chainId,
                sourceChainId: chainId,
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
                params.targetChainId = chainId;
                break;
            }
            case CryptoFlowServiceStrategy.SELL.toLowerCase(): {
                params.sourceChainId = chainId;
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
                params.sourceChainId = chainId;
                params.targetChainId = chainId;
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

    async swapTokens(
        accountAddress: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string
    ): Promise<{success: boolean}> {
        const useTestnet = ChainMap[this.chainId].isTestnet;
        const chainId = parseInt(this.chainId, 10);
        const assets = (await this.apiService.getCryptoFlowData(
            CryptoFlowRoutes.ASSETS,
            {
                sourceCode,
                targetCode,
                useTestnet,
                targetChainId: chainId,
                sourceChainId: chainId,
            },
            CryptoFlowServiceStrategy.SWAP
        )) as ICryptoFlowAssets;

        const sourceAddress = assets.source.find((asset) => asset.code === sourceCode)?.address;
        const targetAddress = assets.target.find((asset) => asset.code === targetCode)?.address;

        const quotes = (await this.apiService.getCryptoFlowData(
            CryptoFlowRoutes.QUOTES,
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
            CryptoFlowServiceStrategy.SWAP
        )) as ICryptoFlowQuote[];
        const selectedQuote = quotes.find(quote => quote.service.id === serviceId);
        if (!selectedQuote) {
            throw new Error("Quote not found");
        }

        const txData: ICryptoFlowTransaction = (await this.apiService.getCryptoFlowData(CryptoFlowRoutes.TRANSACTION, {
            serviceId,
            sourceCode,
            sourceChainId: chainId,
            sourceAddress: selectedQuote.source.asset.address,
            sourceAmount,
            targetCode,
            targetChainId: +this.chainId,
            targetAddress: selectedQuote.target.asset.address,
            walletAddress: accountAddress,
            slippage,
            useTestnet
        })) as ICryptoFlowTransaction;

        if (await this.cryptoFlowService.validateMessage(txData)) {
            await this.cryptoFlowService.executeAllowanceApprove(
                selectedQuote,
                accountAddress,
                this.chainId,
                this.signer!,
                true,
                txData.allowanceTo
            );
            try {
                await this.cryptoFlowService.executeHederaSwapTx(txData.calldata, this.signer!);
            } catch (e) {
                await this.cryptoFlowService.executeAllowanceApprove(
                    selectedQuote,
                    accountAddress,
                    this.chainId,
                    this.signer!,
                    false,
                    txData.allowanceTo
                );
                throw e;
            }
            await this.cryptoFlowService.executeHederaBladeFeeTx(
                selectedQuote,
                accountAddress,
                this.chainId,
                this.signer!
            );
        } else {
            throw new Error("Invalid signature of txData");
        }
        return {success: true};
    }

    async getTradeUrl(
        strategy: CryptoFlowServiceStrategy,
        accountId: string,
        sourceCode: string,
        sourceAmount: number,
        targetCode: string,
        slippage: string,
        serviceId: string,
        redirectUrl: string
    ): Promise<IntegrationUrlData> {
        const useTestnet = ChainMap[this.chainId].isTestnet;

        const params: ICryptoFlowAssetsParams | ICryptoFlowQuoteParams | ICryptoFlowTransactionParams | any = {
            sourceCode,
            sourceAmount,
            targetCode,
            useTestnet,
            walletAddress: accountId,
            slippage
        };

        switch (strategy.toLowerCase()) {
            case CryptoFlowServiceStrategy.BUY.toLowerCase(): {
                params.targetChainId = this.chainId;
                break;
            }
            case CryptoFlowServiceStrategy.SELL.toLowerCase(): {
                params.sourceChainId = this.chainId;
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
}
