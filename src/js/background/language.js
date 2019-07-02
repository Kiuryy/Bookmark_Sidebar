($ => {
    "use strict";

    $.LanguageHelper = function (b) {

        const allLanguages = {
            ar: "Arabic",
            am: "Amharic",
            bg: "Bulgarian",
            bn: "Bengali",
            ca: "Catalan",
            cs: "Czech",
            da: "Danish",
            de: "German",
            el: "Greek",
            en: "English",
            es: "Spanish",
            //es_419: "Spanish (Latin America and Caribbean)",
            et: "Estonian",
            fa: "Persian",
            fi: "Finnish",
            fil: "Filipino",
            fr: "French",
            gu: "Gujarati",
            he: "Hebrew",
            hi: "Hindi",
            hr: "Croatian",
            hu: "Hungarian",
            id: "Indonesian",
            it: "Italian",
            ja: "Japanese",
            kn: "Kannada",
            ko: "Korean",
            lt: "Lithuanian",
            lv: "Latvian",
            ml: "Malayalam",
            mr: "Marathi",
            ms: "Malay",
            nl: "Dutch",
            no: "Norwegian",
            pl: "Polish",
            pt_BR: "Portuguese (Brazil)",
            pt_PT: "Portuguese (Portugal)",
            ro: "Romanian",
            ru: "Russian",
            sk: "Slovak",
            sl: "Slovenian",
            sr: "Serbian",
            sv: "Swedish",
            sw: "Swahili",
            ta: "Tamil",
            te: "Telugu",
            th: "Thai",
            tr: "Turkish",
            uk: "Ukrainian",
            vi: "Vietnamese",
            zh_CN: "Chinese (Simplified)",
            zh_TW: "Chinese (Traditional)",
        };

        const rtlLangs = ["ar", "fa", "he"];
        const aliasLangs = {pt: "pt_PT"};
        let language = null;
        let langVars = {};
        let isRtl = false;

        /**
         * Initialises the language file
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                chrome.storage.sync.get(["language"], (data) => {
                    const defaultLang = $.opts.manifest.default_locale;
                    let lang = data.language || "default";
                    let fallbackLang = null;

                    if (lang === "default") {
                        lang = chrome.i18n.getUILanguage();
                    }
                    lang = lang.replace("-", "_");

                    if (aliasLangs[lang]) { // language code is an alias for another one (e.g. pt -> pt_PT)
                        lang = aliasLangs[lang];
                    }

                    if (lang.indexOf("_") > -1) { // search for a language file with short language code, too (e.g. de_DE -> de)
                        fallbackLang = lang.replace(/_.*$/, "");
                    }

                    this.getAvailableLanguages().then((obj) => {
                        [lang, fallbackLang, defaultLang].some((name) => { // check if user language exists, if not fallback to default language
                            if (name !== null && obj && obj.infos && obj.infos[name] && obj.infos[name].available) {
                                language = name;
                                isRtl = rtlLangs.indexOf(language) > -1;

                                getVars(name, defaultLang).then((data) => { // load language variables from model
                                    if (data && data.langVars) {
                                        langVars = data.langVars;
                                        resolve();
                                    }
                                });
                                return true;
                            }
                        });
                    });
                });
            });
        };

        /**
         * Returns the language which is used for the language variables
         *
         * @returns {string}
         */
        this.getLanguage = () => language;

        /**
         * Returns the name and the language variables of the user language
         *
         * @returns {Promise}
         */
        this.getLangVars = () => {
            return new Promise((resolve) => {
                resolve({
                    language: language,
                    dir: isRtl ? "rtl" : "ltr",
                    vars: langVars
                });
            });
        };

        /**
         * Returns the information about the all languages
         *
         * @returns {Promise}
         */
        this.getAvailableLanguages = () => {
            return new Promise((resolve) => {
                chrome.storage.local.get(["languageInfos"], (obj) => {
                    if (obj && obj.languageInfos && (+new Date() - obj.languageInfos.updated) / 36e5 < 8) { // cached
                        resolve({infos: obj.languageInfos.infos});
                    } else { // not cached -> determine available languages
                        const total = Object.keys(allLanguages).length;
                        let loaded = 0;
                        const infos = {};

                        Object.keys(allLanguages).forEach((lang) => {
                            infos[lang] = {
                                name: lang,
                                label: allLanguages[lang],
                                available: false
                            };

                            const xhrDone = () => {
                                if (++loaded === total) {
                                    chrome.storage.local.set({
                                        languageInfos: {infos: infos, updated: +new Date()}
                                    });
                                    resolve({infos: infos});
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

        /**
         * Determines all languages with incomplete translations
         *
         * @returns {Promise}
         */
        this.getIncompleteLanguages = () => {
            return new Promise((resolve) => {
                $.xhr($.opts.website.translation.info).then((xhr) => {
                    const infos = JSON.parse(xhr.responseText);
                    const incompleteLangs = [];

                    if (infos && infos.languages && infos.categories) {
                        let totalVars = 0;
                        Object.values(infos.categories).forEach((cat) => { // determine the total amount of language variables
                            totalVars += cat.total;
                        });

                        infos.languages.forEach((lang) => { // add all languages with incomplete amount of variables to list
                            if (lang.varsAmount < totalVars) {
                                incompleteLangs.push(lang.name);
                            }
                        });
                    }

                    resolve(incompleteLangs);
                });
            });
        };

        /**
         * Returns the language variables for the given language
         *
         * @param {string} lang
         * @param {string} defaultLang
         * @returns {Promise}
         */
        const getVars = (lang, defaultLang = null) => {
            return new Promise((resolve) => {
                if (lang) {
                    const sendXhr = (obj) => {
                        const langVars = obj.langVars;

                        $.xhr(chrome.extension.getURL("_locales/" + lang + "/messages.json")).then((xhr) => {
                            const result = JSON.parse(xhr.responseText);
                            Object.assign(langVars, result); // override all default variables with the one from the language file
                            resolve({langVars: langVars});
                        });
                    };

                    if (defaultLang && defaultLang !== lang) { // load default language variables first and replace them afterwards with the language specific ones
                        getVars(defaultLang, null).then(sendXhr);
                    } else {
                        sendXhr({langVars: {}});
                    }
                }
            });
        };
    };

})(jsu);