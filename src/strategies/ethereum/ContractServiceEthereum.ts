import {ethers} from "ethers"
import {
    ContractCallQueryRecordsData,
    TransactionReceiptData,
} from "../../models/Common";
import {KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {IContractService} from "../ContractServiceContext";
import {ParametersBuilder} from "../../ParametersBuilder";
import {getContractFunctionBytecode} from "../../helpers/ContractHelpers";

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

    async contractCallFunction(contractAddress: string, functionName: string, params: string | ParametersBuilder, gas: number, bladePayFee: boolean): Promise<TransactionReceiptData> {
        // TODO add gas usage
        // TODO implement bladePayFee

        const {functionSignature, bytecode} = await getContractFunctionBytecode(functionName, params);

        const iface = new ethers.utils.Interface([
            ethers.utils.FunctionFragment.from(functionSignature)
        ]);

        const contract = new ethers.Contract(
            contractAddress,
            iface,
            this.signer
        );

        const tx = await contract[functionName](...iface.decodeFunctionData(functionSignature, bytecode));

        const receipt = await tx.wait();

        return {
            status: receipt.status === 1 ? "success" : "failure",
            contractAddress,
            serials: [],
            transactionHash: receipt.transactionHash
        }
    }

    async contractCallQueryFunction(contractAddress: string, functionName: string, params: string | ParametersBuilder, gas: number, bladePayFee: boolean, resultTypes: string[]): Promise<ContractCallQueryRecordsData> {
        const {functionSignature, bytecode} = await getContractFunctionBytecode(functionName, params);

        const iface = new ethers.utils.Interface([
            ethers.utils.FunctionFragment.from(`${functionSignature} view returns (${resultTypes.join(",")})`)
        ]);

        const contract = new ethers.Contract(
            contractAddress,
            iface,
            this.signer
        );

        // Call the Function
        let result = await contract.callStatic[functionName](...iface.decodeFunctionData(functionSignature, bytecode));

        if (resultTypes.length <= 1) {
            result = [result];
        }

        return {
            values: result.map((value: any, index: number) => {
                return {
                    type: resultTypes[index] || "",
                    value: value.toString()
                }
            }),
            gasUsed: 0 // TODO add actual gas usage if possible
        };
    }
}
