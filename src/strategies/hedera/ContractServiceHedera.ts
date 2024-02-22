import {
    ContractCallQuery,
    ContractExecuteTransaction,
    ContractFunctionResult,
    Signer,
    Transaction,
} from "@hashgraph/sdk";
import {Buffer} from "buffer";

import {
    ContractCallQueryRecordsData,
    TransactionReceiptData,
} from "../../models/Common";
import {KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {IContractService} from "../ContractServiceContext";
import {ParametersBuilder} from "../../ParametersBuilder";
import {getContractFunctionBytecode, parseContractQueryResponse} from "../../helpers/ContractHelpers";
import {formatReceipt} from "../../helpers/TransactionHelpers";

export default class ContractServiceHedera implements IContractService {
    private readonly chainId: KnownChainIds;
    private readonly signer: Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(
        chainId: KnownChainIds,
        signer: Signer,
        apiService: ApiService,
        configService: ConfigService,
    ) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async contractCallFunction(contractId: string, functionName: string, paramsEncoded: string | ParametersBuilder, gas: number, bladePayFee: boolean): Promise<TransactionReceiptData> {
        const contractFunctionParameters = await getContractFunctionBytecode(functionName, paramsEncoded);

        let transaction: Transaction;
        bladePayFee = bladePayFee && (await this.configService.getConfig("smartContract")).toLowerCase() === "true";
        if (bladePayFee) {
            const options = {
                contractFunctionParameters,
                contractId,
                functionName,
                gas
            };

            const {transactionBytes} = await this.apiService.signContractCallTx(options);
            transaction = Transaction.fromBytes(Buffer.from(transactionBytes, "base64"));
        } else {
            transaction = new ContractExecuteTransaction()
                .setContractId(contractId)
                .setGas(gas)
                .setFunction(functionName)
                .setFunctionParameters(contractFunctionParameters)
        }

        return transaction
            .freezeWithSigner(this.signer!)
            .then(tx => tx.signWithSigner(this.signer!))
            .then(tx => tx.executeWithSigner(this.signer!))
            .then(result => result.getReceiptWithSigner(this.signer!))
            .then(data => {
                return formatReceipt(data);
            });
    }

    async contractCallQueryFunction(contractId: string, functionName: string, paramsEncoded: string | ParametersBuilder, gas: number, bladePayFee: boolean, resultTypes: string[]): Promise<ContractCallQueryRecordsData> {
        const contractFunctionParameters = await getContractFunctionBytecode(functionName, paramsEncoded);
        let response: ContractFunctionResult;

        if (bladePayFee) {
            const options = {
                contractFunctionParameters,
                contractId,
                functionName,
                gas
            };
            const {contractFunctionResult, rawResult} = await this.apiService.apiCallContractQuery(options);

            response = new ContractFunctionResult({
                _createResult: false,
                contractId: contractFunctionResult?.contractId,
                errorMessage: "",
                bloom: Uint8Array.from([]),
                gasUsed: contractFunctionResult?.gasUsed,
                logs: [],
                createdContractIds: [],
                evmAddress: null,
                bytes: Buffer.from(rawResult, "base64"),
                gas: contractFunctionResult?.gasUsed,
                amount: contractFunctionResult?.gasUsed,
                functionParameters: Uint8Array.from([]),
                senderAccountId: null,
                stateChanges: [],
                contractNonces: []
            });
        } else {
            response = await new ContractCallQuery()
                .setContractId(contractId)
                .setGas(gas)
                .setFunction(functionName)
                .setFunctionParameters(contractFunctionParameters)
                .executeWithSigner(this.signer!);
        }

        const values = await parseContractQueryResponse(response, resultTypes);
        return {
            values,
            gasUsed: parseInt(response.gasUsed.toString(), 10)
        };
    }
}
