const SDK = require("../../src");
require("dotenv").config();

const {PrivateKey} = require("@hashgraph/sdk");
const {hethers} = require("@hashgraph/hethers");

const bladeSdk = window["bladeSdk"];
const completionKey = "completionKey1";
const privateKey = "3030020100300706052b8104000a04220420ce63a040b35eaaddc8ddfbd92f101f0ec501ce9c9285865bdffde26710d22590";

test('bladeSdk defined', () => {
    expect(window["bladeSdk"]).toBeDefined()
});

test('bladeSdk.init', async () => {
    const result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.FINGERPRINT, completionKey);
    checkResult(result);
    expect(result.data.status).toEqual("success" );
});

test('bladeSdk.getBalance', async () => {
    const result = await bladeSdk.getBalance("0.0.499326", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("hbars");
    expect(result.data).toHaveProperty("tokens");
    expect(Array.isArray(result.data.tokens)).toEqual(true);
});

test('bladeSdk.sign', async () => {
    const message = "hello";
    const messageString = Buffer.from(message).toString("base64");

    const result = await bladeSdk.sign(messageString, privateKey, completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("signedMessage");
    expect(result.data.signedMessage).toEqual("0fca6a58f4870cb4aaa289d6932ef8d47d091fc740e3864d76a383d4faabf5df65b234d24f842f14808e96e9bf1c96c386367e6bc2a353967312df541c502672");
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
    expect(result.data.signedMessage).toEqual("0x69de12502032d04abdff2dd95ab84e0464c03aa80360736920f3f7b7d4440f8506ec7c0dd144d3a51e1df39ebbadb6037580612d85761b4000f0f160d27ad9c81c");

    const signerAddress = hethers.utils.verifyMessage(message, result.data.signedMessage);
    const wallet = new hethers.Wallet(privateKey);

    expect(signerAddress).toEqual(wallet.publicKey);
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