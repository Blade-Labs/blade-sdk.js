import { Client, Hbar, PrivateKey, TokenAssociateTransaction, TokenCreateTransaction } from "@hashgraph/sdk";
export const completionKey = "completionKey1";

export const privateKeyFromString = (privateKey: string): PrivateKey => {
    // TODO TRY different keys in different format (ecdsa, ed25, .raw, .der)
    try {
        return PrivateKey.fromStringECDSA(privateKey);
    } catch (e) {
        return PrivateKey.fromStringED25519(privateKey);
    }
};

export const createToken = async (accountId: string, privateKey: string, tokenName: string): Promise<string> => {
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);
    const key = PrivateKey.fromString(privateKey);

    // Create the transaction and freeze for manual signing
    const transaction = new TokenCreateTransaction()
        .setTokenName(tokenName)
        .setTokenSymbol("JTT")
        .setTreasuryAccountId(accountId)
        .setInitialSupply(1000000000)
        .setAdminKey(key.publicKey)
        .setMaxTransactionFee(new Hbar(30)) // Change the default max transaction fee
        .freezeWith(client);

    // Sign the transaction with the token adminKey and the token treasury account private key
    const signTx = await (await transaction.sign(key)).sign(key);

    // Sign the transaction with the client operator private key and submit to a Hedera network
    const txResponse = await signTx.execute(client);

    // Get the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    // Get the token ID from the receipt
    return receipt.tokenId?.toString() || "";
};

export const associateToken = async (tokenId: string, accountId: string, privateKey: string) => {
    const client = Client.forTestnet();
    const key = privateKeyFromString(privateKey);
    client.setOperator(accountId, key);

    // Associate a token to an account and freeze the unsigned transaction for signing
    const transaction = new TokenAssociateTransaction()
        .setAccountId(accountId)
        .setTokenIds([tokenId])
        .freezeWith(client);

    const signTx = await transaction.sign(key);

    return await signTx.execute(client).catch((err) => {
        // tslint:disable-next-line:no-console
        console.log(err);
        return null;
    });
};

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// utils
export function checkResult(result: any, success = true) {
    // console.log(success, JSON.parse(JSON.stringify(result)));
    expect(result).toEqual(
        expect.objectContaining({
            completionKey,
        })
    );
    if (success) {
        expect(result).toHaveProperty("data");
        expect(result).not.toHaveProperty("error");
    } else {
        expect(result.data).toBeNull();
        expect(result).toHaveProperty("error");
        expect(result.error).toHaveProperty("name");
        expect(result.error).toHaveProperty("reason");
    }
}
