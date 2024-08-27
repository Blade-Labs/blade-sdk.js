import {ChainMap, KnownChains} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import {IFeeService} from "../FeeServiceContext";
import {
    AccountId,
    Hbar,
    ScheduleCreateTransaction,
    Transaction,
    TransferTransaction,
    Long
} from "@hashgraph/sdk";
import {FeeManualOptions} from "../../models/Exchange";
import {Network} from "../../models/Networks";
import {FeatureFeeConfig, FeeType} from "../../models/Common";
import BigNumber from "bignumber.js";
import ConfigService from "../../services/ConfigService";

export const HbarTokenId = "0.0.0";

export type RateData = {
    hbarPrice: BigNumber;
    usdPrice: BigNumber;
    decimals: number;
};

type APIRateData = {
    decimals: number;
    icon: string | null;
    id: string;
    name: string;
    price: string;
    priceUsd: number;
    symbol: string;
    dueDiligenceComplete: boolean;
    isFeeOnTransferToken: boolean;
    description: string | null;
    website: string | null;
    twitterHandle: string | null;
    timestampSecondsLastListingChange: number;
};

export default class FeeServiceHedera implements IFeeService {
    private readonly chain: KnownChains;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    private cryptoExchangeRates: Record<KnownChains, Record<string, RateData>> = Object.values(KnownChains).reduce((acc, chain) => {
        acc[chain as KnownChains] = {};
        return acc;
    }, {} as Record<KnownChains, Record<string, RateData>>);

    constructor(chain: KnownChains, apiService: ApiService, configService: ConfigService) {
        this.chain = chain;
        this.apiService = apiService;
        this.configService = configService;
    }

    public async addBladeFee<T extends Transaction>(
        tx: T,
        chain: KnownChains,
        payerAccount: string,
        manualOptions: FeeManualOptions
    ): Promise<T> {
        try {
            if (tx.isFrozen()) {
                return tx;
            }

            const feesConfig = await this.configService.getConfig("fees");
            const feature: FeeType = manualOptions.type;
            const featureConfig = feesConfig[feature];
            const feeAmount = await this.calculateFeeAmount(tx, chain, featureConfig, manualOptions);
            this.modifyTransactionWithFee(tx, payerAccount, featureConfig.collector, feeAmount);

            return tx;
        } catch (e) {
            return tx;
        }
    }

    async createFeeTransaction<R>(
        chain: KnownChains,
        payerAccount: string,
        manualOptions: FeeManualOptions
    ): Promise<R | null> {
        const tx = new TransferTransaction();
        const txWithFee = await this.addBladeFee<TransferTransaction>(tx, chain, payerAccount, manualOptions);
        return txWithFee.hbarTransfers.size > 0 ? (txWithFee as unknown as R) : null;
    }

    private async calculateFeeAmount(
        tx: Transaction,
        chain: KnownChains,
        config: FeatureFeeConfig,
        manualOptions: FeeManualOptions
    ): Promise<Hbar> {
        let spentAmount: BigNumber = BigNumber(0);
        switch (tx.constructor) {
            case TransferTransaction: {
                const transfer = (tx as TransferTransaction);
                spentAmount = spentAmount.plus(
                    await this.getHBAREquivalentAmountFromTransferTransaction(transfer, chain)
                );
                break;
            }
            case ScheduleCreateTransaction: {
                const schedule = (tx as ScheduleCreateTransaction);
                // @ts-ignore
                const scheduledTransaction = schedule._scheduledTransaction;
                spentAmount = spentAmount.plus(
                    await this.getHBAREquivalentAmountFromTransferTransaction(scheduledTransaction, chain)
                );
                break;
            }
        }

        if (manualOptions) {
            let rate = BigNumber(1);
            let decimals = 8;
            if (manualOptions.amountTokenId !== ChainMap[chain].currency) {
                rate = await this.getHBARRateByTokenId(chain, manualOptions.amountTokenId);
                decimals = await this.getDecimalsForTokenId(chain, manualOptions.amountTokenId);
            }
            spentAmount = BigNumber(manualOptions.amount).shiftedBy(decimals).multipliedBy(rate);
        }

        const feeAmount = spentAmount.multipliedBy(config.amount / 100);
        return this.applyLimits(feeAmount, chain, config);
    }

    private modifyTransactionWithFee(
        tx: Transaction,
        payerAccount: AccountId | string,
        collectorAccount: AccountId | string,
        amount: Hbar
    ): void {
        if (amount.toBigNumber().lte(0)) {
            return;
        }

        if (tx instanceof ScheduleCreateTransaction) {
            const schedule = tx;
            // @ts-expect-error need to access private variable
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const scheduledTransaction = schedule._scheduledTransaction;
            if (scheduledTransaction instanceof TransferTransaction) {
                scheduledTransaction.addHbarTransfer(collectorAccount, amount);
                scheduledTransaction.addHbarTransfer(payerAccount, amount.negated());
            }
        } else if (tx instanceof TransferTransaction) {
            tx.addHbarTransfer(collectorAccount, amount);
            tx.addHbarTransfer(payerAccount, amount.negated());
        }
    }

