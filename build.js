import fs from 'fs';
import { ZipArchive } from 'archiver';

function buildExtension(buildType) {
    console.log(`Building extension for ${buildType}...`);
    let output;
    if (buildType === 'test') {
        output = fs.createWriteStream(`${process.env.npm_package_config_testdir}/kramden.zip`);
    } else {
        output = fs.createWriteStream('kramden.crx');
    }

    // const output = fs.createWriteStream('kramden.zip');
    const archive = new ZipArchive('zip', { zlib: { level: 9 } });

    output.on('close', () => console.log('Extension zipped successfully!'));
    archive.on('error', (err) => { throw err; });
    archive.pipe(output);

    archive.file('manifest.json', { name: 'manifest.json' });
    archive.file('EmailParsers/BaseEmailParser.js', { name: 'EmailParsers/BaseEmailParser.js' });
    archive.file('EmailParsers/DiceEmailParser.js', { name: 'EmailParsers/DiceEmailParser.js' });
    archive.file('EmailParsers/IndeedEmailParser.js', { name: 'EmailParsers/IndeedEmailParser.js' });
    archive.file('EmailParsers/MicrosoftEmailParser.js', { name: 'EmailParsers/MicrosoftEmailParser.js' });
    archive.file('EmailParsers/MonsterEmailParser.js', { name: 'EmailParsers/MonsterEmailParser.js' });
    archive.directory('options/', 'options');
    archive.directory('scripts/', 'scripts');
    archive.directory('content-scripts/', 'content-scripts');
    archive.directory('popup/', 'popup');
    archive.finalize();
};

const buildType = process.argv[2] || 'production';
buildExtension(buildType);