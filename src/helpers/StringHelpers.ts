import {Network} from "../models/Networks";

export default class StringHelpers {
    static stringToNetwork(str: string): Network {
        return str[0].toUpperCase() + str.slice(1).toLowerCase() as Network;
    }

    static pathArrayToString(path: number[]): string {
        return `m/${path.join("'/")}`;
    }
}

