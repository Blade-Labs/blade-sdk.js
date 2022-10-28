
var path = require('path')

module.exports = {
    entry: { JSWrapper: "./index.js" },
    mode: "development",
    output: {
        path:  path.resolve(__dirname, 'dist'),
        filename: "[name].bundle.js",
        library: "[name]",
        libraryTarget: "var"
    }
};