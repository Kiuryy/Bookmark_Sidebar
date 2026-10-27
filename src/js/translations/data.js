($ => {
    "use strict";

    $.TranslationsDataHelper = function (t) {

        let languages = {};
        let infos = null;
        let rtlLangs = [];
        let reminder = [];

        const langVarsCache = {};
        const minPercentage = 15; // languages with less variables filled are only listed in the "Add language" dropdown
        const thanksLimit = 30;

        /**
         * Loads the local information about the languages and the reminder preferences of the user
         *
         * @returns {Promise}
         */
        this.init = async () => {
            const [obj, languageInfos, rtl] = await Promise.all([
                $.api.storage.sync.get(["translationInfo"]),
                t.helper.model.call("languageInfos"),
                t.helper.model.call("rtlLangs")
            ]);

            reminder = obj.translationInfo || [];
            languages = languageInfos.infos;
            rtlLangs = rtl || [];
        };

        /**
         * Loads the translation progress of all languages from the translation service,
         * throws an error if the service is not available
         *
         * @returns {Promise}
         */
        this.loadInfos = async () => {
            const xhr = await $.xhr($.opts.website.translation.info);
            const response = JSON.parse(xhr.responseText);

            if (!response || !response.languages) {
                throw new Error("Invalid response of the translation service");
            }

            infos = response;
        };

        /**
         * Returns whether the given language is known to the extension
         *
         * @param {string} lang
         * @returns {boolean}
         */
        this.isLanguage = (lang) => !!languages[lang];

        /**
         * Returns the name of the given language
         *
         * @param {string} lang
         * @returns {string}
         */
        this.getLabel = (lang) => languages[lang] ? languages[lang].label : lang;

        /**
         * Returns the writing direction of the given language
         *
         * @param {string} lang
         * @returns {string}
         */
        this.getDir = (lang) => rtlLangs.indexOf(lang) > -1 ? "rtl" : "ltr";

        /**
         * Returns the languages with a sufficient translation progress (sorted by their progress) and the remaining ones (sorted by their name)
         *
         * @returns {{listed: Array, missing: Array}}
         */
        this.getLanguageList = () => {
            const collator = t.helper.i18n.getLocaleSortCollator();
            const progress = {};
            const listed = [];
            const missing = [];

            infos.languages.forEach((lang) => {
                progress[lang.name] = lang.varsAmount;
            });

            Object.values(languages).forEach((lang) => {
                const varsAmount = progress[lang.name] || 0;
                const percentage = Math.min(100, Math.floor(varsAmount / infos.varsAmount * 100));

                if (percentage < minPercentage) {
                    missing.push({name: lang.name, label: lang.label});
                    return;
                }

                let status = "draft";
                if (lang.available) {
                    status = infos.varsAmount > varsAmount ? "incomplete" : "released";
                }

                listed.push({name: lang.name, label: lang.label, varsAmount, percentage, status});
            });

            listed.sort((a, b) => b.varsAmount - a.varsAmount || collator.compare(a.label, b.label));
            missing.sort((a, b) => collator.compare(a.label, b.label));

            return {listed, missing};
        };

        /**
         * Returns the categories of the given language with their translation progress,
         * returns null if the translation service doesn't know the language
         *
         * @param {string} lang
         * @returns {Promise<Array|null>}
         */
        this.getCategories = async (lang) => {
            const langVars = await getLangVars(lang);
            if (!langVars) {
                return null;
            }

            return Object.keys(langVars.vars).map((name) => {
                const entries = getEntries(lang, langVars, name);
                return {
                    name: name,
                    required: !!langVars.vars[name].required,
                    total: entries.length,
                    filled: entries.filter((entry) => entry.value.length > 0).length
                };
            });
        };

        /**
         * Returns the language variables of the given category, each entry contains the current and the original (english) text,
         * returns null if the category doesn't exist
         *
         * @param {string} lang
         * @param {string} category
         * @returns {Promise<Array|null>}
         */
        this.getEntries = async (lang, category) => {
            const langVars = await getLangVars(lang);
            if (!langVars || !langVars.vars[category]) {
                return null;
            }
            return getEntries(lang, langVars, category);
        };

        /**
         * Submits the given language variables to the translation service and updates the cached values accordingly,
         * returns the total amount of variables the user has translated for the language so far
         *
         * @param {string} lang
         * @param {object} vars
         * @returns {Promise<int>}
         */
        this.submit = async (lang, vars) => {
            await $.xhr($.opts.website.translation.submit, {
                method: "POST",
                data: {lang, vars}
            });

            if (langVarsCache[lang]) { // the submitted values are the current state now -> reflect them in the progress without reloading everything
                Object.values(langVarsCache[lang].vars).forEach((category) => {
                    category.vars.forEach((field) => {
                        if (typeof vars[field.name] !== "undefined") {
                            field.value = vars[field.name];
                        }
                    });
                });
            }

            return storeChangedLangVars(lang, vars);
        };

        /**
         * Submits the email address of the user, so they can receive a license key as thank you for the translation
         *
         * @param {string} lang
         * @param {string} email
         * @param {int} translatedAmount
         * @returns {Promise}
         */
        this.submitEmail = async (lang, email, translatedAmount) => {
            await $.xhr($.opts.website.translation.submit, {
                method: "POST",
                data: {lang, email, translatedAmount}
            });
        };

        /**
         * Returns whether the user should be thanked for the translation, which is the case once for non-premium users after translating enough variables
         *
         * @param {int} translatedAmount
         * @returns {boolean}
         */
        this.shouldThank = (translatedAmount) => {
            return !t.helper.model.getUserType().startsWith("premium") && translatedAmount >= thanksLimit && t.helper.model.getData("u/translationThanked") === false;
        };

        /**
         * Returns whether the user wants to be notified about new language variables of the given language
         *
         * @param {string} lang
         * @returns {boolean}
         */
        this.isReminderEnabled = (lang) => reminder.indexOf(lang) !== -1;

        /**
         * Enables or disables the notification about new language variables for the given language
         *
         * @param {string} lang
         * @param {boolean} enabled
         * @returns {Promise}
         */
        this.setReminder = async (lang, enabled) => {
            reminder = reminder.filter((name) => name !== lang);
            if (enabled) {
                reminder.push(lang);
            }
            await $.api.storage.sync.set({translationInfo: reminder});
        };

        /**
         * Returns the language variables of the given language and the ones of the default language to show as original text,
         * returns null if the translation service doesn't know the language
         *
         * @param {string} lang
         * @returns {Promise<object|null>}
         */
        const getLangVars = async (lang) => {
            if (langVarsCache[lang]) {
                return langVarsCache[lang];
            }

            const xhr = await $.xhr($.opts.website.translation.langvars, {
                method: "POST",
                data: {lang}
            });

            const vars = JSON.parse(xhr.responseText);
            if (!vars || Object.keys(vars).length === 0) {
                return null;
            }

            const defaultLang = t.helper.i18n.getDefaultLanguage();
            const defaults = lang === defaultLang ? null : await getLangVars(defaultLang);

            langVarsCache[lang] = {vars, defaults: defaults ? defaults.vars : null};
            return langVarsCache[lang];
        };

        /**
         * Returns the translatable variables of the given category with their current value and their original text
         *
         * @param {string} lang
         * @param {object} langVars
         * @param {string} category
         * @returns {Array}
         */
        const getEntries = (lang, langVars, category) => {
            const isDefaultLang = lang === t.helper.i18n.getDefaultLanguage();
            const originals = {};

            if (langVars.defaults && langVars.defaults[category]) { // match the original texts by name instead of relying on the same order
                langVars.defaults[category].vars.forEach((field) => {
                    originals[field.name] = field.value || "";
                });
            }

            return langVars.vars[category].vars
                .filter((field) => isDefaultLang || field.translatable !== false) // non-translatable variables can only be edited for the default language
                .map((field) => {
                    const value = (field.value || "").trim();
                    return {
                        name: field.name,
                        label: field.label || field.name,
                        value: value,
                        original: isDefaultLang ? value : (originals[field.name] || "") // there are no originals for the default language -> show the current text instead
                    };
                });
        };

        /**
         * Stores the names of the variables the user has translated for the given language in the local storage,
         * returns the total amount of variables the user has translated for the language
         *
         * @param {string} lang
         * @param {object} vars
         * @returns {Promise<int>}
         */
        const storeChangedLangVars = async (lang, vars) => {
            const storageKey = "translated_" + lang;
            const obj = await $.api.storage.local.get([storageKey]);
            const translated = new Set(obj[storageKey] || []);

            Object.keys(vars).forEach((name) => translated.add(name));

            if (translated.size > 0) {
                try {
                    await $.api.storage.local.set({[storageKey]: [...translated]});
                } catch (e) {
                    // do nothing specific with the error -> is thrown if too many save attempts are triggered
                }
            }

            return translated.size;
        };
    };

})(jsu);
