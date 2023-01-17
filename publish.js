const shell = require('shelljs')

const dir = 'publish';
const sourcePath = 'dist/JSWrapper.bundle.js'
const branch = `js/build_${(new Date()).toLocaleDateString('en-UK').split('/').reverse().join('-')}`

const sdkConfigs = [
    {
        destinationPath: 'BladeSDK/src/main/assets',
        repoUrl: 'git@github.com:Blade-Labs/kotlin-blade.git',
        sdkName: 'kotlin'
    }
];


if (!shell.which('git')) {
    shell.echo('Sorry, this script requires git');
    shell.exit(1);
}

for (const {destinationPath, repoUrl, sdkName} of sdkConfigs) {
    shell.rm('-rf', `${dir}/${sdkName}`);
    shell.exec(`git clone ${repoUrl} ${dir}/${sdkName}`);
    shell.cd(`${dir}/${sdkName}`);
    shell.exec(`git checkout -b ${branch}`);
    shell.exec(`git pull origin ${branch}`);
    shell.cp(`../../${sourcePath}`, destinationPath);
    shell.exec(`git add ${destinationPath}`);
    shell.exec(`git commit -m "build JS from ${Date().toString()}"`);
    shell.exec(`git push --set-upstream origin ${branch}`);
    shell.rm('-rf', `../../${dir}/${sdkName}`);

}





// shell.rm('-rf', `${dir}/${sdkName}`);


//
// (async () => {
//     // console.log(await execShellCommand('git clone git@github.com:Blade-Labs/kotlin-blade.git'));
//     try {
//         console.log(await execShellCommand('pwd'));
//         console.log(shell.exec('pwd'))
//         console.log(await execShellCommand(`rm -rf ${dir}/${sdkName}`));
//
//         console.log(await execShellCommand(`git clone ${repoUrl} ${dir}/${sdkName}`));
//         console.log(await execShellCommand('ls'));
//         console.log(await execShellCommand('pwd'));
//     } catch (e) {
//         console.log("Catch exception", e);
//     }
//
// })();


function execShellCommand(cmd) {
    const exec = require('child_process').exec;
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            console.log('error', error);
            console.log('stdout', stdout);
            console.log('stderr', stderr);

            if (error) {
                console.warn(error);
                throw error;
            }
            if (stderr) {
                // return reject(stderr)
            }
            resolve(stdout);
        });
    });
}
