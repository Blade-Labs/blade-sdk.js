import {BladeSDK} from "./BladeSDK";
import {ParametersBuilder} from "./ParametersBuilder";
import {getContainer} from "./container";

const bladeContainer = getContainer(true);

interface CustomWindow extends Window {
    bladeSdk: BladeSDK;
    ParametersBuilder: typeof ParametersBuilder;
}

declare const window: CustomWindow;

if (window) window.bladeSdk = bladeContainer.get<BladeSDK>(BladeSDK);
if (window) window.ParametersBuilder = ParametersBuilder;

export * from "./models/Common";
export * from "./models/Chain";
export * from "./models/CryptoFlow";
export {ParametersBuilder} from "./ParametersBuilder";
export {BladeSDK} from "./BladeSDK";
export {bladeContainer};