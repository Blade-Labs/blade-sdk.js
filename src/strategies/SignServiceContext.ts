import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import {Signer} from "@hashgraph/sdk"
import {
    ChainType, SignMessageData, SignVerifyMessageData,
    SplitSignatureData
} from "../models/Common";
import SignServiceHedera from "./hedera/SignServiceHedera";
import SignServiceEthereum from "./ethereum/SignServiceEthereum";
import { ethers } from "ethers";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import {Network} from "../models/Networks";
import {ParametersBuilder} from "../ParametersBuilder";

export interface ISignService {
    splitSignature(signature: string): Promise<SplitSignatureData>
    getParamsSignature(paramsEncoded: string | ParametersBuilder, privateKey: string): Promise<SplitSignatureData>

    // TODO rename to signMessage
    ethersSign(messageString: string, privateKey: string): Promise<SignMessageData>

    // TODO rename to verifyMessage
    ethersVerify(messageString: string): Promise<SignVerifyMessageData>

    // TODO rename to signMessageKey
    sign(messageString: string, privateKey: string): Promise<SignMessageData>

    // TODO verifyMessageKey
    signVerify(messageString: string, signature: string, publicKey: string): Promise<SignVerifyMessageData>
}

@injectable()
export default class SignServiceContext implements ISignService {
    private chainType: ChainType | null = null;
    private signer: Signer | ethers.Signer | null = null
    private strategy: ISignService | null = null;

    constructor(
        @inject('apiService') private readonly apiService: ApiService,
        @inject('configService') private readonly configService: ConfigService,
    ) {}


    init(chainType: ChainType, network: Network, signer: Signer | ethers.Signer) {
        this.chainType = chainType;
        this.signer = signer;

        switch (chainType) {
            case ChainType.Hedera:
                this.strategy = new SignServiceHedera(network, signer as Signer, this.apiService, this.configService);
                break;
            case ChainType.Ethereum:
                this.strategy = new SignServiceEthereum(network, signer as ethers.Signer, this.apiService, this.configService);
                break;
            default:
                throw new Error("Unsupported chain type");
        }
    }

    splitSignature(signature: string): Promise<SplitSignatureData> {
        this.checkInit();
        return this.strategy!.splitSignature(signature);
    }

    getParamsSignature(paramsEncoded: string | ParametersBuilder, privateKey: string): Promise<SplitSignatureData> {
        this.checkInit();
        return this.strategy!.getParamsSignature(paramsEncoded, privateKey);
    }

    // TODO rename to signMessage
    ethersSign(messageString: string, privateKey: string): Promise<SignMessageData> {
        this.checkInit();
        return this.strategy!.ethersSign(messageString, privateKey);
    }

    // TODO rename to verifyMessage
    ethersVerify(messageString: string): Promise<SignVerifyMessageData> {
        this.checkInit();
        return this.strategy!.ethersVerify(messageString);
    }

    // TODO rename to signMessageKey
    sign(messageString: string, privateKey: string): Promise<SignMessageData> {
        this.checkInit();
        return this.strategy!.sign(messageString, privateKey);
    }

    // TODO verifyMessageKey
    signVerify(messageString: string, signature: string, publicKey: string): Promise<SignVerifyMessageData> {
        this.checkInit();
        return this.strategy!.signVerify(messageString, signature, publicKey);
    }

    private checkInit() {
        if (!this.strategy) {
            throw new Error("TokenService not initialized");
        }
    }
}
