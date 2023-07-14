import 'whatwg-fetch';
import {
    Client,
    TransactionResponse,
    TransferTransaction,
    AccountId, PrivateKey
} from "@hashgraph/sdk";
import {Buffer} from "buffer";
import {CustomError} from "./models/Errors";
import {
    BridgeResponse,
    InfoData, SdkEnvironment
} from "./models/Common";
import {Network} from "./models/Networks";
import config from "./config";
import StringHelpers from "./helpers/StringHelpers";
import {setApiKey, setEnvironment, setSDKVersion} from "./ApiService";

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
                            .setNodeAccountIds([AccountId.fromString("0.0.4")])
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