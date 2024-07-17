import {ethers} from "ethers";
import {ITokenService, TransferInitData, TransferTokenInitData} from "../TokenServiceContext";
import {
    BalanceData,
    KeyRecord,
    NFTStorageConfig,
    TokenDropData,
    TransactionReceiptData,
    TransactionResponseData
} from "../../models/Common";
import {ChainMap, KnownChainIds} from "../../models/Chain";
import ApiService from "../../services/ApiService";
import ConfigService from "../../services/ConfigService";
import {Alchemy, Contract, Network as AlchemyNetwork} from "alchemy-sdk";
import {Network} from "../../models/Networks";
import StringHelpers from "../../helpers/StringHelpers";
import ERC20ABI from "../../abi/erc20.abi";
import FeeService from "../../services/FeeService";
import BigNumber from "bignumber.js";
import {Signer} from "@ethersproject/abstract-signer";

export default class TokenServiceEthereum implements ITokenService {
    private readonly chainId: KnownChainIds;
    private readonly signer: ethers.Signer | null;
    private readonly apiService: ApiService;
    private readonly configService: ConfigService;
    private readonly feeService: FeeService;
    private alchemy: Alchemy | null = null;

    constructor(
        chainId: KnownChainIds,
        signer: ethers.Signer | null,
        apiService: ApiService,
        configService: ConfigService,
        feeService: FeeService
    ) {
        this.chainId = chainId;
        this.signer = signer;
        this.apiService = apiService;
        this.configService = configService;
        this.feeService = feeService;
    }

    async getBalance(address: string): Promise<BalanceData> {
        await this.initAlchemy();

        const wei = (await this.alchemy!.core.getBalance(address)).toBigInt();
        const mainBalance = ethers.formatEther(wei);
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
                    rawBalance: token.rawBalance || "0"
                };
            })
        };
    }

    async transferBalance({from, to, amount}: TransferInitData): Promise<TransactionResponseData> {
        const transaction = {
            from,
            to,
            value: ethers.parseUnits(amount, "ether")
        };
        const result = await this.signer!.sendTransaction(transaction);
        return {
            transactionHash: result.hash,
            transactionId: result.hash
        };
    }

    async transferToken({
        amountOrSerial,
        from,
        to,
        tokenAddress,
        memo,
        usePaymaster
    }: TransferTokenInitData): Promise<TransactionResponseData> {
        if (usePaymaster) {
            throw new Error("Paymaster not supported on Ethereum now");
        }

        await this.initAlchemy();

        // TODO remove this dirty hack after alchemy starts supporting ethers@6
        const newSigner = {
            ...this.signer,
            _isSigner: () => true,
            getAddress: this.signer.getAddress,
            call: tx => this.signer.call(tx),
            estimateGas: async (tx: any) => {
                return BigNumber((await this.signer.estimateGas(tx)).toString());
            },
            sendTransaction: tx => this.signer.sendTransaction(tx),
        } as unknown as Signer

        const contract = new Contract(tokenAddress, ERC20ABI, newSigner);
        const toAddress = StringHelpers.stripHexPrefix(to);
        const decimals = await contract.decimals();
        const value = ethers.parseUnits(amountOrSerial, decimals);
        const {baseFeePerGas} = await this.alchemy!.core.getBlock("pending");
        const maxPriorityFeePerGas = await this.alchemy!.transact.getMaxPriorityFeePerGas();
        const maxFeePerGas = baseFeePerGas?.add(maxPriorityFeePerGas);
        const gasLimit = await contract.estimateGas.transfer(toAddress, value);
        const nonce = await this.alchemy.core.getTransactionCount(this.signer.getAddress())

        const iface = new ethers.Interface(ERC20ABI);
        const data = iface.encodeFunctionData("transfer", [
            to,
            value,
        ]);

        const transaction = {
            to: tokenAddress,
            data,
            gasLimit: gasLimit.toString(),
            maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
            maxFeePerGas: maxFeePerGas.toString(),
            nonce,
            type: 2,
            chainId: this.chainId,
        };

        const rawTransaction = await this.signer.signTransaction(transaction);
        const responseTx = await this.alchemy.transact.sendTransaction(rawTransaction)
        const result = await responseTx.wait();

        return {
            transactionHash: result.transactionHash,
            transactionId: result.transactionHash
        };
    }

    associateToken(tokenId: string, accountId: string): Promise<TransactionReceiptData> {
        throw new Error("Method not implemented.");
    }

    createToken(
        tokenName: string,
        tokenSymbol: string,
        isNft: boolean,
        treasuryAccountId: string,
        supplyPublicKey: string,
        keys: KeyRecord[] | string,
        decimals: number,
        initialSupply: number,
        maxSupply: number
    ): Promise<{tokenId: string}> {
        throw new Error("Method not implemented.");
    }

    nftMint(
        tokenId: string,
        file: File | string,
        metadata: {},
        storageConfig: NFTStorageConfig
    ): Promise<TransactionReceiptData> {
        throw new Error("Method not implemented.");
    }

    dropTokens(accountId: string, secretNonce: string): Promise<TokenDropData> {
        throw new Error("Method not implemented.");
    }

    private async initAlchemy() {
        if (!this.alchemy) {
            const alchemyNetwork = ChainMap[this.chainId].isTestnet
                ? AlchemyNetwork.ETH_SEPOLIA
                : AlchemyNetwork.ETH_MAINNET;
            const apiKey = await this.configService.getConfig(
                `alchemy${ChainMap[this.chainId].isTestnet ? Network.Testnet : Network.Mainnet}APIKey`
            );
            this.alchemy = new Alchemy({apiKey, network: alchemyNetwork});
        }
    }

    swapTokens(): Promise<{success: boolean}> {
        throw new Error("Method not implemented.");
    }
}
