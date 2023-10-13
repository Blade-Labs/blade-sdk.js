import {getBladeConfig} from "./ApiService";

let config: any = null;

export const getConfig = async (key: string): Promise<string> => {
    if (!config) {
        config = await getBladeConfig();
    }
    if (config[key] !== undefined) {
        return config[key];
    }
    throw new Error(`Unknown key "${key}" in configService`);
};
