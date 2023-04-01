import { BladeSDK } from './BladeSDK';
if (window) window["bladeSdk"] = new BladeSDK(true);

export { BladeSDK };
export { ParametersBuilder } from './ParametersBuilder';
