(() => {
    "use strict";

    /* eslint-disable no-console */
    /* global func, path */
    global.build = new function () {

        /**
         * Removes the content of the tmp and dist directory
         *
         * @returns {Promise}
         */
        const cleanPre = () => {
            return measureTime((resolve) => {
                func.remove([path.tmp + "*", path.dist + "*", "*.zip"]).then(() => {
                    return func.createFile(path.tmp + "info.txt", new Date().toISOString());
                }).then(() => {
                    resolve();
                });
            }, "Cleaned tmp and dist directories");
        };

        /**
         * Removes the tmp directory
         *
         * @returns {Promise}
         */
        const cleanPost = () => {
            return measureTime((resolve) => {
                func.remove([path.tmp]).then(() => {
                    resolve();
                });
            }, "Cleaned tmp directory");
        };

        /**
         * Copies the images to the dist directory
         *
         * @returns {Promise}
         */
        const img = () => {
            return measureTime((resolve) => {
                func.copy([path.src + "img/**/*"], [path.src + "**/*.xcf", path.src + "img/icon/dev/**"], path.dist, false).then(() => {
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
            return measureTime((resolve) => {
                func.minify([ // parse scss files
                    path.src + "scss/*.scss"
                ], path.dist + "css/").then(() => {
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
            return measureTime((resolve) => {
                func.concat( // concat extension javascripts
                    [
                        path.src + "js/helper/**/*.js",
                        path.src + "js/extension.js"
                    ],
                    path.tmp + "extension-merged.js"
                ).then(() => {
                    return func.concat( // concat background javascripts
                        [
                            path.src + "js/background/**/*.js",
                            path.src + "js/background.js"
                        ],
                        path.tmp + "background-merged.js"
                    );
                }).then(() => {
                    return func.concat( // concat settings javascripts
                        [
                            path.src + "js/lib/colorpicker.js",
                            path.src + "js/opts.js",
                            path.src + "js/settings/*.js",
                            path.src + "js/settings.js"
                        ],
                        path.tmp + "settings-merged.js"
                    );
                }).then(() => {
                    return func.concat( // concat newtab javascripts
                        [
                            path.src + "js/helper/entry.js",
                            path.src + "js/newtab/*.js",
                            path.src + "js/newtab.js"
                        ],
                        path.tmp + "newtab-merged.js"
                    );
                }).then(() => {
                    return func.replace({
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
                    return func.minify([
                        path.tmp + "extension.js",
                        path.tmp + "settings.js",
                        path.tmp + "background.js",
                        path.tmp + "newtab.js",
                        path.src + "js/opts.js",
                        path.src + "js/onboarding.js"
                    ], path.dist + "js/");
                }).then(() => {
                    return func.minify([
                        path.src + "js/lib/jsu.js",
                        path.src + "js/helper/i18n.js",
                        path.src + "js/helper/model.js",
                        path.src + "js/helper/utility.js",
                        path.src + "js/helper/checkbox.js",
                        path.src + "js/helper/template.js",
                        path.src + "js/helper/stylesheet.js",
                        path.src + "js/helper/font.js"
                    ], path.dist + "js/lib/");
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
                        urlPath: "Colorpicker/master/src/js/colorpicker.js"
                    },
                    {
                        file: "jsu.js",
                        urlPath: "jsu/master/src/js/jsu.js"
                    }
                ];

                const fetched = () => {
                    i++;
                    if (i === files.length) {
                        resolve();
                    }
                };

                files.forEach((obj) => {
                    measureTime((rslv) => {
                        func.getRemoteContent("https://raw.githubusercontent.com/Kiuryy/" + obj.urlPath).then((content) => {
                            func.createFile(path.src + "js/lib/" + obj.file, content).then(() => {
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
            return measureTime((resolve) => {
                func.replace({
                    [path.src + "html/settings.html"]: path.tmp + "html/settings.html",
                    [path.src + "html/newtab.html"]: path.tmp + "html/newtab.html",
                    [path.src + "html/intro.html"]: path.tmp + "html/intro.html"
                }, [
                    [/<\!\-\-\s*\[START\sREMOVE\]\s*\-\->[\s\S]*?<\!\-\-\s*\[END\sREMOVE\]\s*\-\->/mig, ""],
                    [/\/js\/helper\//ig, "/js/lib/"]
                ]).then(() => { // minify in dist directory
                    return func.minify([path.src + "html/**/*.html"], path.dist, false);
                }).then(() => {
                    return func.minify([path.tmp + "html/**/*.html"], path.dist + "html/");
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
            return measureTime((resolve) => {
                func.zipDirectory(path.dist, process.env.npm_package_name + "_" + process.env.npm_package_version + ".zip").then(resolve);
            }, "Created zip file from dist directory");
        };

        /**
         * Parses the json files and copies them to the dist directory
         *
         * @returns {Promise}
         */
        const json = () => {
            return measureTime((resolve) => {
                func.replace({ // parse manifest.json
                    [path.src + "manifest.json"]: path.tmp + "manifest.json"
                }, [
                    [/("content_scripts":[\s\S]*?"js":\s?\[)([\s\S]*?)(\])/mig, "$1\"js/lib/jsu.js\",\"js/opts.js\",\"js/extension.js\"$3"],
                    [/("background":[\s\S]*?"scripts":\s?\[)([\s\S]*?)(\])/mig, "$1\"js/lib/jsu.js\",\"js/background.js\"$3"],
                    [/("version":[\s]*")[^"]*("[\s]*,)/ig, "$1" + process.env.npm_package_version + "$2"],
                    [/("version_name":[\s]*")[^"]*("[\s]*,)/ig, "$1" + process.env.npm_package_versionName + "$2"],
                    [/(img\/icon\/)dev\/(.*\.png)/ig, "$1$2"]
                ]).then(() => { // minify in dist directory
                    return func.minify([path.tmp + "manifest.json", path.src + "_locales/**/*.json"], path.dist, false);
                }).then(() => {
                    resolve();
                });
            }, "Moved json files to dist directory");
        };

        /**
         * Updates the mininum Chrome version in the manifest.json to the current version - 4
         *
         * @returns {Promise}
         */
        const updateMinimumChromeVersion = () => {
            return measureTime((resolve) => {
                func.getRemoteContent("https://omahaproxy.appspot.com/all.json").then((content) => {
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
                        const minVersion = currentVersion - 4;

                        func.replace({ // update the min version in the manifest
                            [path.src + "manifest.json"]: path.src + "manifest.json"
                        }, [
                            [/("minimum_chrome_version":[\s]*")[^"]*("[\s]*,)/ig, "$1" + (minVersion) + "$2"]
                        ]).then(() => {
                            resolve("v" + minVersion);
                        });
                    }


                });
            }, "Updated minimum chrome version");
        };

        /**
         * Performs eslint checks for the build and src/js directories
         *
         * @returns {Promise}
         */
        const eslintCheck = async () => {
            for (const dir of ["build", "src/js"]) {
                await measureTime(async (resolve) => {
                    func.cmd("eslint --fix " + dir + "/**/*.js").then((obj) => {
                        if (obj.stdout && obj.stdout.trim().length > 0) {
                            console.error(obj.stdout);
                            process.exit(1);
                        }
                        resolve();
                    });
                }, "Performed eslint check for " + dir);
            }
        };

        /**
         *
         * @param {function} func
         * @param {string} msg
         * @returns {Promise}
         */
        const measureTime = (func, msg) => {
            return new Promise((resolve) => {
                const start = +new Date();
                new Promise(func).then((info) => {
                    const timeInfo = "[" + (+new Date() - start) + " ms]";
                    console.log(" - " + timeInfo + "" + (" ".repeat(10 - timeInfo.length)) + msg + (info ? (" -> " + info) : ""));
                    resolve();
                });
            });
        };

        /**
         *
         */
        this.release = () => {
            return new Promise((resolve) => {
                cleanPre().then(() => {
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
                    return cleanPost();
                }).then(() => {
                    resolve();
                });
            });
        };
    };
})();