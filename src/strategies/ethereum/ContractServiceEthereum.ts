import {ethers} from "ethers"
import {
    ContractCallQueryRecord, ContractCallQueryRecordsData,
    TransactionReceiptData,
} from "../../models/Common";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {Network} from "../../models/Networks";
import {IContractService} from "../ContractServiceContext";
import {ParametersBuilder} from "../../ParametersBuilder";

export default class ContractServiceEthereum implements IContractService {
    private readonly network: Network;
    private readonly signer: ethers.Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(
        network: Network,
        signer: ethers.Signer,
        apiService: ApiService,
        configService: ConfigService
    ) {
        this.network = network;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async contractCallFunction(contractId: string, functionName: string, paramsEncoded: string | ParametersBuilder, gas: number, bladePayFee: boolean): Promise<TransactionReceiptData> {
        throw new Error("Method not implemented.");
    }
    async contractCallQueryFunction(contractId: string, functionName: string, paramsEncoded: string | ParametersBuilder, gas: number, bladePayFee: boolean, resultTypes: string[]): Promise<ContractCallQueryRecordsData> {
        throw new Error("Method not implemented.");
    }
}
