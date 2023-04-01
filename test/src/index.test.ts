import {AccountId, Client, ContractCallQuery, Hbar, Mnemonic} from "@hashgraph/sdk";
import {associateToken, checkResult, createToken, getTokenInfo, sleep} from "./helpers";
import {GET, getTransaction} from "../../src/ApiService";
import {Network} from "../../src/models/Networks";
import {isEqual} from "lodash";
import {Buffer} from "buffer";

const {BladeSDK, ParametersBuilder} = require("../../src/webView");
require("dotenv").config();

global.fetch = require("node-fetch");

const {PrivateKey} = require("@hashgraph/sdk");
const {hethers} = require("@hashgraph/hethers");

const bladeSdk = new BladeSDK(true);
export const completionKey = "completionKey1";
const privateKey = process.env.PRIVATE_KEY; // ECDSA
const accountId = process.env.ACCOUNT_ID;

const privateKey2 = process.env.PRIVATE_KEY2; // ECDSA
const accountId2 = process.env.ACCOUNT_ID2;


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
    const contractId = process.env.CONTRACT_ID || "";
    expect(contractId).not.toEqual("");
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.FINGERPRINT, completionKey);
    checkResult(result);

    let message = `Hello test ${Math.random()}`;
    let params = new ParametersBuilder().addString(message);

    // direct call
    result = await bladeSdk.contractCallFunction(contractId, "set_message", params, accountId, privateKey, 1000000, false, completionKey);
    checkResult(result);

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

    contractCallQueryResult = await contractCallQuery.execute(client);
    expect(contractCallQueryResult.getString(0)).toEqual(message);


    message = `Sum test ${Math.random()}`;
    const num1 = 37;
    const num2 = 5;
    params = new ParametersBuilder().addString(message).addTuple(new ParametersBuilder().addUInt64(num1).addUInt64(num2));
    result = await bladeSdk.contractCallFunction(contractId, "set_numbers", params.encode(), accountId, privateKey, 1000000, false, completionKey);
    checkResult(result);


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

    //fail on low gas
    params = new ParametersBuilder().addString(message).addTuple(new ParametersBuilder().addUInt64(num1).addUInt64(num2));
    result = await bladeSdk.contractCallFunction(contractId, "set_message", params, accountId, privateKey, 1, false, completionKey);
    checkResult(result, false);
}, 120_000);

test('bladeSdk.contractCallQueryFunction', async () => {
    const contractId = process.env.CONTRACT_ID || "";
    expect(contractId).not.toEqual("");
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.FINGERPRINT, completionKey);
    checkResult(result);

    let message = `Hello DIRECT test ${Math.random()}`;
    let params = new ParametersBuilder().addString(message);

    result = await bladeSdk.contractCallFunction(contractId, "set_message", params, accountId, privateKey, 100000, false, completionKey);
    checkResult(result);


    // direct call
    params = new ParametersBuilder();
    result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, accountId, privateKey, 100000, false, ["string"], completionKey);
    checkResult(result);

    expect(Array.isArray(result.data)).toEqual(true);
    expect(result.data.length).toEqual(1);

    expect(result.data[0]).toHaveProperty("type");
    expect(result.data[0]).toHaveProperty("value");
    expect(result.data[0].type).toEqual("string");
    expect(result.data[0].value).toEqual(message);

    // call with API

    message = `Hello API test ${Math.random()}`;
    params = new ParametersBuilder().addString(message);

    result = await bladeSdk.contractCallFunction(contractId, "set_message", params, accountId, privateKey, 100000, true, completionKey);
    checkResult(result);

    params = new ParametersBuilder();
    result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, accountId, privateKey, 100000, true, ["string"], completionKey);
    checkResult(result);

    expect(Array.isArray(result.data)).toEqual(true);
    expect(result.data.length).toEqual(1);

    expect(result.data[0]).toHaveProperty("type");
    expect(result.data[0]).toHaveProperty("value");
    expect(result.data[0].type).toEqual("string");
    expect(result.data[0].value).toEqual(message);
}, 120_000);

test('bladeSdk.transferTokens', async () => {
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
    result = await bladeSdk.transferTokens(tokenId.toString(), accountId2, privateKey, accountId2, amount.toString(), false, completionKey);
    checkResult(result, false);

    // invalid tokenId
    result = await bladeSdk.transferTokens("invalid token id", accountId2, privateKey, accountId2, amount.toString(), false, completionKey);
    checkResult(result, false);

    result = await bladeSdk.transferTokens(tokenId.toString(), accountId, privateKey, accountId2, amount.toString(), false, completionKey);
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
    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.FINGERPRINT, completionKey);
    checkResult(result);

    result = await bladeSdk.createAccount(completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("seedPhrase");
    expect(result.data).toHaveProperty("publicKey");
    expect(result.data).toHaveProperty("privateKey");
    expect(result.data).toHaveProperty("accountId");
    expect(result.data).toHaveProperty("evmAddress");

    await sleep(25_000);

    const publicKey = PrivateKey.fromString(result.data.privateKey).publicKey.toStringRaw();
    const evmAddress = hethers.utils.computeAddress(`0x${publicKey}`);

    expect(result.data.evmAddress).toEqual(evmAddress.toLowerCase());

    result = await bladeSdk.init("wrong api key", process.env.NETWORK, process.env.DAPP_CODE, process.env.FINGERPRINT, completionKey);
    checkResult(result);

    result = await bladeSdk.createAccount(completionKey);
    checkResult(result, false);
}, 60_000);

