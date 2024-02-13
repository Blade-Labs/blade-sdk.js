import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import {
    FeeManualOptions,
    FeeType,
    ICryptoFlowQuote,
    ICryptoFlowTransaction
} from "../models/CryptoFlow";
import {Buffer} from "buffer";
import BigNumber from "bignumber.js";
import {AccountAllowanceApproveTransaction,  Signer, Status, Transaction} from "@hashgraph/sdk";
import {Network} from "../models/Networks";
import FeeService, {HbarTokenId} from "./FeeService";
import ConfigService from "./ConfigService";
import {flatArray} from "../helpers/ArrayHelpers";
import {ChainMap, KnownChainIds} from "../models/Chain";

@injectable()
export default class CryptoFlowService {
    constructor(
        @inject('configService') private readonly configService: ConfigService,
        @inject('feeService') private readonly feeService: FeeService,
    ) {}

    async executeAllowanceApprove(selectedQuote: ICryptoFlowQuote, activeAccount: string, chainId: KnownChainIds, signer: Signer, approve: boolean = true): Promise<void> {
        const network = ChainMap[chainId].isTestnet ? Network.Testnet : Network.Mainnet;

        const sourceToken = selectedQuote.source.asset;
        if (!sourceToken.address)
            return;

        const isTokenHbar = await this.isHbar(sourceToken.address);

        if (!isTokenHbar) {
            const swapContract = JSON.parse(await this.configService.getConfig("swapContract"));
            const amount = approve
                ? Math.ceil(
                    Math.pow(10, sourceToken!.decimals!) * (
                        selectedQuote.source.amountExpected! * 1.2 // with a little buffer
                    )
                )
                : 0;

            const tx = new AccountAllowanceApproveTransaction()
                .setMaxTransactionFee(100)
                .approveTokenAllowance(
                    sourceToken.address as string,
                    activeAccount,
                    swapContract[network],
                    amount
                );
            const freezedTx = await tx.freezeWithSigner(signer);
            const signedTx = await freezedTx.signWithSigner(signer);
            const txResponse = await signedTx.executeWithSigner(signer);
            const receipt = await txResponse.getReceiptWithSigner(signer);

            if (receipt?.status !== Status.Success) {
                throw new Error("Allowance giving failed");
            }
        }
    }

    async executeHederaSwapTx(txHex: string, signer: Signer) {
        const buffer: Buffer = Buffer.from(txHex, "hex");
        const transaction = await Transaction
            .fromBytes(buffer)
            .freezeWithSigner(signer);
        const signedTx = await transaction.signWithSigner(signer);
        const txResponse = await signedTx.executeWithSigner(signer);
        const receipt = await txResponse.getReceiptWithSigner(signer);

        if (receipt?.status !== Status.Success) {
            throw new Error("Swap transaction failed");
        }
    }

    async executeHederaBladeFeeTx(selectedQuote: ICryptoFlowQuote, activeAccount: string, chainId: KnownChainIds, signer: Signer) {
        const feeOptions: FeeManualOptions = {
            type: FeeType.Swap,
            amount: BigNumber(selectedQuote.source.amountExpected),
            amountTokenId: selectedQuote.source.asset.address as string
        };
        let transaction = await this.feeService.createFeeTransaction(
            chainId,
            activeAccount,
            feeOptions
        );
        if (!transaction) {
            return;
        }
        transaction = await transaction.setTransactionMemo("Swap Blade Fee").freezeWithSigner(signer);
        const signedTx = await transaction.signWithSigner(signer);
        const response = await signedTx.executeWithSigner(signer);
        const receiptFee = await response.getReceiptWithSigner(signer);

        if (receiptFee?.status !== Status.Success) {
            throw new Error("Fee transfer execution failed");
        }
    }

    async validateMessage(tx: ICryptoFlowTransaction) {
        try {
            const pubKeyHex = await this.configService.getConfig("exchangeServiceSignerPubKey");
            const decodedJsonString = Buffer.from(pubKeyHex, "hex").toString();
            const publicKeyJwk = JSON.parse(decodedJsonString);

            // Import the JWK formatted public key to WebCrypto API
            const importedPublicKey = await global.crypto.subtle.importKey(
                "jwk",
                publicKeyJwk, // Parse the JWK from string format
                {
                    name: "ECDSA",
                    namedCurve: "P-256"
                },
                true,
                ["verify"]
            );

            // Verify the signature
            return await global.crypto.subtle.verify(
                {
                    name: "ECDSA",
                    hash: "SHA-256"
                },
                importedPublicKey,
                Buffer.from(tx.signature, "hex"), // The signature in ArrayBuffer format
                Buffer.from(tx.calldata) // The original message in ArrayBuffer format
            );
        } catch (e) {
            return false;
        }
    }

    private async isHbar(tokenId: string): Promise<boolean> {
        const WHBARs = JSON.parse(await this.configService.getConfig("swapWrapHbar"));
        const arr: string[] = flatArray(Object.values(WHBARs));
        arr.push(HbarTokenId);
        return arr.includes(tokenId);
    }
}
