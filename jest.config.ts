import type { Config } from "@jest/types";
import { FormData, File, Blob } from 'formdata-node';
import { TextEncoder, TextDecoder } from 'util';
// Sync object
const config: Config.InitialOptions = {
    verbose: true,
    transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "./tsconfig.json" }],
    },
    testEnvironment: "jsdom",
    setupFiles: ["core-js"],
    setupFilesAfterEnv: ["<rootDir>/test/src/helpers.ts"],
    maxConcurrency: 5,
    globals: {
        Uint8Array,
        ArrayBuffer,
        Request,
        FormData, File, Blob,
        TextEncoder, TextDecoder
    },
};
export default config;