    private async getHBARRateByTokenId(chain: KnownChains, tokenId: string): Promise<BigNumber> {
        if (
            !this.cryptoExchangeRates ||
            !this.cryptoExchangeRates[chain] ||
            !this.cryptoExchangeRates[chain][tokenId]
        ) {
            await this.loadRatesPerChain(chain);
        }
        return this.cryptoExchangeRates[chain]?.[tokenId]?.hbarPrice || BigNumber(0);
    }

    async getDecimalsForTokenId(chain: KnownChains, tokenId: string): Promise<number> {
        if (!this.cryptoExchangeRates || !this.cryptoExchangeRates[chain] || !this.cryptoExchangeRates[chain][tokenId]) {
            await this.loadRatesPerChain(chain);
        }
        return this.cryptoExchangeRates[chain]?.[tokenId]?.decimals || 0;
    }

    private async getHBAREquivalentAmountFromTransferTransaction(tx: TransferTransaction, chain: KnownChains): Promise<BigNumber> {
        let amount: BigNumber = BigNumber(0);
        if (tx.tokenTransfers?.size > 0) {
            for (const [tokenId, accountMap] of tx.tokenTransfers) {
                const spentAmount = [...accountMap.values()]
                    .filter(v => v.gt(0))
                    .reduce((summ, val) => summ.add(val), Long.ZERO);
                const rate = await this.getHBARRateByTokenId(chain, tokenId.toString());
                amount = amount.plus(BigNumber(spentAmount.toNumber()).multipliedBy(rate));
            }
        }
        if (tx.hbarTransfers?.size > 0) {
            const spentAmount = [...tx.hbarTransfers.values()]
                .filter(h => !h.isNegative())
                .reduce((summ, h) => summ.plus(h.toTinybars().toNumber()), BigNumber(0));
            amount = amount.plus(spentAmount);
        }
        return amount;
    }

    private async loadRatesPerChain(chain: KnownChains): Promise<void> {
        const apiRates = await this.fetchRates(chain);
        this.cryptoExchangeRates[chain] = apiRates
            .reduce((rates, rate) => {
                rates[rate.id] = {
                    hbarPrice: BigNumber(rate.price).shiftedBy(-rate.decimals),
                    usdPrice: BigNumber(rate.priceUsd),
                    decimals: rate.decimals
                };
                return rates;
            }, {} as Record<string, RateData>);
    }

    private async fetchRates(chain: KnownChains): Promise<APIRateData[]> {
        const saucerswapApi: {[key in Network]: string} = JSON.parse(
            await this.configService.getConfig("saucerswapApi")
        );
        const network = chain === KnownChains.HEDERA_MAINNET ? Network.Mainnet : Network.Testnet;
        const url = `${saucerswapApi[network]}tokens`;
        return fetch(url)
            .then(result => result.json())
            .catch(() => []) as Promise<APIRateData[]>;
    }

    /**
     * Return amount in TinyHbar that is not less or not greater than limits in provided currency type.
     *
     * @param amount - amount to be limited in TinyHbars
     * @param chain - working chain
     * @param config - feature fee config
     * @private
     */
    private async applyLimits(amount: BigNumber, chain: KnownChains, config: FeatureFeeConfig): Promise<Hbar> {
        const minInTinyHbars = await this.convertAmountToTinyBarsByCurrencyType(chain, config.min, config.limitsCurrency);
        const maxInTinyHbars = await this.convertAmountToTinyBarsByCurrencyType(chain, config.max, config.limitsCurrency);
        const limitedAmount = BigNumber.min(BigNumber.max(minInTinyHbars, amount), maxInTinyHbars);

        if (!limitedAmount.isFinite()) {
            return Hbar.fromTinybars(0);
        }

        return Hbar.fromTinybars(limitedAmount.toFixed(0, BigNumber.ROUND_CEIL));
    }

    private async convertAmountToTinyBarsByCurrencyType(
        chain: KnownChains,
        amount: number,
        type: string = "tinyhbar"
    ): Promise<BigNumber> {
        let rate = BigNumber(1);
        let decimalMultiplier = 8;

        switch (type) {
            case "usd": {
                rate = BigNumber(1).div(await this.getUSDRateForHBAR(chain));
                break;
            }
            case "tinyhbar": {
                decimalMultiplier = 0;
                break;
            }
            case "hbar": {
                break;
            }
            default: {
                decimalMultiplier = await this.getDecimalsForTokenId(chain, type);
                rate = await this.getHBARRateByTokenId(chain, type);
            }
        }

        return BigNumber(amount).multipliedBy(rate).shiftedBy(decimalMultiplier);
    }

    private async getUSDRateForHBAR(chain: KnownChains): Promise<BigNumber | string> {
        const wrapHbar = JSON.parse(await this.configService.getConfig("swapWrapHbar"));
        const network = chain === KnownChains.HEDERA_MAINNET ? Network.Mainnet : Network.Testnet;
        const tokenId = wrapHbar[network][0];

        if (
            !this.cryptoExchangeRates ||
            !this.cryptoExchangeRates[chain] ||
            !this.cryptoExchangeRates[chain][tokenId]
        ) {
            await this.loadRatesPerChain(chain);
        }

        return this.cryptoExchangeRates[chain][tokenId]?.usdPrice || BigNumber(0);
    }
}
