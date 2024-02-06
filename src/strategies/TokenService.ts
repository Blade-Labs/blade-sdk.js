import { injectable, inject } from 'inversify';
import 'reflect-metadata';

import {Signer} from "@hashgraph/sdk"
import {ITokenService, TransferInitData, TransferTokenInitData} from "./ITokenService";
import {BalanceData, ChainType, TransactionResponseData} from "../models/Common";
import TokenServiceHedera from "./hedera/TokenServiceHedera";
import TokenServiceEthereum from "./ethereum/TokenServiceEthereum";
import { ethers } from "ethers";
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

    transferBalance(transferData: TransferInitData): Promise<TransactionResponseData> {
        this.checkInit();
        return this.strategy!.transferBalance(transferData);
    }

    transferToken(transferData: TransferTokenInitData): Promise<TransactionResponseData> {
        this.checkInit();
        return this.strategy!.transferToken(transferData);
    }

    private checkInit() {
        if (!this.strategy) {
            throw new Error("TokenService not initialized");
        }
    }
}
