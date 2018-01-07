($ => {
    "use strict";

    window.LanguageHelper = function (b) {

        let allLanguages = {
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

        let rtlLangs = ["ar", "fa", "iw"];
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
                    let lang = data.language || "default";

                    if (lang === "default") {
                        lang = chrome.i18n.getUILanguage();
                    }

                    let defaultLang = b.manifest.default_locale;

                    this.getAvailableLanguages().then((obj) => {
                        [lang, defaultLang].some((name) => { // check if user language exists, if not fallback to default language
                            if (obj && obj.infos && obj.infos[name] && obj.infos[name].available) {
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
                        let total = Object.keys(allLanguages).length;
                        let loaded = 0;
                        let infos = {};

                        Object.keys(allLanguages).forEach((lang) => {
                            infos[lang] = {
                                name: lang,
                                label: allLanguages[lang],
                                available: false
                            };

                            let xhrDone = () => {
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
         * Returns the language variables for the given language
         *
         * @param {string} lang
         * @param {string} defaultLang
         * @returns {Promise}
         */
        let getVars = (lang, defaultLang = null) => {
            return new Promise((resolve) => {
                if (lang) {
                    let sendXhr = (obj) => {
                        let langVars = obj.langVars;

                        $.xhr(chrome.extension.getURL("_locales/" + lang + "/messages.json")).then((xhr) => {
                            let result = JSON.parse(xhr.responseText);
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