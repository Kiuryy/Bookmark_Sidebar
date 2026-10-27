#!/usr/bin/env node
/**
 * Converts the recordings in demo/recordings/ (.mov with alpha) into .webm files (VP9 with alpha) next to them, via ffmpeg.
 * VP9 is the only codec Chrome and Edge play with transparency on every OS (HEVC with alpha only works on macOS).
 *
 *   node demo/convert-recordings.mjs [options]
 *
 *   --crf=24     VP9 quality from 0 to 63, lower = sharper + larger files (default 24)
 *   --force      convert again even if the .webm is newer than the .mov
 */
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "recordings");

const opts = {
    crf: "24",
    force: false
};

for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, "").split(/=(.*)/s);

    if (key === "crf" && value) {
        opts.crf = value;
    } else if (key === "force") {
        opts.force = true;
    } else {
        console.error(`Unknown argument: ${arg}`);
        process.exit(1);
    }
}

if (spawnSync("ffmpeg", ["-version"]).error) {
    console.error("ffmpeg not found, install it first (e.g. `brew install ffmpeg`)");
    process.exit(1);
}

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((file) => file.toLowerCase().endsWith(".mov")) : [];
if (files.length === 0) {
    console.log(`No .mov files in ${dir}`);
    process.exit(0);
}

let failed = 0;
for (const file of files) {
    const source = path.join(dir, file);
    const target = source.replace(/\.mov$/i, ".webm");

    if (!opts.force && fs.existsSync(target) && fs.statSync(target).mtimeMs >= fs.statSync(source).mtimeMs) {
        console.log(`${file}: up to date`);
        continue;
    }

    console.log(`${file} -> ${path.basename(target)}`);
    const result = spawnSync("ffmpeg", [
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", source, // ffmpeg decodes the alpha layer of HEVC with alpha since v8, ProRes 4444 works with any version
        "-an",
        "-pix_fmt", "yuva420p",
        "-c:v", "libvpx-vp9",
        "-crf", opts.crf,
        "-b:v", "0", // constant quality
        "-row-mt", "1",
        "-auto-alt-ref", "0", // alt-ref frames would drop the alpha channel
        target
    ], {stdio: "inherit"});

    if (result.status !== 0) {
        console.error(`${file}: conversion failed`);
        fs.rmSync(target, {force: true});
        failed++;
    }
}

process.exit(failed ? 1 : 0);
