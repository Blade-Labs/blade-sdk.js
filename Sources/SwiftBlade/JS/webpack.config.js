
var path = require('path')

module.exports = {
    entry: { JSWrapper: "./src/index.ts" },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ]
    },
    output: {
        path:  path.resolve(__dirname, 'dist'),
        filename: "[name].bundle.js",
        library: "[name]",
        libraryTarget: "var"
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
};