import fs from 'fs';
import { ZipArchive } from 'archiver';
import packageJson from './package.json' with { type: 'json' };
import manifestJson from './manifest.json' with { type: 'json' };

function getLocalizedMessages(buildType) {
    const messages = JSON.parse(fs.readFileSync('_locales/en/messages.json', 'utf8'));
    if (buildType === 'test' || buildType === 'beta') {
        messages.extensionName.message += ` (${buildType.toUpperCase()}) ${Date.now()}`;
    }
    return messages;
}

function buildExtension(buildType = 'test') {
    console.log(`Building extension for ${buildType}...`);
    let filename;
    let output;
    switch (buildType) {
        case 'prod':
            filename = `${process.env.npm_package_config_builddir}/kramden-${manifestJson.version}.zip`
            output = fs.createWriteStream(filename);
            break;
        case 'beta':
        case 'test':
        default:
            filename = `${process.env.npm_package_config_builddir}/kramden-${buildType.toUpperCase()}.zip`
            output = fs.createWriteStream(filename);
            break;
    }

    const archive = new ZipArchive('zip', { zlib: { level: 9 } });

    output.on('close', () => console.log('Extension zipped successfully!'));
    archive.on('error', (err) => { throw err; });
    archive.on('warning', (err) => { throw err; });
    archive.pipe(output);

    switch (buildType) {
        case 'test':
        case 'beta': {
            const manifest = structuredClone(manifestJson);
            manifest.oauth2.client_id = '652869451301-2bu30an73jm424a08ct7jr783eqhkao6.apps.googleusercontent.com';
            if (buildType === 'test') {
                manifest.key = fs.readFileSync('key', 'utf8').trim();
            }
            archive.append(JSON.stringify(manifest, null, 4), { name: 'manifest.json' });
            break;
        }
        default:
            archive.file('manifest.json', { name: 'manifest.json' });
    }
    archive.file('emailparsers/index.js', { name: 'emailparsers/index.js' });
    archive.file('emailparsers/baseemailparser.js', { name: 'emailparsers/baseemailparser.js' });
    archive.file('emailparsers/builtinemailparser.js', { name: 'emailparsers/builtinemailparser.js' });
    archive.file('emailparsers/diceemailparser.js', { name: 'emailparsers/diceemailparser.js' });
    archive.file('emailparsers/glassdooremailparser.js', { name: 'emailparsers/glassdooremailparser.js' });
    archive.file('emailparsers/hiringcafeemailparser.js', { name: 'emailparsers/hiringcafeemailparser.js' });
    archive.file('emailparsers/indeedemailparser.js', { name: 'emailparsers/indeedemailparser.js' });
    archive.file('emailparsers/indeedmatchemailparser.js', { name: 'emailparsers/indeedmatchemailparser.js' });
    archive.file('emailparsers/jobrightemailparser.js', { name: 'emailparsers/jobrightemailparser.js' });
    archive.file('emailparsers/linkedinemailparser.js', { name: 'emailparsers/linkedinemailparser.js' });
    archive.file('emailparsers/microsoftemailparser.js', { name: 'emailparsers/microsoftemailparser.js' });
    archive.file('emailparsers/monsteremailparser.js', { name: 'emailparsers/monsteremailparser.js' });
    archive.file('extensionutils/auth.js', { name: 'extensionutils/auth.js' });
    archive.file('extensionutils/data.js', { name: 'extensionutils/data.js' });
    archive.file('extensionutils/utils.js', { name: 'extensionutils/utils.js' });
    archive.file('extensionutils/emailclient.js', { name: 'extensionutils/emailclient.js' });
    const messages = getLocalizedMessages(buildType);
    archive.append(JSON.stringify(messages, null, 4), { name: '_locales/en/messages.json' });
    archive.directory('_locales/', '_locales', (entry) => entry.name === 'en/messages.json' ? false : entry);
    archive.directory('content-scripts/', 'content-scripts');
    archive.directory('images/', 'images');
    archive.directory('options/', 'options');
    archive.directory('popup/', 'popup');
    archive.directory('scripts/', 'scripts');
    archive.finalize();
};

const buildType = process.argv[2] || 'test';
buildExtension(buildType);