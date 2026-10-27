#!/usr/bin/env node
/**
 * Launches Chrome or Edge with a fresh, empty profile and the unpacked extension from dist/ installed,
 * at a fixed window (or viewport) size — for reproducible screen recordings.
 *
 *   node demo/launch-browser.mjs [chrome|edge] [options]
 *
 *   --size=1024x768      window size (default 1024x768)
 *   --viewport           apply --size to the page viewport instead of the outer window
 *   --position=100,100   window position (default 100,100)
 *   --scale=2            force the device scale factor
 *   --lang=en            browser UI + accept language (default en)
 *   --dark / --light     force the color scheme
 *   --bookmarks=<file>   bookmarks to put into the profile (default demo/profile/bookmarks.js, "none" = empty)
 *   --storage=<file>     extension settings merged into the storage after the installation
 *                        (default demo/profile/extension-settings.js, "none" = extension defaults)
 *   --theme=<dir>        browser theme (default demo/theme, the same colors in Chrome and Edge, "none" = default look)
 *   --record[=<file>]    record the browser window (macOS, transparent rounded corners, video with alpha),
 *                        default file demo/recordings/<browser>-<date>.mov, stops when the browser is closed
 *   --record-fps=30      maximum frame rate of the recording (default 30)
 *   --record-scale=2     pixels per point of the recording (default: the one of the display, 1 = half the size on Retina)
 *   --record-codec=hevc  hevc (default, HEVC with alpha, small files) or prores (ProRes 4444 with alpha, huge files)
 *   --record-quality=0.9 HEVC quality from 0 to 1 (default 0.9)
 *
 * All folders are expanded in the sidebar, the profile is deleted when the browser is closed.
 * Next to the onboarding page, a second tab shows https://example.com/ with the content of demo/website/example.html
 * (a search page skeleton), https://example.com/images shows demo/website/example-images.html (a grid of colorful photos
 * to show off the transparency of the sidebar).
 * Branded Chrome ignores --load-extension since v137, so the extension is installed via the
 * DevTools protocol (Extensions.loadUnpacked), which requires --remote-debugging-pipe.
 * `npm run launch-demo:chrome` / `launch-demo:edge` build dist/ in demo mode first (placeholder titles and icons).
 */
import {spawn, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const browsers = {
    chrome: {
        darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        linux: "google-chrome",
        win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    },
    edge: {
        darwin: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        linux: "microsoft-edge",
        win32: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    }
};

// ---------------------------------------------------------------------------------------------------------------------
// Arguments

const opts = {
    browser: "chrome",
    size: "1024x720",
    position: "100,100",
    lang: "en",
    viewport: false,
    scale: null,
    colorScheme: null,
    bookmarks: path.join(root, "demo", "profile", "bookmarks.js"),
    storage: path.join(root, "demo", "profile", "extension-settings.js"),
    theme: path.join(root, "demo", "theme"),
    record: null,
    "record-fps": "30",
    "record-scale": null,
    "record-codec": "hevc",
    "record-quality": "0.9"
};

for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, "").split(/=(.*)/s);

    if (browsers[arg]) {
        opts.browser = arg;
    } else if (["size", "position", "lang", "scale", "bookmarks", "storage", "theme", "record-fps", "record-scale", "record-codec", "record-quality"].includes(key) && value) {
        opts[key] = value;
    } else if (key === "viewport") {
        opts.viewport = true;
    } else if (key === "dark" || key === "light") {
        opts.colorScheme = key;
    } else if (key === "record") {
        opts.record = value || true;
    } else {
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
    }
}

const [width, height] = opts.size.split("x").map(Number);
const [left, top] = opts.position.split(",").map(Number);

if (!width || !height || Number.isNaN(left) || Number.isNaN(top)) {
    console.error("Invalid --size (WIDTHxHEIGHT) or --position (X,Y)");
    process.exit(1);
}

// ---------------------------------------------------------------------------------------------------------------------
// Preparation

const extensionPath = path.join(root, "dist");
if (!fs.existsSync(path.join(extensionPath, "manifest.json"))) {
    console.error("dist/manifest.json not found, run `npm run build:chrome` first");
    process.exit(1);
}

/**
 * Compiles the window recorder (Swift + ScreenCaptureKit) when it's missing or older than its source
 */
