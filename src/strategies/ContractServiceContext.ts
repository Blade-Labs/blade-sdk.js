import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import {Signer} from "@hashgraph/sdk"
import {
    ChainType, ContractCallQueryRecordsData,
    TransactionReceiptData,
} from "../models/Common";
import ContractServiceHedera from "./hedera/ContractServiceHedera";
import ContractServiceEthereum from "./ethereum/ContractServiceEthereum";
import { ethers } from "ethers";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import {Network} from "../models/Networks";
import {ParametersBuilder} from "../ParametersBuilder";

export interface IContractService {
    contractCallFunction(contractId: string, functionName: string, paramsEncoded: string | ParametersBuilder, gas: number, bladePayFee: boolean): Promise<TransactionReceiptData>
    contractCallQueryFunction(contractId: string, functionName: string, paramsEncoded: string | ParametersBuilder, gas: number, bladePayFee: boolean, resultTypes: string[]): Promise<ContractCallQueryRecordsData>
}

@injectable()
export default class ContractServiceContext implements IContractService {
    private chainType: ChainType | null = null;
    private signer: Signer | ethers.Signer | null = null
    private strategy: IContractService | null = null;

    constructor(
        @inject('apiService') private readonly apiService: ApiService,
        @inject('configService') private readonly configService: ConfigService,
    ) {}

    init(chainType: ChainType, network: Network, signer: Signer | ethers.Signer) {
        this.chainType = chainType;
        this.signer = signer;

        switch (chainType) {
            case ChainType.Hedera:
                this.strategy = new ContractServiceHedera(network, signer as Signer, this.apiService, this.configService);
                break;
            case ChainType.Ethereum:
                this.strategy = new ContractServiceEthereum(network, signer as ethers.Signer, this.apiService, this.configService);
                break;
            default:
                throw new Error("Unsupported chain type");
        }
    }

    contractCallFunction(contractId: string, functionName: string, paramsEncoded: string | ParametersBuilder, gas: number, bladePayFee: boolean): Promise<TransactionReceiptData> {
        this.checkInit();
        return this.strategy!.contractCallFunction(contractId, functionName, paramsEncoded, gas, bladePayFee);
    }

    contractCallQueryFunction(contractId: string, functionName: string, paramsEncoded: string | ParametersBuilder, gas: number, bladePayFee: boolean, resultTypes: string[]): Promise<ContractCallQueryRecordsData> {
        this.checkInit();
        return this.strategy!.contractCallQueryFunction(contractId, functionName, paramsEncoded, gas, bladePayFee, resultTypes);
    }

    private checkInit() {
        if (!this.strategy) {
            throw new Error("TokenService not initialized");
        }
    }
}
