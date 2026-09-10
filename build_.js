/*
  Copyright (c) 2026 Joseph Medley. All rights reserved.
  No part of this software may be used, copied, modified, or distributed
  without the express written permission of the author.
*/

/*
 * build_.js — webpack-based build of the Chrome extension.
 *
 * Unlike build.js (which zips the source tree verbatim), this script runs each
 * entry point through webpack so that emailparsers/ and extensionutils/ are
 * bundled into the files that use them. Output is emitted as native ES modules
 * (experiments.outputModule + scope hoisting), so the bundles are plain
 * import/export code rather than webpack's function-wrapped format. The zip
 * therefore contains only the three generated bundles plus static assets:
 *
 *   manifest.json
 *   scripts/background.js      <- bundled service worker
 *   popup/popup.{html,css,js}  <- popup.js bundled
 *   options/options.{html,css,js} <- options.js bundled (pulls in scripts/jobsview.js)
 *   _locales/**                <- en/messages.json transformed for test/beta
 *   images/**
 *
 * Usage: node build_.js [test|beta|prod]   (default: test)
 *
 * Only depends on packages already present: webpack and archiver.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import { ZipArchive } from 'archiver';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_OAUTH_CLIENT_ID =
    '652869451301-2bu30an73jm424a08ct7jr783eqhkao6.apps.googleusercontent.com';

const manifestJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

// Output directory: an npm-level override wins, otherwise package.json's
// `config.builddir` (the canonical source, and what `npm run` also reads).
// path.resolve leaves an absolute value untouched and resolves a relative one
// against the repo root.
const buildDir = path.resolve(
    __dirname,
    process.env.npm_package_config_builddir || packageJson.config?.builddir || 'build'
);

/* ------------------------------------------------------------------ helpers */

function getLocalizedMessages(buildType) {
    const messages = JSON.parse(
        fs.readFileSync(path.join(__dirname, '_locales/en/messages.json'), 'utf8')
    );
    if (buildType === 'test' || buildType === 'beta') {
        messages.extensionName.message += ` (${buildType.toUpperCase()}) ${Date.now()}`;
    }
    return messages;
}

function getManifest(buildType) {
    if (buildType === 'prod') {
        return manifestJson;
    }
    const manifest = structuredClone(manifestJson);
    manifest.oauth2.client_id = TEST_OAUTH_CLIENT_ID;
    if (buildType === 'test') {
        manifest.key = fs.readFileSync(path.join(__dirname, 'key'), 'utf8').trim();
    }
    return manifest;
}

/*
 * Strip every `<script src="...">` tag from an HTML page (the source pages
 * reference raw modules under ../extensionutils and ../scripts) and inject a
 * single module script pointing at the webpack bundle that sits next to it.
 */
function rewriteHtml(html, bundleName) {
    return html
        .replace(/[ \t]*<script\b[^>]*\bsrc=["'][^"']*["'][^>]*><\/script>\r?\n?/gi, '')
        .replace(/<\/body>/i, `  <script type="module" src="${bundleName}"></script>\n</body>`);
}

function walkFiles(dir, base = dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...walkFiles(full, base));
        } else {
            out.push({ full, rel: path.relative(base, full).split(path.sep).join('/') });
        }
    }
    return out;
}

/* ------------------------------------------------------------------ webpack */

