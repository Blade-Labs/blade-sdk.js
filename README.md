# Blade-SDK.js

[![Build Status](https://github.com/Blade-Labs/blade-sdk.js/actions/workflows/node.js.yml/badge.svg)](https://github.com/Blade-Labs/blade-sdk.js/actions/workflows/node.js.yml)

## Disclaimer

Please note that the security of your private keys is your sole responsibility. Our JS SDK, which wraps Hedera SDK and Blade wallet API, has been developed to ensure the highest level of security possible. However, we do not take any responsibility for the security of your private keys. Please be aware that once someone else gains access to your private keys, they will have full control of your account, funds, tokens, and NFTs. We strongly recommend that you follow best practices for securing your private keys when using our SDK. Please be aware that private keys will never be sent over the network or shared with any third party through our SDK.

### Best practices for securing your private keys

Here are some examples of secure storage options for hex-encoded private keys for iOS, Android, and JavaScript:

#### iOS:

**Keychain**: iOS provides a secure Keychain service that allows you to store sensitive information, such as private keys, securely. You can use the Keychain API provided by Apple to store and retrieve private keys in a secure manner.

**Encrypted file**: You can store the private key in an encrypted file and save it to the device's file system. The file can be decrypted when needed using a password or passphrase.

#### Android:

**Android Keystore**: Android provides a secure hardware-backed Keystore service that allows you to store cryptographic keys securely. You can use the Android Keystore API provided by Google to store and retrieve private keys in a secure manner.

**Encrypted file**: Similar to iOS, you can store the private key in an encrypted file and save it to the device's file system. The file can be decrypted when needed using a password or passphrase.

#### JavaScript:

**Browser local storage**: You can store the private key in the browser's local storage, which provides a simple way to store data on the user's device. However, this is not the most secure option as the data can be accessed by other scripts running on the same page.

**Encrypted cookie**: You can store the private key in an encrypted cookie on the user's device. The cookie can be decrypted when needed using a password or passphrase. However, this is not the most secure option as cookies can be accessed by other scripts running on the same page.

It's important to note that these are just a few examples, and there may be other secure storage options available depending on your specific use case and requirements. It's recommended to consult with a security expert to determine the most appropriate storage solution for your needs.

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
import {BladeSDK} from '@bladelabs/blade-sdk.js';

...
const bladeSDK = new BladeSDK();
await bladeSDK.init("Blade apiKey", "testnet", "dAppCode", "client unique fingerprint or empty string", "Prod");
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

[Blade-SDK.js docs](SUMMARY.md)

## Publish bundle for other SDK repos

Some other SDKs ([Kotlin-Blade](https://github.com/Blade-Labs/kotlin-blade) and [Swift-Blade](https://github.com/Blade-Labs/swift-blade)) depend on this repo. To publish a new bundle to those repos, run the following command:

```
npm run publish:web-view
```

On repos create pull request from newly created branch `js/latest-build`
