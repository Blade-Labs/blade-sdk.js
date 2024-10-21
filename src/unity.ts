import {Buffer} from "buffer";
import {TextDecoder, TextEncoder} from "text-encoding";
import {
    AccountDeleteTransaction,
    AccountId,
    Client,
    ContractCallQuery,
    ContractExecuteTransaction,
    ContractFunctionResult,
    ContractId,
    Hbar,
    PrivateKey,
    PublicKey,
    Query,
    Timestamp,
    Transaction,
    TransactionId,
    TransferTransaction
} from "@hashgraph/sdk";
import {CustomError} from "./models/Errors";
import {AccountInfoData, BridgeResponse, EncryptedType, Environment, InfoData, SdkEnvironment} from "./models/Common";
import {Network} from "./models/Networks";
import config from "./config";
import StringHelpers from "./helpers/StringHelpers";
import {getEncryptedHeader, initApiService} from "./ApiService";
import {ethers} from "ethers";
import {
    getContractFunctionBytecode,
    parseContractFunctionParams,
    parseContractQueryResponse
} from "./helpers/ContractHelpers";
import {ParametersBuilder} from "@/ParametersBuilder";

Object.assign(globalThis, {
    unityEnv: true,
    Buffer: Buffer,
    TextEncoder,
    TextDecoder,
    btoa: (str: string) => Buffer.from(str, "binary").toString("base64"),
});

export class BladeUnitySDK {
    private apiKey: string = "";
    private network: Network = Network.Testnet;
    private dAppCode: string = "";
    private visitorId: string = "";
    private sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod;
    private sdkVersion: string = config.sdkVersion;

    async init(
        apiKey: string,
        network: string,
        dAppCode: string,
        visitorId: string,
        sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod,
        sdkVersion: string = config.sdkVersion
    ): Promise<InfoData> {
        this.apiKey = apiKey;
        this.network = StringHelpers.stringToNetwork(network);
        this.dAppCode = dAppCode;
        this.visitorId = visitorId;
        this.sdkEnvironment = sdkEnvironment;
        this.sdkVersion = sdkVersion;

        initApiService(sdkVersion, visitorId, apiKey, sdkEnvironment);

        return  {
            apiKey: this.apiKey,
            dAppCode: this.dAppCode,
            network: this.network,
            visitorId: this.visitorId,
            sdkEnvironment: this.sdkEnvironment,
            sdkVersion: this.sdkVersion,
            nonce: Math.round(Math.random() * 1000000000)
        };
    }

