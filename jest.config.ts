import type {Config} from '@jest/types';
// Sync object
const config: Config.InitialOptions = {
    verbose: true,
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    "testEnvironment": "jsdom",
    setupFilesAfterEnv: ["<rootDir>/test/src/helpers.ts"]
};
export default config;
