import {associateToken, checkResult, completionKey, createToken, sleep} from "./helpers";
import ApiService from "../../src/services/ApiService";
import CryptoFlowService from "../../src/services/CryptoFlowService";
import ConfigService from "../../src/services/ConfigService";
import FeeService from "../../src/services/FeeService";
import config from "../../src/config";
import dotenv from "dotenv";
import fetch from "node-fetch";
import {TextDecoder, TextEncoder} from "util";
import crypto from "crypto";
import {
    AccountProvider,
    BalanceData,
    BridgeResponse,
    CreateAccountData,
    KeyRecord,
    KeyType,
    NFTStorageProvider,
    TokenBalanceData
} from "../../src/models/Common";
import {Network} from "../../src/models/Networks";
import AccountServiceContext from "../../src/strategies/AccountServiceContext";
import TokenServiceContext from "../../src/strategies/TokenServiceContext";
import SignServiceContext from "../../src/strategies/SignServiceContext";
import ContractServiceContext from "../../src/strategies/ContractServiceContext";
import TradeServiceContext from "../../src/strategies/TradeServiceContext";
import {KnownChainIds, CryptoKeyType} from "../../src/models/Chain";
import SignService from "../../src/services/SignService";
import {ethers} from "ethers";
import {
    AccountCreateTransaction,
    AccountId,
    Client,
    ContractCallQuery,
    Hbar,
    Mnemonic,
    PrivateKey
} from "@hashgraph/sdk";
import {isEqual} from "lodash";
import BigNumber from "bignumber.js";
import {TokenInfo} from "../../src/models/MirrorNode";
import {ParametersBuilder} from "../../src/ParametersBuilder";
import AuthService from "../../src/services/AuthService";

const {BladeSDK} = require("../../src/webView");

Object.defineProperty(global.self, "crypto", {
    value: {
        subtle: crypto.webcrypto.subtle
    }
});

Object.assign(global, {TextDecoder, TextEncoder, fetch});

dotenv.config();

