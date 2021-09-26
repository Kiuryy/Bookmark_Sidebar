(() => {
    "use strict";

    /* eslint-disable no-console */
    /* global Func, path */

    global.modulePath = __dirname + "/node_modules/";

    try {
        require("../node.js_Build/funcs");
    } catch (e) {
        if (e.code !== "MODULE_NOT_FOUND") {
            throw e;
        }
        console.error("Build script is missing. Please download from https://github.com/Kiuryy/node.js_Build");
        process.exit(1);
    }

    /**
     *
     * @type {Object}
     */
    let packageJson = {};

    /**
     * Starts building the application
     */
    const Build = () => {
        const start = +new Date();
        console.log("Building release...\n");

        loadPackageJson().then(() => {
            return Func.cleanPre();
        }).then(() => {
            return eslintCheck();
        }).then(() => {
            return updateMinimumChromeVersion();
        }).then(() => {
            return remoteJs();
        }).then(() => {
            return js();
        }).then(() => {
            return css();
        }).then(() => {
            return img();
        }).then(() => {
            return json();
        }).then(() => {
            return html();
        }).then(() => {
            return zip();
        }).then(() => {
            return Func.cleanPost();
        }).then(() => {
            console.log("\nRelease built successfully\t[" + (+new Date() - start) + " ms]");
        });
    };

    /*
     * ################################
     * BUILD FUNCTIONS
     * ################################
     */

    /**
     * Read the package.json of the project and parse its JSON content into an object
     *
     * @returns {*}
     */
    const loadPackageJson = () => {
        return Func.measureTime((resolve) => {
            const fs = require("fs");

            const rawData = fs.readFileSync("package.json");
            const parsedData = JSON.parse(rawData);

            if (parsedData) {
                packageJson = parsedData;
                packageJson.preamble = `(c) ${packageJson.author} under ${packageJson.license}`;
                resolve();
            } else {
                console.error("Could not load package.json");
                process.exit(1);
            }
        }, "Loaded package.json");
    };

    /**
     * Copies the images to the dist directory
     *
     * @returns {Promise}
     */
    const img = () => {
        return Func.measureTime((resolve) => {
            Func.copy([path.src + "img/**/*"], [path.src + "**/*.xcf", path.src + "img/icon/dev/**"], path.dist, false).then(() => {
                resolve();
            });
        }, "Moved image files to dist directory");
    };

    /**
     * Parses the scss files and copies the css files to the dist directory
     *
     * @returns {Promise}
     */
    const css = () => {
        return Func.measureTime((resolve) => {
            Func.minify([ // parse scss files
                path.src + "scss/**/*.scss"
            ], path.dist, false, packageJson.preamble).then(() => {
                resolve();
            });
        }, "Moved css files to dist directory");
    };

    /**
     * Parses the js files and copies them to the dist directory
     *
     * @returns {Promise}
     */
    const js = () => {
        return Func.measureTime((resolve) => {
            Func.concat( // concat extension javascripts
                [
                    path.src + "js/helper/**/*.js",
                    path.src + "js/extension.js"
                ],
                path.tmp + "extension-merged.js"
            ).then(() => {
                return Func.concat( // concat background javascripts
                    [
                        path.src + "js/background/**/*.js",
                        path.src + "js/background.js"
                    ],
                    path.tmp + "background-merged.js"
                );
            }).then(() => {
                return Func.concat( // concat settings javascripts
                    [
                        path.src + "js/lib/colorpicker.js",
                        path.src + "js/settings/*.js",
                        path.src + "js/settings.js"
                    ],
                    path.tmp + "settings-merged.js"
                );
            }).then(() => {
                return Func.concat( // concat newtab javascripts
                    [
                        path.src + "js/helper/entry.js",
                        path.src + "js/newtab/*.js",
                        path.src + "js/newtab.js"
                    ],
                    path.tmp + "newtab-merged.js"
                );
            }).then(() => {
                return Func.replace({
                    [path.tmp + "extension-merged.js"]: path.tmp + "extension.js",
                    [path.tmp + "background-merged.js"]: path.tmp + "background.js",
                    [path.tmp + "settings-merged.js"]: path.tmp + "settings.js",
                    [path.tmp + "newtab-merged.js"]: path.tmp + "newtab.js"
                }, [
                    [/}\)\(jsu\);[\s\S]*?\(\$\s*=>\s*{[\s\S]*?"use strict";/mig, ""]
                ]);
            }).then(() => { // delay execution, so the files are created properly before being used to minify
                return new Promise((rslv) => {
                    setTimeout(rslv, 1000);
                });
            }).then(() => {
                return Func.minify([
                    path.tmp + "extension.js",
                    path.tmp + "settings.js",
                    path.tmp + "background.js",
                    path.tmp + "newtab.js",
                    path.src + "js/opts.js",
                    path.src + "js/onboarding.js"
                ], path.dist + "js/", true, packageJson.preamble);
            }).then(() => {
                return Func.minify([
                    path.src + "js/lib/jsu.js",
                    path.src + "js/helper/i18n.js",
                    path.src + "js/helper/model.js",
                    path.src + "js/helper/utility.js",
                    path.src + "js/helper/checkbox.js",
                    path.src + "js/helper/template.js",
                    path.src + "js/helper/stylesheet.js",
                    path.src + "js/helper/font.js"
                ], path.dist + "js/lib/", true, packageJson.preamble);
            }).then(() => {
                resolve();
            });
        }, "Moved js files to dist directory");
    };

    /**
     * Retrieves the newest versions of the lib js files from Github
     *
     * @returns {Promise}
     */
    const remoteJs = () => {
        return new Promise((resolve) => {
            let i = 0;
            const files = [
                {
                    file: "colorpicker.js",
                    urlPath: "colorpicker.js/master/src/js/colorpicker.js"
                },
                {
                    file: "jsu.js",
                    urlPath: "jsu.js/master/src/js/jsu.js"
                }
            ];

            const fetched = () => {
                i++;
                if (i === files.length) {
                    resolve();
                }
            };

            files.forEach((obj) => {
                Func.measureTime((rslv) => {
                    Func.getRemoteContent("https://raw.githubusercontent.com/Kiuryy/" + obj.urlPath).then((content) => {
                        Func.createFile(path.src + "js/lib/" + obj.file, content).then(() => {
                            rslv();
                        });
                    }, rslv);
                }, "Fetched " + obj.file + " from Github").then(() => {
                    fetched();
                });
            });
        });
    };

    /**
     * Parses the html files and copies them to the dist directory
     *
     * @returns {Promise}
     */
    const html = () => {
        return Func.measureTime((resolve) => {
            Func.replace({
                [path.src + "html/settings.html"]: path.tmp + "html/settings.html",
                [path.src + "html/newtab.html"]: path.tmp + "html/newtab.html",
                [path.src + "html/intro.html"]: path.tmp + "html/intro.html"
            }, [
                [/<\!\-\-\s*\[START\sREMOVE\]\s*\-\->[\s\S]*?<\!\-\-\s*\[END\sREMOVE\]\s*\-\->/mig, ""],
                [/\/js\/helper\//ig, "/js/lib/"]
            ]).then(() => { // minify in dist directory
                return Func.minify([path.src + "html/**/*.html"], path.dist, false);
            }).then(() => {
                return Func.minify([path.tmp + "html/**/*.html"], path.dist + "html/");
            }).then(() => {
                resolve();
            });
        }, "Moved html files to dist directory");
    };

    /**
     * Generate zip file from dist directory
     *
     * @returns {Promise}
     */
    const zip = () => {
        return Func.measureTime((resolve) => {
            Func.zipDirectory(path.dist, packageJson.name + "_" + packageJson.versionName + ".zip").then(resolve);
        }, "Created zip file from dist directory");
    };

    /**
     * Parses the json files and copies them to the dist directory
     *
     * @returns {Promise}
     */
    const json = () => {
        return Func.measureTime((resolve) => {
            Func.replace({ // parse manifest.json
                [path.src + "manifest.json"]: path.tmp + "manifest.json"
            }, [
                [/("content_scripts":[\s\S]*?"js":\s?\[)([\s\S]*?)(\])/mig, "$1\"js/lib/jsu.js\",\"js/opts.js\",\"js/extension.js\"$3"],
                [/("background":[\s\S]*?"scripts":\s?\[)([\s\S]*?)(\])/mig, "$1\"js/lib/jsu.js\",\"js/opts.js\",\"js/background.js\"$3"],
                [/("version":[\s]*")[^"]*("[\s]*,)/ig, "$1" + packageJson.version + "$2"],
                [/("version_name":[\s]*")[^"]*("[\s]*,)/ig, "$1" + packageJson.versionName + "$2"],
                [/(img\/icon\/)dev\/(.*\.png)/ig, "$1$2"]
            ]).then(() => { // minify in dist directory
                return Func.minify([path.tmp + "manifest.json", path.src + "_locales/**/*.json"], path.dist, false);
            }).then(() => {
                resolve();
            });
        }, "Moved json files to dist directory");
    };

    /**
     * Updates the mininum Chrome version in the manifest.json to the current version - 5
     *
     * @returns {Promise}
     */
    const updateMinimumChromeVersion = () => {
        return Func.measureTime((resolve) => {
            Func.getRemoteContent("https://omahaproxy.appspot.com/all.json").then((content) => {
                const result = JSON.parse(content);
                let currentVersion = null;

                result.some((platform) => {
                    if (platform.os === "win64") {
                        platform.versions.some((info) => {
                            if (info.channel === "stable") {
                                currentVersion = +info.version.replace(/(\d+)\..*$/, "$1");
                                return true;
                            }
                        });
                        return true;
                    }
                });

                if (!currentVersion) {
                    console.error("Could not determine current Chrome version");
                    process.exit(1);
                } else {
                    const minVersion = currentVersion - 5;

                    Func.replace({ // update the min version in the manifest
                        [path.src + "manifest.json"]: path.src + "manifest.json"
                    }, [
                        [/("minimum_chrome_version":[\s]*")[^"]*("[\s]*,)/ig, "$1" + (minVersion) + "$2"]
                    ]).then(() => {
                        resolve("v" + minVersion);
                    });
                }
            });
        }, "Updated minimum chromium version");
    };

    /**
     * Performs eslint checks for the build and src/js directories
     *
     * @returns {Promise}
     */
    const eslintCheck = async () => {
        for (const files of ["build.js", path.src + "js/**/*.js"]) {
            await Func.measureTime(async (resolve) => {
                Func.cmd("eslint --fix " + files).then((obj) => {
                    if (obj.stdout && obj.stdout.trim().length > 0) {
                        console.error(obj.stdout);
                        process.exit(1);
                    }
                    resolve();
                });
            }, "Performed eslint check for " + files);
        }
    };

    //
    //
    //
    Build();
})();