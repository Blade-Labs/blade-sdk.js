import {
    AccountId,
    Client,
    ContractCallQuery,
    Hbar,
    Mnemonic,
    PrivateKey,
    TokenAssociateTransaction
} from "@hashgraph/sdk";
import {associateToken, checkResult, createToken, getTokenInfo, sleep} from "./helpers";
import {GET, getTransaction} from "../../src/services/ApiService";
import {Network} from "../../src/models/Networks";
import {isEqual} from "lodash";
import {Buffer} from "buffer";
import config from "../../src/config";
import dotenv from "dotenv";
import fetch from "node-fetch";
import {ethers} from "ethers";
import {TextDecoder, TextEncoder} from 'util';
import crypto from "crypto";
import {flatArray} from "../../src/helpers/ArrayHelpers";
import {parseContractFunctionParams} from "../../src/helpers/ContractHelpers";
import {decrypt, encrypt} from "../../src/helpers/SecurityHelper";
import {KeyRecord, KeyType, NFTStorageProvider, SdkEnvironment} from "../../src/models/Common";
const {BladeSDK, ParametersBuilder} = require("../../src/webView");

Object.defineProperty(global.self, "crypto", {
    value: {
        subtle: crypto.webcrypto.subtle,
    },
});

Object.assign(global, { TextDecoder, TextEncoder, fetch });

dotenv.config();
const bladeSdk = new BladeSDK(true);
const sdkVersion = `Kotlin@${config.numberVersion}`;
export const completionKey = "completionKey1";
const privateKey = process.env.PRIVATE_KEY || ""; // ECDSA
const accountId = process.env.ACCOUNT_ID || "";
const privateKey1 = process.env.PRIVATE_KEY1 || "";
const accountId1 = process.env.ACCOUNT_ID1;
const privateKey2 = process.env.PRIVATE_KEY2 || ""; // ECDSA
const accountId2 = process.env.ACCOUNT_ID2 || "";
const privateKey3 = process.env.PRIVATE_KEY3 || "";
const accountId3 = process.env.ACCOUNT_ID3 || "";
const privateKey4 = process.env.PRIVATE_KEY_ED25519 || "";
const accountId4 = process.env.ACCOUNT_ID_ED25519 || "";


beforeEach(async () => {
    const result = await bladeSdk.init(
        process.env.API_KEY,
        process.env.NETWORK,
        process.env.DAPP_CODE,
        process.env.VISITOR_ID,
        process.env.SDK_ENV,
        sdkVersion,
        completionKey);
    checkResult(result);
});

test('bladeSdk.defined', () => {
    expect(window["bladeSdk"]).toBeDefined()
});

test('bladeSdk.init', async () => {
    let result = await bladeSdk.init(
        process.env.API_KEY,
        process.env.NETWORK,
        process.env.DAPP_CODE,
        "", // empty visitor id,
        process.env.SDK_ENV,
        sdkVersion,
        completionKey);
    checkResult(result);
    expect(result.data).toHaveProperty("apiKey");
    expect(result.data).toHaveProperty("dAppCode");
    expect(result.data).toHaveProperty("network");
    expect(result.data).toHaveProperty("visitorId");
    expect(result.data).toHaveProperty("sdkEnvironment");
    expect(result.data).toHaveProperty("sdkVersion");
    expect(result.data).toHaveProperty("nonce");

    result = await bladeSdk.init(
        process.env.API_KEY,
        process.env.NETWORK,
        process.env.DAPP_CODE,
        process.env.VISITOR_ID,
        SdkEnvironment.Prod,
        sdkVersion,
        completionKey);
    checkResult(result);

    result = await bladeSdk.init(
        process.env.API_KEY,
        process.env.NETWORK,
        process.env.DAPP_CODE,
        "",
        "test",
        sdkVersion,
        completionKey);
    checkResult(result);
});

test('bladeSdk.getInfo', async () => {
    const result = await bladeSdk.getInfo(completionKey);
    checkResult(result);
    expect(result.data).toHaveProperty("apiKey");
    expect(result.data).toHaveProperty("dAppCode");
    expect(result.data).toHaveProperty("network");
    expect(result.data).toHaveProperty("visitorId");
    expect(result.data).toHaveProperty("sdkEnvironment");
    expect(result.data).toHaveProperty("sdkVersion");
    expect(result.data).toHaveProperty("nonce");
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
}, 20_000);

