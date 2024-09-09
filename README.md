# Blade-SDK.js

[![Build Status](https://github.com/Blade-Labs/blade-sdk.js/actions/workflows/node.js.yml/badge.svg)](https://github.com/Blade-Labs/blade-sdk.js/actions/workflows/node.js.yml)

## Disclaimer

Please note that the security of your private keys is your sole responsibility. Our JS SDK, which wraps Hedera SDK and Blade wallet API, has been developed to ensure the highest level of security possible. However, we do not take any responsibility for the security of your private keys. Please be aware that once someone else gains access to your private keys, they will have full control of your account, funds, tokens, and NFTs. We strongly recommend that you follow best practices for securing your private keys when using our SDK. Please be aware that private keys will never be sent over the network or shared with any third party through our SDK.

## Getting Started

### Requirements

- Node.js 16.x or higher (MacOS/Linux)
- Node.js 16.x to 18.x (Windows)

### Install

```
npm i @bladelabs/blade-sdk.js
```

## Usage

```
import {BladeSDK, SdkEnvironment, KnownChains} from '@bladelabs/blade-sdk.js';

...

const apiKey ="ygUgCzRrsvhWmb3dsLcApGnApSZ4tk8hBCmZqg9BngpuQYKsnD5m9FjfPV3tVBeB" // provided by BladeLabs team
const chain = KnownChains.HEDERA_TESTNET; // or HEDERA_MAINNET, ETHEREUM_SEPOLIA, ETHEREUM_MAINNET
const dAppCode = "your-dApp-code"; // provided by BladeLabs team
const visitorId = ""; // provide empty string and SDK will generate a new one. Otherwise consult with BladeLabs team first
const environment = SdkEnvironment.Prod; // or SdkEnvironment.CI

const bladeSdk = BladeSDK();
await bladeSDK.init(apiKey, chain, dAppCode, visitorId, environment);
await bladeSdk.setUser(AccountProvider.PrivateKey, "0.0.454464", "302e020100300506032b6570042204204323472EA5374E80B07346243234DEADBEEF25235235...")
const balance = await bladeSdk.getBalance("0.0.8235");
console.log(balance);
```

## Providing account credentials

To set active user please call `setUser()` method. Credentials provided will be stored in SDK memory and will be used for all SDK methods calls until you destroy instance of BladeSDK or call `resetUser()` or `setUser()` again. Currently `setUser()` support next user providers:
   1. `Magic` - [Magic.link](https://magic.link). Example: `setUser("Magic", "your_email@domain.com")`
   2. `PrivateKey` - enter `accountIdOrEmail` and `privateKey`. Example: `setUser("PrivateKey", "0.0.45467464", "302e020100300506032b6570042204204323472EA5374E80B07346243234DEADBEEF25235235...")`



## Documentation

[Blade-SDK.js documentation](SUMMARY.md).

For more information, please check our [Blade SDK Portal](https://docs.bladelabs.io/)  

## Contribution

Some other SDKs ([Kotlin-Blade](https://github.com/Blade-Labs/kotlin-blade) and [Swift-Blade](https://github.com/Blade-Labs/swift-blade)) depend on this repo. To publish a new bundle to those repos, run the following command:

```
npm run publish:web-view
```

On repos create pull request from newly created branch `js/latest-build`
