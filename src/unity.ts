import 'whatwg-fetch';
import {Buffer} from "buffer";
import {TextEncoder, TextDecoder} from "text-encoding";

Object.assign(globalThis, {
    Buffer: Buffer,
    TextEncoder,
    TextDecoder
});

import {
    Client,
    TransferTransaction,
    AccountId, PrivateKey, Transaction, ContractExecuteTransaction
} from "@hashgraph/sdk";
import {CustomError} from "./models/Errors";
import {
    AccountInfoData,
    BridgeResponse,
    InfoData, SdkEnvironment
} from "./models/Common";
import {Network} from "./models/Networks";
import config from "./config";
import StringHelpers from "./helpers/StringHelpers";
import {getTvteHeader, setApiKey, setEnvironment, setSDKVersion} from "./ApiService";
import {hethers} from "@hashgraph/hethers";
import {getContractFunctionBytecode} from "./helpers/ContractHelpers";

export class BladeUnitySDK {
    private apiKey: string = "";
    private network: Network = Network.Testnet;
    private dAppCode: string = "";
    // private visitorId: string = "";
    private sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod;
    private sdkVersion: string = config.sdkVersion;

    async init(
        apiKey: string,
        network: string,
        dAppCode: string,
        sdkEnvironment: SdkEnvironment = SdkEnvironment.Prod,
        sdkVersion: string = config.sdkVersion
    ): Promise<InfoData> {
        this.apiKey = apiKey;
        this.network = StringHelpers.stringToNetwork(network);
        this.dAppCode = dAppCode;
        // this.visitorId = visitorId;
        this.sdkEnvironment = sdkEnvironment;
        this.sdkVersion = sdkVersion;

        setApiKey(apiKey);
        setEnvironment(sdkEnvironment);
        setSDKVersion(sdkVersion);

        return  {
            apiKey: this.apiKey,
            dAppCode: this.dAppCode,
            network: this.network,
            visitorId: "not implemented in unity sdk",
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

    async getTvteValue(): Promise<string> {
        try {
            return this.sendMessageToNative({
                tvte: await getTvteHeader("node")
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
                calculatedEvmAddress: hethers.utils.computeAddress(`0x${publicKey}`).toLowerCase()
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
                evmAddress: hethers.utils.computeAddress(`0x${privateKey.publicKey.toStringRaw()}`)
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