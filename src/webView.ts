import { BladeSDK } from './BladeSDK';
import { ParametersBuilder } from './ParametersBuilder';
import {getContainer} from "./container";

const bladeContainer = getContainer(true);
if (window) window["bladeSdk"] = bladeContainer.get<BladeSDK>(BladeSDK);
if (window) window["ParametersBuilder"] = ParametersBuilder;

export { ParametersBuilder } from './ParametersBuilder';
export { SdkEnvironment } from './models/Common';
export { KnownChainIds } from './models/Chain';
export { BladeSDK } from './BladeSDK';
export { bladeContainer }
