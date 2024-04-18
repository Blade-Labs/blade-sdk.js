import path from "path";
import { fileURLToPath } from "url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export const entry = { JSWrapper: "./src/webView.ts" };
export const module = {
    rules: [
        {
            test: /\.tsx?$/,
            use: "ts-loader",
            exclude: /node_modules/,
        },
    ],
};
export const output = {
    path: path.resolve(dirname, "dist"),
    filename: "[name].bundle.js",
    library: "[name]",
    libraryTarget: "var",
};
export const devtool = "source-map";
export const resolve = {
    extensions: [".tsx", ".ts", ".js"],
};

export default {
    entry,
    module,
    output,
    devtool,
    resolve,
};
