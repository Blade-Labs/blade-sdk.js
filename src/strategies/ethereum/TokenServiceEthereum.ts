import type {TransactionResponse} from "@ethersproject/abstract-provider";
import {ethers} from "ethers"
import {ITokenService, TransferInitData} from "../ITokenService";
import {BalanceData} from "../../models/Common";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {
    Alchemy,
    Network as AlchemyNetwork,
} from "alchemy-sdk";
import {Network} from "../../models/Networks";

export default class TokenServiceEthereum implements ITokenService {
    private readonly network: Network;
    private readonly signer: ethers.Signer;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;
    private alchemy: Alchemy | null = null;

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

    async getBalance(address: string): Promise<BalanceData> {
        const network = this.network === Network.Mainnet ? AlchemyNetwork.ETH_MAINNET : AlchemyNetwork.ETH_SEPOLIA;
        const apiKey = await this.configService.getConfig(`alchemy${this.network}APIKey`);
        this.alchemy = new Alchemy({apiKey, network});

        const wei = await this.alchemy!.core.getBalance(address);
        const mainBalance = ethers.utils.formatEther(wei);
        const tokenBalances = await this.alchemy!.core.getTokensForOwner(address);

        return {
            balance: mainBalance,
            rawBalance: wei.toString(),
            decimals: 18,
            tokens: tokenBalances.tokens.map(token => {
                return {
                    balance: token.balance || "0",
                    decimals: token.decimals || 0,
                    name: token.name || "",
                    symbol: token.symbol || "",
                    address: token.contractAddress || "",
                    rawBalance: token.rawBalance || "0",
                }
            })
        }
    }

    async transferBalance({from, to, amount}: TransferInitData): Promise<TransactionResponse> {
        const transaction = {
            from,
            to,
            value: ethers.utils.parseUnits(amount, 'ether')
        }
        return this.signer.sendTransaction(transaction);
    }
}
