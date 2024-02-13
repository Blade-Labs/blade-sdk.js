import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import {Signer} from "@hashgraph/sdk"
import {
    SignMessageData, SignVerifyMessageData,
    SplitSignatureData
} from "../models/Common";
import {ChainMap, ChainServiceStrategy, KnownChainIds} from "../models/Chain";
import SignServiceHedera from "./hedera/SignServiceHedera";
import SignServiceEthereum from "./ethereum/SignServiceEthereum";
import { ethers } from "ethers";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import {Network} from "../models/Networks";
import {ParametersBuilder} from "../ParametersBuilder";
import SignService from "../services/SignService";

export interface ISignService {
    // remove if useless and move entirely to SignService
    placeholder(signature: string): Promise<SplitSignatureData>
}

@injectable()
export default class SignServiceContext implements ISignService {
    private chainId: KnownChainIds | null = null;
    private signer: Signer | ethers.Signer | null = null
    private strategy: ISignService | null = null;

    constructor(
        @inject('apiService') private readonly apiService: ApiService,
        @inject('configService') private readonly configService: ConfigService,
        @inject('signService') private readonly signService: SignService,
    ) {}

    // TODO rewrite sign/verify methods to use signer from constructor
    // TODO do we need chain-specific methods here?

    init(chainId: KnownChainIds, signer: Signer | ethers.Signer) {
        this.chainId = chainId;
        this.signer = signer;

        switch (ChainMap[this.chainId].serviceStrategy) {
            case ChainServiceStrategy.Hedera:
                this.strategy = new SignServiceHedera(chainId, signer as Signer, this.apiService, this.configService);
                break;
            case ChainServiceStrategy.Ethereum:
                this.strategy = new SignServiceEthereum(chainId, signer as ethers.Signer, this.apiService, this.configService);
                break;
            default:
                throw new Error(`Unsupported chain id: ${this.chainId}`);
        }
    }

    placeholder(signature: string): Promise<SplitSignatureData> {
        this.checkInit();
        return this.strategy!.placeholder(signature);
    }

    splitSignature(signature: string): Promise<SplitSignatureData> {
        return this.signService.splitSignature(signature);
    }

    getParamsSignature(paramsEncoded: string | ParametersBuilder, privateKey: string): Promise<SplitSignatureData> {
        return this.signService.getParamsSignature(paramsEncoded, privateKey);
    }

    // TODO rename to signMessage
    ethersSign(messageString: string, privateKey: string): Promise<SignMessageData> {
        return this.signService.ethersSign(messageString, privateKey);
    }

    // TODO rename to verifyMessage
    ethersVerify(messageString: string): Promise<SignVerifyMessageData> {
        return this.signService.ethersVerify(messageString);
    }

    // TODO rename to signMessageKey
    sign(messageString: string, privateKey: string): Promise<SignMessageData> {
        return this.signService.sign(messageString, privateKey);
    }

    // TODO verifyMessageKey
    signVerify(messageString: string, signature: string, publicKey: string): Promise<SignVerifyMessageData> {
        return this.signService.signVerify(messageString, signature, publicKey);
    }

    private checkInit() {
        if (!this.strategy) {
            throw new Error("SignService not initialized");
        }
    }
}
