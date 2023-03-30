# Blade-SDK.js

[![Build Status](https://github.com/Blade-Labs/blade-sdk.js/actions/workflows/node.js.yml/badge.svg)](https://github.com/Blade-Labs/blade-sdk.js/actions/workflows/node.js.yml)



## Getting Started

### Install

```
npm i @bladelabs/blade-sdk.js
```

## Use

```
import {BladeSDK} from '@bladelabs/blade-sdk.js';

...
const bladeSDK = new BladeSDK();
await bladeSDK.init("Blade apiKey", "testnet", "dAppCode", "client unique fingerprint");
const balance = await bladeSDK.getBalance("0.0.8235");
console.log(balance);
```

## Documentation

TODO - add link to documentation

## TODO

- [ ] Add documentation
- [ ] Add builder for contract call params
- [ ] Add JSDoc for `contractCallFunction` method
- [ ] Add JSDoc for `contractCallQueryFunction` method
- [ ] Add JSDoc for `getParamsSignature` method

## Publish bundle for other SDK repos

Some other SDKs ([Kotlin-Blade](https://github.com/Blade-Labs/kotlin-blade) and [Swift-Blade](https://github.com/Blade-Labs/swift-blade)) depend on this repo. To publish a new bundle to those repos, run the following command:

```
npm run publish:web-view
```

On repos create pull request from newly created branch `js/latest-build`