test('bladeSdk.getAccountInfo', async () => {
    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.FINGERPRINT, completionKey);
    checkResult(result);

    const account = await bladeSdk.createAccount(completionKey);
    checkResult(account);
    const newAccountId = account.data.accountId;

    await sleep(7_000);

    const accountInfo = await bladeSdk.getAccountInfo(newAccountId, completionKey);
    checkResult(accountInfo);

    expect(accountInfo.data.evmAddress).toEqual(`0x${AccountId.fromString(newAccountId).toSolidityAddress()}`);
    expect(accountInfo.data.calculatedEvmAddress).toEqual(account.data.evmAddress);
}, 60_000);

test('bladeSdk.deleteAccount', async () => {
    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.FINGERPRINT, completionKey);
    checkResult(result);

    result = await bladeSdk.createAccount(completionKey);
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
    await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.FINGERPRINT, completionKey);
    let result = await bladeSdk.createAccount(completionKey);
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

    //invalid private key
    let resultInvalid = await bladeSdk.sign(messageString, `privateKey`, completionKey);
    checkResult(resultInvalid, false);

    resultInvalid = bladeSdk.signVerify(messageString, "invalid signature", "invalid publicKey", completionKey);
    checkResult(resultInvalid, false);
});

test('bladeSdk.hethersSign', async () => {
    const message = "hello";
    const messageString = Buffer.from(message).toString("base64");
    const wallet = new hethers.Wallet(privateKey);

    let result = await bladeSdk.hethersSign(messageString, privateKey, completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("signedMessage");
    expect(result.data.signedMessage).toEqual(await wallet.signMessage(Buffer.from(message)));

    const signerAddress = hethers.utils.verifyMessage(message, result.data.signedMessage);
    expect(signerAddress).toEqual(wallet.publicKey);

    // invalid calls
    result = await bladeSdk.hethersSign(messageString, "invalid privateKey", completionKey);
    checkResult(result, false);

    result = await bladeSdk.hethersSign(123, privateKey, completionKey);
    checkResult(result, false);
});

test('bladeSdk.splitSignature', async () => {
    const message = "hello";
    const messageString = Buffer.from(message).toString("base64");

    let result = await bladeSdk.hethersSign(messageString, privateKey, completionKey);
    checkResult(result);
    expect(result.data).toHaveProperty("signedMessage");
    const signature = result.data.signedMessage;

    result = await bladeSdk.splitSignature(result.data.signedMessage, completionKey);
    checkResult(result);

    const v: number = result.data.v;
    const r: string = result.data.r;
    const s: string = result.data.s;
    expect(signature).toEqual(hethers.utils.joinSignature({v, r, s}));

    // invalid signature
    result = await bladeSdk.splitSignature("invalid signature", completionKey);
    checkResult(result, false);
});

test('bladeSdk.getParamsSignature', async () => {
    let result = await bladeSdk.getParamsSignature(`[{"type":"address","value":["${accountId}"]},{"type":"uint64[]","value":["300000","300000"]},{"type":"uint64[]","value":["6"]},{"type":"uint64[]","value":["2"]}]`, privateKey, completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("v");
    expect(result.data).toHaveProperty("r");
    expect(result.data).toHaveProperty("s");

    expect(result.data.v).toEqual(28);
    expect(result.data.r).toEqual("0x615bd012c437d1e0c166a75675fcf2fb628836d53d5421452f784505d9d4b28f");
    expect(result.data.s).toEqual("0x10ee86b9b05c5745efeb2b1a560fbf422c4ecfab9241d35ef44be6367ef8efb5");

    // invalid paramsEncoded
    result = await bladeSdk.getParamsSignature('[{{{{{{{{{{{"]', privateKey, completionKey);
    checkResult(result, false);
});

test('bladeSdk.getTransactions', async () => {
    // make transaction
    let result = await bladeSdk.transferHbars(accountId, privateKey, accountId2, "1.5", completionKey);
    checkResult(result);

    expect(result.data).toHaveProperty("nodeId");
    expect(result.data).toHaveProperty("transactionHash");
    expect(result.data).toHaveProperty("transactionId");

    const transactionId = result.data.transactionId.replace("@", ".");
    await sleep(10_000);

    //get expected transaction
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


    //next page
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
        expect(result.data.transactions[0].plainData).toHaveProperty("account");
        expect(result.data.transactions[0].plainData).toHaveProperty("amount");
    }

    //invalid accountId
    result = await bladeSdk.getTransactions('0.dgsgsdgdsgdsgdsg', "", "", "5", completionKey);
    checkResult(result, false);

    //invalid tx
    result = await getTransaction(Network.Testnet, "wrong tx id", accountId);
    expect(Array.isArray(result));
    expect(result.length).toEqual(0)

}, 30_000);

test('bladeSdk.getC14url', async () => {
    let result = await bladeSdk.init(process.env.API_KEY, process.env.NETWORK, process.env.DAPP_CODE, process.env.FINGERPRINT, completionKey);
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
});
