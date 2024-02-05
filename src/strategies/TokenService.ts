import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import {
    TransactionResponse as TransactionResponseHedera
} from "@hashgraph/sdk";
import {Signer} from "@hashgraph/sdk"
import {ITokenService, TransferInitData} from "./ITokenService";
import {BalanceData, ChainType} from "../models/Common";
import TokenServiceHedera from "./hedera/TokenServiceHedera";
import TokenServiceEthereum from "./ethereum/TokenServiceEthereum";
import { ethers } from "ethers";
import type {TransactionResponse} from "@ethersproject/abstract-provider";
import ApiService from "../services/ApiService";
import ConfigService from "../services/ConfigService";
import {Network} from "../models/Networks";

@injectable()
export default class TokenService implements ITokenService {
    private chainType: ChainType | null = null;
    private signer: Signer | ethers.Signer | null = null
    private strategy: ITokenService | null = null;

    constructor(
        @inject('apiService') private readonly apiService: ApiService,
        @inject('configService') private readonly configService: ConfigService,
    ) {}


    init(chainType: ChainType, network: Network, signer: Signer | ethers.Signer) {
        this.chainType = chainType;
        this.signer = signer;

        switch (chainType) {
            case ChainType.Hedera:
                this.strategy = new TokenServiceHedera(network, signer as Signer, this.apiService, this.configService);
                break;
            case ChainType.Ethereum:
                this.strategy = new TokenServiceEthereum(network, signer as ethers.Signer, this.apiService, this.configService);
                break;
            default:
                throw new Error("Unsupported chain type");
        }
    }

    getBalance(accountId: string): Promise<BalanceData> {
        this.checkInit();
        return this.strategy!.getBalance(accountId);
    }

    // TODO: make single response type
    transferBalance({from, to, amount, memo}: TransferInitData): Promise<TransactionResponseHedera | TransactionResponse> {
        this.checkInit();
        return this.strategy!.transferBalance({from, to, amount, memo});
    }

    private checkInit() {
        if (!this.strategy) {
            throw new Error("TokenService not initialized");
        }
    }
}
