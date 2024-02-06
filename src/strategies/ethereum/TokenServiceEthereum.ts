import {ethers} from "ethers"
import {ITokenService, TransferInitData, TransferTokenInitData} from "../ITokenService";
import {BalanceData, TransactionResponseData} from "../../models/Common";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {
    Alchemy,
    Contract,
    Network as AlchemyNetwork,
} from "alchemy-sdk";
import {Network} from "../../models/Networks";
import StringHelpers from "../../helpers/StringHelpers";
const ERC20ABI = require("../../abi/erc20.abi.json");

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
        await this.initAlchemy();


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

    async transferBalance({from, to, amount}: TransferInitData): Promise<TransactionResponseData> {
        const transaction = {
            from,
            to,
            value: ethers.utils.parseUnits(amount, 'ether')
        }
        const result = await this.signer.sendTransaction(transaction);
        return {
            transactionHash: result.hash,
            transactionId: result.hash,
        }
    }

    async transferToken({amountOrSerial, from, to, tokenAddress, memo, freeTransfer}: TransferTokenInitData): Promise<TransactionResponseData> {
        await this.initAlchemy();
        const contract = new Contract(tokenAddress, ERC20ABI, this.signer);
        const toAddress = StringHelpers.stripHexPrefix(to);
        const value = ethers.utils.parseUnits(amountOrSerial, "wei");
        const {baseFeePerGas} = await this.alchemy!.core.getBlock("pending");
        const maxPriorityFeePerGas = await this.alchemy!.transact.getMaxPriorityFeePerGas();
        const maxFeePerGas = baseFeePerGas?.add(maxPriorityFeePerGas);
        const gasLimit = await contract.estimateGas.transfer(toAddress, value);
        const result = await contract.transfer(toAddress, value, {gasLimit, maxPriorityFeePerGas, maxFeePerGas});
        return {
            transactionHash: result.hash,
            transactionId: result.hash,
        }
    }

    private async initAlchemy() {
        const network = this.network === Network.Mainnet ? AlchemyNetwork.ETH_MAINNET : AlchemyNetwork.ETH_SEPOLIA;
        const apiKey = await this.configService.getConfig(`alchemy${this.network}APIKey`);
        this.alchemy = new Alchemy({apiKey, network});
    }
}
