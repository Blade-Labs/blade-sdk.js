import {injectable, inject} from "inversify";
import "reflect-metadata";

import {Signer} from "@hashgraph/sdk";
import {ContractCallQueryRecordsData, TransactionReceiptData} from "../models/Common";
import {ChainMap, ChainServiceStrategy, KnownChainIds} from "../models/Chain";
import ContractServiceHedera from "./hedera/ContractServiceHedera";
import ContractServiceEthereum from "./ethereum/ContractServiceEthereum";
import {ethers} from "ethers";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import {Network} from "../models/Networks";
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

@injectable()
export default class ContractServiceContext implements IContractService {
    private chainId: KnownChainIds | null = null;
    private signer: Signer | ethers.Signer | null = null;
    private strategy: IContractService | null = null;

    constructor(
        @inject("apiService") private readonly apiService: ApiService,
        @inject("configService") private readonly configService: ConfigService
    ) {}

    init(chainId: KnownChainIds, signer: Signer | ethers.Signer) {
        this.chainId = chainId;
        this.signer = signer;

        switch (ChainMap[this.chainId].serviceStrategy) {
            case ChainServiceStrategy.Hedera:
                this.strategy = new ContractServiceHedera(
                    chainId,
                    signer as Signer,
                    this.apiService,
                    this.configService
                );
                break;
            case ChainServiceStrategy.Ethereum:
                this.strategy = new ContractServiceEthereum(
                    chainId,
                    signer as ethers.Signer,
                    this.apiService,
                    this.configService
                );
                break;
            default:
                throw new Error(`Unsupported chain id: ${this.chainId}`);
        }
    }

    contractCallFunction(
        contractAddress: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number,
        usePaymaster: boolean
    ): Promise<TransactionReceiptData> {
        this.checkInit();
        return this.strategy!.contractCallFunction(contractAddress, functionName, paramsEncoded, gas, usePaymaster);
    }

    contractCallQueryFunction(
        contractAddress: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number,
        usePaymaster: boolean,
        resultTypes: string[]
    ): Promise<ContractCallQueryRecordsData> {
        this.checkInit();
        return this.strategy!.contractCallQueryFunction(
            contractAddress,
            functionName,
            paramsEncoded,
            gas,
            usePaymaster,
            resultTypes
        );
    }

    private checkInit() {
        if (!this.strategy) {
            throw new Error("ContractService not initialized (no signer, call setUser() first)");
        }
    }
}
