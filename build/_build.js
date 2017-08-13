(() => {
    "use strict";

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
                    path.src + 'scss/*.scss'
                ], path.dist + "css/").then(() => {
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
                            path.src + 'js/helper/**/*.js',
                            path.src + 'js/extension.js',
                            path.src + 'js/init.js'
                        ],
                        path.tmp + 'extension-merged.js'
                    ),
                    func.concat([ // concat background javascripts
                            path.src + 'js/background/**/*.js',
                            path.src + 'js/background.js'
                        ],
                        path.tmp + 'background-merged.js'
                    ),
                    func.concat([ // concat settings javascripts
                            path.src + 'js/lib/colorpicker.js',
                            path.src + 'js/helper/checkbox.js',
                            path.src + 'js/settings/*.js',
                            path.src + 'js/settings.js'
                        ],
                        path.tmp + 'settings-merged.js'
                    )
                ]).then(() => { // merge anonymous brackets
                    return func.replace({
                        [path.tmp + 'extension-merged.js']: path.tmp + 'extension.js',
                        [path.tmp + 'background-merged.js']: path.tmp + 'background.js',
                        [path.tmp + 'settings-merged.js']: path.tmp + 'settings.js'
                    }, [
                        [/\}\)\(jsu\);[\s\S]*?\(\$\s*\=\>\s*\{[\s\S]*?\"use strict\";/mig, ""]
                    ]);
                }).then(() => { // minify in dist directory
                    return Promise.all([
                        func.minify([
                            path.tmp + 'extension.js',
                            path.tmp + 'settings.js',
                            path.tmp + 'background.js',
                            path.src + 'js/translation.js',
                            path.src + 'js/onboarding.js',
                            path.src + 'js/changelog.js'
                        ], path.dist + "js/"),
                        func.minify([
                            path.src + 'js/lib/jsu.js',
                            path.src + 'js/helper/i18n.js',
                            path.src + 'js/helper/model.js',
                            path.src + 'js/helper/template.js',
                            path.src + 'js/helper/stylesheet.js',
                            path.src + 'js/helper/font.js'
                        ], path.dist + "js/lib/"),
                    ]);
                }).then(() => {
                    resolve();
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
                    [path.src + 'html/settings.html']: path.tmp + 'html/settings.html',
                    [path.src + 'html/translate.html']: path.tmp + 'html/translate.html',
                    [path.src + 'html/changelog.html']: path.tmp + 'html/changelog.html',
                    [path.src + 'html/intro.html']: path.tmp + 'html/intro.html'
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
                    [ path.src + 'manifest.json']: path.tmp + 'manifest.json'
                }, [
                    [/("content_scripts":[\s\S]*?"js":\s?\[)([\s\S]*?)(\])/mig, '$1"js/lib/jsu.js","js/extension.js"$3'],
                    [/("background":[\s\S]*?"scripts":\s?\[)([\s\S]*?)(\])/mig, '$1"js/lib/jsu.js","js/background.js"$3'],
                    [/("version":[\s]*")[^"]*("[\s]*,)/ig, "$1" + process.env.npm_package_version + "$2"],
                    [/"version_name":[^,]*,/ig, ""],
                    [/(img\/icon\/)dev\/(.*)\.png/ig, "$1$2.webp"]
                ]).then(() => { // minify in dist directory
                    return func.minify([path.tmp + "manifest.json", path.src + "_locales/**/*.json"], path.dist, false);
                }).then(() => {
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
                    return Promise.all([js(), css(), img(), json(), html()]);
                }).catch(reason => {
                    throw reason;
                }).then(() => {
                    resolve();
                    //return cleanPost();
                })//.then(() => {
                   // resolve();
                //});
            });
        };
    };
})();