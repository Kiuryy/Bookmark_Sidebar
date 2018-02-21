(() => {
    "use strict";

    /* global func, path */
    global.build = new function () {

        /**
         * Removes the content of the tmp and dist directory
         *
         * @returns {Promise}
         */
        let cleanPre = () => {
            return new Promise((resolve) => {
                func.remove([path.tmp + "*", path.dist + "*"]).then(() => {
                    return func.createFile(path.tmp + "info.txt", new Date().toISOString());
                }).then(() => {
                    log("Cleaned tmp and dist directories");
                    resolve();
                });
            });
        };

        /**
         * Removes the tmp directory
         *
         * @returns {Promise}
         */
        let cleanPost = () => {
            return new Promise((resolve) => {
                func.remove([path.tmp]).then(() => {
                    log("Cleaned tmp directory");
                    resolve();
                });
            });
        };

        /**
         * Copies the images to the dist directory
         *
         * @returns {Promise}
         */
        let img = () => {
            return new Promise((resolve) => {
                func.copy([path.src + "img/**/*"], [path.src + "**/*.xcf", path.src + "img/icon/dev/**"], path.dist, false).then(() => {
                    log("Moved image files to dist directory");
                    resolve();
                });
            });
        };

        /**
         * Parses the scss files and copies the css files to the dist directory
         *
         * @returns {Promise}
         */
        let css = () => {
            return new Promise((resolve) => {
                func.minify([ // parse scss files
                    path.src + "scss/*.scss"
                ], path.dist + "css/").then(() => {
                    log("Moved css files to dist directory");
                    resolve();
                });
            });
        };

        /**
         * Parses the js files and copies them to the dist directory
         *
         * @returns {Promise}
         */
        let js = () => {
            return new Promise((resolve) => {
                Promise.all([
                    func.concat([ // concat extension javascripts
                        path.src + "js/helper/**/*.js",
                        path.src + "js/extension.js",
                        path.src + "js/init.js"
                    ],
                    path.tmp + "extension-merged.js"
                    ),
                    func.concat([ // concat background javascripts
                        path.src + "js/background/**/*.js",
                        path.src + "js/background.js"
                    ],
                    path.tmp + "background-merged.js"
                    ),
                    func.concat([ // concat settings javascripts
                        path.src + "js/lib/colorpicker.js",
                        path.src + "js/helper/checkbox.js",
                        path.src + "js/settings/*.js",
                        path.src + "js/settings.js"
                    ],
                    path.tmp + "settings-merged.js"
                    ),
                    func.concat([ // concat newtab javascripts
                        path.src + "js/helper/entry.js",
                        path.src + "js/newtab/*.js",
                        path.src + "js/newtab.js"
                    ],
                    path.tmp + "newtab-merged.js"
                    )
                ]).then(() => { // merge anonymous brackets
                    return func.replace({
                        [path.tmp + "extension-merged.js"]: path.tmp + "extension.js",
                        [path.tmp + "background-merged.js"]: path.tmp + "background.js",
                        [path.tmp + "settings-merged.js"]: path.tmp + "settings.js",
                        [path.tmp + "newtab-merged.js"]: path.tmp + "newtab.js"
                    }, [
                        [/\}\)\(jsu\);[\s\S]*?\(\$\s*\=\>\s*\{[\s\S]*?\"use strict\";/mig, ""]
                    ]);
                }).then(() => { // minify in dist directory
                    return Promise.all([
                        func.minify([
                            path.tmp + "extension.js",
                            path.tmp + "settings.js",
                            path.tmp + "background.js",
                            path.tmp + "newtab.js",
                            path.src + "js/onboarding.js",
                            path.src + "js/changelog.js"
                        ], path.dist + "js/"),
                        func.minify([
                            path.src + "js/lib/jsu.js",
                            path.src + "js/helper/i18n.js",
                            path.src + "js/helper/model.js",
                            path.src + "js/helper/utility.js",
                            path.src + "js/helper/template.js",
                            path.src + "js/helper/stylesheet.js",
                            path.src + "js/helper/font.js"
                        ], path.dist + "js/lib/"),
                    ]);
                }).then(() => {
                    log("Moved js files to dist directory");
                    resolve();
                });
            });
        };

        /**
         * Retrieves the newest versions of the lib js files from Github
         *
         * @returns {Promise}
         */
        let remoteJs = () => {
            return new Promise((resolve) => {
                let i = 0;
                let files = [
                    {
                        file: "colorpicker.js",
                        urlPath: "Colorpicker/master/src/js/colorpicker.js"
                    },
                    {
                        file: "jsu.js",
                        urlPath: "jsu/master/src/js/jsu.js"
                    }
                ];

                let fetched = () => {
                    i++;
                    if (i === files.length) {
                        resolve();
                    }
                };

                files.forEach((obj) => {
                    func.getRemoteContent("https://raw.githubusercontent.com/Kiuryy/" + obj.urlPath).then((content) => {
                        func.createFile(path.src + "js/lib/" + obj.file, content).then(() => {
                            log("Fetched " + obj.file + " from Github");
                            fetched();
                        });
                    }, fetched);
                });
            });
        };

        /**
         * Parses the html files and copies them to the dist directory
         *
         * @returns {Promise}
         */
        let html = () => {
            return new Promise((resolve) => {
                func.replace({
                    [path.src + "html/settings.html"]: path.tmp + "html/settings.html",
                    [path.src + "html/changelog.html"]: path.tmp + "html/changelog.html",
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
                    log("Moved html files to dist directory");
                    resolve();
                });
            });
        };

        /**
         * Parses the json files and copies them to the dist directory
         *
         * @returns {Promise}
         */
        let json = () => {
            return new Promise((resolve) => {
                func.replace({ // parse manifest.json
                    [path.src + "manifest.json"]: path.tmp + "manifest.json"
                }, [
                    [/("content_scripts":[\s\S]*?"js":\s?\[)([\s\S]*?)(\])/mig, "$1\"js/lib/jsu.js\",\"js/extension.js\"$3"],
                    [/("background":[\s\S]*?"scripts":\s?\[)([\s\S]*?)(\])/mig, "$1\"js/lib/jsu.js\",\"js/background.js\"$3"],
                    [/("version":[\s]*")[^"]*("[\s]*,)/ig, "$1" + process.env.npm_package_version + "$2"],
                    [/("version_name":[\s]*")[^"]*("[\s]*,)/ig, "$1" + process.env.npm_package_versionName + "$2"],
                    [/(img\/icon\/)dev\/(.*)\.png/ig, "$1$2.webp"]
                ]).then(() => { // minify in dist directory
                    return func.minify([path.tmp + "manifest.json", path.src + "_locales/**/*.json"], path.dist, false);
                }).then(() => {
                    log("Moved json files to dist directory");
                    resolve();
                });
            });
        };

        /**
         *
         * @param {string} msg
         */
        let log = (msg) => {
            console.log(" - " + msg);
        };

        /**
         *
         */
        this.release = () => {
            return new Promise((resolve) => {
                Promise.all([
                    cleanPre(),
                    remoteJs()
                ]).then(() => {
                    return Promise.all([js(), css(), img(), json(), html()]);
                }).then(() => {
                    return cleanPost();
                }).then(() => {
                    resolve();
                });
            });
        };
    };
})();