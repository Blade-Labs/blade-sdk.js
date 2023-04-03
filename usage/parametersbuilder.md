# ParametersBuilder

## Class: ParametersBuilder

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

#### Methods

* [constructor](parametersbuilder.md#constructor)
* [addAddress](parametersbuilder.md#addaddress)
* [addAddressArray](parametersbuilder.md#addaddressarray)
* [addBytes32](parametersbuilder.md#addbytes32)
* [addInt64](parametersbuilder.md#addint64)
* [addString](parametersbuilder.md#addstring)
* [addStringArray](parametersbuilder.md#addstringarray)
* [addTuple](parametersbuilder.md#addtuple)
* [addTupleArray](parametersbuilder.md#addtuplearray)
* [addUInt256](parametersbuilder.md#adduint256)
* [addUInt256Array](parametersbuilder.md#adduint256array)
* [addUInt64](parametersbuilder.md#adduint64)
* [addUInt64Array](parametersbuilder.md#adduint64array)
* [addUInt8](parametersbuilder.md#adduint8)
* [encode](parametersbuilder.md#encode)