describe("testing methods related to HEDERA network", () => {
    const apiService = new ApiService();
    const configService = new ConfigService(apiService);
    const authService = new AuthService(apiService, configService);
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
        authService,
        accountServiceContext,
        tokenServiceContext,
        signServiceContext,
        contractServiceContext,
        tradeServiceContext,
        cryptoFlowService,
        true
    );

    const sdkVersion = `Kotlin@${config.numberVersion}`;
    const accountId = process.env.ACCOUNT_ID || "";
    const privateKey = process.env.PRIVATE_KEY || ""; // ECDSA
    const privateKey2 = process.env.PRIVATE_KEY2 || ""; // ECDSA
    const accountId2 = process.env.ACCOUNT_ID2 || "";

    const privateKey1 = process.env.PRIVATE_KEY1 || "";
    const accountId1 = process.env.ACCOUNT_ID1;
    const privateKey3 = process.env.PRIVATE_KEY3 || "";
    const accountId3 = process.env.ACCOUNT_ID3 || "";
    const privateKey4 = process.env.PRIVATE_KEY_ED25519 || "";
    const accountId4 = process.env.ACCOUNT_ID_ED25519 || "";
    const tokenId0 = process.env.TOKEN_ID0 || "";
    const tokenId1 = process.env.TOKEN_ID1 || "";

    const chainId = KnownChainIds.HEDERA_TESTNET; // KnownChainIds.ETHEREUM_SEPOLIA

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

    test("bladeSdk-hedera.getBalance", async () => {
        let result;

        try {
            result = await bladeSdk.getBalance("", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);
        result = await bladeSdk.getBalance("", completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("balance");
        expect(result.data).toHaveProperty("rawBalance");
        expect(result.data).toHaveProperty("decimals");
        expect(result.data).toHaveProperty("tokens");
        expect(Array.isArray(result.data.tokens)).toEqual(true);
        expect(result.data.tokens.length > 0).toEqual(true);
        expect(result.data.tokens[0]).toHaveProperty("balance");
        expect(result.data.tokens[0]).toHaveProperty("decimals");
        expect(result.data.tokens[0]).toHaveProperty("name");
        expect(result.data.tokens[0]).toHaveProperty("symbol");
        expect(result.data.tokens[0]).toHaveProperty("address");
        expect(result.data.tokens[0]).toHaveProperty("rawBalance");

        result = await bladeSdk.getBalance(accountId2, completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("balance");
        expect(result.data).toHaveProperty("tokens");
        expect(Array.isArray(result.data.tokens)).toEqual(true);

        // invalid accountId
        try {
            result = await bladeSdk.getBalance("0.0.0", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    }, 60_000);

    test("bladeSdk-hedera.dropTokens", async () => {
        const accountResult = await bladeSdk.createAccount("", "device-id", completionKey);
        const account: CreateAccountData = accountResult.data;
        checkResult(accountResult);

        await bladeSdk.setUser(AccountProvider.PrivateKey, account.accountId, account.privateKey, completionKey);
        await sleep(7000);

        const successfulResult = await bladeSdk.dropTokens(account.accountId, process.env.NONCE, completionKey);
        checkResult(successfulResult);

        expect(successfulResult.data).toHaveProperty("status");
        expect(successfulResult.data).toHaveProperty("accountId");
        expect(successfulResult.data).toHaveProperty("redirectUrl");
        expect(successfulResult.data).toHaveProperty("dropStatuses");
        expect(Object.keys(successfulResult.data.dropStatuses).length).toBeGreaterThan(0);

        // const failedResult = await bladeSdk.dropTokens(account.accountId, process.env.NONCE, completionKey);
        // checkResult(failedResult, false);
    }, 60_000);

    test("bladeSdk-hedera.transferBalance", async () => {
        let result = await bladeSdk.getBalance(accountId, completionKey);
        checkResult(result);
        const hbars = result.data.balance;

        try {
            result = await bladeSdk.transferBalance(accountId2, "1.5", "custom memo text", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);

        result = await bladeSdk.transferBalance(accountId2, "1.5", "custom memo text", completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("transactionHash");
        expect(result.data).toHaveProperty("transactionId");

        // wait for balance update
        await sleep(20_000);

        result = await bladeSdk.getBalance(accountId, completionKey);
        checkResult(result);
        expect(hbars).not.toEqual(result.data.balance);

        try {
            // parseFloat exception
            result = await bladeSdk.transferBalance(accountId, "jhghjhgjghj", "custom memo text", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    }, 60_000);

    test("bladeSdk-hedera.transferTokens", async () => {
        const tokenName = "JEST Token Test";
        let result = await bladeSdk.getBalance(accountId, completionKey);
        checkResult(result);

        let tokenId: string | null = null;
        // for (let i = 0; i < result.data.tokens.length; i++) {
        for (const token of result.data.tokens as TokenBalanceData[]) {
            const tokenInfo = await apiService.requestTokenInfo(token.address);
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

        let account1Balance: BridgeResponse<BalanceData> = await bladeSdk.getBalance(accountId, completionKey);
        checkResult(account1Balance);
        const account1TokenBalance = account1Balance.data.tokens.find(token => token.address === tokenId)?.balance || 0;
        let account2Balance: BridgeResponse<BalanceData> = await bladeSdk.getBalance(accountId2, completionKey);
        checkResult(account2Balance);
        const account2TokenBalance = account2Balance.data.tokens.find(token => token.address === tokenId)?.balance || 0;

        const amount = 1;

        // invalid tokenId
        try {
            result = await bladeSdk.transferTokens(
                "invalid token id",
                accountId2,
                amount.toString(),
                "transfer memo",
                false,
                completionKey
            );
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        // no user
        try {
            result = await bladeSdk.transferTokens(
                tokenId.toString(),
                accountId2,
                amount.toString(),
                "transfer memo",
                false,
                completionKey
            );
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);

        result = await bladeSdk.transferTokens(
            tokenId.toString(),
            accountId2,
            amount.toString(),
            "transfer memo",
            true,
            completionKey
        );
        checkResult(result);
        expect(result.data).toHaveProperty("transactionHash");
        expect(result.data).toHaveProperty("transactionId");

        await sleep(20_000);

        account1Balance = await bladeSdk.getBalance(accountId, completionKey);
        checkResult(account1Balance);
        const account1TokenBalanceNew =
            parseFloat(account1Balance.data.tokens.find(token => token.address === tokenId)?.balance) || 0;
        account2Balance = await bladeSdk.getBalance(accountId2, completionKey);
        checkResult(account2Balance);
        const account2TokenBalanceNew =
            parseFloat(account2Balance.data.tokens.find(token => token.address === tokenId)?.balance) || 0;

        expect(account1TokenBalance).toEqual((account1TokenBalanceNew + amount).toString());
        expect(account2TokenBalance).toEqual((account2TokenBalanceNew - amount).toString());

        result = await bladeSdk.transferTokens(
            tokenId.toString(),
            accountId2,
            amount.toString(),
            "transfer memo",
            true,
            completionKey
        );
        checkResult(result);
    }, 120_000);

    test("bladeSdk-hedera.createAccount", async () => {
        let result;

        result = await bladeSdk.createAccount("", "device-id", completionKey);
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

        result = await bladeSdk.init(
            "wrong api key",
            chainId,
            process.env.DAPP_CODE,
            process.env.VISITOR_ID,
            process.env.SDK_ENV,
            sdkVersion,
            completionKey
        );
        checkResult(result);

        // fail on wrong api key
        try {
            result = await bladeSdk.createAccount("", "device-id", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    }, 60_000);

    test("bladeSdk-hedera.getAccountInfo", async () => {
        let result;
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
            expect("Code should not reach here").toEqual(accountInfo);
        } catch (accountInfo) {
            checkResult(accountInfo, false);
        }
        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);
        accountInfo = await bladeSdk.getAccountInfo("", completionKey);
        checkResult(accountInfo);

        try {
            accountInfo = await bladeSdk.getAccountInfo("0.0.9999999999999999999999999", completionKey);
            expect("Code should not reach here").toEqual(accountInfo);
        } catch (accountInfo) {
            checkResult(accountInfo, false);
        }
    }, 600_000);

    test("bladeSdk-hedera.deleteAccount", async () => {
        let result;

        result = await bladeSdk.createAccount("", "device-id", completionKey);
        checkResult(result);
        const newAccountId = result.data.accountId;
        const newPrivateKey = result.data.privateKey;

        try {
            result = await bladeSdk.deleteAccount(newAccountId, newPrivateKey, accountId, completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);

        result = await bladeSdk.deleteAccount(newAccountId, newPrivateKey, accountId, completionKey);
        checkResult(result);

        await sleep(15_000);
        result = await apiService.GET(Network.Testnet, `/accounts/${newAccountId}`);
        expect(result.deleted).toEqual(true);

        // invalid request (already deleted)
        try {
            result = await bladeSdk.deleteAccount(newAccountId, newPrivateKey, accountId, completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    }, 60_000);

    test("bladeSdk-hedera.getKeysFromMnemonic", async () => {
        let result;

        result = await bladeSdk.createAccount("", "device-id", completionKey);
        checkResult(result);

        const accountSample = {
            accountId: result.data.accountId,
            privateKey: result.data.privateKey,
            publicKey: result.data.publicKey,
            seedPhrase: result.data.seedPhrase,
            evmAddress: result.data.evmAddress
        };

        result = await bladeSdk.getKeysFromMnemonic(accountSample.seedPhrase, completionKey);
        checkResult(result);

        await sleep(7000);

        expect(result.data).toHaveProperty("accounts");
        expect(Array.isArray(result.data.accounts)).toEqual(true);
        expect(result.data.accounts.length).toBeGreaterThanOrEqual(1);
        expect(result.data.accounts[0]).toHaveProperty("privateKey");
        expect(result.data.accounts[0]).toHaveProperty("publicKey");
        expect(result.data.accounts[0]).toHaveProperty("address");
        expect(result.data.accounts[0]).toHaveProperty("evmAddress");
        expect(result.data.accounts[0]).toHaveProperty("path");
        expect(result.data.accounts[0]).toHaveProperty("keyType");
        expect(result.data.accounts[0].address).toEqual(accountSample.accountId);
        expect(result.data.accounts[0].keyType).toEqual("ECDSA_SECP256K1");

        try {
            result = await bladeSdk.getKeysFromMnemonic("invalid seed phrase", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.getKeysFromMnemonic((await Mnemonic.generate12()).toString(), completionKey);
        checkResult(result);
        expect(result.data.accounts.length).toBeGreaterThanOrEqual(1);
        expect(result.data.accounts[0].address).toEqual("");
    }, 60_000);

    test("bladeSdk-hedera.searchAccounts", async () => {
        let result;
        result = await bladeSdk.createAccount("", "device-id", completionKey);
        checkResult(result);

        const accountSample = {
            accountId: result.data.accountId,
            privateKey: result.data.privateKey,
            publicKey: result.data.publicKey,
            seedPhrase: result.data.seedPhrase,
            evmAddress: result.data.evmAddress
        };

        result = await bladeSdk.searchAccounts(accountSample.seedPhrase, completionKey);
        checkResult(result);

        await sleep(7000);

        expect(result.data).toHaveProperty("accounts");
        expect(Array.isArray(result.data.accounts)).toEqual(true);
        expect(result.data.accounts.length).toBeGreaterThanOrEqual(1);

        expect(result.data.accounts[0]).toHaveProperty("privateKey");
        expect(result.data.accounts[0]).toHaveProperty("publicKey");
        expect(result.data.accounts[0]).toHaveProperty("address");
        expect(result.data.accounts[0]).toHaveProperty("evmAddress");
        expect(result.data.accounts[0]).toHaveProperty("path");
        expect(result.data.accounts[0]).toHaveProperty("keyType");

        expect(result.data.accounts[0].address).toEqual(accountSample.accountId);
        expect(result.data.accounts[0].privateKey).toEqual(accountSample.privateKey);
        expect(result.data.accounts[0].publicKey).toEqual(accountSample.publicKey);
        expect(result.data.accounts[0].evmAddress).toEqual(accountSample.evmAddress);
        expect(result.data.accounts[0].keyType).toEqual(CryptoKeyType.ECDSA_SECP256K1);

        try {
            result = await bladeSdk.searchAccounts("invalid seed phrase", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        try {
            result = await bladeSdk.searchAccounts("0xinvalidPrivateKey", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.searchAccounts((await Mnemonic.generate12()).toString(), completionKey);
        checkResult(result);
        expect(result.data.accounts.length).toBeGreaterThanOrEqual(1);
        expect(result.data.accounts[0].address).toEqual("");   

        // ecdsa key without account
        result = await bladeSdk.searchAccounts("3030020100300706052b8104000a04220420b355ed04bf673f326da0935df005566646eb30481d08e81dc75fc9b9fda90a3f", completionKey);
        checkResult(result);
        expect(result.data.accounts.length).toEqual(0);

    }, 60_000);

    test("bladeSdk-hedera.getTransactions", async () => {
        let result;

        // make transaction
        try {
            result = await bladeSdk.transferBalance(accountId2, "1.5", "some tx memo", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);

        result = await bladeSdk.transferBalance(accountId2, "1.5", "some tx memo", completionKey);
        checkResult(result);

        expect(result.data).toHaveProperty("transactionHash");
        expect(result.data).toHaveProperty("transactionId");

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
        try {
            result = await bladeSdk.getTransactions("0.dgsgsdgdsgdsgdsg", "", "", "5", completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        // invalid tx
        result = await apiService.getTransaction(Network.Testnet, "wrong tx id");
        expect(Array.isArray(result));
        expect(result.length).toEqual(0);
    }, 600_000);

    test("bladeSdk-hedera.associateToken", async () => {
        let result;
        const mnemonic = await Mnemonic.generate12();
        const key = await mnemonic.toStandardECDSAsecp256k1PrivateKey();

        const operatorKey = PrivateKey.fromString(privateKey);

        const client = Client.forTestnet();
        client.setOperator(accountId, operatorKey);
        const receipt = await new AccountCreateTransaction()
            .setKey(key)
            .setAccountMemo("test association")
            .execute(client)
            .then((tx) => tx.getReceipt(client))

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, receipt.accountId.toString(), key.toStringDer(), completionKey);
        checkResult(result);
        result = await bladeSdk.associateToken(tokenId0, completionKey);
        checkResult(result);
        try {
            result = await bladeSdk.associateToken(tokenId0, completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        try {
            result = await bladeSdk.associateToken(tokenId1, completionKey);
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
            expect(result.error.reason.includes("INSUFFICIENT_PAYER_BALANCE")).toEqual(true);
        }
    }, 60_000);

    test("bladeSdk-hedera.createToken + nftMint + associateToken + transferTokens", async () => {
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
            {type: KeyType.feeSchedule, privateKey: feeScheduleKey}
        ];

        try {
            result = await bladeSdk.createToken(
                tokenName,
                tokenSymbol,
                true, // isNft
                keys,
                0, // decimals
                0, // initialSupply
                250, // maxSupply
                completionKey
            );
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(
            AccountProvider.PrivateKey,
            treasuryAccountId,
            treasuryPrivateKey,
            completionKey
        );
        checkResult(result);

        result = await bladeSdk.createToken(
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
        const tokenInfo: TokenInfo = await apiService.requestTokenInfo(tokenId);

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
        expect(tokenInfo.type).toEqual("NON_FUNGIBLE_UNIQUE");

        // associate token with receiver account
        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId2, privateKey2, completionKey);
        checkResult(result);

        result = await bladeSdk.associateToken(tokenId, completionKey);
        checkResult(result);

        await sleep(5_000);

        result = await bladeSdk.setUser(
            AccountProvider.PrivateKey,
            treasuryAccountId,
            treasuryPrivateKey,
            completionKey
        );
        checkResult(result);

        // MINT NFT
        result = await bladeSdk.nftMint(
            tokenId,
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAARUlEQVR42u3PMREAAAgEIO1fzU5vBlcPGtCVTD3QIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIXCyqyi6fIALs1AAAAAElFTkSuQmCC", // TODO upload file base64
            {
                author: "GaryDu"
            },
            {
                provider: NFTStorageProvider.nftStorage,
                apiKey: process.env.NFT_STORAGE_TOKEN
            },
            completionKey
        );
        checkResult(result);

        const serialNumber = result.data.serials[0];

        // TRANSFER NFT
        await sleep(20_000);

        result = await bladeSdk.transferTokens(
            tokenId,
            accountId2,
            serialNumber,
            "transfer NFT memo",
            false,
            completionKey
        );
        checkResult(result);
    }, 180_000);

    test("bladeSdk-hedera.contractCallFunction", async () => {
        let result;
        const contractId = process.env.CONTRACT_ID || "";
        expect(contractId).not.toEqual("");
        const client = Client.forTestnet();
        client.setOperator(accountId, privateKey);

        let message = `Hello test ${Math.random()}`;
        let params = new ParametersBuilder().addString(message);

        result = await bladeSdk.resetUser(completionKey);
        checkResult(result);

        try {
            result = await bladeSdk.contractCallFunction(
                contractId,
                "set_message",
                params,
                1000000,
                false,
                completionKey
            );
            expect("Code should not reach here1").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);

        // direct call
        result = await bladeSdk.contractCallFunction(contractId, "set_message", params, 1000000, false, completionKey);
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
        result = await bladeSdk.contractCallFunction(contractId, "set_message", params, 1000000, true, completionKey);
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
        params = new ParametersBuilder()
            .addString(message)
            .addTuple(new ParametersBuilder().addUInt64(BigNumber(num1)).addUInt64(BigNumber(num2)));
        result = await bladeSdk.contractCallFunction(
            contractId,
            "set_numbers",
            params.encode(),
            1000000,
            false,
            completionKey
        );
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
            params = new ParametersBuilder()
                .addString(message)
                .addAddress("0x65f17cac69fb3df1328a5c239761d32e8b346da0")
                .addAddressArray([accountId, accountId2])
                .addTuple(new ParametersBuilder().addUInt64(BigNumber(num1)).addUInt64(BigNumber(num2)));
            result = await bladeSdk.contractCallFunction(
                contractId,
                "set_numbers",
                params.encode(),
                1000000,
                false,
                completionKey
            );
            expect("Code should not reach here2").toEqual(result);
        } catch (result) {
            checkResult(result, false);
            expect(result.error.reason.includes("CONTRACT_REVERT_EXECUTED")).toEqual(true);
        }

        try {
            // fail on invalid json
            const paramsEncoded = '[{"type":"string",""""""""]';
            result = await bladeSdk.contractCallFunction(
                contractId,
                "set_numbers",
                paramsEncoded,
                1000000,
                false,
                completionKey
            );
            expect("Code should not reach here3").toEqual(result);
        } catch (result) {
            checkResult(result, false);
            expect(result.error.reason.includes("Unexpected token")).toEqual(true);
        }

        try {
            // fail on low gas
            params = new ParametersBuilder()
                .addString(message)
                .addTuple(new ParametersBuilder().addUInt64(BigNumber(num1)).addUInt64(BigNumber(num2)));
            result = await bladeSdk.contractCallFunction(contractId, "set_message", params, 1, false, completionKey);
            expect("Code should not reach here4").toEqual(result);
        } catch (result) {
            checkResult(result, false);
            expect(result.error.reason.includes("INSUFFICIENT_GAS")).toEqual(true);
        }
    }, 120_000);

    test('bladeSdk-hedera.contractCallQueryFunction', async () => {
        const contractId = process.env.CONTRACT_ID || "";
        expect(contractId).not.toEqual("");
        const client = Client.forTestnet();
        client.setOperator(accountId, privateKey);

        let result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);

        let message = `Hello DIRECT test ${Math.random()}`;
        let params = new ParametersBuilder().addString(message);

        result = await bladeSdk.contractCallFunction(contractId, "set_message", params, 100000, false, completionKey);
        checkResult(result);

        await sleep(10_000);
        // direct call
        params = new ParametersBuilder();
        result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, 100000, false, ["string"], completionKey);
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

        result = await bladeSdk.contractCallFunction(contractId, "set_message", params, 100000, true, completionKey);
        checkResult(result);

        await sleep(10_000);
        params = new ParametersBuilder();
        result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, 100000, true, ["string"], completionKey);
        checkResult(result);

        expect(Array.isArray(result.data.values)).toEqual(true);
        expect(result.data.values.length).toEqual(1);

        expect(result.data.values[0]).toHaveProperty("type");
        expect(result.data.values[0]).toHaveProperty("value");
        expect(result.data.values[0].type).toEqual("string");
        expect(result.data.values[0].value).toEqual(message);

        params = new ParametersBuilder();
        try {
            result = await bladeSdk.contractCallQueryFunction(contractId, "unknown function", params, 100000, true, ["string"], completionKey);
            expect("Code should not reach here1").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }


        try {
            result = await bladeSdk.contractCallQueryFunction(contractId, "unknown function", params, 100000, true, ["string"], completionKey);
            expect("Code should not reach here2").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }

        try {
            result = await bladeSdk.contractCallQueryFunction(contractId, "get_message", params, 100000, false, ["bytes32", "unknown-type"], completionKey);
            expect("Code should not reach here3").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    }, 620_000);

    test("bladeSdk-hedera.sign + signVerify", async () => {
        let result;
        const message = "hello";
        const messageString = Buffer.from(message).toString("base64");

        result = await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);
        checkResult(result);

        result = await bladeSdk.sign(messageString, "base64", completionKey);
        checkResult(result);
        expect(result.data).toHaveProperty("signedMessage");
        const signedMessage = result.data.signedMessage;

        result = await bladeSdk.sign(Buffer.from(message).toString("hex"), "hex", completionKey);
        checkResult(result);
        expect(result.data.signedMessage).toEqual(signedMessage);

        result = await bladeSdk.sign(message, "utf8", completionKey);
        checkResult(result);
        expect(result.data.signedMessage).toEqual(signedMessage);

        expect(result.data.signedMessage).toEqual(
            Buffer.from(PrivateKey.fromString(privateKey).sign(Buffer.from(message))).toString("hex")
        );

        let validationResult = await bladeSdk.verify(
            messageString,
            "base64",
            result.data.signedMessage,
            "",
            completionKey
        );
        checkResult(validationResult);
        expect(validationResult.data.valid).toEqual(true);

        validationResult = await bladeSdk.verify(
            messageString,
            "base64",
            result.data.signedMessage,
            PrivateKey.fromString(privateKey).publicKey.toStringRaw(),
            completionKey
        );
        checkResult(validationResult);
        expect(validationResult.data.valid).toEqual(true);

        validationResult = await bladeSdk.verify(
            messageString,
            "base64",
            result.data.signedMessage,
            "0x029dc73991b0d9cdbb59b2cd0a97a0eaff6de801726cb39804ea9461df6be2dd30",
            completionKey
        );
        checkResult(validationResult);
        expect(validationResult.data.valid).toEqual(true);

        validationResult = await bladeSdk.verify(
            messageString,
            "base64",
            result.data.signedMessage,
            accountId,
            completionKey
        );
        checkResult(validationResult);
        expect(validationResult.data.valid).toEqual(true);

        expect(
            PrivateKey.fromString(privateKey).publicKey.verify(
                Buffer.from(message),
                Buffer.from(result.data.signedMessage, "hex")
            )
        ).toEqual(true);

        try {
            result = await bladeSdk.verify(
                messageString,
                "base64",
                "invalid signature",
                "invalid publicKey",
                completionKey
            );
            expect("Code should not reach here").toEqual(result);
        } catch (result) {
            checkResult(result, false);
        }
    });

    test("bladeSdk-hedera.schedule", async () => {
        await bladeSdk.setUser(AccountProvider.PrivateKey, accountId, privateKey, completionKey);

        let result = await bladeSdk.createScheduleTransaction(
            false,
            "TRANSFER",
            [
                {
                    type: "HBAR",
                    sender: accountId,
                    receiver: accountId2,
                    value: Math.floor(Math.random() * 6000000)
                },
                {
                    type: "FT",
                    sender: accountId,
                    receiver: accountId2,
                    tokenId: tokenId0,
                    value: 1
                }
                // {
                //     type: "NFT",
                //     sender: accounts[1].accountId,
                //     receiver: accounts[2].accountId,
                //     tokenId: "0.0.3982458",
                //     serial: 4
                // },
            ],
            completionKey
        );
        checkResult(result);
        expect(result.data).toHaveProperty("scheduleId");
        const scheduleId = result.data.scheduleId;

        result = await bladeSdk.signScheduleId(scheduleId, false, accountId2, completionKey);
        checkResult(result);
    }, 60_000);
}); // describe
