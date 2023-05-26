const fs = require('fs');

fs.writeFile('./src/config.ts', `// Autogenerated file. Please check utils/fixConfig.js

export default {
    sdkVersion: ${JSON.stringify("BladeSDK.js@" + process.env['SDK_VERSION'])},
};`, function (err) {
    if (err) throw err;
    console.log('Config updated');
});

