// @ts-nocheck
import {
    AccountCreateTransaction,
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
import {Buffer} from "buffer";
import config from "../../src/config";
import dotenv from "dotenv";
import fetch from "node-fetch-cjs";
import {ethers} from "ethers";
import {TextDecoder, TextEncoder} from 'util';
import crypto from "crypto";
import {flatArray} from "../../src/helpers/ArrayHelpers";
import {parseContractFunctionParams} from "../../src/helpers/ContractHelpers";
import {decrypt, encrypt} from "../../src/helpers/SecurityHelper";
import {
    AccountProvider,
    CryptoKeyType,
    KeyRecord,
    KeyType,
    IPFSProvider,
    SdkEnvironment
} from "../../src/models/Common";
import {BladeSDK, ParametersBuilder} from "../../src/webView";

Object.defineProperty(global.self, "crypto", {
    value: {
        subtle: crypto.webcrypto.subtle,
    },
});

Object.assign(global, {TextDecoder, TextEncoder, fetch});

dotenv.config();
const bladeSdk = new BladeSDK(true);
const sdkVersion = `Kotlin@${config.numberVersion}`;
export const completionKey = "completionKey1";
const privateKey = process.env.PRIVATE_KEY || ""; // ECDSA
const accountId = process.env.ACCOUNT_ID || "";
const privateKey1 = process.env.PRIVATE_KEY1 || "";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const accountId1 = process.env.ACCOUNT_ID1;
const privateKey2 = process.env.PRIVATE_KEY2 || ""; // ECDSA
const accountId2 = process.env.ACCOUNT_ID2 || "";
const privateKey3 = process.env.PRIVATE_KEY3 || "";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const accountId3 = process.env.ACCOUNT_ID3 || "";
const privateKey4 = process.env.PRIVATE_KEY_ED25519 || "";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const accountId4 = process.env.ACCOUNT_ID_ED25519 || "";
const tokenId0 = process.env.TOKEN_ID0 || "";
const tokenId1 = process.env.TOKEN_ID1 || "";


beforeEach(async () => {
    const result = await bladeSdk.init(
        process.env.API_KEY,
        process.env.NETWORK,
        process.env.DAPP_CODE,
        process.env.VISITOR_ID,
        process.env.SDK_ENV as SdkEnvironment,
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
        process.env.SDK_ENV as SdkEnvironment,
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

    result = await bladeSdk.setUser(AccountProvider.Hedera, accountId, privateKey, completionKey);
    checkResult(result);
    result = await bladeSdk.getBalance("", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("hbars");
    expect(result.data).toHaveProperty("tokens");
    expect(Array.isArray(result.data.tokens)).toEqual(true);

    try {
        // invalid accountId
        await bladeSdk.getBalance("0.0.0", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
}, 90_000);

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

    try {
        await bladeSdk.getCoinList(completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
});

test('bladeSdk.getCoinPrice', async () => {
    let result = await bladeSdk.getCoinPrice("Hbar", "uah", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("priceUsd");
    expect(result.data).toHaveProperty("price");
    expect(result.data).toHaveProperty("coin");
    expect(result.data).toHaveProperty("currency");
    const coin = result.data.coin;
    expect(coin.id).toEqual("hedera-hashgraph");
    expect(coin.symbol).toEqual("hbar");
    expect(result.data.currency).toEqual("uah");
    expect(coin.market_data.current_price.usd).toEqual(result.data.priceUsd);

    result = await bladeSdk.getCoinPrice("0.0.0", "", completionKey);
    checkResult(result);
    expect(result.data.coin.symbol).toEqual("hbar");

    result = await bladeSdk.getCoinPrice("0x80008bcd713c38af90a9930288d446bc3bd2e684", "", completionKey);
    checkResult(result);
    expect(result.data.coin.symbol).toEqual("karate");

    result = await bladeSdk.getCoinPrice(process.env.KARATE_TOKEN_ID, "", completionKey);
    checkResult(result);
    expect(result.data.coin.symbol).toEqual("karate");

    result = await bladeSdk.getCoinPrice("karate-combat", "", completionKey);
    checkResult(result);
    expect(result.data.coin.symbol).toEqual("karate");

    try {
        await bladeSdk.getCoinPrice("unknown token", "", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
}, 10_000);

test('bladeSdk.transferHbars', async () => {
    let result = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(result);
    const hbars = result.data.hbars;
    result = await bladeSdk.transferHbars(accountId, privateKey, accountId2, "1.5", "custom memo text", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("status");
    expect(result.data).toHaveProperty("topicSequenceNumber");
    expect(result.data).toHaveProperty("totalSupply");
    expect(result.data).toHaveProperty("status");
    expect(result.data.status).toEqual("SUCCESS");

    // wait for balance update
    await sleep(20_000);

    result = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(result);
    expect(hbars).not.toEqual(result.data.hbars);

    result = await bladeSdk.setUser(AccountProvider.Hedera, accountId, privateKey, completionKey);
    checkResult(result);
    result = await bladeSdk.transferHbars("", "", accountId2, "1.5", "custom memo text", completionKey);
    checkResult(result);

    try {
        // invalid signature
        await bladeSdk.transferHbars(accountId2, privateKey, accountId, "1.5", "custom memo text", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }

    try {
        // parseFloat exception
        result = await bladeSdk.transferHbars(accountId, privateKey, accountId, "jhghjhgjghj", "custom memo text", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
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

    try {
        // fail on wrong function params (CONTRACT_REVERT_EXECUTED)
        params = new ParametersBuilder().addString(message).addAddress("0x65f17cac69fb3df1328a5c239761d32e8b346da0").addAddressArray([accountId, accountId2]).addTuple(new ParametersBuilder().addUInt64(num1).addUInt64(num2));
        result = await bladeSdk.contractCallFunction(contractId, "set_numbers", params.encode(), accountId, privateKey, 1000000, false, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
        expect(result.error.reason.includes("CONTRACT_REVERT_EXECUTED")).toEqual(true);
    }

    try {
        // fail on wrong function params (CONTRACT_REVERT_EXECUTED) with error_message
        params = new ParametersBuilder()
        result = await bladeSdk.contractCallFunction(contractId, "revert_fnc", params, accountId, privateKey, 1000000, true, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);

        const reason = result.error.reason;
        const regex = /\(([^)]+)\)/;
        const match = reason.match(regex);

        expect(result.error.reason.includes("CONTRACT_REVERT_EXECUTED") && match[1].length > 0).toEqual(true);
    }

    try {
        // fail on invalid json
        const paramsEncoded = '[{"type":"string",""""""""]'
        result = await bladeSdk.contractCallFunction(contractId, "set_numbers", paramsEncoded, accountId, privateKey, 1000000, false, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
        expect(result.error.reason.includes("Unexpected token")).toEqual(true);
    }

    try {
        // fail on low gas
        params = new ParametersBuilder().addString(message).addTuple(new ParametersBuilder().addUInt64(num1).addUInt64(num2));
        result = await bladeSdk.contractCallFunction(contractId, "set_message", params, accountId, privateKey, 1, false, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
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
    try {
        result = await bladeSdk.contractCallQueryFunction(contractId, "unknown function", params, accountId, privateKey, 100000, true, ["string"], completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }

    try {
        result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, "0.0.3", privateKey2, 100000, false, ["string"], completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }

    try {
        result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, accountId, privateKey, 100000, false, ["bytes32", "unknown-type"], completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
}, 120_000);

test('bladeSdk.transferTokens', async () => {
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    const tokenName = "JEST Token Test";
    let result = await bladeSdk.getBalance(accountId, completionKey);
    checkResult(result);

    let tokenId: string | null = null;
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

    try {
        // invalid signature
        result = await bladeSdk.transferTokens(tokenId?.toString(), accountId2, privateKey, accountId2, amount.toString(), "transfer memo", false, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }

    try {
        // invalid tokenId
        result = await bladeSdk.transferTokens("invalid token id", accountId2, privateKey, accountId2, amount.toString(), "transfer memo", false, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }

    result = await bladeSdk.transferTokens(tokenId.toString(), accountId, privateKey, accountId2, amount.toString(), "transfer memo", false, completionKey);
    checkResult(result);
    expect(result.data).toHaveProperty("status");
    expect(result.data).toHaveProperty("topicSequenceNumber");
    expect(result.data).toHaveProperty("totalSupply");
    expect(result.data).toHaveProperty("status");
    expect(result.data.status).toEqual("SUCCESS");

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

    result = await bladeSdk.setUser(AccountProvider.Hedera, accountId, privateKey, completionKey);
    checkResult(result);
    result = await bladeSdk.transferTokens(tokenId.toString(), "", "", accountId2, amount.toString(), "transfer memo (setUser)", true, completionKey);
    checkResult(result);
}, 120_000);

test('bladeSdk.createAccount', async () => {
    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    checkResult(result);

    result = await bladeSdk.createAccount("", "device-id", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("seedPhrase");
    expect(result.data).toHaveProperty("publicKey");
    expect(result.data).toHaveProperty("privateKey");
    expect(result.data).toHaveProperty("accountId");
    expect(result.data).toHaveProperty("evmAddress");

    await sleep(25_000);

    const publicKey = PrivateKey.fromStringDer(result.data.privateKey).publicKey.toStringRaw();
    const evmAddress = ethers.computeAddress(`0x${publicKey}`);

    expect(result.data.evmAddress).toEqual(evmAddress.toLowerCase());

    try {
        result = await bladeSdk.init("wrong api key", process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
        checkResult(result);

        result = await bladeSdk.createAccount("", "device-id", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
}, 60_000);

test('bladeSdk.getAccountInfo', async () => {
    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    checkResult(result);

    const account = await bladeSdk.createAccount("", "device-id", completionKey);
    checkResult(account);
    const newAccountId = account.data.accountId;

    await sleep(15_000);

    let accountInfo = await bladeSdk.getAccountInfo(newAccountId, completionKey);
    checkResult(accountInfo);

    expect(accountInfo.data.evmAddress).toEqual(`0x${AccountId.fromString(newAccountId).toSolidityAddress()}`);
    expect(accountInfo.data.calculatedEvmAddress).toEqual(account.data.evmAddress);

    try {
        accountInfo = await bladeSdk.getAccountInfo("////", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }

    result = await bladeSdk.setUser(AccountProvider.Hedera, accountId, privateKey, completionKey);
    checkResult(result);
    accountInfo = await bladeSdk.getAccountInfo("", completionKey);
    checkResult(accountInfo);

    try {
        accountInfo = await bladeSdk.getAccountInfo("0.0.9999999999999999999999999", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
}, 60_000);

test('bladeSdk.deleteAccount', async () => {
    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    checkResult(result);

    result = await bladeSdk.createAccount("", "device-id", completionKey);
    checkResult(result);
    const newAccountId = result.data.accountId;
    const newPrivateKey = result.data.privateKey;

    result = await bladeSdk.deleteAccount(newAccountId, newPrivateKey, accountId, accountId, privateKey, completionKey);
    checkResult(result);

    await sleep(15_000);
    result = await GET(Network.Testnet, `/accounts/${newAccountId}`);
    expect(result.deleted).toEqual(true);

    try {
        // invalid request (already deleted)
        result = await bladeSdk.deleteAccount(newAccountId, newPrivateKey, accountId, accountId, privateKey, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
}, 60_000);

test('bladeSdk.getKeysFromMnemonic', async () => {
    await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    let result = await bladeSdk.createAccount("", "device-id", completionKey);
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

    await sleep(7000);

    expect(result.data).toHaveProperty("privateKey");
    expect(result.data).toHaveProperty("publicKey");
    expect(result.data).toHaveProperty("accounts");
    expect(result.data).toHaveProperty("evmAddress");
    expect(Array.isArray(result.data.accounts)).toEqual(true);
    expect(result.data.accounts.length).toEqual(1);

    expect(result.data.privateKey).toEqual(accountSample.privateKey);
    expect(result.data.publicKey).toEqual(accountSample.publicKey);
    expect(result.data.evmAddress).toEqual(accountSample.evmAddress);



    result = await bladeSdk.getKeysFromMnemonic(accountSample.seedPhrase, true, completionKey);
    checkResult(result);

    expect(result.data.accounts.length).toEqual(1);
    expect(result.data.accounts[0]).toEqual(accountSample.accountId);

    try {
        result = await bladeSdk.getKeysFromMnemonic("invalid seed phrase", true, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }

    result = await bladeSdk.getKeysFromMnemonic((await Mnemonic.generate12()).toString(), true, completionKey);
    checkResult(result);
    expect(result.data.accounts.length).toEqual(1);
    expect(result.data.accounts[0]).toEqual("");
}, 60_000);

test('bladeSdk.searchAccounts', async () => {
    await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    let result = await bladeSdk.createAccount("", "device-id", completionKey);
    checkResult(result);

    const accountSample = {
        accountId: result.data.accountId,
        privateKey: result.data.privateKey,
        publicKey: result.data.publicKey,
        seedPhrase: result.data.seedPhrase,
        evmAddress: result.data.evmAddress
    }

    await sleep(15000);
    result = await bladeSdk.searchAccounts(accountSample.seedPhrase, completionKey);
    checkResult(result);


    expect(result.data).toHaveProperty("accounts");
    expect(Array.isArray(result.data.accounts)).toEqual(true);
    expect(result.data.accounts.length).toEqual(1);

    expect(result.data.accounts[0]).toHaveProperty("privateKey");
    expect(result.data.accounts[0]).toHaveProperty("publicKey");
    expect(result.data.accounts[0]).toHaveProperty("evmAddress");
    expect(result.data.accounts[0]).toHaveProperty("address");
    expect(result.data.accounts[0]).toHaveProperty("path");
    expect(result.data.accounts[0]).toHaveProperty("keyType");

    expect(result.data.accounts[0].address).toEqual(accountSample.accountId);
    expect(result.data.accounts[0].privateKey).toEqual(accountSample.privateKey);
    expect(result.data.accounts[0].publicKey).toEqual(accountSample.publicKey);
    expect(result.data.accounts[0].evmAddress).toEqual(accountSample.evmAddress);
    expect(result.data.accounts[0].keyType).toEqual(CryptoKeyType.ECDSA_SECP256K1);

    try {
        result = await bladeSdk.searchAccounts("invalid seed phrase", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }

    try {
        result = await bladeSdk.searchAccounts("0xinvalidPrivateKey", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }

    result = await bladeSdk.searchAccounts((await Mnemonic.generate12()).toString(), completionKey);
    checkResult(result);
    expect(result.data.accounts.length).toEqual(1);
    expect(result.data.accounts[0].address).toEqual("");

    // ecdsa key without account
    result = await bladeSdk.searchAccounts("3030020100300706052b8104000a04220420b355ed04bf673f326da0935df005566646eb30481d08e81dc75fc9b9fda90a3f", completionKey);
    checkResult(result);
    expect(result.data.accounts.length).toEqual(0);

}, 60_000);

test('bladeSdk.dropTokens', async () => {
    await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);
    let result = await bladeSdk.createAccount("", "device-id", completionKey);
    checkResult(result);
    const accountSample = result.data;
    await sleep(7000);

    result = await bladeSdk.dropTokens(accountSample.accountId, accountSample.privateKey, process.env.NONCE, completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("status");
    expect(result.data).toHaveProperty("statusCode");
    expect(result.data).toHaveProperty("timestamp");
    expect(result.data).toHaveProperty("executionStatus");
    expect(result.data).toHaveProperty("requestId");
    expect(result.data).toHaveProperty("accountId");
    expect(result.data).toHaveProperty("redirectUrl");

    try {
        result = await bladeSdk.dropTokens(accountSample.accountId, accountSample.privateKey, process.env.NONCE, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
}, 60_000);

test('bladeSdk.getTokenInfo', async () => {
    await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.VISITOR_ID, process.env.SDK_ENV, sdkVersion, completionKey);

    let result = await bladeSdk.getTokenInfo("0.0.3982458", "5", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("token");
    expect(result.data).toHaveProperty("nft");
    expect(result.data).toHaveProperty("metadata");
    expect(result.data.nft).toHaveProperty("token_id");
    expect(result.data.nft).toHaveProperty("serial_number");
    expect(result.data.metadata).toHaveProperty("author");
    expect(result.data.metadata).toHaveProperty("description");
    expect(result.data.metadata.author).toEqual("GaryDu 2");
    expect(result.data.metadata.description).toEqual("description 2");


    result = await bladeSdk.getTokenInfo(tokenId0, "", completionKey);
    checkResult(result);
    expect(result.data.nft).toEqual(null);
    expect(result.data.metadata).toEqual(null);

    try {
        result = await bladeSdk.getTokenInfo("0.0.3982458", "555", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
}, 60_000);

test('bladeSdk.sign + signVerify', async () => {
    const message = "hello";
    const messageString = Buffer.from(message).toString("base64");

    let result = await bladeSdk.sign(messageString, privateKey, completionKey);
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

    try {
        // invalid private key
        result = await bladeSdk.sign(messageString, `privateKey`, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }

    try {
        result = bladeSdk.signVerify(messageString, "invalid signature", "invalid publicKey", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
});

test('bladeSdk.ethersSign', async () => {
    const message = "hello";
    const messageString = Buffer.from(message).toString("base64");
    const wallet = new ethers.Wallet(PrivateKey.fromStringDer(privateKey).toStringRaw());

    let result = await bladeSdk.ethersSign(messageString, privateKey, completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("signedMessage");
    expect(result.data.signedMessage).toEqual(await wallet.signMessage(Buffer.from(message)));

    const signerAddress = ethers.verifyMessage(message, result.data.signedMessage);
    expect(signerAddress).toEqual(ethers.computeAddress(wallet.signingKey.publicKey));

    try {
        // invalid calls
        result = await bladeSdk.ethersSign(messageString, "invalid privateKey", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }

    try {
        result = await bladeSdk.ethersSign(123, privateKey, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
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
    expect(signature).toEqual(ethers.Signature.from({v, r, s}).serialized);


    try {
        // invalid signature
        result = await bladeSdk.splitSignature("invalid signature", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
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

    expect(result.data.v).toEqual(27);
    expect(result.data.r).toEqual("0x0c6e8f0487709cfc1ebbc41e47ce56aee5cf5bc933a4cd6cb2695b098dbe4ee4");
    expect(result.data.s).toEqual("0x22d0b6351670c37eb112ebd80123452237cb5c893767510a9356214189f6fe86");

    try {
        // invalid paramsEncoded
        result = await bladeSdk.getParamsSignature('[{{{{{{{{{{{"]', privateKey, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
});

test('bladeSdk.getTransactions', async () => {
    // make transaction
    let result = await bladeSdk.transferHbars(accountId, privateKey, accountId2, "1.5", "some tx memo", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("status");
    expect(result.data).toHaveProperty("topicSequenceNumber");
    expect(result.data).toHaveProperty("totalSupply");
    expect(result.data).toHaveProperty("status");
    expect(result.data.status).toEqual("SUCCESS");

    // get expected transaction
    result = await bladeSdk.getTransactions(accountId, "", "", "5", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("nextPage");
    expect(result.data).toHaveProperty("transactions");
    expect(Array.isArray(result.data.transactions)).toEqual(true);

    const nextPage = result.data.nextPage;

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

    try {
        // invalid accountId
        result = await bladeSdk.getTransactions('0.dgsgsdgdsgdsgdsg', "", "", "5", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }

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

    try {
    result = await bladeSdk.getC14url("1b487a96-a14a-47d1-a1e0-09c18d409671", "0.0.13421", "10", completionKey);
    expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
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

    result = await bladeSdk.exchangeGetQuotes("HBAR", 30, "PHP", "Sell", completionKey);
    checkResult(result);

    result = await bladeSdk.exchangeGetQuotes("HBAR", 1500, "SAUCE", "Swap", completionKey);
    checkResult(result);

    try {
        result = await bladeSdk.exchangeGetQuotes("aaaaaaa", 0, "bbbbbb", "FFFF", completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
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
        "HBAR",
        1,
        "SAUCE",
        0.5,
        "saucerswapV2",
        completionKey
    );
    checkResult(result);

    try {
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
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
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

    const redirectUrl = "some-redirect-url";

    result = await bladeSdk.getTradeUrl("buy", accountId, "EUR", 50, "HBAR", 0.5, "moonpay", redirectUrl, completionKey);
    checkResult(result);
    expect(result.data).toHaveProperty("url");

    result = await bladeSdk.getTradeUrl("sell", accountId, "HBAR", 2000, "USD", 1, "transak", redirectUrl, completionKey);
    checkResult(result);
    expect(result.data).toHaveProperty("url");

    try {
        result = await bladeSdk.getTradeUrl("buy", accountId, "EUR", 50, "HBAR", 0.5, "unknown-service-id", redirectUrl, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
    }
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
        // {type: KeyType.feeSchedule, privateKey: feeScheduleKey},
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
    // expect(tokenInfo.fee_schedule_key.key).toEqual(PrivateKey.fromString(feeScheduleKey).publicKey.toStringRaw());
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
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAARUlEQVR42u3PMREAAAgEIO1fzU5vBlcPGtCVTD3QIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIXCyqyi6fIALs1AAAAAElFTkSuQmCC", // TODO upload file base64
        {
            author: "GaryDu",
        },
        {
            provider: IPFSProvider.pinata,
            token: process.env.PINATA_JWT,
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

test('bladeSdk.schedule', async () => {
    let result = await bladeSdk.createScheduleTransaction(
        accountId2,
        privateKey2,
        "TRANSFER", [
            {
                type: "HBAR",
                sender: accountId,
                receiver: accountId2,
                value: parseInt(Math.random() * 6000000, 10),
            },
            {
                type: "FT",
                sender: accountId,
                receiver: accountId2,
                tokenId: tokenId0,
                value: 1
            },
            // {
            //     type: "NFT",
            //     sender: accounts[1].accountId,
            //     receiver: accounts[2].accountId,
            //     tokenId: "0.0.3982458",
            //     serial: 4
            // },
        ],
        false,
        completionKey
    );
    checkResult(result);
    expect(result.data).toHaveProperty("scheduleId");
    const scheduleId = result.data.scheduleId;

    result = await bladeSdk.signScheduleId(scheduleId, accountId, privateKey, accountId2, false, completionKey);
    checkResult(result);
}, 60_000);


test("bladeSdk.associateToken", async () => {
    let result;
    const mnemonic = await Mnemonic.generate12();
    const key = await mnemonic.toStandardECDSAsecp256k1PrivateKey();

    const operatorKey = PrivateKey.fromStringDer(privateKey);

    const client = Client.forTestnet();
    client.setOperator(accountId, operatorKey);
    const receipt = await new AccountCreateTransaction()
        .setKey(key)
        .setAccountMemo("test association")
        .execute(client)
        .then((tx) => tx.getReceipt(client))

    result = await bladeSdk.associateToken(tokenId0, receipt.accountId.toString(), key.toStringDer(), completionKey);
    checkResult(result);
    try {
        result = await bladeSdk.associateToken(tokenId0, receipt.accountId.toString(), key.toStringDer(), completionKey);
        expect("Code should not reach here").toEqual(result);
    } catch (result) {
        checkResult(result, false);
    }

    // association on demand
    result = await bladeSdk.associateToken("drop1", receipt.accountId.toString(), key.toStringDer(), completionKey);
    checkResult(result);

    try {
        result = await bladeSdk.associateToken(tokenId1, receipt.accountId.toString(), key.toStringDer(), completionKey);
        expect("Code should not reach here").toEqual(result);
    } catch (result) {
        checkResult(result, false);
        expect(result.error.reason.includes("INSUFFICIENT_PAYER_BALANCE")).toEqual(true);
    }

}, 60_000);

test("bladeSdk.brokenMnemonicEmergencyTransfer", async () => {
    let result;

    const brokenSeed = "marriage bounce fiscal express wink wire trick allow faith mandate base bone";
    const brokenMnemonic = await Mnemonic.fromString(brokenSeed);
    // create account with broken mnemonic

    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);
    const receipt = await new AccountCreateTransaction()
        .setKey((await brokenMnemonic.toStandardECDSAsecp256k1PrivateKey()).publicKey)
        .setAccountMemo("broken account")
        .setMaxAutomaticTokenAssociations(1)
        .setInitialBalance(new Hbar(2))
        .execute(client)
        .then((tx) => tx.getReceipt(client))

    const accountToResque = {
        accountId: receipt.accountId.toString(),
        privateKey: (await brokenMnemonic.toStandardECDSAsecp256k1PrivateKey()).toStringDer()
    }

    const clientBroken = Client.forTestnet();
    clientBroken.setOperator(accountToResque.accountId, await brokenMnemonic.toStandardECDSAsecp256k1PrivateKey());

    // Associate a token to an account and freeze the unsigned transaction for signing
    await new TokenAssociateTransaction()
        .setAccountId(accountToResque.accountId)
        .setTokenIds([tokenId0])
        .freezeWith(clientBroken)
        .execute(clientBroken);

    await sleep(10_000);

    console.log("accountToResque", accountToResque);

    result = await bladeSdk.transferTokens(tokenId0, accountId, privateKey, accountToResque.accountId, "5", "transfer tokens to broken account", false, completionKey);
    checkResult(result);

    try {
        result = await bladeSdk.transferHbars(accountToResque.accountId, accountToResque.privateKey, accountId, "0.1", "resque broken account attempt", completionKey);
        expect("Code should not reach here").toEqual(result);
    } catch (result) {
        checkResult(result, false);
        expect(result.error.reason.includes("INVALID_SIGNATURE")).toEqual(true);
    }

    result = await bladeSdk.brokenMnemonicEmergencyTransfer(brokenSeed, accountToResque.accountId, accountId, "0.123", [tokenId0], true, completionKey);
    checkResult(result);
    expect(result.data.isValid).toEqual(false);
    expect(result.data.transferStatus).toEqual("");
    result = await bladeSdk.brokenMnemonicEmergencyTransfer(brokenSeed, accountToResque.accountId, accountId, "0.123", [tokenId0], false, completionKey);
    checkResult(result);
    expect(result.data.isValid).toEqual(false);
    expect(result.data.transferStatus).toEqual("SUCCESS");

    const mnemonic = await Mnemonic.generate12();
    result = await bladeSdk.brokenMnemonicEmergencyTransfer(mnemonic.toString(), "0.0.000001", accountId, "0", [], false, completionKey);
    expect(result.data.isValid).toEqual(true);
    expect(result.data.transferStatus).toEqual("");

}, 60_000);

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
        .addUInt64Array([1, 2, 3])
        .addUInt256Array([1, 2, 3])
        .addTuple(tuple1)
        .addTuple(tuple2)
        .addTupleArray([tuple0, tuple1])
        .addTupleArray([tuple2, tuple2])
        .addAddress("0.0.12345")
        .addUInt64(56784645645)
        .addUInt256(12345);

    const paramsEncoded = params.encode();
    expect(paramsEncoded).toEqual(paramsEncodedExample);

    let result;
    try {
        result = await bladeSdk.contractCallFunction(contractId, "set_message", paramsEncoded, accountId, privateKey, 100000, false, completionKey);
        expect("Code should not reach here").toBeNull();
    } catch (result) {
        checkResult(result, false);
        expect(result.error.reason.includes("CONTRACT_REVERT_EXECUTED")).toEqual(true);
    }

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
            .addBytes32([0x00, 0x01, 0x02]);
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
    const arr = flatArray([1, 2, 3, [4, 5, 6, [7, 8, 9, [10], [11]], [12]]]);
    expect(Array.isArray(arr)).toEqual(true);

    const originalString = "hello";
    const encrypted = await encrypt(originalString, process.env.API_KEY || "");
    expect(await decrypt(encrypted, process.env.API_KEY || "")).toEqual(originalString);

    expect((await GET(Network.Testnet, `/accounts/${accountId}`)).account).toEqual(accountId)
});
