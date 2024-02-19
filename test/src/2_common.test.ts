import {PrivateKey} from "@hashgraph/sdk";
import {checkResult, completionKey} from "./helpers";
import ApiService from "../../src/services/ApiService";
import CryptoFlowService from "../../src/services/CryptoFlowService";
import ConfigService from "../../src/services/ConfigService";
import FeeService from "../../src/services/FeeService";
import {Buffer} from "buffer";
import config from "../../src/config";
import dotenv from "dotenv";
import fetch from "node-fetch";
import {ethers} from "ethers";
import {TextDecoder, TextEncoder} from 'util';
import crypto from "crypto";
import {AccountProvider} from "../../src/models/Common";
import AccountServiceContext from "../../src/strategies/AccountServiceContext";
import TokenServiceContext from "../../src/strategies/TokenServiceContext";
import SignServiceContext from "../../src/strategies/SignServiceContext";
import ContractServiceContext from "../../src/strategies/ContractServiceContext";
import TradeServiceContext from "../../src/strategies/TradeServiceContext";
import {KnownChainIds} from "../../src/models/Chain";
import SignService from "../../src/services/SignService";
const {BladeSDK, ParametersBuilder} = require("../../src/webView");

Object.defineProperty(global.self, "crypto", {
    value: {
        subtle: crypto.webcrypto.subtle,
    },
});

Object.assign(global, { TextDecoder, TextEncoder, fetch });

dotenv.config();

