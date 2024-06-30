import {
    ContractCallQuery,
    ContractExecuteTransaction,
    ContractFunctionResult,
    Signer,
    Transaction,
    TransactionResponse
} from "@hashgraph/sdk";
import {Buffer} from "buffer";

import {ContractCallQueryRecordsData, TransactionReceiptData} from "../../models/Common";
import {KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {IContractService} from "../ContractServiceContext";
import {ParametersBuilder} from "../../ParametersBuilder";
import {getContractFunctionBytecode, parseContractQueryResponse} from "../../helpers/ContractHelpers";
import {getReceipt} from "../../helpers/TransactionHelpers";
import {JobAction, JobStatus} from "../../models/BladeApi";
import {sleep} from "../../helpers/ApiHelper";

export default class ContractServiceHedera implements IContractService {
    private readonly chainId: KnownChainIds;
    private readonly signer: Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(chainId: KnownChainIds, signer: Signer, apiService: ApiService, configService: ConfigService) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async contractCallFunction(
        contractAddress: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number,
        usePaymaster: boolean
    ): Promise<TransactionReceiptData> {
        const {bytecode} = await getContractFunctionBytecode(functionName, paramsEncoded);

        let response: Promise<TransactionResponse>;
        usePaymaster = usePaymaster && await this.configService.getConfig("contractExecute");
        if (usePaymaster) {
            const options = {
                contractFunctionParameters: bytecode.toString("base64"),
                contractAddress,
                functionName,
                gas,
                memo: ""
            };

            let contractCallJob = await this.apiService.signContractCallTx(JobAction.INIT, "", options);
            while (true) {
                if (contractCallJob.status === JobStatus.SUCCESS) {
                    break;
                }
                if (contractCallJob.status === JobStatus.FAILED) {
                    throw new Error(contractCallJob.errorMessage);
                }
                await sleep(await this.configService.getConfig("refreshTaskPeriodSeconds") * 1000);
                contractCallJob = await this.apiService.signContractCallTx(JobAction.CHECK, contractCallJob.taskId);
            }

            if (!contractCallJob.result) {
                throw new Error("Failed to fetch transaction bytes backend");
            }

            response = Transaction.fromBytes(Buffer.from(contractCallJob.result.transactionBytes, "base64"))

                .freezeWithSigner(this.signer!)
                .then(tx => tx.signWithSigner(this.signer!))
                .then(tx => tx.executeWithSigner(this.signer!))
                .then(async res => {
                    await this.apiService.signContractCallTx(JobAction.CONFIRM, contractCallJob.taskId).catch(() => {
                        // ignore this error, continue (no content)
                    });

                    return res;
                });
        } else {
            response = new ContractExecuteTransaction()
                .setContractId(contractAddress)
                .setGas(gas)
                .setFunction(functionName)
                .setFunctionParameters(bytecode)

                .freezeWithSigner(this.signer!)
                .then(tx => tx.signWithSigner(this.signer!))
                .then(tx => tx.executeWithSigner(this.signer!));
        }

        return response.then(txResult => getReceipt(txResult, this.signer!));
    }

    async contractCallQueryFunction(
        contractAddress: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        gas: number,
        usePaymaster: boolean,
        resultTypes: string[]
    ): Promise<ContractCallQueryRecordsData> {
        const {bytecode} = await getContractFunctionBytecode(functionName, paramsEncoded);
        let response: ContractFunctionResult;

        if (usePaymaster) {
            const options = {
                contractFunctionParameters: bytecode.toString("base64"),
                contractAddress,
                functionName,
                gas,
                memo: ""
            };
            let contractCallQueryJob = await this.apiService.apiCallContractQuery(JobAction.INIT, "", options);
            while (true) {
                if (contractCallQueryJob.status === JobStatus.SUCCESS) {
                    break;
                }
                if (contractCallQueryJob.status === JobStatus.FAILED) {
                    throw new Error(contractCallQueryJob.errorMessage);
                }
                await sleep(await this.configService.getConfig("refreshTaskPeriodSeconds") * 1000);
                contractCallQueryJob = await this.apiService.apiCallContractQuery(JobAction.CHECK, contractCallQueryJob.taskId);
            }

            if (!contractCallQueryJob.result) {
                throw new Error("No result from backend");
            }

            const {contractFunctionResult, rawResult} = contractCallQueryJob.result;

            // TODO improve, when backend will be fixed
            console.log(contractFunctionResult, rawResult);

            response = new ContractFunctionResult({
                _createResult: false,
                // @ts-expect-error - should be a Long, but we don't have the type for it
                contractId: contractFunctionResult?.contractId,
                errorMessage: "",
                bloom: Uint8Array.from([]),
                // @ts-expect-error - should be a Long, but we don't have the type for it
                gasUsed: contractFunctionResult?.gasUsed,
                logs: [],
                createdContractIds: [],
                evmAddress: null,
                bytes: Buffer.from(rawResult, "base64"),
                // @ts-expect-error - should be a Long, but we don't have the type for it
                gas: contractFunctionResult?.gasUsed,
                // @ts-expect-error - should be a Long, but we don't have the type for it
                amount: contractFunctionResult?.gasUsed,
                functionParameters: Uint8Array.from([]),
                senderAccountId: null,
                stateChanges: [],
                contractNonces: []
            });
        } else {
            response = await new ContractCallQuery()
                .setContractId(contractAddress)
                .setGas(gas)
                .setFunction(functionName)
                .setFunctionParameters(bytecode)
                .executeWithSigner(this.signer!);
        }

        const values = await parseContractQueryResponse(response, resultTypes);
        return {
            values,
            gasUsed: parseInt(response.gasUsed.toString(), 10)
        };
    }
}
