/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/
import fs from 'fs';
import { ZipArchive } from 'archiver';
import packageJson from './package.json' with { type: 'json' };

function buildExtension(buildType) {
    console.log(`Building extension for ${buildType}...`);
    let output;
    if (buildType !== 'prod') {
        output = fs.createWriteStream(`${process.env.npm_package_config_builddir}/kramden-${buildType.toUpperCase()}-${packageJson.version}.zip`);
    } else {
        output = fs.createWriteStream(`${process.env.npm_package_config_builddir}/kramden-${packageJson.version}.zip`);
    }

    const archive = new ZipArchive('zip', { zlib: { level: 9 } });

    output.on('close', () => console.log('Extension zipped successfully!'));
    archive.on('error', (err) => { throw err; });
    archive.pipe(output);

    archive.file('manifest.json', { name: 'manifest.json' });
    archive.file('EmailParsers/index.js', { name: 'EmailParsers/index.js' });
    archive.file('EmailParsers/BaseEmailParser.js', { name: 'EmailParsers/BaseEmailParser.js' });
    archive.file('EmailParsers/DiceEmailParser.js', { name: 'EmailParsers/DiceEmailParser.js' });
    archive.file('EmailParsers/GlassdoorEmailParser.js', { name: 'EmailParsers/GlassdoorEmailParser.js' });
    archive.file('EmailParsers/HiringCafeEmailParser.js', { name: 'EmailParsers/HiringCafeEmailParser.js' });
    archive.file('EmailParsers/IndeedEmailParser.js', { name: 'EmailParsers/IndeedEmailParser.js' });
    archive.file('EmailParsers/LinkedInEmailParser.js', { name: 'EmailParsers/LinkedInEmailParser.js' });
    archive.file('EmailParsers/MonsterEmailParser.js', { name: 'EmailParsers/MonsterEmailParser.js' });
    archive.file('ExtensionUtils/data.js', { name: 'ExtensionUtils/data.js' });
    archive.file('ExtensionUtils/emailClient.js', { name: 'ExtensionUtils/emailClient.js' });
    archive.file('ExtensionUtils/utils.js', { name: 'ExtensionUtils/utils.js' });
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