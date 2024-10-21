var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: { JSUnityWrapper: "./src/unity.ts" },
    target: ["es5", "web"],
    optimization: {
        minimize: false,
    },
    module: {
        rules: [
            {
                test: /\.[t|j]sx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    configFile: "config/tsconfig.unity.json"
                }
            },
        ]
    },
    output: {
        path: '/Users/gary/dev/unity/io.bladelabs.unity-sdk/Resources',
        filename: "[name].txt",
        library: "[name]",
        libraryTarget: "var",
        chunkFormat: "module",
        publicPath: "/",
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            'process/browser': require.resolve('process/browser'),
            'browser': require.resolve('process/browser'),
            crypto: require.resolve('crypto-browserify'),
            buffer: require.resolve('buffer'),
            stream: require.resolve("stream-browserify"),
            vm: require.resolve('vm-browserify'),
        },
        alias: {
            process: "process/browser",
            brorand: path.resolve(__dirname, '../src/fallback/unity/brorand.js'),
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],
};
