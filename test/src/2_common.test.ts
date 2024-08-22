import {PrivateKey} from "@hashgraph/sdk";
import {checkResult, completionKey} from "./helpers";
import {Buffer} from "buffer";
import config from "../../src/config";
import dotenv from "dotenv";
import fetch from "node-fetch";
import {ethers} from "ethers";
import {TextDecoder, TextEncoder} from "util";
import crypto from "crypto";
import {KnownChains} from "../../src/models/Chain";
const {BladeSDK, ParametersBuilder} = require("../../src/webView");

Object.defineProperty(global.self, "crypto", {
    value: {
        subtle: crypto.webcrypto.subtle
    }
});

Object.assign(global, {TextDecoder, TextEncoder, fetch});

dotenv.config();

describe("test COMMON functionality", () => {
    const bladeSdk = BladeSDK();

    const sdkVersion = `Kotlin@${config.numberVersion}`;

    const privateKey = process.env.PRIVATE_KEY || ""; // ECDSA
    const accountId = process.env.ACCOUNT_ID || "";
    const chainId = KnownChains.HEDERA_TESTNET; // KnownChainIds.ETHEREUM_SEPOLIA

    beforeEach(async () => {
        const result = await bladeSdk.init(
            process.env.API_KEY,
            chainId,
            process.env.DAPP_CODE,
            process.env.VISITOR_ID,
            process.env.SDK_ENV,
            sdkVersion,
            completionKey
        );
        checkResult(result);
    });

    test("bladeSdk-common.getCoinList", async () => {
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
            completionKey
        );
        checkResult(result);

        try {
            result = await bladeSdk.getCoinList(completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

    test("bladeSdk-common.getCoinPrice", async () => {
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

        result = await bladeSdk.getCoinPrice("0.0.0", "uah", completionKey);
        checkResult(result);
        expect(result.data.coin.symbol).toEqual("hbar");

        result = await bladeSdk.getCoinPrice("0x80008bcd713c38af90a9930288d446bc3bd2e684", "php", completionKey);
        checkResult(result);
        expect(result.data.coin.symbol).toEqual("karate");

        result = await bladeSdk.getCoinPrice(process.env.KARATE_TOKEN_ID, "", completionKey);
        checkResult(result);
        expect(result.data.coin.symbol).toEqual("karate");

        result = await bladeSdk.getCoinPrice("karate-combat", "usd", completionKey);
        checkResult(result);
        expect(result.data.coin.symbol).toEqual("karate");

        try {
            result = await bladeSdk.getCoinPrice("unknown token", "usd", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    }, 60_000);

    test("bladeSdk-common.splitSignature", async () => {
        const message = "hello";
        const wallet = new ethers.Wallet(PrivateKey.fromStringDer(privateKey).toStringRaw());
        const signature = await wallet.signMessage(Buffer.from(message));

        let result = await bladeSdk.splitSignature(signature, completionKey);
        checkResult(result);

        const v: number = result.data.v;
        const r: string = result.data.r;
        const s: string = result.data.s;
        expect(signature).toEqual(ethers.Signature.from({v, r, s}).serialized);



        // invalid signature
        try {
            result = await bladeSdk.splitSignature("invalid signature", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });
}); // describe
