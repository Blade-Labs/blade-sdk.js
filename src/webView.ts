import { BladeSDK } from './BladeSDK';
import { ParametersBuilder } from './ParametersBuilder';
import {getContainer} from "./container";

const bladeContainer = getContainer(true);
if (window) window["bladeSdk"] = bladeContainer.get<BladeSDK>(BladeSDK);
if (window) window["ParametersBuilder"] = ParametersBuilder;

export { bladeContainer };
export { ParametersBuilder };
