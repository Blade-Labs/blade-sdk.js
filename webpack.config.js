import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default {
    entry: {
        JSWrapper: "./src/webView.ts",
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    output: {
        path: path.resolve(dirname, "dist"),
        filename: "[name].bundle.js",
        library: "[name]",
        libraryTarget: "var",
    },
    devtool: "source-map",
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    optimization: {
        splitChunks: false,
    },
    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1,
        }),
    ],
};
