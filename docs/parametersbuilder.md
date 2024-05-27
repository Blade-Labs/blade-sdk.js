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


# Contents

* [addAddress](parametersbuilder.md#addaddress)
* [addAddressArray](parametersbuilder.md#addaddressarray)
* [addBytes32](parametersbuilder.md#addbytes32)
* [addUInt8](parametersbuilder.md#adduint8)
* [addUInt64](parametersbuilder.md#adduint64)
* [addUInt64Array](parametersbuilder.md#adduint64array)
* [addInt64](parametersbuilder.md#addint64)
* [addUInt256](parametersbuilder.md#adduint256)
* [addUInt256Array](parametersbuilder.md#adduint256array)
* [addTuple](parametersbuilder.md#addtuple)
* [addTupleArray](parametersbuilder.md#addtuplearray)
* [addString](parametersbuilder.md#addstring)
* [addStringArray](parametersbuilder.md#addstringarray)
* [encode](parametersbuilder.md#encode)

# Methods

## addAddress



`addAddress(value: string | AccountId): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `string \| AccountId` |  |

#### Returns

`ParametersBuilder`


## addAddressArray



`addAddressArray(value: string[] | AccountId[]): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `string[] \| AccountId[]` |  |

#### Returns

`ParametersBuilder`


## addBytes32



`addBytes32(value: Uint8Array | number[]): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `Uint8Array \| number[]` |  |

#### Returns

`ParametersBuilder`


## addUInt8



`addUInt8(value: number): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `number` |  |

#### Returns

`ParametersBuilder`


## addUInt64



`addUInt64(value: BigNumber): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `BigNumber` |  |

#### Returns

`ParametersBuilder`


## addUInt64Array



`addUInt64Array(value: BigNumber[]): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `BigNumber[]` |  |

#### Returns

`ParametersBuilder`


## addInt64



`addInt64(value: BigNumber): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `BigNumber` |  |

#### Returns

`ParametersBuilder`


## addUInt256



`addUInt256(value: BigNumber): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `BigNumber` |  |

#### Returns

`ParametersBuilder`


## addUInt256Array



`addUInt256Array(value: BigNumber[]): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `BigNumber[]` |  |

#### Returns

`ParametersBuilder`


## addTuple



`addTuple(value: ParametersBuilder): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `ParametersBuilder` |  |

#### Returns

`ParametersBuilder`


## addTupleArray



`addTupleArray(value: ParametersBuilder[]): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `ParametersBuilder[]` |  |

#### Returns

`ParametersBuilder`


## addString



`addString(value: string): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `string` |  |

#### Returns

`ParametersBuilder`


## addStringArray



`addStringArray(value: string[]): ParametersBuilder`

#### Parameters

| Name | Type | Description |
|------|------| ----------- |
| `value` | `string[]` |  |

#### Returns

`ParametersBuilder`


## encode

Encodes the parameters to a base64 string, compatible with the methods of the BladeSDK

Calling this method is optional, as the BladeSDK will automatically encode the parameters if needed

`encode(): string`


#### Returns

`string`


