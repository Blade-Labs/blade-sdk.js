import {Client, TokenDeleteTransaction, TokenDissociateTransaction} from "@hashgraph/sdk";

const SDK = require("../../src");
import {associateToken, createToken, getTokenInfo} from "./helpers";
require("dotenv").config();

global.fetch = require("node-fetch");

const {PrivateKey} = require("@hashgraph/sdk");
const {hethers} = require("@hashgraph/hethers");

const bladeSdk = window["bladeSdk"];
const completionKey = "completionKey1";
const privateKey = "9c1878c421d7d0c8c460a23db1dad4274b52803ed4bae338eba2c539eb75ca3c"; // ECDSA
const accountId = "0.0.49054496";

const privateKey2 = "f9b7e8442fcd7a57bee72bff3bcf7e7b11f8663a897e85f04cad1bee58137a2e"; // ECDSA
const accountId2 = "0.0.49091120";


test('bladeSdk defined', () => {
    expect(window["bladeSdk"]).toBeDefined()
});

test('bladeSdk.init', async () => {
    const result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.FINGERPRINT, completionKey);
    checkResult(result);
    expect(result.data.status).toEqual("success" );
});

test('bladeSdk.getBalance', async () => {
    let result = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("hbars");
    expect(result.data).toHaveProperty("tokens");
    expect(Array.isArray(result.data.tokens)).toEqual(true);

    // invalid accountId
    result = await bladeSdk.getBalance("0.0.0", completionKey);
    checkResult(result, false);
});

test('bladeSdk.transferHbars', async () => {
    let result = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(result);
    const hbars = result.data.hbars;
    result = await bladeSdk.transferHbars(accountId, privateKey, accountId2, "1.5", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("nodeId");
    expect(result.data).toHaveProperty("transactionHash");
    expect(result.data).toHaveProperty("transactionId");

    // wait for balance update
    await sleep(5_000);

    result = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(result);
    expect(hbars).not.toEqual(result.data.hbars);

    // invalid signature
    result = await bladeSdk.transferHbars(accountId2, privateKey, accountId, "1.5", completionKey);
    checkResult(result, false);

    // parseFloat exception
    result = await bladeSdk.transferHbars(accountId, privateKey, accountId, "jhghjhgjghj", completionKey);
    checkResult(result, false);

}, 60_000);

test('bladeSdk.contractCallFunction', async () => {
    // TODO
});

test('bladeSdk.transferTokens', async () => {
    // TODO
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    const tokenName = "JEST Token Test";
    let result = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(result);

    let tokenId = null;
    for (let i = 0; i < result.data.tokens.length; i++) {
        const tokenInfo = await getTokenInfo(result.data.tokens[i].tokenId);
        if (tokenInfo.name === tokenName) {
            tokenId = tokenInfo.token_id;
            break;
        }
    }

    if (!tokenId) {
        // Create token
        tokenId = await createToken(accountId, privateKey, tokenName);
    } else {
        // token exists
    }

    await associateToken(tokenId, accountId2, privateKey2);

    let account1Balance = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(account1Balance);
    const account1TokenBalance = (account1Balance.data.tokens.find(token => token.tokenId === tokenId))?.balance || 0;
    let account2Balance = await bladeSdk.getBalance(accountId2, completionKey);
    checkResult(account2Balance);
    const account2TokenBalance = (account2Balance.data.tokens.find(token => token.tokenId === tokenId))?.balance || 0;

    const amount = 1;
    // invalid signature
    result = await bladeSdk.transferHbars(accountId2, privateKey, accountId, amount.toString(), completionKey);
    checkResult(result, false);


    result = await bladeSdk.transferTokens(tokenId.toString(), accountId, privateKey, accountId2, "1.5", completionKey);
    checkResult(result);
    expect(result.data).toHaveProperty("nodeId");
    expect(result.data).toHaveProperty("transactionHash");
    expect(result.data).toHaveProperty("transactionId");

    await sleep(5_000);

    account1Balance = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(account1Balance);
    const account1TokenBalanceNew = (account1Balance.data.tokens.find(token => token.tokenId === tokenId))?.balance || 0;
    account2Balance = await bladeSdk.getBalance(accountId2, completionKey);
    checkResult(account2Balance);
    const account2TokenBalanceNew = (account2Balance.data.tokens.find(token => token.tokenId === tokenId))?.balance || 0;

    expect(account1TokenBalance).toEqual(account1TokenBalanceNew + amount);
    expect(account2TokenBalance).toEqual(account2TokenBalanceNew - amount);
}, 120_000);

test('bladeSdk.createAccount', async () => {
    // TODO
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);




});

test('bladeSdk.deleteAccount', async () => {
    // TODO
});

test('bladeSdk.getKeysFromMnemonic', async () => {
    // TODO
});

test('bladeSdk.sign + signVerify', async () => {
    const message = "hello";
    const messageString = Buffer.from(message).toString("base64");

    const result = await bladeSdk.sign(messageString, privateKey, completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("signedMessage");
    expect(result.data.signedMessage).toEqual("bbc2f1c80fbbabb6e898c65d2e5a2a5ce3f3a04d4321b3d0095145019eedf99cf2e3a80fe88794f908cc95fdcdb0b8079de81bed6b053f7adcfe5a1c77560c50");

    const validationResult = bladeSdk.signVerify(messageString, result.data.signedMessage, PrivateKey.fromString(privateKey).publicKey.toStringRaw(), completionKey);
    checkResult(validationResult);
    expect(validationResult.data.valid).toEqual(true);

    expect(PrivateKey.fromString(privateKey).publicKey.verify(
        Buffer.from(message),
        Buffer.from(result.data.signedMessage, "hex")
    )).toEqual(true);
});

test('bladeSdk.hethersSign', async () => {
    const message = "hello";
    const messageString = Buffer.from(message).toString("base64");

    const result = await bladeSdk.hethersSign(messageString, privateKey, completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("signedMessage");
    expect(result.data.signedMessage).toEqual("0x12509f194214661211b113c6a23029f4a8364fd4885918cc5943f2d784eb63661aded5c89825451fc1248b692e86479fa0dff50bf05caab20e56bb63e26559181c");

    const signerAddress = hethers.utils.verifyMessage(message, result.data.signedMessage);
    const wallet = new hethers.Wallet(privateKey);

    expect(signerAddress).toEqual(wallet.publicKey);
});

test('bladeSdk.splitSignature', async () => {
    // TODO
});





//utils
function checkResult(result, success = true) {
    expect(result).toEqual(
        expect.objectContaining({
            completionKey: completionKey,
        }),
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

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