const buildRecorder = () => {
    const source = path.join(root, "demo", "recorder", "record-window.swift");
    const recorderBinary = path.join(root, "demo", "recorder", ".build", "record-window");

    if (!fs.existsSync(recorderBinary) || fs.statSync(recorderBinary).mtimeMs < fs.statSync(source).mtimeMs) {
        console.log("Compiling the window recorder ...");
        fs.mkdirSync(path.dirname(recorderBinary), {recursive: true});
        const result = spawnSync("xcrun", ["swiftc", "-O", source, "-o", recorderBinary], {stdio: "inherit"});
        if (result.status !== 0) {
            console.error("Could not compile the recorder (requires Xcode or the Command Line Tools)");
            process.exit(1);
        }
    }
    return recorderBinary;
};

let recorderBinary = null;
if (opts.record) {
    const date = new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
    opts.record = path.resolve(opts.record === true ? path.join(root, "demo", "recordings", `${opts.browser}-${date}.mov`) : opts.record);

    if (process.platform !== "darwin") {
        console.error("--record is only supported on macOS");
        process.exit(1);
    }
    recorderBinary = buildRecorder();
    fs.mkdirSync(path.dirname(opts.record), {recursive: true});
}

const binary = browsers[opts.browser][process.platform];
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), `bs-${opts.browser}-`));
fs.mkdirSync(path.join(profileDir, "Default"));

// ---------------------------------------------------------------------------------------------------------------------
// Bookmarks, browser preferences + extension storage

const require = createRequire(import.meta.url);
const readFixture = (file) => file === "none" ? {} : require(path.resolve(file)); // .js (module.exports = {…}) or .json
const fixture = readFixture(opts.bookmarks);
const storage = readFixture(opts.storage);
const folderIds = [];

/**
 * Writes the fixture as the Bookmarks file of the profile. Ids, guids and the order are fixed,
 * the dates are relative to the launch (one minute apart), so relative date displays stay the same too
 */
const writeBookmarks = () => {
    let id = 3; // 1-3 = bookmark bar, other bookmarks, mobile bookmarks
    const now = (Date.now() + 11644473600000) * 1000; // microseconds since 1601-01-01
    const date = (n) => `${now - n * 60 * 1000 * 1000}`;
    const guid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

    const convert = (entries = []) => entries.map((entry) => {
        const n = ++id;
        const node = {date_added: date(n), date_last_used: "0", guid: guid(n), id: `${n}`, name: entry.title};

        if (entry.children) {
            folderIds.push(`${n}`);
            return {...node, children: convert(entry.children), date_modified: date(n), type: "folder"};
        }
        return {...node, type: "url", url: entry.url};
    });

    const rootFolder = (n, name, uuid, children) => {
        folderIds.push(`${n}`);
        return {children: convert(children), date_added: date(0), date_modified: "0", guid: uuid, id: `${n}`, name, type: "folder"};
    };

    const roots = {
        bookmark_bar: rootFolder(1, "Bookmarks bar", "0bc5d13f-2cba-5d74-951f-3f233fe6c908", fixture.bookmark_bar),
        other: rootFolder(2, "Other bookmarks", "82b081ec-3dd3-529c-8475-ab6c344590dd", fixture.other),
        synced: rootFolder(3, "Mobile bookmarks", "4cf2e351-0e85-532b-bb37-df045d8f8d0f", fixture.synced)
    };

    fs.writeFileSync(path.join(profileDir, "Default", "Bookmarks"), JSON.stringify({roots, version: 1}, null, 3));
};

writeBookmarks();

// browser preferences, e.g. to hide the Copilot button and the sign-in badge of Edge
const preferences = readFixture(path.join(root, "demo", "profile", "browser-settings.js"));
fs.writeFileSync(path.join(profileDir, "Default", "Preferences"), JSON.stringify(preferences[opts.browser] || {}));

// expand all folders in the sidebar
storage.local = storage.local || {};
storage.local.utility = {...storage.local.utility, openStates: Object.fromEntries(folderIds.map((id) => [id, true]))};

const flags = [
    `--user-data-dir=${profileDir}`,
    "--remote-debugging-pipe",
    "--enable-unsafe-extension-debugging",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-sync",
    "--disable-search-engine-choice-screen",
    "--hide-crash-restore-bubble",
    "--password-store=basic",
    "--use-mock-keychain",
    "--disable-features=Translate,MediaRouter,OptimizationHints,msEdgeFREOnFirstRun,msImplicitSignin",
    `--lang=${opts.lang}`,
    `--accept-lang=${opts.lang}`,
    `--window-size=${width},${height}`,
    `--window-position=${left},${top}`
];

if (opts.scale) {
    flags.push(`--force-device-scale-factor=${opts.scale}`);
}
if (opts.colorScheme === "dark") {
    flags.push("--force-dark-mode");
}
if (opts.colorScheme) {
    flags.push(`--blink-settings=preferredColorScheme=${opts.colorScheme === "dark" ? 0 : 1}`);
}

