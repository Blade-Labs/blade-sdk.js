import {ethers} from "ethers"
import {
    ContractCallQueryRecordsData,
    TransactionReceiptData,
} from "../../models/Common";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {IContractService} from "../ContractServiceContext";
import {ParametersBuilder} from "../../ParametersBuilder";
import {KnownChainIds} from "@/models/Chain";

export default class ContractServiceEthereum implements IContractService {
    private readonly chainId: KnownChainIds;
    private readonly signer: ethers.Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(
        chainId: KnownChainIds,
        signer: ethers.Signer,
        apiService: ApiService,
        configService: ConfigService
    ) {
        this.chainId = chainId;
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
