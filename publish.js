const shell = require('shelljs')

const dir = 'publish';
const sourcePaths = ['dist/*', 'index.html'];
const branch = 'js/latest-build';
const message = `build JS from ${Date().toString()}`;

const sdkConfigs = [
    {
        sdkName: 'kotlin',
        repoUrl: 'git@github.com:Blade-Labs/kotlin-blade.git',
        destinationPath: 'BladeSDK/src/main/assets',
    },
    {
        sdkName: 'swift',
        repoUrl: 'git@github.com:Blade-Labs/swift-blade.git',
        destinationPath: 'Sources/SwiftBlade/JS',
    },
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

    for (const sourcePath of sourcePaths) {
        shell.cp(`../../${sourcePath}`, destinationPath);
    }
    shell.exec(`git add ${destinationPath}`);
    shell.exec(`git commit -m "${message}"`);
    shell.exec(`git push --set-upstream origin ${branch} --force`);
    shell.cd('../..');
    shell.rm('-rf', `${dir}/${sdkName}`);
}