function runWebpack(buildType, outDir) {
    const isProd = buildType === 'prod';
    const config = {
        mode: isProd ? 'production' : 'development',
        devtool: isProd ? false : 'source-map',
        context: __dirname,
        target: ['web', 'es2022'],
        // Emit native ES modules instead of webpack's function-wrapped bundle
        // format, so each output file is real `import`/`export` code with only
        // a minimal runtime.
        experiments: {
            outputModule: true,
        },
        entry: {
            'scripts/background': './scripts/background.js',
            'popup/popup': './popup/popup.js',
            'options/options': './options/options.js',
        },
        output: {
            path: outDir,
            filename: '[name].js',
            module: true,
            clean: true,
        },
        resolve: {
            extensions: ['.js'],
        },
        optimization: {
            minimize: isProd,
            // Concatenate each entry's imported modules into a single scope
            // (scope hoisting) rather than wrapping every module in a runtime
            // function. Combined with `output.module`, this drops nearly all of
            // webpack's __webpack_require__ plumbing from the output.
            concatenateModules: true,
            // Keep each entry self-contained; the extension loads these in
            // separate contexts (service worker / popup / options page).
            splitChunks: false,
            runtimeChunk: false,
        },
        performance: { hints: false },
        stats: 'errors-warnings',
    };

    return new Promise((resolve, reject) => {
        webpack(config, (err, stats) => {
            if (err) {
                reject(err);
                return;
            }
            console.log(stats.toString({ colors: true, modules: false, children: false }));
            if (stats.hasErrors()) {
                reject(new Error('webpack compilation failed'));
                return;
            }
            resolve();
        });
    });
}

/* -------------------------------------------------------------------- build */

async function buildExtension(buildType = 'test') {
    console.log(`Building extension for ${buildType} (webpack)...`);

    const outDir = path.join(buildDir, `webpack-${buildType}`);
    fs.mkdirSync(outDir, { recursive: true });

    await runWebpack(buildType, outDir);

    const filename =
        buildType === 'prod'
            ? path.join(buildDir, `kramden-${manifestJson.version}.zip`)
            : path.join(buildDir, `kramden-${buildType.toUpperCase()}.zip`);

    fs.mkdirSync(path.dirname(filename), { recursive: true });
    const output = fs.createWriteStream(filename);
    const archive = new ZipArchive('zip', { zlib: { level: 9 } });

    const done = new Promise((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
        archive.on('error', reject);
        archive.on('warning', reject);
    });
    archive.pipe(output);

    // manifest.json (transformed per build type)
    archive.append(JSON.stringify(getManifest(buildType), null, 4), { name: 'manifest.json' });

    // webpack output: bundles and any source maps
    for (const { full, rel } of walkFiles(outDir)) {
        archive.file(full, { name: rel });
    }

    // HTML pages, rewritten to load the bundle instead of raw modules
    archive.append(
        rewriteHtml(fs.readFileSync(path.join(__dirname, 'popup/popup.html'), 'utf8'), 'popup.js'),
        { name: 'popup/popup.html' }
    );
    archive.append(
        rewriteHtml(fs.readFileSync(path.join(__dirname, 'options/options.html'), 'utf8'), 'options.js'),
        { name: 'options/options.html' }
    );

    // Stylesheets (referenced relatively by the HTML pages)
    archive.file(path.join(__dirname, 'popup/popup.css'), { name: 'popup/popup.css' });
    archive.file(path.join(__dirname, 'options/options.css'), { name: 'options/options.css' });

    // Locales: copy the tree verbatim (preserving directory structure and any
    // additional locale folders), skipping en/messages.json, which is appended
    // below with the test/beta name transform. Mirrors build.js.
    archive.directory(path.join(__dirname, '_locales') + '/', '_locales', (entry) =>
        entry.name === 'en/messages.json' ? false : entry
    );
    archive.append(JSON.stringify(getLocalizedMessages(buildType), null, 4), {
        name: '_locales/en/messages.json',
    });

    // Static asset directories
    archive.directory(path.join(__dirname, 'images') + '/', 'images');
    const contentScripts = path.join(__dirname, 'content-scripts');
    if (fs.existsSync(contentScripts)) {
        archive.directory(contentScripts + '/', 'content-scripts');
    }

    await archive.finalize();
    await done;
    console.log(`Extension zipped successfully! -> ${filename}`);
}

const buildType = process.argv[2] || 'test';
buildExtension(buildType).catch((err) => {
    console.error(err);
    process.exit(1);
});
