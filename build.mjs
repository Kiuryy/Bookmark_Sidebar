#!/usr/bin/env node
/**
 * Builds the extension into dist/ (the single source of truth for what ships)
 *
 *   node build.mjs --mode=build --target=chrome            dev build (source maps, version_name "Dev")
 *   node build.mjs --mode=build --target=chrome --demo     dev build with version_name "Demo", see $.opts.demoMode
 *   node build.mjs --mode=release --target=chrome,firefox  ESLint, re-downloads src/js/lib/*.js, minified + zipped
 */
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const SUPPORTED_CHROME_VERSIONS = 10;
const SUPPORTED_FIREFOX_VERSIONS = 1;

const rootDir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(rootDir);

//
// ARGUMENTS
//
const opts = {
    mode: "",
    targets: [],
    demo: false
};

for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, "").split(/=(.*)/s);

    if (key === "mode" && value) {
        opts.mode = value;
    } else if (key === "target" && value) {
        opts.targets = value.split(",").map((target) => target.trim()).filter(Boolean);
    } else if (key === "demo") {
        opts.demo = true;
    } else {
        console.error(`Unknown parameter: ${arg}`);
        process.exit(1);
    }
}

const isRelease = opts.mode === "release";

/**
 * Runs the given command and aborts the build if it fails,
 * binaries of the devDependencies are taken from node_modules/.bin, so the script also works outside of npm run
 */
const run = (cmd, args, {cwd = rootDir, errorMessage = null} = {}) => {
    const localBin = path.join(rootDir, "node_modules", ".bin", cmd);
    const result = spawnSync(fs.existsSync(localBin) ? localBin : cmd, args, {cwd, stdio: "inherit"});

    if (result.status !== 0) {
        console.error(errorMessage || `${cmd} failed${result.error ? `: ${result.error.message}` : ""}`);
        process.exit(1);
    }
};

const fetchText = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return response.text();
};

const listJs = (dir) => fs.readdirSync(dir).filter((file) => file.endsWith(".js")).sort().map((file) => `${dir}/${file}`);

const copy = (src, dest) => fs.cpSync(src, dest, {recursive: true, preserveTimestamps: true});


//
// PREPARE
//
fs.rmSync("dist", {recursive: true, force: true});
fs.mkdirSync("dist");


//
// TRANSLATION
//
copy("src/_locales", "dist/_locales");
for (const lang of fs.readdirSync("dist/_locales")) { // the description of the Web Store listings (see webstore/descriptions.mjs) is not used by the extension
    const file = `dist/_locales/${lang}/messages.json`;
    if (!fs.existsSync(file)) { // e.g. .DS_Store
        continue;
    }
    const messages = JSON.parse(fs.readFileSync(file, "utf8"));
    if (messages.extension_webstore_desc) {
        delete messages.extension_webstore_desc;
        fs.writeFileSync(file, JSON.stringify(messages, null, 4));
    }
}


//
// IMAGES
//
copy("src/img", "dist/img");


//
// VIDEOS
//
copy("src/video", "dist/video");


//
// SCSS
//
run("sass", ["src/scss:dist/css", ...(isRelease ? ["--style", "compressed"] : [])]);


//
// HTML
//
if (isRelease) {
    run("html-minifier-terser", ["--input-dir", "src/html", "--output-dir", "dist/html", "--collapse-whitespace", "--remove-comments", "--minify-js", "true"]);
} else {
    copy("src/html", "dist/html");
}


//
// JS
//
fs.mkdirSync("dist/js", {recursive: true});

if (isRelease) {
    run("eslint", ["--fix", "src/js", "demo", "webstore", "build.mjs", "eslint.config.mjs"], {errorMessage: "ESLint failed, aborting the release"});
    fs.writeFileSync("src/js/lib/jsu.js", await fetchText("https://raw.githubusercontent.com/Kiuryy/jsu.js/master/src/js/jsu.js"));
    fs.writeFileSync("src/js/lib/colorpicker.js", await fetchText("https://raw.githubusercontent.com/Kiuryy/colorpicker.js/master/src/js/colorpicker.js"));
}

const helperJs = listJs("src/js/helper");
const backgroundJs = listJs("src/js/background");
const newtabJs = listJs("src/js/newtab");
const settingsJs = listJs("src/js/settings");
const translationsJs = listJs("src/js/translations");

const pageHelperJs = ["src/js/defaults.js", "src/js/helper/i18n.js", "src/js/helper/font.js", "src/js/helper/stylesheet.js", "src/js/helper/template.js", "src/js/helper/utility.js", "src/js/helper/model.js"];