flags.push("about:blank");

// ---------------------------------------------------------------------------------------------------------------------
// Launch + DevTools protocol over the pipe (fd 3 = browser reads, fd 4 = browser writes, messages are \0-terminated)

const proc = spawn(binary, flags, {stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"]});
const [, , , pipeIn, pipeOut] = proc.stdio;

let messageId = 0;
const pending = new Map();
const listeners = [];
let buffer = "";

pipeOut.on("data", (chunk) => {
    buffer += chunk.toString();
    let end;
    while ((end = buffer.indexOf("\0")) !== -1) {
        const msg = JSON.parse(buffer.slice(0, end));
        buffer = buffer.slice(end + 1);

        if (msg.id && pending.has(msg.id)) {
            const {resolve, reject} = pending.get(msg.id);
            pending.delete(msg.id);
            msg.error ? reject(new Error(`${msg.error.message} (${msg.error.code})`)) : resolve(msg.result);
        } else if (msg.method) {
            listeners.forEach((fn) => fn(msg));
        }
    }
});
pipeIn.on("error", () => {}); // browser closed

const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, {resolve, reject});
    pipeIn.write(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}) + "\0");
});

const cleanup = () => fs.rmSync(profileDir, {recursive: true, force: true});

proc.on("error", (err) => {
    console.error(`Could not start ${binary}: ${err.message}`);
    cleanup();
    process.exit(1);
});
let recorder = null;
const recorderExited = new Promise((resolve) => {
    recorder = {resolve};
});

proc.on("exit", async () => {
    console.log("Browser closed");
    if (recorder.process) { // let the recorder finish the file
        if (recorder.process.exitCode === null) {
            recorder.process.kill("SIGINT");
        }
        await recorderExited;
    }
    cleanup();
    process.exit(0);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => proc.kill());
}

