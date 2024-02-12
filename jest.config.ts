import type {Config} from '@jest/types';
// Sync object
const config: Config.InitialOptions = {
    verbose: true,
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {tsconfig: './tsconfig.json'}
        ],
    },
    moduleNameMapper: {
        '^alchemy-sdk$': '<rootDir>node_modules/alchemy-sdk/dist/cjs/index.js',
    },
    testEnvironment: "jsdom",
    setupFiles: ["core-js"],
    setupFilesAfterEnv: ["<rootDir>/test/src/helpers.ts"],
    maxConcurrency: 5,
    globals: {
        Uint8Array: Uint8Array,
        ArrayBuffer: ArrayBuffer
    }
};
export default config;
