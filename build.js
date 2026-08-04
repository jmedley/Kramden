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
    archive.file('EmailParsers/index.js', { name: 'EmailParsers/index.js' });
    archive.file('EmailParsers/BaseEmailParser.js', { name: 'EmailParsers/BaseEmailParser.js' });
    archive.file('EmailParsers/DiceEmailParser.js', { name: 'EmailParsers/DiceEmailParser.js' });
    archive.file('EmailParsers/GlassdoorEmailParser.js', { name: 'EmailParsers/GlassdoorEmailParser.js' });
    archive.file('EmailParsers/HiringCafeEmailParser.js', { name: 'EmailParsers/HiringCafeEmailParser.js' });
    archive.file('EmailParsers/IndeedEmailParser.js', { name: 'EmailParsers/IndeedEmailParser.js' });
    archive.file('EmailParsers/LinkedInEmailParser.js', { name: 'EmailParsers/LinkedInEmailParser.js' });
    archive.file('EmailParsers/MonsterEmailParser.js', { name: 'EmailParsers/MonsterEmailParser.js' });
    archive.file('EmailParsers/JobrightEmailParser.js', { name: 'EmailParsers/JobrightEmailParser.js' });
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