const bundles = { // load order matters: lib/jsu.js -> opts.js -> defaults.js -> helpers -> page script
    "background": ["src/js/background-prepare.js", "src/js/lib/jsu.js", "src/js/opts.js", "src/js/defaults.js", ...backgroundJs, "src/js/background.js"],
    "extension": ["src/js/webcomponents-bundle.js", "src/js/lib/jsu.js", "src/js/opts.js", "src/js/defaults.js", ...helperJs, "src/js/settings/importExport.js", "src/js/extension.js"],
    "sidepanel": ["src/js/lib/jsu.js", "src/js/opts.js", "src/js/sidepanel.js"],
    "onboarding": ["src/js/lib/jsu.js", "src/js/opts.js", ...pageHelperJs, "src/js/settings/dialog.js", "src/js/settings/video.js", "src/js/onboarding.js"],
    "settings": ["src/js/lib/jsu.js", "src/js/lib/colorpicker.js", "src/js/opts.js", ...pageHelperJs, "src/js/helper/checkbox.js", ...settingsJs, "src/js/settings.js"],
    "translations": ["src/js/lib/jsu.js", "src/js/opts.js", ...pageHelperJs, "src/js/helper/checkbox.js", "src/js/settings/dialog.js", ...translationsJs, "src/js/translations.js"],
    "newtab-preflight": ["src/js/newtab-preflight.js"],
    "newtab": ["src/js/lib/jsu.js", "src/js/opts.js", ...pageHelperJs, "src/js/helper/checkbox.js", "src/js/helper/entry.js", ...newtabJs, "src/js/newtab.js"]
};

for (const [name, files] of Object.entries(bundles)) {
    const terserOptions = isRelease ? ["--compress", "--mangle", "reserved=['jsu','chrome']"] : ["--source-map", `url='${name}.js.map'`];
    run("terser", [...files, ...terserOptions, "--output", `dist/js/${name}.js`]);
}


//
// MANIFEST
//
const extensionVersion = JSON.parse(fs.readFileSync("package.json", "utf8")).version;

for (const target of opts.targets) {
    const manifest = JSON.parse(fs.readFileSync(`src/manifest.${target}.json`, "utf8"));
    manifest.version = extensionVersion;

    if (target === "chrome") {
        const content = JSON.parse(await fetchText("https://versionhistory.googleapis.com/v1/chrome/platforms/win64/channels/stable/versions"));
        const latestChromeVersion = parseInt(content.versions[0].version.split(".")[0]);
        manifest.minimum_chrome_version = `${latestChromeVersion - SUPPORTED_CHROME_VERSIONS}`;

        if (opts.mode === "build") {
            manifest.version_name = opts.demo ? "Demo" : "Dev"; // demo mode (placeholder titles and icons), see $.opts.demoMode
        }
    } else if (target === "firefox") {
        const content = JSON.parse(await fetchText("https://product-details.mozilla.org/1.0/firefox_versions.json"));
        const latestFirefoxVersion = parseInt(content.LATEST_FIREFOX_VERSION.split(".")[0]);
        manifest.browser_specific_settings.gecko.strict_min_version = `${latestFirefoxVersion - SUPPORTED_FIREFOX_VERSIONS}.0`;
    }

    let manifestJson = JSON.stringify(manifest, null, 2) + "\n";
    if (isRelease) {
        manifestJson = manifestJson.replaceAll("icon/dev/", "icon/");
    }

    fs.writeFileSync(opts.mode === "build" ? "dist/manifest.json" : `dist/manifest.${target}.json`, manifestJson);
}


//
// ZIP
//
if (isRelease) {
    for (const file of fs.readdirSync(rootDir)) {
        if (file.endsWith(".zip")) {
            fs.rmSync(file);
        }
    }

    // source code
    const rootFiles = fs.readdirSync(rootDir).filter((file) => !file.startsWith(".") && fs.statSync(file).isFile());
    run("zip", ["source-code.zip", ...rootFiles]);
    run("zip", ["-r", "source-code.zip", "src"]);

    // extension code
    const distDirs = fs.readdirSync("dist").filter((file) => fs.statSync(`dist/${file}`).isDirectory());

    for (const target of opts.targets) {
        run("zip", ["-r", `../extension.${target}.zip`, ...distDirs], {cwd: "dist"});
        fs.copyFileSync(`dist/manifest.${target}.json`, "dist/manifest.json");
        run("zip", [`../extension.${target}.zip`, "manifest.json"], {cwd: "dist"});
        fs.rmSync("dist/manifest.json");
    }
}
