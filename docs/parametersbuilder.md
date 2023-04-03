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

### Methods

- [constructor](parametersbuilder.md#constructor)
- [encode](parametersbuilder.md#encode)
- [addAddress](parametersbuilder.md#addaddress)
- [addAddressArray](parametersbuilder.md#addaddressarray)
- [addBytes32](parametersbuilder.md#addbytes32)
- [addUInt8](parametersbuilder.md#adduint8)
- [addUInt64](parametersbuilder.md#adduint64)
- [addUInt64Array](parametersbuilder.md#adduint64array)
- [addInt64](parametersbuilder.md#addint64)
- [addUInt256](parametersbuilder.md#adduint256)
- [addUInt256Array](parametersbuilder.md#adduint256array)
- [addTuple](parametersbuilder.md#addtuple)
- [addTupleArray](parametersbuilder.md#addtuplearray)
- [addString](parametersbuilder.md#addstring)
- [addStringArray](parametersbuilder.md#addstringarray)

## Methods

### constructor

▸ **new ParametersBuilder**()

___

### encode

▸ **encode**(): `string`

Encodes the parameters to a base64 string, compatible with the methods of the BladeSDK
Calling this method is optional, as the BladeSDK will automatically encode the parameters if needed

#### Returns

`string`

___

### addAddress

▸ **addAddress**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string` \| `default` |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

___

### addAddressArray

▸ **addAddressArray**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string`[] \| `default`[] |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

___

### addBytes32

▸ **addBytes32**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `number`[] \| `Uint8Array` |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

___

### addUInt8

▸ **addUInt8**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `number` |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

___

### addUInt64

▸ **addUInt64**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `BigNumber` |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

___

### addUInt64Array

▸ **addUInt64Array**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `BigNumber`[] |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

___

### addInt64

▸ **addInt64**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `BigNumber` |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

___

### addUInt256

▸ **addUInt256**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `BigNumber` |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

___

### addUInt256Array

▸ **addUInt256Array**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `BigNumber`[] |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

___

### addTuple

▸ **addTuple**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`ParametersBuilder`](parametersbuilder.md) |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

___

### addTupleArray

▸ **addTupleArray**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`ParametersBuilder`](parametersbuilder.md)[] |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

___

### addString

▸ **addString**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string` |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

___

### addStringArray

▸ **addStringArray**(`value`): [`ParametersBuilder`](parametersbuilder.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `string`[] |

#### Returns

[`ParametersBuilder`](parametersbuilder.md)