const getPageTarget = async () => {
    for (let i = 0; i < 50; i++) {
        const {targetInfos} = await send("Target.getTargets");
        const page = targetInfos.find((t) => t.type === "page");
        if (page) {
            return page;
        }
        await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("No page target found");
};

/**
 * Evaluates the given expression in the service worker of the extension
 */
const evaluateInWorker = async (extensionId, expression) => {
    const {targetInfos} = await send("Target.getTargets");
    const worker = targetInfos.find((t) => t.type === "service_worker" && t.url.startsWith(`chrome-extension://${extensionId}/`));
    if (!worker) {
        throw new Error("Service worker of the extension not found");
    }

    const {sessionId} = await send("Target.attachToTarget", {targetId: worker.targetId, flatten: true});
    const {exceptionDetails} = await send("Runtime.evaluate", {expression, awaitPromise: true}, sessionId);
    await send("Target.detachFromTarget", {sessionId});

    if (exceptionDetails) {
        throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    }
};

/**
 * Deep merges the storage fixture into the storage of the extension,
 * has to run after the installation, since the install handler rewrites the stored settings
 */
const writeStorage = (extensionId) => evaluateInWorker(extensionId, `(async (fixture) => {
    const merge = (a, b) => {
        for (const [k, v] of Object.entries(b)) {
            a[k] = v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" ? merge(a[k], v) : v;
        }
        return a;
    };
    for (const [area, values] of Object.entries(fixture)) {
        const stored = await chrome.storage[area].get(Object.keys(values));
        await chrome.storage[area].set(merge(stored, values));
    }
})(${JSON.stringify(storage)})`);

/**
 * Moves the tabs with the given url to the end (new tabs are inserted after the active one, which differs between the browsers)
 */
const moveToEnd = (extensionId, url) => evaluateInWorker(extensionId, `(async () => {
    const tabs = await chrome.tabs.query({url: ${JSON.stringify(url)}});
    await Promise.all(tabs.map((tab) => chrome.tabs.move(tab.id, {index: -1})));
})()`);

const setSize = async (targetId) => {
    const {windowId} = await send("Browser.getWindowForTarget", {targetId});
    const bounds = {left, top, width, height};

    await send("Browser.setWindowBounds", {windowId, bounds: {windowState: "normal"}});
    await send("Browser.setWindowBounds", {windowId, bounds});

    if (opts.viewport) { // measure the browser UI around the page and add it to the window size
        const {sessionId} = await send("Target.attachToTarget", {targetId, flatten: true});
        const {result} = await send("Runtime.evaluate", {
            expression: `new Promise((resolve) => {
                const check = () => innerWidth > 0 && innerHeight > 0 ? resolve([innerWidth, innerHeight]) : setTimeout(check, 50);
                check();
            })`,
            awaitPromise: true,
            returnByValue: true
        }, sessionId);
        await send("Target.detachFromTarget", {sessionId});

        const [innerWidth, innerHeight] = result.value;
        const {bounds: outer} = await send("Browser.getWindowBounds", {windowId});
        bounds.width = outer.width + width - innerWidth;
        bounds.height = outer.height + height - innerHeight;
        await send("Browser.setWindowBounds", {windowId, bounds});
    }

    return bounds;
};

/**
 * Replaces the responses of example.com with the local demo pages (the favicon and other files with a 404),
 * the requests are intercepted at the response stage, so the connection (and the security state) stays the real one
 */
const interceptExampleCom = async () => {
    const files = {"/": "example.html", "/images": "example-images.html"};
    const pages = Object.fromEntries(Object.entries(files).map(([pathname, file]) => {
        return [pathname, fs.readFileSync(path.join(root, "demo", "website", file)).toString("base64")];
    }));

    listeners.push((msg) => {
        if (msg.method !== "Fetch.requestPaused") {
            return;
        }
        const {requestId, request} = msg.params;
        const page = pages[new URL(request.url).pathname.replace(/(.)\/$/, "$1")]; // "/images/" = "/images"
        const isPage = !!page;
        send("Fetch.fulfillRequest", {
            requestId,
            responseCode: isPage ? 200 : 404,
            responseHeaders: [{name: "Content-Type", value: isPage ? "text/html; charset=utf-8" : "text/plain"}],
            body: isPage ? page : ""
        }).catch(() => {});
    });

    await send("Fetch.enable", {
        patterns: ["*://example.com/*", "*://www.example.com/*"].map((urlPattern) => ({urlPattern, requestStage: "Response"}))
    });
};

try {
    await send("Target.setDiscoverTargets", {discover: true});
    await interceptExampleCom();

    const introOpened = new Promise((resolve) => { // the extension opens the onboarding page after the installation
        listeners.push((msg) => {
            if (msg.method === "Target.targetCreated" && msg.params.targetInfo.url.endsWith("/html/intro.html")) {
                resolve(msg.params.targetInfo.targetId);
            }
        });
    });

    // the browser needs a window before the extension can be installed, the blank tab (and with it the info bubble
    // about the installed theme) is closed again below
    const blankTargetId = (await getPageTarget()).targetId;
    if (opts.theme !== "none") { // themes are extensions too, so they can be installed the same way
        fs.rmSync(path.join(path.resolve(opts.theme), "Cached Theme.pak"), {force: true}); // generated by Chrome, would be reused after changing the colors
        await send("Extensions.loadUnpacked", {path: path.resolve(opts.theme)});
    }
    const {id} = await send("Extensions.loadUnpacked", {path: extensionPath});

    const introTargetId = await Promise.race([introOpened, new Promise((r) => setTimeout(() => r(null), 5000))]);

    await writeStorage(id);
    if (introTargetId) { // the intro page was loaded with the default settings
        const {sessionId} = await send("Target.attachToTarget", {targetId: introTargetId, flatten: true});
        await send("Page.reload", {}, sessionId);
        await send("Target.detachFromTarget", {sessionId});
    }

    const {targetId: exampleTargetId} = await send("Target.createTarget", {url: "https://example.com/", background: true});
    await send("Target.closeTarget", {targetId: blankTargetId});
    await moveToEnd(id, "https://example.com/*");
    if (introTargetId) {
        await send("Target.activateTarget", {targetId: introTargetId});
    }

    const bounds = await setSize(introTargetId || exampleTargetId);

    console.log(`${opts.browser} running, extension ${id}`);
    console.log(`window ${bounds.width}x${bounds.height}${opts.viewport ? ` (viewport ${width}x${height})` : ""} at ${left},${top}`);
    console.log(`profile ${profileDir}`);

    if (opts.record) {
        recorder.process = spawn(recorderBinary, [
            `--pid=${proc.pid}`,
            `--output=${opts.record}`,
            `--fps=${opts["record-fps"]}`,
            `--codec=${opts["record-codec"]}`,
            `--quality=${opts["record-quality"]}`,
            ...(opts["record-scale"] ? [`--scale=${opts["record-scale"]}`] : [])
        ], {stdio: ["ignore", "inherit", "inherit"]});
        recorder.process.on("exit", (code, signal) => {
            if (code !== 0) {
                console.error(`Recorder failed (${signal || `exit code ${code}`}), no recording was saved`);
            }
            recorder.resolve();
        });
    }
    console.log("Close the browser or press Ctrl+C to quit");
} catch (err) {
    console.error(err.message);
    proc.kill();
}
