($ => {
    "use strict";

    window.LanguageHelper = function (b) {

        let langs = {
            af: "Afrikaans",
            ar: "Arabic",
            hy: "Armenian",
            be: "Belarusian",
            bg: "Bulgarian",
            ca: "Catalan",
            "zh-CN": "Chinese (Simplified)",
            "zh-TW": "Chinese (Traditional)",
            hr: "Croatian",
            cs: "Czech",
            da: "Danish",
            nl: "Dutch",
            en: "English",
            eo: "Esperanto",
            et: "Estonian",
            tl: "Filipino",
            fi: "Finnish",
            fr: "French",
            de: "German",
            el: "Greek",
            iw: "Hebrew",
            hi: "Hindi",
            hu: "Hungarian",
            is: "Icelandic",
            id: "Indonesian",
            it: "Italian",
            ja: "Japanese",
            ko: "Korean",
            lv: "Latvian",
            lt: "Lithuanian",
            no: "Norwegian",
            fa: "Persian",
            pl: "Polish",
            pt: "Portuguese",
            ro: "Romanian",
            ru: "Russian",
            sr: "Serbian",
            sk: "Slovak",
            sl: "Slovenian",
            es: "Spanish",
            sw: "Swahili",
            sv: "Swedish",
            ta: "Tamil",
            th: "Thai",
            tr: "Turkish",
            uk: "Ukrainian",
            vi: "Vietnamese"
        };

        let langVarsChache = {};

        /**
         * Returns the information about the all languages
         *
         * @returns {Promise}
         */
        this.getAll = () => {
            return new Promise((resolve) => {
                getInfos().then((infos) => {
                    resolve({infos: infos});
                });
            });
        };

        /**
         * Returns the language variables for the given language
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.getVars = (opts) => {
            return new Promise((resolve) => {
                if (opts.lang) {
                    let cacheVars = typeof opts.cache === "undefined" || opts.cache === true;

                    if (langVarsChache[opts.lang] && cacheVars) { // take langvars from cache
                        resolve({langVars: langVarsChache[opts.lang]});
                    } else { // load langvars with xhr request
                        let sendXhr = (obj) => {
                            let langVars = obj.langVars;

                            $.xhr(chrome.extension.getURL("_locales/" + opts.lang + "/messages.json")).then((xhr) => {
                                let result = JSON.parse(xhr.responseText);
                                Object.assign(langVars, result); // override all default variables with the one from the language file

                                if (cacheVars) {
                                    langVarsChache[opts.lang] = langVars;
                                }
                                resolve({langVars: langVars});
                            });
                        };

                        if (opts.defaultLang && opts.defaultLang !== opts.lang) { // load default language variables first and replace them afterwards with the language specific ones
                            this.getVars({lang: opts.defaultLang, cache: false}).then(sendXhr);
                        } else {
                            sendXhr({langVars: {}});
                        }
                    }
                }
            });
        };

        /**
         * Returns information about all languages (e.g. if they are available in the extension)
         *
         * @returns {Promise}
         */
        let getInfos = () => {
            return new Promise((resolve) => {
                chrome.storage.local.get(["languageInfos"], (obj) => {
                    if (obj && obj.languageInfos && (+new Date() - obj.languageInfos.updated) / 36e5 < 8) { // cached
                        resolve(obj.languageInfos.infos);
                    } else { // not cached -> determine available languages
                        let total = Object.keys(langs).length;
                        let loaded = 0;
                        let infos = {};

                        Object.keys(langs).forEach((lang) => {
                            infos[lang] = {
                                name: lang,
                                label: langs[lang],
                                available: false
                            };

                            let xhrDone = () => {
                                if (++loaded === total) {
                                    chrome.storage.local.set({
                                        languageInfos: {infos: infos, updated: +new Date()}
                                    });
                                    resolve(infos);
                                }
                            };

                            $.xhr(chrome.extension.getURL("_locales/" + lang + "/messages.json"), {method: "HEAD"}).then(() => {
                                infos[lang].available = true;
                                xhrDone();
                            }, xhrDone);
                        });
                    }
                });
            });
        };
    };

})(jsu);