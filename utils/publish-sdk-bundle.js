import { which, echo, exit, rm, exec, cd, cp } from 'shelljs';

const dir = 'publish';
const sourcePaths = ['dist/*', 'assets/index.html'];
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


if (!which('git')) {
    echo('Sorry, this script requires git');
    exit(1);
}

for (const {destinationPath, repoUrl, sdkName} of sdkConfigs) {
    rm('-rf', `${dir}/${sdkName}`);
    exec(`git clone ${repoUrl} ${dir}/${sdkName}`);
    cd(`${dir}/${sdkName}`);
    exec(`git checkout -b ${branch}`);

    for (const sourcePath of sourcePaths) {
        cp(`../../${sourcePath}`, destinationPath);
    }
    exec(`git add ${destinationPath}`);
    exec(`git commit -m "${message}"`);
    exec(`git push --set-upstream origin ${branch} --force`);
    cd('../..');
    rm('-rf', `${dir}/${sdkName}`);
}
