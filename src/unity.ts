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