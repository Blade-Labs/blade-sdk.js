import {
    FeeManualOptions,
    FeeType,
    ICryptoFlowQuote,
    ICryptoFlowTransaction
} from "../models/CryptoFlow";
import {Buffer} from "buffer";
import BigNumber from "bignumber.js";
import {AccountAllowanceApproveTransaction, Client, Status, Transaction} from "@hashgraph/sdk";
import {Network} from "../models/Networks";
import {createFeeTransaction, HbarTokenId} from "./FeeService";
import {getConfig} from "./ConfigService";
import {flatArray} from "../helpers/ArrayHelpers";

export const validateMessage = async (tx: ICryptoFlowTransaction) => {
    try {
        const pubKeyHex = await getConfig("exchangeServiceSignerPubKey");
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

export const executeAllowanceApprove = async(selectedQuote: ICryptoFlowQuote, activeAccount: string, network: Network, client: Client): Promise<void> => {
    const sourceToken = selectedQuote.source.asset;
    if (!sourceToken.address)
        return;

    const isTokenHbar = await isHbar(sourceToken.address);

    if (!isTokenHbar) {
        const swapContract = JSON.parse(await getConfig("swapContract"));
        const amount = Math.ceil(
            Math.pow(10, sourceToken!.decimals!) * (
                selectedQuote.source.amountExpected! * 1.2 // with a little buffer
            )
        );

        const tx = new AccountAllowanceApproveTransaction()
            .setMaxTransactionFee(100)
            .approveTokenAllowance(
                sourceToken.address as string,
                activeAccount,
                swapContract[network],
                amount
            );
        const signedTx = await tx.signWithOperator(client);
        const txResponse = await signedTx.execute(client);
        const receipt = await txResponse.getReceipt(client);

        if (receipt?.status !== Status.Success) {
            throw new Error("Allowance giving failed");
        }
    }
}

export const executeHederaSwapTx = async (txHex: string, client: Client) => {
    const buffer: Buffer = Buffer.from(txHex, "hex");
    const transaction = await Transaction
        .fromBytes(buffer)
        .signWithOperator(client);
    const response = await transaction.execute(client);
    const receipt = await response.getReceipt(client);

    if (receipt?.status !== Status.Success) {
        throw new Error("Swap transaction failed");
    }
}

export const executeHederaBladeFeeTx = async (selectedQuote: ICryptoFlowQuote, activeAccount: string, network: Network, client: Client) => {
    const feeOptions: FeeManualOptions = {
        type: FeeType.Swap,
        amount: BigNumber(selectedQuote.source.amountExpected),
        amountTokenId: selectedQuote.source.asset.address as string
    };
    const transaction = await createFeeTransaction(
        network,
        activeAccount,
        feeOptions
    );
    if (!transaction) {
        return;
    }
    transaction.setTransactionMemo("Swap Blade Fee");
    const signedTx = await transaction.signWithOperator(client);
    const response = await signedTx.execute(client);
    const receiptFee = await response.getReceipt(client);

    if (receiptFee?.status !== Status.Success) {
        throw new Error("Fee transfer execution failed");
    }
}

async function isHbar(tokenId: string): Promise<boolean> {
    const WHBARs = JSON.parse(await getConfig("swapWrapHbar"));
    const arr: string[] = flatArray(Object.values(WHBARs));
    arr.push(HbarTokenId);
    return arr.includes(tokenId);
}

export default {
    executeAllowanceApprove,
    executeHederaSwapTx,
    executeHederaBladeFeeTx,
    validateMessage
}