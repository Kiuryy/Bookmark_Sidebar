#!/usr/bin/env node
/**
 * Prepares the localized descriptions for the Web Store listings (Chrome Web Store, Edge Add-ons), which can only be edited by hand in their dashboards
 * The texts are maintained in src/_locales/<lang>/messages.json (translated via the translation site like every other text):
 *   "extension_desc"           the short description of the manifest, which the Chrome Web Store shows above the long description
 *   "extension_webstore_desc"  the long description (removed from the extension bundle by build.mjs)
 * Edge Add-ons only shows the long description, so its text is "extension_desc" + "extension_webstore_desc", the Chrome text is the long one only.
 *
 * Writes every description to webstore/descriptions/{chrome,edge}/<lang>.txt and lists the languages which have to be updated in the dashboards,
 * by comparing them with the texts of the last update (webstore/published.json):
 *
 *   npm run extract-webstore-descriptions                                  list the changes
 *   npm run confirm-webstore-descriptions                                  after updating the dashboard: remember the current texts of all languages
 *   npm run extract-webstore-descriptions -- --mark-published=de,fr       … or only of the given ones
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const SHORT_KEY = "extension_desc";
const LONG_KEY = "extension_webstore_desc";
const STORES = {
    chrome: ({long}) => long,
    edge: ({short, long}) => `${short}\n\n${long}`
};
const DEFAULT_LANG = "en";

const dir = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(dir, "..", "src", "_locales");
const outputDir = path.join(dir, "descriptions");
const publishedFile = path.join(dir, "published.json");

const markArg = process.argv.slice(2).find((arg) => arg === "--mark-published" || arg.startsWith("--mark-published="));
const markLangs = markArg && markArg.includes("=") ? markArg.split("=")[1].split(",").map((lang) => lang.trim()).filter(Boolean) : null;

const hash = (text) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);

const texts = {}; // {short, long} per language, null if one of them is missing
const incomplete = {}; // lang -> the missing key, for languages with only one of them
fs.readdirSync(localesDir).sort().forEach((lang) => {
    const file = path.join(localesDir, lang, "messages.json");
    if (fs.existsSync(file)) {
        const messages = JSON.parse(fs.readFileSync(file, "utf8"));
        const short = messages[SHORT_KEY] ? messages[SHORT_KEY].message.trim() : null;
        const long = messages[LONG_KEY] ? messages[LONG_KEY].message.trim() : null;
        texts[lang] = short && long ? {short, long} : null;
        if (!!short !== !!long) {
            incomplete[lang] = short ? LONG_KEY : SHORT_KEY;
        }
    }
});

if (!texts[DEFAULT_LANG]) {
    console.error(`Missing "${SHORT_KEY}" or "${LONG_KEY}" in src/_locales/${DEFAULT_LANG}/messages.json`);
    process.exit(1);
}

const hashStores = (lang) => Object.fromEntries(Object.entries(STORES).map(([store, getText]) => [store, hash(getText(texts[lang]))])); // one hash per store, so only the dashboards with a changed text are listed

const published = fs.existsSync(publishedFile) ? JSON.parse(fs.readFileSync(publishedFile, "utf8")) : {};
const defaultHash = hash(`${texts[DEFAULT_LANG].short}\n${texts[DEFAULT_LANG].long}`);

if (markArg) {
    const langs = markLangs || Object.keys(texts).filter((lang) => texts[lang]);
    const unknown = langs.filter((lang) => !texts[lang]);
    if (unknown.length > 0) {
        console.error(`No description for: ${unknown.join(", ")}`);
        process.exit(1);
    }

    langs.forEach((lang) => {
        published[lang] = {hashes: hashStores(lang), defaultHash}; // defaultHash = the english text at that time, to detect outdated translations
    });

    const sorted = Object.fromEntries(Object.keys(published).sort().map((lang) => [lang, published[lang]]));
    fs.writeFileSync(publishedFile, JSON.stringify(sorted, null, 4) + "\n");
    console.log(`Marked as published: ${langs.join(", ")}`);
    process.exit(0);
}

fs.rmSync(outputDir, {recursive: true, force: true});
Object.keys(STORES).forEach((store) => fs.mkdirSync(path.join(outputDir, store), {recursive: true}));

const toUpdate = []; // {store, lang, reason}
const outdated = [];
const missing = [];

Object.entries(texts).forEach(([lang, text]) => {
    if (!text) {
        missing.push(lang);
        return;
    }

    const entry = published[lang];
    const hashes = hashStores(lang);

    Object.entries(STORES).forEach(([store, getText]) => {
        fs.writeFileSync(path.join(outputDir, store, `${lang}.txt`), getText(text) + "\n");

        if (!entry || !entry.hashes) {
            toUpdate.push({store, lang, reason: "not marked as published yet"});
        } else if (entry.hashes[store] !== hashes[store]) {
            toUpdate.push({store, lang, reason: "text changed"});
        }
    });

    if (entry && entry.hashes && lang !== DEFAULT_LANG && entry.defaultHash !== defaultHash && !toUpdate.some((item) => item.lang === lang)) {
        outdated.push(lang);
    }
});

const relOutputDir = path.relative(process.cwd(), outputDir);

if (toUpdate.length > 0) {
    const storeNames = {chrome: "Chrome Web Store", edge: "Edge Add-ons"};
    const files = toUpdate.map(({store, lang}) => `${relOutputDir}/${store}/${lang}.txt`);
    const width = Math.max(...files.map((file) => file.length));

    Object.keys(STORES).forEach((store) => {
        const items = toUpdate.map((item, i) => ({...item, file: files[i]})).filter((item) => item.store === store);
        if (items.length > 0) {
            console.log(`Update these descriptions in the ${storeNames[store]}:\n`);
            items.forEach(({lang, file, reason}) => {
                console.log(`  ${lang.padEnd(6)} ${file.padEnd(width)}  (${reason})`);
            });
            console.log("");
        }
    });
    console.log("Then run: npm run confirm-webstore-descriptions");
} else {
    console.log("All webstore descriptions are up to date.");
}

if (outdated.length > 0) { // the translation itself is unchanged, but it was made for an older version of the english text
    console.log(`\nThe english text changed since these translations were published, they may need an update on the translation site: ${outdated.join(", ")}`);
}

Object.entries(incomplete).forEach(([lang, key]) => {
    console.log(`\n${lang}: "${key}" is not translated yet, the description is skipped until it is`);
});

if (missing.length > 0) {
    console.log(`\nNot translated yet (${missing.length} languages): ${missing.join(", ")}`);
}