test('bladeSdk.getCoinList', async () => {
    let result = await bladeSdk.getCoinList(completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("coins");
    expect(Array.isArray(result.data.coins)).toEqual(true);
    const coin = result.data.coins[0];
    expect(coin).toHaveProperty("id");
    expect(coin).toHaveProperty("symbol");
    expect(coin).toHaveProperty("name");
    expect(coin).toHaveProperty("platforms");
    expect(Array.isArray(coin.platforms)).toEqual(true);

    result = await bladeSdk.init(
        process.env.API_KEY,
        process.env.NETWORK,
        process.env.DAPP_CODE,
        "",
        "test",
        sdkVersion,
        completionKey);
    checkResult(result);

    result = await bladeSdk.getCoinList(completionKey);
    checkResult(result, false);
});

test('bladeSdk.getCoinPrice', async () => {
    let result = await bladeSdk.getCoinPrice("Hbar", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("priceUsd");
    expect(result.data).toHaveProperty("coin");
    const coin = result.data.coin;
    expect(coin.id).toEqual("hedera-hashgraph");
    expect(coin.symbol).toEqual("hbar");
    expect(coin.market_data.current_price.usd).toEqual(result.data.priceUsd);

    result = await bladeSdk.getCoinPrice("0.0.0", completionKey);
    checkResult(result);
    expect(result.data.coin.symbol).toEqual("hbar");

    result = await bladeSdk.getCoinPrice("0x80008bcd713c38af90a9930288d446bc3bd2e684", completionKey);
    checkResult(result);
    expect(result.data.coin.symbol).toEqual("karate");

    result = await bladeSdk.getCoinPrice("0.0.2283230", completionKey);
    checkResult(result);
    expect(result.data.coin.symbol).toEqual("karate");

    result = await bladeSdk.getCoinPrice("karate-combat", completionKey);
    checkResult(result);
    expect(result.data.coin.symbol).toEqual("karate");

    result = await bladeSdk.getCoinPrice("unknown token", completionKey);
    checkResult(result, false);
}, 10_000);

test('bladeSdk.transferHbars', async () => {
    let result = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(result);
    const hbars = result.data.hbars;
    result = await bladeSdk.transferHbars(accountId, privateKey, accountId2, "1.5", "custom memo text", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("nodeId");
    expect(result.data).toHaveProperty("transactionHash");
    expect(result.data).toHaveProperty("transactionId");

    // wait for balance update
    await sleep(20_000);

    result = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(result);
    expect(hbars).not.toEqual(result.data.hbars);

    // invalid signature
    result = await bladeSdk.transferHbars(accountId2, privateKey, accountId, "1.5", "custom memo text", completionKey);
    checkResult(result, false);

    // parseFloat exception
    result = await bladeSdk.transferHbars(accountId, privateKey, accountId, "jhghjhgjghj", "custom memo text", completionKey);
    checkResult(result, false);

}, 60_000);

test('bladeSdk.contractCallFunction', async () => {
    const contractId = process.env.CONTRACT_ID || "";
    expect(contractId).not.toEqual("");
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    checkResult(result);

    let message = `Hello test ${Math.random()}`;
    let params = new ParametersBuilder().addString(message);

    // direct call
    result = await bladeSdk.contractCallFunction(contractId, "set_message", params, accountId, privateKey, 1000000, false, completionKey);
    checkResult(result);

    await sleep(10_000);

    let contractCallQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("get_message")
        .setQueryPayment(new Hbar(1));

    let contractCallQueryResult = await contractCallQuery.execute(client);
    expect(contractCallQueryResult.getString(0)).toEqual(message);


    // pay fee on backend
    message = `Hello test ${Math.random()}`;
    params = new ParametersBuilder().addString(message);
    result = await bladeSdk.contractCallFunction(contractId, "set_message", params, accountId, privateKey, 1000000, true, completionKey);
    checkResult(result);

    contractCallQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("get_message")
        .setQueryPayment(new Hbar(1));

    await sleep(10_000);

    contractCallQueryResult = await contractCallQuery.execute(client);
    expect(contractCallQueryResult.getString(0)).toEqual(message);


    message = `Sum test ${Math.random()}`;
    const num1 = 37;
    const num2 = 5;
    params = new ParametersBuilder().addString(message).addTuple(new ParametersBuilder().addUInt64(num1).addUInt64(num2));
    result = await bladeSdk.contractCallFunction(contractId, "set_numbers", params.encode(), accountId, privateKey, 1000000, false, completionKey);
    checkResult(result);

    await sleep(10_000);

    contractCallQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("get_sum")
        .setQueryPayment(new Hbar(1));

    contractCallQueryResult = await contractCallQuery.execute(client);
    expect(contractCallQueryResult.getString(0)).toEqual(message);
    expect(contractCallQueryResult.getUint64(1).toNumber()).toEqual(num1 + num2);


    // fail on wrong function params (CONTRACT_REVERT_EXECUTED)

    params = new ParametersBuilder().addString(message).addAddress("0x65f17cac69fb3df1328a5c239761d32e8b346da0").addAddressArray([accountId, accountId2]).addTuple(new ParametersBuilder().addUInt64(num1).addUInt64(num2));
    result = await bladeSdk.contractCallFunction(contractId, "set_numbers", params.encode(), accountId, privateKey, 1000000, false, completionKey);
    checkResult(result, false);
    expect(result.error.reason.includes("CONTRACT_REVERT_EXECUTED")).toEqual(true);

    // fail on invalid json
    const paramsEncoded = '[{"type":"string",""""""""]'
    result = await bladeSdk.contractCallFunction(contractId, "set_numbers", paramsEncoded, accountId, privateKey, 1000000, false, completionKey);
    checkResult(result, false);
    expect(result.error.reason.includes("Unexpected token")).toEqual(true);

    // fail on low gas
    params = new ParametersBuilder().addString(message).addTuple(new ParametersBuilder().addUInt64(num1).addUInt64(num2));
    result = await bladeSdk.contractCallFunction(contractId, "set_message", params, accountId, privateKey, 1, false, completionKey);
    checkResult(result, false);
}, 120_000);

test('bladeSdk.contractCallQueryFunction', async () => {
    const contractId = process.env.CONTRACT_ID || "";
    expect(contractId).not.toEqual("");
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    checkResult(result);

    let message = `Hello DIRECT test ${Math.random()}`;
    let params = new ParametersBuilder().addString(message);

    result = await bladeSdk.contractCallFunction(contractId, "set_message", params, accountId, privateKey, 100000, false, completionKey);
    checkResult(result);

    await sleep(10_000);
    // direct call
    params = new ParametersBuilder();
    result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, accountId, privateKey, 100000, false, ["string"], completionKey);
    checkResult(result);

    expect(Array.isArray(result.data.values)).toEqual(true);
    expect(result.data.values.length).toEqual(1);

    expect(result.data.values[0]).toHaveProperty("type");
    expect(result.data.values[0]).toHaveProperty("value");
    expect(result.data.values[0].type).toEqual("string");
    expect(result.data.values[0].value).toEqual(message);

    // call with API

    message = `Hello API test ${Math.random()}`;
    params = new ParametersBuilder().addString(message);

    result = await bladeSdk.contractCallFunction(contractId, "set_message", params, accountId, privateKey, 100000, true, completionKey);
    checkResult(result);

    await sleep(10_000);
    params = new ParametersBuilder();
    result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, accountId, privateKey, 100000, true, ["string"], completionKey);
    checkResult(result);

    expect(Array.isArray(result.data.values)).toEqual(true);
    expect(result.data.values.length).toEqual(1);

    expect(result.data.values[0]).toHaveProperty("type");
    expect(result.data.values[0]).toHaveProperty("value");
    expect(result.data.values[0].type).toEqual("string");
    expect(result.data.values[0].value).toEqual(message);

    params = new ParametersBuilder();
    result = await bladeSdk.contractCallQueryFunction(contractId, "unknown function", params, accountId, privateKey, 100000, true, ["string"], completionKey);
    checkResult(result, false);

    result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, "0.0.3", privateKey2, 100000, false, ["string"], completionKey);
    checkResult(result, false);

    result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, accountId, privateKey, 100000, false, ["bytes32", "unknown-type"], completionKey);
    checkResult(result, false);
}, 120_000);