    async transferHbars(
        accountId: string,
        accountPrivateKey: string,
        receiverID: string,
        amount: string,
        memo: string
    ): Promise<string> {
        try {
            const client = this.getClient();
            client.setOperator(accountId, accountPrivateKey);
            const parsedAmount = parseFloat(amount);

            const tx = Buffer.from(
                (
                    await (
                        new TransferTransaction()
                            .addHbarTransfer(receiverID, parsedAmount)
                            .addHbarTransfer(accountId, -1 * parsedAmount)
                            .setTransactionMemo(memo)
                            .freezeWith(client)
                            .sign(PrivateKey.fromString(accountPrivateKey))
                    )
                ).toBytes()
            ).toString('hex');
            return this.sendMessageToNative({
                tx,
                network: this.network,
            });
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async signTransaction(transactionBytes: string, encoding: "hex"|"base64", accountPrivateKey: string): Promise<string> {
        const buffer = Buffer.from(transactionBytes, encoding);
        const transaction = Transaction.fromBytes(buffer);

        const tx = Buffer.from(
            (
                await transaction.sign(PrivateKey.fromString(accountPrivateKey))
            ).toBytes()
        ).toString("hex");

        return this.sendMessageToNative({
            tx,
            network: this.network,
        });
    }

    async getEncryptedToken(type: EncryptedType = EncryptedType.tvte): Promise<string> {
        try {
            return this.sendMessageToNative({
                value: await getEncryptedHeader(Environment.node, type)
            });
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async transferTokens(tokenId: string, accountId: string, accountPrivateKey: string, receiverID: string, correctedAmount: number, memo: string): Promise<string> {
        try {
            const client = this.getClient();
            client.setOperator(accountId, accountPrivateKey);

            const tx = Buffer.from((await (
                new TransferTransaction()
                    .addTokenTransfer(tokenId, receiverID, correctedAmount)
                    .addTokenTransfer(tokenId, accountId, -1 * correctedAmount)
                    .setTransactionMemo(memo)
                    .freezeWith(client)
                    .sign(PrivateKey.fromString(accountPrivateKey))
            )).toBytes()).toString('hex');
            return this.sendMessageToNative({
                tx,
                network: this.network,
            });
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async getAccountInfo(accountId: string, evmAddress: string, publicKey: string): Promise<string> {
        try {
            const result: AccountInfoData = {
                accountId,
                evmAddress: (evmAddress ? evmAddress : `0x${AccountId.fromString(accountId).toSolidityAddress()}`),
                calculatedEvmAddress: ethers.utils.computeAddress(`0x${publicKey}`).toLowerCase()
            }
            return this.sendMessageToNative(result);
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async generateKeys(): Promise<string> {
        try {
            const privateKey: PrivateKey = PrivateKey.generateECDSA();
            const publicKey = privateKey.publicKey.toStringDer();
            return this.sendMessageToNative({
                privateKey: privateKey.toStringDer(),
                publicKey,
                evmAddress: ethers.utils.computeAddress(`0x${privateKey.publicKey.toStringRaw()}`)
            });
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async deleteAccount(deleteAccountId: string, deletePrivateKey: string, transferAccountId: string, operatorAccountId: string, operatorPrivateKey: string): Promise<string> {
        try {
            const client = this.getClient();
            const deleteAccountKey = PrivateKey.fromString(deletePrivateKey);
            const operatorAccountKey = PrivateKey.fromString(operatorPrivateKey);
            client.setOperator(operatorAccountId, operatorAccountKey);

            const transaction = await (await (new AccountDeleteTransaction()
                .setAccountId(deleteAccountId)
                .setTransferAccountId(transferAccountId)
                .freezeWith(client)
                .sign(deleteAccountKey)
            )).sign(operatorAccountKey);
            const tx = Buffer.from(transaction.toBytes()).toString('hex');
            return this.sendMessageToNative({
                tx,
                network: this.network,
            });
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async contractCallFunctionTransaction(
        contractId: string,
        functionName: string,
        paramsEncoded: string,
        accountId: string,
        accountPrivateKey: string,
        gas: number = 100000
    ): Promise<string> {
        try {
            const client = this.getClient();
            client.setOperator(accountId, accountPrivateKey);
            const contractFunctionParameters = await getContractFunctionBytecode(functionName, paramsEncoded);
            const transaction = await ( new ContractExecuteTransaction()
                    .setContractId(contractId)
                    .setGas(gas)
                    .setFunction(functionName)
                    .setFunctionParameters(contractFunctionParameters)
                    .freezeWith(client)
                    .sign(PrivateKey.fromString(accountPrivateKey))
            );
            const tx = Buffer.from(transaction.toBytes()).toString('hex');
            return this.sendMessageToNative({
                tx,
                network: this.network,
            });
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async getContractCallBytecode(functionName: string, paramsEncoded: string): Promise<string> {
        try {
            const contractFunctionParameters = await getContractFunctionBytecode(functionName, paramsEncoded);
            return this.sendMessageToNative({
                contractFunctionParameters: contractFunctionParameters.toString('base64')
            });
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async contractCallQueryFunction(
        contractId: string,
        functionName: string,
        paramsEncoded: string | ParametersBuilder,
        accountId: string,
        accountPrivateKey: string,
        gas: number = 100000,
        fee: number = 10000000,
        nodeAccountId: string = "0.0.3"
    ): Promise<string> {
        try {
            const stopWhisperingMsg = "All signs are collected. Stop whispering";
            const privateKey = PrivateKey.fromString(accountPrivateKey);
            const contractFunctionParameters = await getContractFunctionBytecode(functionName, paramsEncoded);
            const globalSignedTx: string[] = [];
            const sharedTimestamp = Date.now();
            const clientWhisper = this.getClient();
            clientWhisper.setOperatorWith(
                accountId,
                privateKey.publicKey,
                async buf => {
                    const signature = Buffer.from(privateKey.sign(buf));
                    globalSignedTx.push(signature.toString("hex"));
                    if (globalSignedTx.length >= 1) {
                        throw new Error(stopWhisperingMsg);
                    }
                    return Buffer.from("");
                }
            );

            const queryHex = Buffer.from(
                new ContractCallQuery()
                    .setContractId(contractId)
                    .setGas(gas)
                    .setFunction(functionName)
                    .setFunctionParameters(contractFunctionParameters)
                    .toBytes()
            ).toString("hex");

            const q1 = await Query.fromBytes(Buffer.from(queryHex, "hex"))
                .setNodeAccountIds([AccountId.fromString(nodeAccountId)])
                .setQueryPayment(Hbar.fromTinybars(fee))
                .setPaymentTransactionId(new TransactionId(AccountId.fromString(accountId), Timestamp.fromDate(new Date(sharedTimestamp))));
            try {
                await q1.execute(clientWhisper);
            } catch (error) {
                if (error.message !== stopWhisperingMsg) {
                    throw error;
                }
                return this.sendMessageToNative({
                    queryHex,
                    signedBuffers: globalSignedTx,
                    sharedTimestamp,
                    nodeAccountId,
                    publicKey: privateKey.publicKey.toStringDer(),
                    accountId,
                    fee,
                    network: this.network,
                });
            }
        } catch (error) {
            return this.sendMessageToNative(null, error)
        }
    }

    async parseContractCallQueryResponse(
        contractId: string,
        gasUsed: number,
        rawResult: string,
        resultTypes: string[]
    ): Promise<string> {
        try {
            const response = new ContractFunctionResult({
                _createResult: false,
                contractId: ContractId.fromString(contractId),
                errorMessage: "",
                bloom: Uint8Array.from([]),
                logs: [],
                createdContractIds: [],
                evmAddress: null,
                bytes: Buffer.from(rawResult, "base64"),
                // @ts-ignore
                gasUsed,
                // @ts-ignore
                gas: gasUsed,
                // @ts-ignore
                amount: gasUsed,
                functionParameters: Uint8Array.from([]),
                senderAccountId: null,
                stateChanges: [],
            });

            const values = await parseContractQueryResponse(response, resultTypes);
            return this.sendMessageToNative({
                values,
                gasUsed: parseInt(response.gasUsed.toString(), 10)
            });
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async sign(messageString: string, privateKey: string, encoding: "hex"|"base64"|"utf8"): Promise<string> {
        try {
            const key = PrivateKey.fromString(privateKey);
            const signed = key.sign(Buffer.from(messageString, encoding));

            return this.sendMessageToNative({
                signedMessage: Buffer.from(signed).toString("hex")
            });
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async signVerify(messageString: string, signature: string, publicKey: string, encoding: "hex"|"base64"|"utf8"): Promise<string> {
        try {
            const valid = PublicKey.fromString(publicKey).verify(
                Buffer.from(messageString, encoding),
                Buffer.from(signature, "hex")
            );
            return this.sendMessageToNative({valid});
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async hethersSign(messageString: string, privateKey: string, encoding: "hex"|"base64"|"utf8"): Promise<string> {
        try {
            const wallet = new ethers.Wallet(privateKey);
            const signedMessage = wallet.signMessage(Buffer.from(messageString, encoding));
            return this.sendMessageToNative({
                signedMessage
            });
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async splitSignature(signature: string): Promise<string> {
        try {
            const {v, r, s} = ethers.utils.splitSignature(signature);
            return this.sendMessageToNative({v, r, s});
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    async getParamsSignature(paramsEncoded: string, privateKey: string): Promise<string> {
        try {
            const {types, values} = await parseContractFunctionParams(paramsEncoded);
            const hash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(types, values)
            );
            const messageHashBytes = ethers.utils.arrayify(hash);
            const wallet = new ethers.Wallet(privateKey);

            const signed = await wallet.signMessage(messageHashBytes);
            const {v, r, s} = ethers.utils.splitSignature(signed);
            return this.sendMessageToNative({v, r, s});
        } catch (error) {
            return this.sendMessageToNative(null, error);
        }
    }

    private getClient() {
        return this.network === Network.Testnet ? Client.forTestnet() : Client.forMainnet();
    }

    private sendMessageToNative(data: any | null, error: Partial<CustomError>|any|null = null) {

        // web-view bridge response
        const responseObject: Partial<BridgeResponse> = {
            data
        };
        if (error) {
            responseObject.error = {
                name: error?.name || "Error",
                reason: error.reason || error.message || JSON.stringify(error)
            };
        }

        return JSON.stringify(responseObject);
    }
}

if (window) window["bladeSdk"] = new BladeUnitySDK();