import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import {Signer} from "@hashgraph/sdk"
import {
    SignMessageData,
    SignVerifyMessageData,
    SplitSignatureData,
    SupportedEncoding
} from "../models/Common";
import {ChainMap, ChainServiceStrategy, KnownChainIds} from "../models/Chain";
import SignServiceHedera from "./hedera/SignServiceHedera";
import SignServiceEthereum from "./ethereum/SignServiceEthereum";
import { ethers } from "ethers";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import {ParametersBuilder} from "../ParametersBuilder";
import SignService from "../services/SignService";

export interface ISignService {
    sign(encodedMessage: string, encoding: SupportedEncoding): Promise<SignMessageData>
    verify(encodedMessage: string, encoding: SupportedEncoding, signature: string, addressOrPublicKey: string): Promise<SignVerifyMessageData>
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

    splitSignature(signature: string): Promise<SplitSignatureData> {
        return this.signService.splitSignature(signature);
    }

    getParamsSignature(paramsEncoded: string | ParametersBuilder, privateKey: string): Promise<SplitSignatureData> {
        return this.signService.getParamsSignature(paramsEncoded, privateKey);
    }

    sign(encodedMessage: string, encoding: SupportedEncoding): Promise<SignMessageData> {
        this.checkInit();
        return this.strategy!.sign(encodedMessage, encoding);
    }

    verify(encodedMessage: string, encoding: SupportedEncoding, signature: string, addressOrPublicKey: string): Promise<SignVerifyMessageData> {
        return this.strategy!.verify(encodedMessage, encoding, signature, addressOrPublicKey);
    }

    private checkInit() {
        if (!this.strategy) {
            throw new Error("SignService not initialized");
        }
    }
}