test('bladeSdk.transferTokens', async () => {
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    const tokenName = "JEST Token Test";
    let result = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(result);

    let tokenId: string|null = null;
    // for (let i = 0; i < result.data.tokens.length; i++) {
    for (const token of result.data.tokens) {
        const tokenInfo = await getTokenInfo(token.tokenId);
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
    result = await bladeSdk.transferTokens(tokenId?.toString(), accountId2, privateKey, accountId2, amount.toString(), "transfer memo", false, completionKey);
    checkResult(result, false);

    // invalid tokenId
    result = await bladeSdk.transferTokens("invalid token id", accountId2, privateKey, accountId2, amount.toString(), "transfer memo",false, completionKey);
    checkResult(result, false);

    result = await bladeSdk.transferTokens(tokenId.toString(), accountId, privateKey, accountId2, amount.toString(), "transfer memo", false, completionKey);
    checkResult(result);
    expect(result.data).toHaveProperty("nodeId");
    expect(result.data).toHaveProperty("transactionHash");
    expect(result.data).toHaveProperty("transactionId");

    await sleep(20_000);

    account1Balance = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(account1Balance);
    const account1TokenBalanceNew = (account1Balance.data.tokens.find(token => token.tokenId === tokenId))?.balance || 0;
    account2Balance = await bladeSdk.getBalance(accountId2, completionKey);
    checkResult(account2Balance);
    const account2TokenBalanceNew = (account2Balance.data.tokens.find(token => token.tokenId === tokenId))?.balance || 0;

    expect(account1TokenBalance).toEqual(account1TokenBalanceNew + amount);
    expect(account2TokenBalance).toEqual(account2TokenBalanceNew - amount);

    result = await bladeSdk.transferTokens(tokenId.toString(), accountId, privateKey, accountId2, amount.toString(), "transfer memo", true, completionKey);
    checkResult(result);
}, 120_000);

test('bladeSdk.createAccount', async () => {
    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    checkResult(result);

    result = await bladeSdk.createAccount("device-id", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("seedPhrase");
    expect(result.data).toHaveProperty("publicKey");
    expect(result.data).toHaveProperty("privateKey");
    expect(result.data).toHaveProperty("accountId");
    expect(result.data).toHaveProperty("evmAddress");

    await sleep(25_000);

    const publicKey = PrivateKey.fromString(result.data.privateKey).publicKey.toStringRaw();
    const evmAddress = ethers.utils.computeAddress(`0x${publicKey}`);

    expect(result.data.evmAddress).toEqual(evmAddress.toLowerCase());

    result = await bladeSdk.init("wrong api key", process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    checkResult(result);

    result = await bladeSdk.createAccount("device-id", completionKey);
    checkResult(result, false);
}, 60_000);

test('bladeSdk.getAccountInfo', async () => {
    const result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    checkResult(result);

    const account = await bladeSdk.createAccount("device-id", completionKey);
    checkResult(account);
    const newAccountId = account.data.accountId;

    await sleep(15_000);

    let accountInfo = await bladeSdk.getAccountInfo(newAccountId, completionKey);
    checkResult(accountInfo);

    expect(accountInfo.data.evmAddress).toEqual(`0x${AccountId.fromString(newAccountId).toSolidityAddress()}`);
    expect(accountInfo.data.calculatedEvmAddress).toEqual(account.data.evmAddress);

    accountInfo = await bladeSdk.getAccountInfo("0.0.9999999999999999999999999", completionKey);
    checkResult(accountInfo, false);
}, 60_000);

test('bladeSdk.deleteAccount', async () => {
    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    checkResult(result);

    result = await bladeSdk.createAccount("device-id", completionKey);
    checkResult(result);
    const newAccountId = result.data.accountId;
    const newPrivateKey = result.data.privateKey;

    result = await bladeSdk.deleteAccount(newAccountId, newPrivateKey, accountId, accountId, privateKey, completionKey);
    checkResult(result);

    await sleep(15_000);
    result = await GET(Network.Testnet, `api/v1/accounts/${newAccountId}`);
    expect(result.deleted).toEqual(true);

    // invalid request (already deleted)
    result = await bladeSdk.deleteAccount(newAccountId, newPrivateKey, accountId, accountId, privateKey, completionKey);
    checkResult(result, false);
}, 60_000);

test('bladeSdk.getKeysFromMnemonic', async () => {
    await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    let result = await bladeSdk.createAccount("device-id", completionKey);
    checkResult(result);

    const accountSample = {
        accountId: result.data.accountId,
        privateKey: result.data.privateKey,
        publicKey: result.data.publicKey,
        seedPhrase: result.data.seedPhrase,
        evmAddress: result.data.evmAddress
    }

    result = await bladeSdk.getKeysFromMnemonic(accountSample.seedPhrase, false, completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("privateKey");
    expect(result.data).toHaveProperty("publicKey");
    expect(result.data).toHaveProperty("accounts");
    expect(result.data).toHaveProperty("evmAddress");
    expect(Array.isArray(result.data.accounts)).toEqual(true);
    expect(result.data.accounts.length).toEqual(0);

    expect(result.data.privateKey).toEqual(accountSample.privateKey);
    expect(result.data.publicKey).toEqual(accountSample.publicKey);
    expect(result.data.evmAddress).toEqual(accountSample.evmAddress);

    await sleep(7000);

    result = await bladeSdk.getKeysFromMnemonic(accountSample.seedPhrase, true, completionKey);
    checkResult(result);

    expect(result.data.accounts.length).toEqual(1);
    expect(result.data.accounts[0]).toEqual(accountSample.accountId);

    result = await bladeSdk.getKeysFromMnemonic("invalid seed phrase", true, completionKey);
    checkResult(result, false);

    result = await bladeSdk.getKeysFromMnemonic((await Mnemonic.generate12()).toString(), true, completionKey);
    checkResult(result);
    expect(result.data.accounts.length).toEqual(0);
}, 60_000);

test('bladeSdk.sign + signVerify', async () => {
    const message = "hello";
    const messageString = Buffer.from(message).toString("base64");

    const result = await bladeSdk.sign(messageString, privateKey, completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("signedMessage");
    expect(result.data.signedMessage).toEqual(Buffer.from(PrivateKey.fromString(privateKey).sign(Buffer.from(message))).toString("hex"));

    const validationResult = bladeSdk.signVerify(messageString, result.data.signedMessage, PrivateKey.fromString(privateKey).publicKey.toStringRaw(), completionKey);
    checkResult(validationResult);
    expect(validationResult.data.valid).toEqual(true);

    expect(PrivateKey.fromString(privateKey).publicKey.verify(
        Buffer.from(message),
        Buffer.from(result.data.signedMessage, "hex")
    )).toEqual(true);

    // invalid private key
    let resultInvalid = await bladeSdk.sign(messageString, `privateKey`, completionKey);
    checkResult(resultInvalid, false);

    resultInvalid = bladeSdk.signVerify(messageString, "invalid signature", "invalid publicKey", completionKey);
    checkResult(resultInvalid, false);
});

test('bladeSdk.ethersSign', async () => {
    const message = "hello";
    const messageString = Buffer.from(message).toString("base64");
    const wallet = new ethers.Wallet(PrivateKey.fromString(privateKey).toStringRaw());

    let result = await bladeSdk.ethersSign(messageString, privateKey, completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("signedMessage");
    expect(result.data.signedMessage).toEqual(await wallet.signMessage(Buffer.from(message)));

    const signerAddress = ethers.utils.verifyMessage(message, result.data.signedMessage);
    expect(signerAddress).toEqual(ethers.utils.computeAddress(wallet.publicKey));

    // invalid calls
    result = await bladeSdk.ethersSign(messageString, "invalid privateKey", completionKey);
    checkResult(result, false);

    result = await bladeSdk.ethersSign(123, privateKey, completionKey);
    checkResult(result, false);
});

test('bladeSdk.splitSignature', async () => {
    const message = "hello";
    const messageString = Buffer.from(message).toString("base64");

    let result = await bladeSdk.ethersSign(messageString, privateKey, completionKey);
    checkResult(result);
    expect(result.data).toHaveProperty("signedMessage");
    const signature = result.data.signedMessage;

    result = await bladeSdk.splitSignature(result.data.signedMessage, completionKey);
    checkResult(result);

    const v: number = result.data.v;
    const r: string = result.data.r;
    const s: string = result.data.s;
    expect(signature).toEqual(ethers.utils.joinSignature({v, r, s}));

    // invalid signature
    result = await bladeSdk.splitSignature("invalid signature", completionKey);
    checkResult(result, false);
});

test('bladeSdk.getParamsSignature', async () => {
    const params = new ParametersBuilder()
        .addAddress(accountId)
        .addUInt64Array([300000, 300000])
        .addUInt64Array([6])
        .addUInt64Array([2])

    let result = await bladeSdk.getParamsSignature(params, privateKey, completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("v");
    expect(result.data).toHaveProperty("r");
    expect(result.data).toHaveProperty("s");

    expect(result.data.v).toEqual(28);
    expect(result.data.r).toEqual("0xe5e662d0564828fd18b2b5b228ade288ad063fadca76812f7902f56cae3e678e");
    expect(result.data.s).toEqual("0x61b7ceb82dc6695872289b697a1bca73b81c494288abda29fa022bb7b80c84b5");

    // invalid paramsEncoded
    result = await bladeSdk.getParamsSignature('[{{{{{{{{{{{"]', privateKey, completionKey);
    checkResult(result, false);
});

test('bladeSdk.getTransactions', async () => {
    // make transaction
    let result = await bladeSdk.transferHbars(accountId, privateKey, accountId2, "1.5", "some tx memo", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("nodeId");
    expect(result.data).toHaveProperty("transactionHash");
    expect(result.data).toHaveProperty("transactionId");

    const transactionId = result.data.transactionId.replace("@", ".");
    await sleep(10_000);

    // get expected transaction
    result = await bladeSdk.getTransactions(accountId, "", "", "5", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("nextPage");
    expect(result.data).toHaveProperty("transactions");
    expect(Array.isArray(result.data.transactions)).toEqual(true);

    const txIdEqual = (txId1: string, txId2: string) => {
        return isEqual(
            txId1.split(".").map(num => parseInt(num, 10)),
            txId2.split(".").map(num => parseInt(num, 10))
        );
    };

    const nextPage = result.data.nextPage;
    const latestTransaction = result.data.transactions.find(tx => txIdEqual(transactionId, tx.transactionId.replaceAll("-", ".")));

    expect(latestTransaction !== null).toEqual(true);
    expect(latestTransaction).toHaveProperty("time");
    expect(latestTransaction).toHaveProperty("transfers");
    expect(Array.isArray(latestTransaction.transfers)).toEqual(true);
    expect(latestTransaction).toHaveProperty("nftTransfers");
    expect(latestTransaction).toHaveProperty("memo");
    expect(latestTransaction).toHaveProperty("transactionId");
    expect(txIdEqual(latestTransaction.transactionId.replaceAll("-", "."), transactionId)).toEqual(true);
    expect(latestTransaction).toHaveProperty("fee");
    expect(latestTransaction).toHaveProperty("type");
    expect(latestTransaction.type).toEqual("CRYPTOTRANSFER");


    // next page
    result = await bladeSdk.getTransactions(accountId, "", nextPage, "5", completionKey);
    checkResult(result);

    // filter by transactionType
    result = await bladeSdk.getTransactions(accountId, "CRYPTOTRANSFER", "", "5", completionKey);
    checkResult(result);

    // filter by transactionType and add custom plainData in response
    result = await bladeSdk.getTransactions(accountId, "CRYPTOTRANSFERTOKEN", "", "5", completionKey);
    checkResult(result);

    if (result.data.transactions.length) {
        expect(result.data.transactions[0]).toHaveProperty("plainData");
        expect(result.data.transactions[0].plainData).toHaveProperty("type");
        expect(result.data.transactions[0].plainData).toHaveProperty("token_id");
        expect(result.data.transactions[0].plainData).toHaveProperty("senders");
        expect(result.data.transactions[0].plainData).toHaveProperty("receivers");
        expect(result.data.transactions[0].plainData).toHaveProperty("amount");
    }

    // invalid accountId
    result = await bladeSdk.getTransactions('0.dgsgsdgdsgdsgdsg', "", "", "5", completionKey);
    checkResult(result, false);

    // invalid tx
    result = await getTransaction(Network.Testnet, "wrong tx id", accountId);
    expect(Array.isArray(result));
    expect(result.length).toEqual(0)

}, 30_000);

test('bladeSdk.getC14url', async () => {
    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    checkResult(result);

    result = await bladeSdk.getC14url("hbar", "0.0.123456", "123", completionKey);
    checkResult(result);
    expect(result.data).toHaveProperty("url");

    let url = result.data.url;
    expect(url.includes("clientId")).toEqual(true);
    expect(url.includes("targetAssetId")).toEqual(true);
    expect(url.includes("targetAssetIdLock")).toEqual(true);
    expect(url.includes("sourceAmount")).toEqual(true);
    expect(url.includes("quoteAmountLock")).toEqual(true);
    expect(url.includes("targetAddress")).toEqual(true);
    expect(url.includes("targetAddressLock")).toEqual(true);

    result = await bladeSdk.getC14url("usdc", "0.0.123456", "123", completionKey);
    url = result.data.url;
    expect(url.includes("clientId")).toEqual(true);
    expect(url.includes("targetAssetId")).toEqual(true);
    expect(url.includes("targetAssetIdLock")).toEqual(true);
    expect(url.includes("sourceAmount")).toEqual(true);
    expect(url.includes("quoteAmountLock")).toEqual(true);
    expect(url.includes("targetAddress")).toEqual(true);
    expect(url.includes("targetAddressLock")).toEqual(true);

    result = await bladeSdk.getC14url("unknown-asset", "", "", completionKey);
    url = result.data.url;
    expect(url.includes("clientId")).toEqual(true);
    expect(url.includes("targetAssetId")).toEqual(false);
    expect(url.includes("targetAssetIdLock")).toEqual(false);
    expect(url.includes("sourceAmount")).toEqual(false);
    expect(url.includes("quoteAmountLock")).toEqual(false);
    expect(url.includes("targetAddress")).toEqual(false);
    expect(url.includes("targetAddressLock")).toEqual(false);

    await bladeSdk.init(
        process.env.API_KEY,
        process.env.NETWORK,
        "karate-kitten",
        "", // empty visitor id,
        process.env.SDK_ENV,
        sdkVersion,
        completionKey);

    result = await bladeSdk.getC14url("karate", "0.0.13421", "10", completionKey);
    checkResult(result);
    result = await bladeSdk.getC14url("1b487a96-a14a-47d1-a1e0-09c18d409671", "0.0.13421", "10", completionKey);
    checkResult(result);

    await bladeSdk.init(
        process.env.API_KEY,
        process.env.NETWORK,
        process.env.DAPP_CODE,
        "", // empty visitor id,
        "test",
        sdkVersion,
        completionKey);

    result = await bladeSdk.getC14url("1b487a96-a14a-47d1-a1e0-09c18d409671", "0.0.13421", "10", completionKey);
    checkResult(result, false);
});

test('bladeSdk.exchangeGetQuotes', async () => {
    let result = await bladeSdk.init(
        process.env.API_KEY_MAINNET,
        "mainnet",
        process.env.DAPP_CODE,
        process.env.VISITOR_ID,
        process.env.SDK_ENV,
        sdkVersion,
        completionKey);
    checkResult(result);

    result = await bladeSdk.exchangeGetQuotes("EUR", 50, "HBAR", "Buy", completionKey);
    checkResult(result);

    result = await bladeSdk.exchangeGetQuotes("USDC", 30, "PHP", "Sell", completionKey);
    checkResult(result);

    result = await bladeSdk.exchangeGetQuotes("HBAR", 5, "USDC", "Swap", completionKey);
    checkResult(result);

    result = await bladeSdk.exchangeGetQuotes("aaaaaaa", 0, "bbbbbb", "FFFF", completionKey);
    checkResult(result, false);
}, 50_000);

test('bladeSdk.swapTokens', async () => {
    let result = await bladeSdk.init(
        process.env.API_KEY,
        process.env.NETWORK,
        process.env.DAPP_CODE,
        process.env.VISITOR_ID,
        process.env.SDK_ENV,
        sdkVersion,
        completionKey);
    checkResult(result);

    result = await bladeSdk.swapTokens(
        process.env.ACCOUNT_ID_ED25519,
        process.env.PRIVATE_KEY_ED25519,
        "USDC",
        0.00001,
        "HBAR",
        0.5,
        "saucerswap",
        completionKey
    );
    checkResult(result);

    result = await bladeSdk.swapTokens(
        process.env.ACCOUNT_ID_ED25519,
        process.env.PRIVATE_KEY_ED25519,
        "USDC",
        0.00001,
        "HBAR",
        0.5,
        "unknown-service-id",
        completionKey
    );
    checkResult(result, false);
}, 60_000);

test('bladeSdk.getTradeUrl', async () => {
    let result = await bladeSdk.init(
        process.env.API_KEY_MAINNET,
        "mainnet",
        process.env.DAPP_CODE,
        process.env.VISITOR_ID,
        process.env.SDK_ENV,
        sdkVersion,
        completionKey);
    checkResult(result);

    result = await bladeSdk.getTradeUrl("buy", accountId, "EUR", 50, "HBAR", 0.5, "moonpay", completionKey);
    checkResult(result);
    expect(result.data).toHaveProperty("url");

    result = await bladeSdk.getTradeUrl("sell", accountId, "USDC", 50, "PHP", 0.5, "onmeta", completionKey);
    checkResult(result);
    expect(result.data).toHaveProperty("url");

    result = await bladeSdk.getTradeUrl("buy", accountId, "EUR", 50, "HBAR", 0.5, "unknown-service-id", completionKey);
    checkResult(result, false);
}, 30_000);

// create token
test('bladeSdk.createToken', async () => {
    const treasuryAccountId = accountId;
    const treasuryPrivateKey = privateKey;


    const supplyKey = privateKey;
    const adminKey = privateKey;
    const kycKey = privateKey1;
    const freezeKey = privateKey2;
    const wipeKey = privateKey3;
    const pauseKey = privateKey4;
    const feeScheduleKey = privateKey1;

    // CREATE TOKEN

    let result = await bladeSdk.getBalance(treasuryAccountId, completionKey);
    checkResult(result);

    const tokenCount = result.data.tokens.length;

    const tokenName = `SDK NFT test ${tokenCount}`;
    const tokenSymbol = `N++ ${tokenCount}`;

    const keys: KeyRecord[] = [
        {type: KeyType.admin, privateKey: adminKey},
        // {type: KeyType.kyc, privateKey: kycKey},
        {type: KeyType.freeze, privateKey: freezeKey},
        {type: KeyType.wipe, privateKey: wipeKey},
        {type: KeyType.pause, privateKey: pauseKey},
        {type: KeyType.feeSchedule, privateKey: feeScheduleKey},
    ];

    result = await bladeSdk.createToken(
        treasuryAccountId, // treasuryAccountId
        supplyKey, // supplyPrivateKey
        tokenName,
        tokenSymbol,
        true, // isNft
        keys,
        0, // decimals
        0, // initialSupply
        250, // maxSupply
        completionKey
    );
    checkResult(result);

    expect(result.data).toHaveProperty("tokenId");
    const tokenId = result.data.tokenId;

    await sleep(20_000);
    const tokenInfo = await getTokenInfo(tokenId);

    expect(tokenInfo.admin_key.key).toEqual(PrivateKey.fromString(adminKey).publicKey.toStringRaw());
    expect(tokenInfo.fee_schedule_key.key).toEqual(PrivateKey.fromString(feeScheduleKey).publicKey.toStringRaw());
    expect(tokenInfo.freeze_key.key).toEqual(PrivateKey.fromString(freezeKey).publicKey.toStringRaw());
    // expect(tokenInfo.kyc_key.key).toEqual(PrivateKey.fromString(kycKey).publicKey.toStringRaw());
    expect(tokenInfo.pause_key.key).toEqual(PrivateKey.fromString(pauseKey).publicKey.toStringRaw());
    expect(tokenInfo.supply_key.key).toEqual(PrivateKey.fromString(supplyKey).publicKey.toStringRaw());
    expect(tokenInfo.wipe_key.key).toEqual(PrivateKey.fromString(wipeKey).publicKey.toStringRaw());
    expect(tokenInfo.decimals).toEqual("0");
    expect(tokenInfo.initial_supply).toEqual("0");
    expect(tokenInfo.max_supply).toEqual("250");
    expect(tokenInfo.name).toEqual(tokenName);
    expect(tokenInfo.symbol).toEqual(tokenSymbol);
    expect(tokenInfo.treasury_account_id).toEqual(treasuryAccountId);
    expect(tokenInfo.type).toEqual('NON_FUNGIBLE_UNIQUE');

    // associate token with receiver account
    const client = Client.forTestnet();
    client.setOperator(accountId2, privateKey2);

    result = await bladeSdk.associateToken(
        tokenId,
        accountId2,
        privateKey2,
        completionKey
    );
    checkResult(result);

    await sleep(5_000);

    // MINT NFT
    result = await bladeSdk.nftMint(
        tokenId,
        treasuryAccountId,
        supplyKey,
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==", // TODO upload file base64
        {
            author: "GaryDu",
        },
        {
            provider: NFTStorageProvider.nftStorage,
            apiKey: process.env.NFT_STORAGE_TOKEN,
        },
        completionKey
    );
    checkResult(result);

    const serialNumber = result.data.serials[0];

    // TRANSFER NFT
    await sleep(20_000);

    result = await bladeSdk.transferTokens(tokenId, treasuryAccountId, treasuryPrivateKey, accountId2, serialNumber, "transfer NFT memo", false, completionKey);
    checkResult(result);



}, 180_000);

test('ParametersBuilder.defined', async () => {
    expect(new ParametersBuilder() != null).toEqual(true);
});

test('ParametersBuilder.complicatedCheck', async () => {
    const paramsEncodedExample = 'W3sidHlwZSI6InN0cmluZyIsInZhbHVlIjpbIkhlbGxvLCBCYWNrZW5kIl19LHsidHlwZSI6ImJ5dGVzMzIiLCJ2YWx1ZSI6WyJXekFzTVN3eUxETXNOQ3cxTERZc055dzRMRGtzTVRBc01URXNNVElzTVRNc01UUXNNVFVzTVRZc01UY3NNVGdzTVRrc01qQXNNakVzTWpJc01qTXNNalFzTWpVc01qWXNNamNzTWpnc01qa3NNekFzTXpGZCJdfSx7InR5cGUiOiJhZGRyZXNzW10iLCJ2YWx1ZSI6WyIwLjAuNDg3Mzg1MzkiLCIwLjAuNDg3Mzg1MzgiLCIwLjAuNDg3Mzg1MzciXX0seyJ0eXBlIjoiYWRkcmVzcyIsInZhbHVlIjpbIjAuMC40ODg1MDQ2NiJdfSx7InR5cGUiOiJhZGRyZXNzIiwidmFsdWUiOlsiMC4wLjQ5OTMyNiJdfSx7InR5cGUiOiJhZGRyZXNzIiwidmFsdWUiOlsiMC4wLjQ4ODAxNjg4Il19LHsidHlwZSI6ImludDY0IiwidmFsdWUiOlsiMSJdfSx7InR5cGUiOiJ1aW50OCIsInZhbHVlIjpbIjEyMyJdfSx7InR5cGUiOiJ1aW50NjRbXSIsInZhbHVlIjpbIjEiLCIyIiwiMyJdfSx7InR5cGUiOiJ1aW50MjU2W10iLCJ2YWx1ZSI6WyIxIiwiMiIsIjMiXX0seyJ0eXBlIjoidHVwbGUiLCJ2YWx1ZSI6WyJXM3NpZEhsd1pTSTZJbWx1ZERZMElpd2lkbUZzZFdVaU9sc2lOU0pkZlN4N0luUjVjR1VpT2lKcGJuUTJOQ0lzSW5aaGJIVmxJanBiSWpFd0lsMTlYUT09Il19LHsidHlwZSI6InR1cGxlIiwidmFsdWUiOlsiVzNzaWRIbHdaU0k2SW1sdWREWTBJaXdpZG1Gc2RXVWlPbHNpTlRBaVhYMHNleUowZVhCbElqb2lkSFZ3YkdWYlhTSXNJblpoYkhWbElqcGJJbGN6YzJsa1NHeDNXbE5KTmtsdGJIVmtSRmt3U1dsM2FXUnRSbk5rVjFWcFQyeHphVTFVV1dsWVdEQnpaWGxLTUdWWVFteEphbTlwWVZjMU1FNXFVV2xNUTBveVdWZDRNVnBUU1RaWGVVbDZUV2xLWkdaV01EMGlMQ0pYTTNOcFpFaHNkMXBUU1RaSmJXeDFaRVJaTUVscGQybGtiVVp6WkZkVmFVOXNjMmxPVTBwa1psTjROMGx1VWpWalIxVnBUMmxLY0dKdVVUSk9RMGx6U1c1YWFHSklWbXhKYW5CaVNXcEZkMGxzTVRsWVVUMDlJbDE5WFE9PSJdfSx7InR5cGUiOiJ0dXBsZVtdIiwidmFsdWUiOlsiVzNzaWRIbHdaU0k2SW1sdWREWTBJaXdpZG1Gc2RXVWlPbHNpTVRZaVhYMHNleUowZVhCbElqb2lhVzUwTmpRaUxDSjJZV3gxWlNJNld5SXpNaUpkZlYwPSIsIlczc2lkSGx3WlNJNkltbHVkRFkwSWl3aWRtRnNkV1VpT2xzaU5TSmRmU3g3SW5SNWNHVWlPaUpwYm5RMk5DSXNJblpoYkhWbElqcGJJakV3SWwxOVhRPT0iXX0seyJ0eXBlIjoidHVwbGVbXSIsInZhbHVlIjpbIlczc2lkSGx3WlNJNkltbHVkRFkwSWl3aWRtRnNkV1VpT2xzaU5UQWlYWDBzZXlKMGVYQmxJam9pZEhWd2JHVmJYU0lzSW5aaGJIVmxJanBiSWxjemMybGtTR3gzV2xOSk5rbHRiSFZrUkZrd1NXbDNhV1J0Um5Oa1YxVnBUMnh6YVUxVVdXbFlXREJ6WlhsS01HVllRbXhKYW05cFlWYzFNRTVxVVdsTVEwb3lXVmQ0TVZwVFNUWlhlVWw2VFdsS1pHWldNRDBpTENKWE0zTnBaRWhzZDFwVFNUWkpiV3gxWkVSWk1FbHBkMmxrYlVaelpGZFZhVTlzYzJsT1UwcGtabE40TjBsdVVqVmpSMVZwVDJsS2NHSnVVVEpPUTBselNXNWFhR0pJVm14SmFuQmlTV3BGZDBsc01UbFlVVDA5SWwxOVhRPT0iLCJXM3NpZEhsd1pTSTZJbWx1ZERZMElpd2lkbUZzZFdVaU9sc2lOVEFpWFgwc2V5SjBlWEJsSWpvaWRIVndiR1ZiWFNJc0luWmhiSFZsSWpwYklsY3pjMmxrU0d4M1dsTkpOa2x0YkhWa1JGa3dTV2wzYVdSdFJuTmtWMVZwVDJ4emFVMVVXV2xZV0RCelpYbEtNR1ZZUW14SmFtOXBZVmMxTUU1cVVXbE1RMG95V1ZkNE1WcFRTVFpYZVVsNlRXbEtaR1pXTUQwaUxDSlhNM05wWkVoc2QxcFRTVFpKYld4MVpFUlpNRWxwZDJsa2JVWnpaRmRWYVU5c2MybE9VMHBrWmxONE4wbHVValZqUjFWcFQybEtjR0p1VVRKT1EwbHpTVzVhYUdKSVZteEphbkJpU1dwRmQwbHNNVGxZVVQwOUlsMTlYUT09Il19LHsidHlwZSI6ImFkZHJlc3MiLCJ2YWx1ZSI6WyIwLjAuMTIzNDUiXX0seyJ0eXBlIjoidWludDY0IiwidmFsdWUiOlsiNTY3ODQ2NDU2NDUiXX0seyJ0eXBlIjoidWludDI1NiIsInZhbHVlIjpbIjEyMzQ1Il19XQ==';
    const tuple0 = new ParametersBuilder().addInt64(16).addInt64(32);
    const tuple1 = new ParametersBuilder().addInt64(5).addInt64(10);
    const tuple2 = new ParametersBuilder().addInt64(50).addTupleArray([tuple0, tuple1]);
    const contractId = process.env.CONTRACT_ID || "";

    const params = new ParametersBuilder()
        .addString("Hello, Backend")
        .addBytes32([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F])
        .addAddressArray(["0.0.48738539", AccountId.fromString("0.0.48738538"), "0.0.48738537"])
        .addAddress("0.0.48850466")
        .addAddress("0.0.499326")
        .addAddress("0.0.48801688")
        .addInt64(1)
        .addUInt8(123)
        .addUInt64Array([1,2,3])
        .addUInt256Array([1,2,3])
        .addTuple(tuple1)
        .addTuple(tuple2)
        .addTupleArray([tuple0, tuple1])
        .addTupleArray([tuple2, tuple2])
        .addAddress("0.0.12345")
        .addUInt64(56784645645)
        .addUInt256(12345)
    ;

    const paramsEncoded = params.encode();
    expect(paramsEncoded).toEqual(paramsEncodedExample);

    let result = await bladeSdk.contractCallFunction(contractId, "set_message", paramsEncoded, accountId, privateKey, 100000, false, completionKey);
    checkResult(result, false);
    expect(result.error.reason.includes("CONTRACT_REVERT_EXECUTED")).toEqual(true);


    const message = `Sum test ${Math.random()}`;
    const num1 = 7;
    const num2 = 9;

    const params1 = new ParametersBuilder()
        .addString(message)
        .addTuple(new ParametersBuilder().addUInt64(num1).addUInt64(num2));


    result = await bladeSdk.contractCallFunction(contractId, "set_numbers", params1.encode(), accountId, privateKey, 1000000, false, completionKey);
    checkResult(result);

    // try to pass ParametersBuilder object instead of encoded string
    result = await bladeSdk.contractCallFunction(contractId, "set_numbers", params1, accountId, privateKey, 1000000, false, completionKey);
    checkResult(result);

    try {
        new ParametersBuilder()
            .addStringArray(["Hello", "World"])
            .addBytes32([0x00, 0x01, 0x02])
        ;
    } catch (e: any) {
        expect(e.message.includes("Bytes32 must be 32 bytes long")).toEqual(true);
    }

    try {
        const tpl1 = new ParametersBuilder().addStringArray(["Hello", "World"]);
        const tpl2 = new ParametersBuilder().addAddressArray(["0.0.1"])
        await parseContractFunctionParams(new ParametersBuilder().addTupleArray([tpl1, tpl2]))
    } catch (e) {
        expect(JSON.stringify(e).includes("Tuple structure in array must be the same")).toEqual(true);
    }

    try {
        await parseContractFunctionParams("W3sidHlwZSI6InN0cmluZ1tdIiwidmFsdWUiOlsiSGVsbG8iLCJXb3JsZCJdfSx7InR5cGUiOiJzdHJpbmciLCJ2YWx1ZSI6WyI1NSJdfSx7InR5cGUiOiJHYXJ5RHUiLCJ2YWx1ZSI6WzQyXX1d");
    } catch (e) {
        expect(JSON.stringify(e).includes("Type \\\"GaryDu\\\" not implemented on JS")).toEqual(true);
    }

}, 120_000);

test("utils", async () => {
    const arr = flatArray([1,2,3, [4,5,6,[7,8,9, [10], [11]], [12]]]);
    expect(Array.isArray(arr)).toEqual(true);

    const originalString = "hello";
    const encrypted = await encrypt(originalString, process.env.API_KEY || "");
    expect(await decrypt(encrypted, process.env.API_KEY || "")).toEqual(originalString);

    expect((await GET(Network.Testnet, `/api/v1/accounts/${accountId}`)).account).toEqual(accountId)
});
