(() => {
    "use strict";

    global.func = new function () {

        let module = {
            find: require('glob-concat'),
            concat: require('concat'),
            read: require('read-file'),
            remove: require('del'),
            createFile: require('create-file'),
            minifyHtml: require('html-minifier').minify,
            minifyJson: require('jsonminify'),
            uglifyjs: require('uglify-es'),
            sass: require('node-sass'),
            copy: require('cp-file')
        };

        /*
         * ################################
         * PRIVATE
         * ################################
         */

        /**
         * Finds the files matching the given list of definitions (files, glob path, ...)
         *
         * @param {Array} files
         * @returns {Promise}
         */
        let find = (files) => {
            return new Promise((resolve) => {
                module.find.sync(files);
                module.find(files, (err, matches) => {
                    if (err) {
                        throw err;
                    }
                    resolve(matches);
                });
            });
        };

        /**
         * Reads the content of the given file
         *
         * @param {string} src
         * @returns {Promise}
         */
        let readFile = (src) => {
            return new Promise((resolve) => {
                module.read(src, {encoding: 'utf8'}, (err, content) => {
                    if (err) {
                        throw err;
                    }
                    resolve(content);
                });
            });
        };

        /**
         * Determines the files matching the given definition and calls the given function for each of the files,
         * Waits until the callback function is runned before proceeding to the next file
         *
         * @param {Array} files
         * @param {boolean} flatten ignore the path of the given files and put them directly into the destination
         * @param {function} func
         * @returns {Promise}
         */
        let proceedFiles = (files, flatten = true, func) => {
            return new Promise((resolve) => {
                find(files).then((matches) => {
                    let proceed = (i = 0) => { // will be called once the previous minify process is done -> important to keep the correct order
                        if (matches[i]) {
                            let info = {
                                file: matches[i],
                                fileName: matches[i].replace(new RegExp("^(" + path.src + "|" + path.tmp + ")", "i"), "")
                            };

                            if (flatten) {
                                info.fileName = info.fileName.split(/\//).pop();
                            }

                            if (info.fileName.search(/\./) > -1) { // only proceed files
                                info.ext = info.fileName.split(/\./).pop();

                                new Promise((rslv) => {
                                    func(info, rslv);
                                }).then(() => {
                                    proceed(i + 1);
                                });
                            } else {
                                proceed(i + 1);
                            }
                        } else {
                            resolve();
                        }
                    };

                    proceed();
                });
            });
        };

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        /**
         * Creates a file with the given content
         *
         * @param {string} src
         * @param {string} content
         * @returns {Promise}
         */
        this.createFile = (src, content) => {
            return new Promise((resolve) => {
                this.remove([src]).then(() => { // remove existing file
                    module.createFile(src, content, (err) => { // create file with given content
                        if (err) {
                            throw err;
                        }
                        resolve();
                    });
                });
            });
        };

        /**
         * Removes the given files
         *
         * @param {Array} files
         * @returns {Promise}
         */
        this.remove = (files) => {
            return new Promise((resolve) => {
                module.remove(files).then(() => {
                    resolve();
                })
            });
        };

        /**
         * Merges the content of the given files into one output file
         *
         * @param {Array} files
         * @param {string} output
         * @returns {Promise}
         */
        this.concat = (files, output) => {
            return new Promise((resolve) => {
                find(files).then((matches) => {
                    return module.concat(matches, output);
                }).then(() => {
                    resolve();
                });
            });
        };

        /**
         * Replaces the given definitions in the content of the given files
         *
         * @param {Array} files
         * @param {Array} replaces
         * @returns {Promise}
         */
        this.replace = (files, replaces) => {
            return new Promise((resolve) => {
                Object.keys(files).forEach((src) => {
                    readFile(src).then((content) => { // read file
                        replaces.forEach((replace) => { // replace the definitions
                            content = content.replace(replace[0], replace[1]);
                        });

                        return this.createFile(files[src], content); // save file with new content
                    }).then(() => {
                        resolve();
                    });
                });
            });
        };

        /**
         * Copies the given files in the given destination
         *
         * @param {Array} files
         * @param {Array} exclude
         * @param {string} dest
         * @param {boolean} flatten ignore the path of the given files and put them directly into the destination
         * @returns {Promise}
         */
        this.copy = (files, exclude, dest, flatten = true) => {
            return new Promise((resolve) => {
                find(exclude).then((exludeList) => {
                    return proceedFiles(files, flatten, (info, rslv) => {
                        if (exludeList.indexOf(info.file) === -1) { // not excluded -> copy file
                            module.copy(info.file, dest + info.fileName).then(() => {
                                rslv();
                            });
                        } else { // excluded -> don't copy
                            rslv();
                        }
                    });
                }).then(() => {
                    resolve();
                });
            });
        };

        /**
         * Minifies the given files and puts them in the given destination
         *
         * @param {Array} files
         * @param {string} dest
         * @param {boolean} flatten ignore the path of the given files and put them directly into the destination
         * @returns {Promise}
         */
        this.minify = (files, dest, flatten = true) => {
            return new Promise((resolve) => {
                proceedFiles(files, flatten, (info, rslv) => {
                    readFile(info.file).then((content) => { // read file
                        switch (info.ext) {
                            case "html": {
                                content = module.minifyHtml(content, { // minify content
                                    collapseWhitespace: true,
                                    keepClosingSlash: true,
                                    minifyCSS: true
                                });
                                break;
                            }
                            case "json": {
                                content = module.minifyJson(content);
                                break;
                            }
                            case "js": {
                                let result = module.uglifyjs.minify(content, {
                                    output: {
                                        preamble: '/*! (c) ' + process.env.npm_package_author_name + ' under ' + process.env.npm_package_license + ' */'
                                    },
                                    mangle: {
                                        reserved: ['jsu', 'chrome']
                                    }
                                });
                                if (result.error) {
                                    throw result.error;
                                }
                                content = result.code;
                                break;
                            }
                            case "scss": {
                                let result = module.sass.renderSync({
                                    data: content,
                                    outputStyle: "compressed",
                                    includePaths: [path.src + "scss"]
                                });
                                content = result.css;
                                info.fileName = info.fileName.replace(/\.scss$/, ".css");
                                break;
                            }
                        }

                        return this.createFile(dest + info.fileName, content); // save file in the output directory
                    }).then(() => {
                        rslv();
                    });
                }).then(() => {
                    resolve();
                });
            });
        };
    };

})();