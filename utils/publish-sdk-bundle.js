const shell = require('shelljs')

const dir = 'publish';
const sourcePaths = [
    {
        path: 'dist/*',
        type: 'source'
    },
    {
        path: 'assets/index.html',
        type: 'asset'
    }
];
const branch = 'js/latest-build';
const message = `build JS from ${Date().toString()}`;

let plaftorms = [];
process.argv.forEach(function (val, index, array) {
    if (val.includes("--platforms=")) {
        plaftorms = val.split("--platforms=")[1].split(",");
    }
});


const sdkConfigs = [
    {
        sdkName: 'kotlin',
        repoUrl: 'git@github.com:Blade-Labs/kotlin-blade.git',
        destinationPath: 'BladeSDK/src/main/assets',
        assets: true,
        sources: true,
    },
    {
        sdkName: 'swift',
        repoUrl: 'git@github.com:Blade-Labs/swift-blade.git',
        destinationPath: 'Sources/SwiftBlade/JS',
        assets: true,
        sources: true,
    },
    {
        sdkName: 'unity',
        repoUrl: 'git@github.com:Blade-Labs/unity-blade.git',
        destinationPath: 'Resources',
        assets: false,
        sources: true,
    },
];

if (plaftorms.length === 0) {
    plaftorms = sdkConfigs.map(config => config.sdkName);
}
console.log("Platforms:", plaftorms);


if (!shell.which('git')) {
    shell.echo('Sorry, this script requires git');
    shell.exit(1);
}

for (const {destinationPath, repoUrl, sdkName, assets, sources} of sdkConfigs.filter(config => plaftorms.includes(config.sdkName))) {
    console.log(`Publishing ${sdkName} SDK...`);

    shell.rm('-rf', `${dir}/${sdkName}`);
    shell.exec(`git clone ${repoUrl} ${dir}/${sdkName}`);
    shell.cd(`${dir}/${sdkName}`);
    shell.exec(`git checkout -b ${branch}`);

    for (const sourcePath of sourcePaths) {
        if (sourcePath.type === 'asset' && assets || sourcePath.type === 'source' && sources) {
            shell.cp(`../../${sourcePath.path}`, destinationPath);
        }
    }
    shell.exec(`git add ${destinationPath}`);
    shell.exec(`git commit -m "${message}"`);
    shell.exec(`git push --set-upstream origin ${branch} --force`);
    shell.cd('../..');
    shell.rm('-rf', `${dir}/${sdkName}`);
}
