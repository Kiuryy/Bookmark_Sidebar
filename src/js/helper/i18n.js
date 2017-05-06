($ => {
    "use strict";

    window.I18nHelper = function (ext) {

        let langVars = {};
        let attr = {
            i18n: "data-i18n",
            i18nReplaces: "data-i18nReplaces"
        };

        /**
         * Initialises the language file
         *
         * @param {function} callback
         */
        this.init = (callback) => {
            ext.helper.model.call("languageInfos", (obj) => {
                let lang = this.getLanguage();
                let defaultLang = ext.opts.manifest.default_locale;
                [lang, defaultLang].some((name) => { // check if user language exists, if not fallback to default language
                    if (obj.infos && obj.infos[name] && obj.infos[name].available) {
                        ext.helper.model.call("langvars", {
                            lang: name,
                            defaultLang: defaultLang
                        }, (obj) => { // load language variables from model
                            if (obj && obj.langVars) {
                                langVars = obj.langVars;
                                if (typeof callback === "function") {
                                    callback();
                                }
                            }
                        });
                        return true;
                    }
                });
            });
        };

        /**
         * Returns the configured language, or the ui language on default
         *
         * @returns {string}
         */
        this.getLanguage = () => {
            let lang = ext.helper.model.getData("a/language");
            if (lang === "default") {
                lang = chrome.i18n.getUILanguage();
            }
            return lang;
        };

        /**
         * Returns the given date in local specific format
         *
         * @param dateObj
         * @returns {string}
         */
        this.getLocaleDate = (dateObj) => {
            return dateObj.toLocaleDateString([this.getLanguage(), ext.opts.manifest.default_locale], {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            });
        };

        /**
         * Parses all language vars in the given html context
         *
         * @param context
         */
        this.parseHtml = (context) => {
            $(context).find("[" + attr.i18n + "]").forEach((elm) => {
                let msg = null;
                let val = $(elm).attr(attr.i18n);

                if (val) {
                    let replaces = [];
                    let replacesRaw = $(elm).attr(attr.i18nReplaces);
                    if (replacesRaw) {
                        replaces = replacesRaw.split(",");
                    }
                    msg = this.get(val, replaces);
                }

                if (msg) {
                    $(elm).removeAttr(attr.i18n);
                    $(elm).html(msg);
                } else {
                    $(elm).remove();
                }
            });
        };

        /**
         * Returns the translated string matching the given message
         *
         * @param {string} msg
         * @param {Array} replaces
         * @returns {string}
         */
        this.get = (msg, replaces = []) => {
            let ret = "";
            let langVar = langVars[msg];

            if (langVar && langVar.message) {
                ret = langVar.message;
                replaces.forEach((replace, i) => {
                    ret = ret.replace(new RegExp("\\{" + (i + 1) + "\\}"), replace)
                });

                ret = ret.replace(/\[b\](.*)\[\/b\]/, "<strong>$1</strong>");
                ret = ret.replace(/\[a\](.*)\[\/a\]/, "<a href='#'>$1</a>");
                ret = ret.replace(/\[em\](.*)\[\/em\]/, "<em>$1</em>");
            }
            return ret;
        };
    };

})(jsu);