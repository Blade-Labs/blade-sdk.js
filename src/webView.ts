import { BladeSDK } from "./BladeSDK";
import { ParametersBuilder } from "./ParametersBuilder";
import { getContainer } from "./container";

const bladeContainer = getContainer(true);

interface CustomWindow extends Window {
    bladeSdk: BladeSDK;
    ParametersBuilder: typeof ParametersBuilder;
}

declare const window: CustomWindow;

if (window) window.bladeSdk = bladeContainer.get<BladeSDK>(BladeSDK);
if (window) window.ParametersBuilder = ParametersBuilder;

export { ParametersBuilder } from "./ParametersBuilder";
export { SdkEnvironment } from "./models/Common";
export { KnownChainIds } from "./models/Chain";
export { BladeSDK } from "./BladeSDK";
export { bladeContainer };
