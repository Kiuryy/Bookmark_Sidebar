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
            en_US: "English (US)",
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
        this.init = async () => {
            const defaultLang = $.opts.manifest.default_locale;
            const data = await $.api.storage.sync.get(["language"]);

            let fallbackLang = null;
            let lang = data.language || "default";

            if (lang === "default") {
                lang = this.getUILanguage();
            }
            lang = lang.replace("-", "_");

            if (aliasLangs[lang]) { // language code is an alias for another one (e.g. pt -> pt_PT)
                lang = aliasLangs[lang];
            }

            if (lang.indexOf("_") > -1) { // search for a language file with short language code, too (e.g. de_DE -> de)
                fallbackLang = lang.replace(/_.*$/, "");
            }

            const availableLanguages = await this.getAvailableLanguages();
            if (availableLanguages && availableLanguages.infos) {
                for (const possibleLang of [lang, fallbackLang, defaultLang]) {
                    if (!possibleLang) {
                        continue;
                    }

                    if (availableLanguages.infos[possibleLang] && availableLanguages.infos[possibleLang].available) {
                        language = possibleLang;
                        isRtl = rtlLangs.indexOf(language) > -1;
                        langVars = await getVars(language, defaultLang); // load language variables from model
                        return;
                    }
                }
            }
        };

        /**
         * Returns the UI language of the browser in the format "de_DE" or "de"
         *
         * @returns {string}
         */
        this.getUILanguage = () => {
            let ret = $.api.i18n.getUILanguage();
            ret = ret.replace("-", "_");
            return ret;
        };

        /**
         * Returns the language which is used for the language variables
         *
         * @returns {string}
         */
        this.getLanguage = () => language;

        /**
         *
         * @returns {Promise}
         */
        this.getRtlLanguages = async () => rtlLangs;

        /**
         * Returns the name and the language variables of the user language
         *
         * @returns {Promise}
         */
        this.getLangVars = async () => {
            return {
                language: language,
                dir: isRtl ? "rtl" : "ltr",
                vars: langVars
            };
        };

        /**
         * Returns the information about the all languages
         *
         * @returns {Promise}
         */
        this.getAvailableLanguages = async () => {
            const cachedData = await $.api.storage.local.get(["languageInfos"]);

            // if (cachedData && cachedData.languageInfos && (+new Date() - cachedData.languageInfos.updated) / 36e5 < 8) { // cached
            //     return {infos: cachedData.languageInfos.infos};
            // }

            // not cached -> determine available languages
            const infos = {};

            for (const lang in allLanguages) {
                infos[lang] = {
                    name: lang,
                    label: allLanguages[lang],
                    available: false
                };

                try {
                    await fetch($.api.runtime.getURL("_locales/" + lang + "/messages.json"), {method: "HEAD"});
                    infos[lang].available = true;
                } catch (e) {
                    // language does not exist
                }
            }

            $.api.storage.local.set({
                languageInfos: {infos: infos, updated: +new Date()}
            });

            return {infos: infos};
        };

        /**
         * Determines all languages with incomplete translations
         *
         * @returns {Promise}
         */
        this.getIncompleteLanguages = async () => {
            const resp = await fetch($.opts.website.translation.info);
            const infos = await resp.json();

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

            return incompleteLangs;
        };

        /**
         * Returns the language variables for the given language
         *
         * @param {string} lang
         * @param {string} defaultLang
         * @returns {Promise}
         */
        const getVars = async (lang, defaultLang) => {
            let langVars = {};

            if (defaultLang) {
                const resp = await fetch($.api.runtime.getURL(`_locales/${defaultLang}/messages.json`));
                const json = await resp.json();
                langVars = {...langVars, ...json};
            }

            if (lang) {
                const resp = await fetch($.api.runtime.getURL(`_locales/${lang}/messages.json`));
                const json = await resp.json();
                langVars = {...langVars, ...json};
            }

            return langVars;
        };
    };

})(jsu);