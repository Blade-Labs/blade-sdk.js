[blade-sdk.js](../README.md) / [Exports](../modules.md) / ParametersBuilder

# Class: ParametersBuilder

ParametersBuilder is a helper class to build contract function parameters

**`Example`**

```ts
const params = new ParametersBuilder()
   .addAddress("0.0.123")
   .addUInt8(42)
   .addBytes32([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F])
   .addString("Hello World")
   .addTuple(new ParametersBuilder().addAddress("0.0.456").addUInt8(42))
 ;
```

## Table of contents

### Constructors

- [constructor](ParametersBuilder.md#constructor)

### Properties

- [params](ParametersBuilder.md#params)

### Methods

- [addAddress](ParametersBuilder.md#addaddress)
- [addAddressArray](ParametersBuilder.md#addaddressarray)
- [addBytes32](ParametersBuilder.md#addbytes32)
- [addInt64](ParametersBuilder.md#addint64)
- [addString](ParametersBuilder.md#addstring)
- [addStringArray](ParametersBuilder.md#addstringarray)
- [addTuple](ParametersBuilder.md#addtuple)
- [addTupleArray](ParametersBuilder.md#addtuplearray)
- [addUInt256](ParametersBuilder.md#adduint256)
- [addUInt256Array](ParametersBuilder.md#adduint256array)
- [addUInt64](ParametersBuilder.md#adduint64)
- [addUInt64Array](ParametersBuilder.md#adduint64array)
- [addUInt8](ParametersBuilder.md#adduint8)
- [encode](ParametersBuilder.md#encode)

## Constructors

### constructor

• **new ParametersBuilder**()

## Properties

### params

• `Private` **params**: `ContractFunctionParameter`[] = `[]`

#### Defined in

[ParametersBuilder.ts:22](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L22)

## Methods

### addAddress

▸ **addAddress**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string` \| `default` |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:24](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L24)

___

### addAddressArray

▸ **addAddressArray**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string`[] \| `default`[] |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:29](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L29)

___

### addBytes32

▸ **addBytes32**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `number`[] \| `Uint8Array` |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:34](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L34)

___

### addInt64

▸ **addInt64**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `BigNumber` |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:61](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L61)

___

### addString

▸ **addString**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string` |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:86](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L86)

___

### addStringArray

▸ **addStringArray**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string`[] |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:91](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L91)

___

### addTuple

▸ **addTuple**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`ParametersBuilder`](ParametersBuilder.md) |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:76](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L76)

___

### addTupleArray

▸ **addTupleArray**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`ParametersBuilder`](ParametersBuilder.md)[] |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:81](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L81)

___

### addUInt256

▸ **addUInt256**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `BigNumber` |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:66](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L66)

___

### addUInt256Array

▸ **addUInt256Array**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `BigNumber`[] |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:71](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L71)

___

### addUInt64

▸ **addUInt64**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `BigNumber` |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:51](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L51)

___

### addUInt64Array

▸ **addUInt64Array**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `BigNumber`[] |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:56](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L56)

___

### addUInt8

▸ **addUInt8**(`value`): [`ParametersBuilder`](ParametersBuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `number` |

#### Returns

[`ParametersBuilder`](ParametersBuilder.md)

#### Defined in

[ParametersBuilder.ts:46](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L46)

___

### encode

▸ **encode**(): `string`

Encodes the parameters to a base64 string, compatible with the methods of the BladeSDK
Calling this method is optional, as the BladeSDK will automatically encode the parameters if needed

#### Returns

`string`

#### Defined in

[ParametersBuilder.ts:100](https://github.com/Blade-Labs/blade-sdk.js/blob/d6d0f60/src/ParametersBuilder.ts#L100)
