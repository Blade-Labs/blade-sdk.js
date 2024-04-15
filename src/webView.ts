import { BladeSDK } from "./BladeSDK";
import { ParametersBuilder } from "./ParametersBuilder";

interface CustomWindow extends Window {
    bladeSdk: BladeSDK;
    ParametersBuilder: typeof ParametersBuilder;
}

declare const window: CustomWindow;

if (window) window.bladeSdk = new BladeSDK(true);
if (window) window.ParametersBuilder = ParametersBuilder;

export { BladeSDK };
export { ParametersBuilder };
export { AccountProvider } from "./models/Common";
