import fs from 'fs';
import { ZipArchive } from 'archiver';
import packageJson from './package.json' with { type: 'json' };
import manifestJson from './manifest.json' with { type: 'json' };

function buildExtension(buildType) {
    console.log(`Building extension for ${buildType}...`);
    let output;
    if (buildType !== 'prod') {
        output = fs.createWriteStream(`${process.env.npm_package_config_builddir}/kramden-${buildType.toUpperCase()}-${manifestJson.version}.zip`);
    } else {
        output = fs.createWriteStream(`${process.env.npm_package_config_builddir}/kramden-${manifestJson.version}.zip`);
    }

    const archive = new ZipArchive('zip', { zlib: { level: 9 } });

    output.on('close', () => console.log('Extension zipped successfully!'));
    archive.on('error', (err) => { throw err; });
    archive.on('warning', (err) => { throw err; });
    archive.pipe(output);

    if (buildType !== 'prod') {
        const key = fs.readFileSync('key', 'utf8').trim();
        const manifestWithKey = {};
        for (const [name, value] of Object.entries(manifestJson)) {
            manifestWithKey[name] = value;
            if (name === 'version') {
                manifestWithKey.key = key;
            }
        }
        archive.append(JSON.stringify(manifestWithKey, null, 4), { name: 'manifest.json' });
    } else {
        archive.file('manifest.json', { name: 'manifest.json' });
    }
    archive.file('emailparsers/index.js', { name: 'emailparsers/index.js' });
    archive.file('emailparsers/baseemailparser.js', { name: 'emailparsers/baseemailparser.js' });
    archive.file('emailparsers/diceemailparser.js', { name: 'emailparsers/diceemailparser.js' });
    archive.file('emailparsers/glassdooremailparser.js', { name: 'emailparsers/glassdooremailparser.js' });
    archive.file('emailparsers/hiringcafeemailparser.js', { name: 'emailparsers/hiringcafeemailparser.js' });
    archive.file('emailparsers/indeedemailparser.js', { name: 'emailparsers/indeedemailparser.js' });
    archive.file('emailparsers/jobrightemailparser.js', { name: 'emailparsers/jobrightemailparser.js' });
    archive.file('emailparsers/linkedinemailparser.js', { name: 'emailparsers/linkedinemailparser.js' });
    archive.file('emailparsers/monsteremailparser.js', { name: 'emailparsers/monsteremailparser.js' });
    archive.file('extensionutils/data.js', { name: 'extensionutils/data.js' });
    archive.file('extensionutils/utils.js', { name: 'extensionutils/utils.js' });
    archive.file('extensionutils/emailclient.js', { name: 'extensionutils/emailclient.js' });
    archive.directory('_locales/', '_locales');
    archive.directory('content-scripts/', 'content-scripts');
    archive.directory('images/', 'images');
    archive.directory('options/', 'options');
    archive.directory('popup/', 'popup');
    archive.directory('scripts/', 'scripts');
    archive.finalize();
};

const buildType = process.argv[2] || 'production';
buildExtension(buildType);