// eslint-disable-next-line @typescript-eslint/no-var-requires
const { writeFile } = require("fs");

writeFile(
    "./src/config.ts",
    `// Autogenerated file. Please check utils/fixConfig.js

export default {
    sdkVersion: ${JSON.stringify("BladeSDK.js@" + process.env.SDK_VERSION)},
    numberVersion: ${JSON.stringify(process.env.SDK_VERSION)},
};`,
    (err) => {
        if (err) throw err;
        // eslint-disable-next-line no-console
        console.log("Config updated");
    }
);
