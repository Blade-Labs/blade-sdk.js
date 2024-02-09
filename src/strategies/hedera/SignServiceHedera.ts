import {
    PrivateKey,
    PublicKey,
    Signer,
} from "@hashgraph/sdk";
import {Buffer} from "buffer";

import {ISignService} from "../SignServiceContext";
import {
    SignMessageData, SignVerifyMessageData,
    SplitSignatureData
} from "../../models/Common";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {Network} from "../../models/Networks";
import { ethers } from "ethers";
import {ParametersBuilder} from "../../ParametersBuilder";
import {parseContractFunctionParams} from "../../helpers/ContractHelpers";

export default class SignServiceHedera implements ISignService {
    private readonly network: Network;
    private readonly signer: Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;

    constructor(
        network: Network,
        signer: Signer,
        apiService: ApiService,
        configService: ConfigService,
    ) {
        this.network = network;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
    }

    async splitSignature(signature: string): Promise<SplitSignatureData> {
        const {v, r, s} = ethers.utils.splitSignature(signature);
        return {v, r, s};
    }

    async getParamsSignature(paramsEncoded: string | ParametersBuilder, privateKey: string): Promise<SplitSignatureData> {
        const {types, values} = await parseContractFunctionParams(paramsEncoded);
        const hash = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(types, values)
        );
        const messageHashBytes = ethers.utils.arrayify(hash);

        const key = PrivateKey.fromString(privateKey);
        const wallet = new ethers.Wallet(key.toStringRaw());
        const signed = await wallet.signMessage(messageHashBytes);

        const {v, r, s} = ethers.utils.splitSignature(signed);
        return {v, r, s};
    }

    // TODO rename to signMessage
    async ethersSign(messageString: string, privateKey: string): Promise<SignMessageData> {
        const key = PrivateKey.fromString(privateKey);
        const wallet = new ethers.Wallet(key.toStringRaw());
        const signedMessage = await wallet.signMessage(Buffer.from(messageString, "base64"));
        return {
            signedMessage
        }
    }

    // TODO rename to verifyMessage
    async ethersVerify(messageString: string): Promise<SignVerifyMessageData> {
        throw new Error("Method not implemented.");
    }

    // TODO rename to signMessageKey
    async sign(messageString: string, privateKey: string): Promise<SignMessageData> {
        const key = PrivateKey.fromString(privateKey);
        const signed = key.sign(Buffer.from(messageString, "base64"));

        return {
            signedMessage: Buffer.from(signed).toString("hex")
        }
    }

    // TODO verifyMessageKey
    async signVerify(messageString: string, signature: string, publicKey: string): Promise<SignVerifyMessageData> {
        const valid = PublicKey.fromString(publicKey).verify(
            Buffer.from(messageString, "base64"),
            Buffer.from(signature, "hex")
        );
        return {
            valid
        };
    }
}
