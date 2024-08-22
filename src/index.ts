import {getContainer} from "./container";
import {BladeSDK as Blade} from "./BladeSDK";

export * from "./models/Common";
export * from "./models/Chain";
export * from "./models/Exchange";
export {ParametersBuilder} from "./ParametersBuilder";
export const BladeSDK = () => {
    return getContainer(false).get<Blade>(Blade);
}
