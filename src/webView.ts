import { BladeSDK } from './BladeSDK';
import { ParametersBuilder } from './ParametersBuilder';
if (window) window["bladeSdk"] = new BladeSDK(true);
if (window) window["ParametersBuilder"] = ParametersBuilder;

export { BladeSDK };
export { ParametersBuilder };
export { AccountProvider } from './models/Common';
