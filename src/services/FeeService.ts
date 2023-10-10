import {Network} from "../models/Networks";
import {AccountId, Hbar, ScheduleCreateTransaction, Transaction, TransferTransaction} from "@hashgraph/sdk";
import {FeeManualOptions, FeeType} from "../models/CryptoFlow";
import BigNumber from "bignumber.js";
import {getConfig} from "./ConfigService";

type FeatureFeeConfig = {
  collector: string,
  min: number,
  amount: number, // Percentage value
  max: number,
  limitsCurrency: string
}

export const createFeeTransaction = async (
    network: Network,
    payerAccount: AccountId | string,
    manualOptions?: FeeManualOptions
): Promise<TransferTransaction | null> => {
    const tx = new TransferTransaction();
    const txWithFee = await addBladeFee<TransferTransaction>(tx, network, payerAccount, manualOptions);
    return txWithFee.hbarTransfers.size > 0 ? txWithFee : null;
}

export const addBladeFee = async <T extends Transaction>(
  tx: T,
  network: Network,
  payerAccount: AccountId | string,
  manualOptions?: FeeManualOptions
): Promise<T> => {
  try {
    if (tx.isFrozen()) {
      return tx;
    }

    const feature: FeeType = manualOptions?.type || detectFeeType(tx);
    const feesConfig = JSON.parse(await getConfig("feesConfig"));

    const featureConfig = feesConfig[network][feature];
    const feeAmount = await calculateFeeAmount(tx, network, featureConfig, manualOptions);
    modifyTransactionWithFee(tx, payerAccount, featureConfig.collector, feeAmount);

    return tx;
  } catch (e) {
    return tx;
  }
}

function detectFeeType(tx: Transaction): FeeType {
  let feature: FeeType;
  switch (tx.constructor) {
    case TransferTransaction: {
      const transfer = (tx as TransferTransaction);
      if (transfer.nftTransfers?.size > 0) {
        feature = FeeType.TransferNFT;
      } else if (transfer.tokenTransfers?.size > 0) {
        feature = FeeType.TransferToken;
      } else if (transfer.hbarTransfers?.size > 0) {
        feature = FeeType.TransferHBAR;
      } else {
        feature = FeeType.Default;
      }
      break;
    }
    case ScheduleCreateTransaction: {
      const schedule = (tx as ScheduleCreateTransaction);
      // @ts-ignore
      const scheduledTransaction = schedule._scheduledTransaction;

      if (scheduledTransaction.nftTransfers?.size > 0) {
        feature = FeeType.TradeNFT;
      } else if (scheduledTransaction.tokenTransfers?.size > 0) {
        feature = FeeType.ScheduledTransferToken;
      } else if (scheduledTransaction.hbarTransfers?.size > 0) {
        feature = FeeType.ScheduledTransferHBAR;
      } else {
        feature = FeeType.Default;
      }
      break;
    }
    default: {
      feature = FeeType.Default;
    }
  }

  return feature;
}


async function calculateFeeAmount(
  tx: Transaction,
  network: Network,
  config: FeatureFeeConfig,
  manualOptions?: FeeManualOptions
 ): Promise<Hbar> {
    let spentAmount: BigNumber = BigNumber(0);
    switch (tx.constructor) {
      case TransferTransaction: {
        const transfer = (tx as TransferTransaction);
        spentAmount = spentAmount.plus(
          await this.getHBAREquivalentAmountFromTransferTransaction(transfer, network)
        );
        break;
      }
      case ScheduleCreateTransaction: {
        const schedule = (tx as ScheduleCreateTransaction);
        // @ts-ignore
        const scheduledTransaction = schedule._scheduledTransaction;
        spentAmount = spentAmount.plus(
          await this.getHBAREquivalentAmountFromTransferTransaction(scheduledTransaction, network)
        );
        break;
      }
    }

    if (manualOptions) {
      let rate = BigNumber(1);
      let decimals = 8;
      if (manualOptions.amountTokenId !== "0.0.0") {
        rate = await this.ratesService.getHBARRateByTokenId(network, manualOptions.amountTokenId);
        decimals = await this.ratesService.getDecimalsForTokenId(network, manualOptions.amountTokenId);
      }
      spentAmount = BigNumber(manualOptions.amount).shiftedBy(decimals).multipliedBy(rate);
    }

    const feeAmount = spentAmount.multipliedBy(config.amount / 100);
    return this.applyLimits(feeAmount, network, config);
  }


  function modifyTransactionWithFee(
    tx: Transaction,
    payerAccount: AccountId | string,
    collectorAccount: AccountId | string,
    amount: Hbar
  ): void {
    if (amount.toBigNumber().eq(0) || amount.toBigNumber().lt(0)) {
      return;
    }

    if (tx instanceof ScheduleCreateTransaction) {
      const schedule = (tx as ScheduleCreateTransaction);
      // @ts-ignore
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
