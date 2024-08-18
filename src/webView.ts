import {BladeSDK as Blade} from "./BladeSDK";
import {ParametersBuilder} from "./ParametersBuilder";
import {getContainer} from "./container";

const bladeContainer = getContainer(true);

interface CustomWindow extends Window {
    bladeSdk: Blade;
    ParametersBuilder: typeof ParametersBuilder;
}

declare const window: CustomWindow;

if (window) window.bladeSdk = bladeContainer.get<Blade>(Blade);
if (window) window.ParametersBuilder = ParametersBuilder;

export * from "./models/Common";
export * from "./models/Chain";
export * from "./models/CryptoFlow";
export {ParametersBuilder} from "./ParametersBuilder";
export const BladeSDK = () => {
    return bladeContainer.get<Blade>(Blade);
}
