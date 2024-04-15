
import { resolve as _resolve } from 'path';

export const entry = { JSWrapper: "./src/webView.ts" };
export const module = {
    rules: [
        {
            test: /\.tsx?$/,
            use: 'ts-loader',
            exclude: /node_modules/,
        },
    ]
};
export const output = {
    path: _resolve(__dirname, 'dist'),
    filename: "[name].bundle.js",
    library: "[name]",
    libraryTarget: "var"
};
export const devtool = "source-map";
export const resolve = {
    extensions: ['.tsx', '.ts', '.js'],
};