describe('test COMMON functionality', () => {

    const apiService = new ApiService();
    const configService = new ConfigService(apiService);
    const feeService = new FeeService(configService);
    const signService = new SignService();
    const cryptoFlowService = new CryptoFlowService(configService, feeService);
    const accountServiceContext = new AccountServiceContext(apiService, configService);
    const tokenServiceContext = new TokenServiceContext(apiService, configService);
    const signServiceContext = new SignServiceContext(apiService, configService, signService);
    const contractServiceContext = new ContractServiceContext(apiService, configService);
    const tradeServiceContext = new TradeServiceContext(apiService, configService, cryptoFlowService);

    const bladeSdk = new BladeSDK(
        configService,
        apiService,
        accountServiceContext,
        tokenServiceContext,
        signServiceContext,
        contractServiceContext,
        tradeServiceContext,
        cryptoFlowService,
        true
    );

    const sdkVersion = `Kotlin@${config.numberVersion}`;

    const privateKey = process.env.PRIVATE_KEY || ""; // ECDSA
    const accountId = process.env.ACCOUNT_ID || "";
    const privateKeyED25519 = process.env.PRIVATE_KEY_ED25519 || "";
    const accountId4ED25519 = process.env.ACCOUNT_ID_ED25519 || "";
    const chainId = KnownChainIds.HEDERA_TESTNET; // KnownChainIds.ETHEREUM_SEPOLIA

    beforeEach(async () => {
        const result = await bladeSdk.init(
            process.env.API_KEY,
            chainId,
            process.env.DAPP_CODE,
            process.env.VISITOR_ID,
            process.env.SDK_ENV,
            sdkVersion,
            completionKey);
        checkResult(result);
    });


    test('bladeSdk-common.getCoinList', async () => {
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
            chainId,
            process.env.DAPP_CODE,
            "bad visitor id",
            process.env.SDK_ENV,
            sdkVersion,
            completionKey);
        checkResult(result);

        try {
            result = await bladeSdk.getCoinList(completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

    test('bladeSdk-common.getCoinPrice', async () => {
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

        // result = await bladeSdk.getCoinPrice("0.0.2283230", completionKey);
        // checkResult(result);
        // expect(result.data.coin.symbol).toEqual("karate");

        result = await bladeSdk.getCoinPrice("karate-combat", completionKey);
        checkResult(result);
        expect(result.data.coin.symbol).toEqual("karate");

        try {
            result = await bladeSdk.getCoinPrice("unknown token", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    }, 10_000);

    test('bladeSdk-common.sign + signVerify', async () => {
        let result;
        const message = "hello";
        const messageString = Buffer.from(message).toString("base64");

        result = await bladeSdk.sign(messageString, privateKey, completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("signedMessage");
        expect(result.data.signedMessage).toEqual(Buffer.from(PrivateKey.fromString(privateKey).sign(Buffer.from(message))).toString("hex"));

        const validationResult = await bladeSdk.signVerify(messageString, result.data.signedMessage, PrivateKey.fromString(privateKey).publicKey.toStringRaw(), completionKey);
        checkResult(validationResult);
        expect(validationResult.data.valid).toEqual(true);

        expect(PrivateKey.fromString(privateKey).publicKey.verify(
            Buffer.from(message),
            Buffer.from(result.data.signedMessage, "hex")
        )).toEqual(true);

        // invalid private key
        try {
            result = await bladeSdk.sign(messageString, `privateKey`, completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }


        try {
            result = await bladeSdk.signVerify(messageString, "invalid signature", "invalid publicKey", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

    test('bladeSdk-common.ethersSign', async () => {
        const message = "hello";
        const messageString = Buffer.from(message).toString("base64");
        const wallet = new ethers.Wallet(PrivateKey.fromString(privateKey).toStringRaw());

        let result = await bladeSdk.ethersSign(messageString, privateKey, completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("signedMessage");
        expect(result.data.signedMessage).toEqual(await wallet.signMessage(Buffer.from(message)));

        const signerAddress = ethers.utils.verifyMessage(message, result.data.signedMessage);
        expect(signerAddress).toEqual(ethers.utils.computeAddress(wallet.publicKey));

        try {
            // invalid calls
            result = await bladeSdk.ethersSign(messageString, "invalid privateKey", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        try {
            result = await bladeSdk.ethersSign(123, privateKey, completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

    test('bladeSdk-common.splitSignature', async () => {
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
        try {
            result = await bladeSdk.splitSignature("invalid signature", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

    test('bladeSdk-common.getParamsSignature', async () => {
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
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

    test('bladeSdk-common.getC14url', async () => {
        let result;
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

        result = await bladeSdk.getC14url("1b487a96-a14a-47d1-a1e0-09c18d409671", "0.0.13421", "10", completionKey);
        checkResult(result);

        await bladeSdk.init(
            process.env.API_KEY,
            chainId,
            process.env.DAPP_CODE,
            process.env.VISITOR_ID,
            "Prod",
            sdkVersion,
            completionKey);

        try {
            result = await bladeSdk.getC14url("1b487a96-a14a-47d1-a1e0-09c18d409671", "0.0.13421", "10", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

    test('bladeSdk-common.exchangeGetQuotes', async () => {
        let result = await bladeSdk.init(
            process.env.API_KEY_MAINNET,
            KnownChainIds.HEDERA_MAINNET,
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

        try {
            result = await bladeSdk.exchangeGetQuotes("aaaaaaa", 0, "bbbbbb", "FFFF", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    }, 50_000);

    test('bladeSdk-common.swapTokens', async () => {
        let result;

        try {
            result = await bladeSdk.swapTokens("USDC", 0.00001, "HBAR", 0.5, "saucerswap", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId4ED25519, privateKeyED25519, completionKey);
        checkResult(result);

        // TODO check why this is failing (TOKEN_NOT_ASSOCIATED_TO_ACCOUNT)
        // result = await bladeSdk.swapTokens("USDC", 0.00001, "HBAR", 0.5, "saucerswap", completionKey);
        // checkResult(result);

        try {
            result = await bladeSdk.swapTokens(
                "USDC",
                0.00001,
                "HBAR",
                0.5,
                "unknown-service-id",
                completionKey
            );
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    }, 60_000);

    test('bladeSdk-common.getTradeUrl', async () => {
        let result = await bladeSdk.init(
            process.env.API_KEY_MAINNET,
            chainId,
            process.env.DAPP_CODE,
            process.env.VISITOR_ID,
            process.env.SDK_ENV,
            sdkVersion,
            completionKey);
        checkResult(result);

        // TODO check what is wrong with the following tests
        // result = await bladeSdk.getTradeUrl("buy", accountId, "EUR", 50, "HBAR", 0.5, "moonpay", completionKey);
        // checkResult(result);
        // expect(result.data).toHaveProperty("url");
        //
        // result = await bladeSdk.getTradeUrl("sell", accountId, "USDC", 50, "PHP", 0.5, "onmeta", completionKey);
        // checkResult(result);
        // expect(result.data).toHaveProperty("url");

        try {
            result = await bladeSdk.getTradeUrl("buy", accountId, "EUR", 50, "HBAR", 0.5, "unknown-service-id", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    }, 30_000);

}); // describe