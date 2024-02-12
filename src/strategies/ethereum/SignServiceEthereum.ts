import {ethers} from "ethers"
import {ISignService} from "../SignServiceContext";
import {
    SignMessageData, SignVerifyMessageData,
    SplitSignatureData,
} from "../../models/Common";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {Network} from "../../models/Networks";
import {ParametersBuilder} from "../../ParametersBuilder";

export default class SignServiceEthereum implements ISignService {
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

    async splitSignature(signature: string): Promise<SplitSignatureData> {
        throw new Error("Method not implemented.");
    }

    async getParamsSignature(paramsEncoded: string | ParametersBuilder, privateKey: string): Promise<SplitSignatureData> {
        throw new Error("Method not implemented.");
    }

    // TODO rename to signMessage
    async ethersSign(messageString: string, privateKey: string): Promise<SignMessageData> {
        throw new Error("Method not implemented.");
    }

    // TODO rename to verifyMessage
    async ethersVerify(messageString: string): Promise<SignVerifyMessageData> {
        throw new Error("Method not implemented.");
    }

    // TODO rename to signMessageKey
    async sign(messageString: string, privateKey: string): Promise<SignMessageData> {
        throw new Error("Method not implemented.");
    }

    // TODO verifyMessageKey
    async signVerify(messageString: string, signature: string, publicKey: string): Promise<SignVerifyMessageData> {
        throw new Error("Method not implemented.");
    }
}
