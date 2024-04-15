import {Mnemonic, PrivateKey, HEDERA_PATH} from "@hashgraph/sdk";
import {AccountPrivateRecord, CryptoKeyType} from "../models/Common";
import {getAccountsFromPublicKey} from "./ApiService";
import {Network} from "../models/Networks";
import { ethers } from "ethers";
import StringHelpers from "../helpers/StringHelpers";
import {AccountInfo} from "../models/MirrorNode";

export const getAccountsFromMnemonic = async (mnemonicRaw: string, network: Network): Promise<AccountPrivateRecord[]> => {
    const mnemonic = await Mnemonic.fromString(mnemonicRaw
        .toLowerCase()
        .trim()
        .split(" ")
        .filter(word => word)
        .join(" ")
    );

    // derive to ECDSA Standard - find account
    // derive to ECDSA Legacy - find account
    // derive to ED25519 Standard - find account
    // derive to ED25519 Legacy - find account
    // return all records with account found. If no account show ECDSA Standard keys

    const records: AccountPrivateRecord[] = [];
    let key: PrivateKey;
    for (const keyType of Object.values(CryptoKeyType)) {
        for (let standard = 1; standard >= 0; standard--) {
            if (keyType === CryptoKeyType.ECDSA_SECP256K1) {
                if (standard) {
                    key = await mnemonic.toStandardECDSAsecp256k1PrivateKey();
                } else {
                    key = await mnemonic.toEcdsaPrivateKey();
                }
            } else {
                if (standard) {
                    key = await mnemonic.toStandardEd25519PrivateKey()
                } else {
                    key = await mnemonic.toEd25519PrivateKey();
                }
            }
            records.push(...await prepareAccountRecord(key, keyType, network))
        }
    }

    if (!records.length) {
        // if no accounts found derive to ECDSA Standard, and return record with empty address
        key = await mnemonic.toStandardECDSAsecp256k1PrivateKey();
        records.push(...await prepareAccountRecord(key, CryptoKeyType.ECDSA_SECP256K1, network, true))
    }

    return records;
};

export const getAccountsFromPrivateKey = async (privateKeyRaw: string, network: Network): Promise<AccountPrivateRecord[]> => {
    const privateKey = privateKeyRaw.toLowerCase().trim().replace("0x", "");
    const privateKeys: PrivateKey[] = [];
    if (privateKey.length >= 96) {
        // 96 chars - hex encoded ED25519 with DER header without 0x prefix
        // 100 chars - hex encoded ECDSA with DER header without 0x prefix
        privateKeys.push(PrivateKey.fromStringDer(privateKey));
    } else {
        // try to parse as ECDSA and ED25519 private key, and find account by public key
        privateKeys.push(
            PrivateKey.fromStringECDSA(privateKey),
            PrivateKey.fromStringED25519(privateKey)
        );
    }

    const records: AccountPrivateRecord[] = [];
    for (const key of privateKeys) {
        const keyType = key.type === "ED25519" ? CryptoKeyType.ED25519 : CryptoKeyType.ECDSA_SECP256K1;
        records.push(...await prepareAccountRecord(key, keyType, network))
    }
    return records;
};

async function prepareAccountRecord(privateKey: PrivateKey, keyType: CryptoKeyType, network: Network, force: boolean = false): Promise<AccountPrivateRecord[]> {
    const accounts: Partial<AccountInfo>[] = await getAccountsFromPublicKey(network, privateKey.publicKey);

    if (!accounts.length && force) {
        accounts.push({});
    }

    return accounts.map(record => {
        const evmAddress = keyType === CryptoKeyType.ECDSA_SECP256K1
            ? ethers.utils.computeAddress(`0x${privateKey.publicKey.toStringRaw()}`).toLowerCase()
            : record?.evm_address;
        return {
            privateKey: privateKey.toStringDer(),
            publicKey: privateKey.publicKey.toStringDer(),
            evmAddress: evmAddress || "",
            address: record?.account || "",
            path: StringHelpers.pathArrayToString(HEDERA_PATH),
            keyType
        }
    })
}