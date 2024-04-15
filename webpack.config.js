import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    path: path.resolve(__dirname, "dist"),
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
