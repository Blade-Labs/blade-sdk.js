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
import {BladeSDK, SdkEnvironment} from '@bladelabs/blade-sdk.js';

...

const apiKey = "ygUgCzRrsvhWmb3dsLcApGnApSZ4tk8hBCmZqg9BngpuQYKsnD5m9FjfPV3tVBeB" // provided by BladeLabs team
const network = "Mainnet"; // or "Testnet"
const dAppCode = "your-dApp-code"; // provided by BladeLabs team

const bladeSDK = new BladeSDK();
await bladeSDK.init(apiKey, network, dAppCode)
const balance = await bladeSDK.getBalance("0.0.8235");
console.log(balance);
```

## Providing account credentials

There are two ways passing `accountId` and `accountPrivateKey` arguments to the SDK methods:

1. Pass `accountId` and `accountPrivateKey` as parameters to the SDK methods as strings. Make sure that private keys contain DER prefix (like: `302e020100300506032b657004220420` and are hex-encoded)
2. Pass empty `accountId` and `accountPrivateKey` in case you called `setUser()` before. That credentials stored in SDK memory and will be used for all SDK methods calls until you destroy instance of BladeSDK or call `resetUser()` or `setUser()` again. Currently `setUser()` support next user providers:
   1. `Magic` - [Magic.link](https://magic.link). Example: `setUser("Magic", "your_email@domain.com")`
   2. `Hedera` - enter `accountId` and `accountPrivateKey`. Example: `setUser("Hedera", "0.0.45467464", "302e020100300506032b6570042204204323472EA5374E80B07346243234DEADBEEF25235235...")`

In case of calling method with `accountId` and `accountPrivateKey` arguments, SDK will override current user with this credentials.


## Documentation

[Blade-SDK.js documentation](SUMMARY.md).

For more information, please check our [Blade SDK Portal](https://docs.bladelabs.io/)  

## Contribution

Some other SDKs ([Kotlin-Blade](https://github.com/Blade-Labs/kotlin-blade) and [Swift-Blade](https://github.com/Blade-Labs/swift-blade)) depend on this repo. To publish a new bundle to those repos, run the following command:

```
npm run publish:web-view
```

On repos create pull request from newly created branch `js/latest-build`
