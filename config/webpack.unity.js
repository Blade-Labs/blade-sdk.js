
var path = require('path')

module.exports = {
    entry: { JSUnityWrapper: "./src/unity.ts" },
    target: ["es5", "web"],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    configFile: "config/tsconfig.unity.json"
                }
            },
        ]
    },
    output: {
        // path: '/Users/gary/dev/unity/io.bladelabs.unity-sdk/Resources',
        filename: "[name].bundle.js",
        library: "[name]",
        libraryTarget: "var",
        chunkFormat: "module"
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
};
