const crypto = require('crypto');
import {Buffer} from "buffer";

const CIPHER_IV_LENGTH = 12;
const CIPHER_KEY_LENGTH = 32;
const MAGIC_IV_INDEX = 3;

export const encrypt = async (data: string, token: string): Promise<string> => {
    const encoder = new TextEncoder();

    const ivStr = generateRandomString(CIPHER_IV_LENGTH);
    const iv = encoder.encode(ivStr);

    const tokenIdx = iv[MAGIC_IV_INDEX];
    const tokenArr = encoder.encode(token);
    const rawKey = new Uint8Array(CIPHER_KEY_LENGTH);
    for (let i = 0; i < CIPHER_KEY_LENGTH; i++) {
        rawKey[i] = tokenArr[(i + tokenIdx) % tokenArr.length]
    }
    const key = await crypto.subtle.importKey(
        "raw",
        rawKey,
        {
            name: "AES-GCM",
        },
        false,
        ["encrypt", "decrypt"]
    );

    const encoded = encoder.encode(data);

    const cipher = await crypto.subtle.encrypt({
        name: 'AES-GCM',
        iv,
    }, key, encoded);


    return btoa(
        ivStr + String.fromCharCode.apply(null, [...new Uint8Array(cipher)])
    );
}

export const encryptNode = async (data: string, token: string): Promise<string> => {
    const ivStr = generateRandomString(CIPHER_IV_LENGTH);
    const iv = Buffer.from(ivStr, 'utf8');

    const tokenIdx = iv[MAGIC_IV_INDEX];
    const tokenBuffer = Buffer.from(token, 'utf8');
    const rawKey = Buffer.alloc(CIPHER_KEY_LENGTH);
    for (let i = 0; i < CIPHER_KEY_LENGTH; i++) {
        rawKey[i] = tokenBuffer[(i + tokenIdx) % tokenBuffer.length];
    }
    const cipher = crypto.createCipheriv('aes-256-gcm', rawKey, iv);
    const nonceCiphertextTag = Buffer.concat([
        iv,
        cipher.update(data),
        cipher.final(),
        cipher.getAuthTag() // Fix: Get tag with cipher.getAuthTag() and concatenate: nonce|ciphertext|tag
    ]);
    return nonceCiphertextTag.toString('base64');
 };

export const decrypt = async (cipherStr: string, token: string): Promise<string> => {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const cipher = atob(cipherStr);
    const ivStr = cipher.substring(0, CIPHER_IV_LENGTH);
    const cipherDataStr = cipher.substring(CIPHER_IV_LENGTH);

    const iv = encoder.encode(ivStr);

    const tokenIdx = iv[MAGIC_IV_INDEX];
    const tokenArr = encoder.encode(token);
    const rawKey = new Uint8Array(CIPHER_KEY_LENGTH);
    for (let i = 0; i < CIPHER_KEY_LENGTH; i++) {
        rawKey[i] = tokenArr[(i + tokenIdx) % tokenArr.length]
    }

    const key = await crypto.subtle.importKey(
        "raw",
        rawKey,
        {
            name: "AES-GCM",
        },
        false,
        ["encrypt", "decrypt"]
    );

    const buffer = new ArrayBuffer(cipherDataStr.length);
    const bufferView = new Uint8Array(buffer);
    for (let i = 0; i < cipherDataStr.length; i++) {
        bufferView[i] = cipherDataStr.charCodeAt(i);
    }

    const deciphered = await window.crypto.subtle.decrypt({
        name: 'AES-GCM',
        iv,
    }, key, buffer);

    return decoder.decode(deciphered);
}

const generateRandomString = (length: number) => {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};
