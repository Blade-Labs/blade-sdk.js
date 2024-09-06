import {ContractCallQueryRecordsData, TransactionReceiptData} from "../models/Common";
import {ParametersBuilder} from "../ParametersBuilder";

export interface IContractService {
    contractCallFunction(
        contractAddress: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number,
        usePaymaster: boolean
    ): Promise<TransactionReceiptData>;
    contractCallQueryFunction(
        contractAddress: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number,
        usePaymaster: boolean,
        resultTypes: string[]
    ): Promise<ContractCallQueryRecordsData>;
}

export default class ContractServiceContext implements IContractService {

    constructor(private strategy: IContractService) {}

    contractCallFunction(
        contractAddress: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number,
        usePaymaster: boolean
    ): Promise<TransactionReceiptData> {
        return this.strategy.contractCallFunction(contractAddress, functionName, paramsEncoded, gas, usePaymaster);
    }

    contractCallQueryFunction(
        contractAddress: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number,
        usePaymaster: boolean,
        resultTypes: string[]
    ): Promise<ContractCallQueryRecordsData> {
        return this.strategy.contractCallQueryFunction(
            contractAddress,
            functionName,
            paramsEncoded,
            gas,
            usePaymaster,
            resultTypes
        );
    }
}
