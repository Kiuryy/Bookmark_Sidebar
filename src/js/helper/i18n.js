($ => {
    "use strict";

    window.I18nHelper = function (ext) {

        let language = null;
        let langVars = {};
        let attr = {
            i18n: "data-i18n",
            i18nReplaces: "data-i18nReplaces"
        };

        /**
         * Initialises the language file
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                ext.helper.model.call("langvars").then((obj) => {
                    language = obj.language;
                    langVars = obj.vars;
                    resolve();
                });
            });
        };

        /**
         * Returns the language which is used for the language variables
         *
         * @returns {string}
         */
        this.getLanguage = () => {
            return language;
        };

        /**
         * Returns the language of the user interface
         *
         * @returns {string}
         */
        this.getUILanguage = () => {
            return chrome.i18n.getUILanguage();
        };

        /**
         * Returns the default language of the extension
         *
         * @returns {string}
         */
        this.getDefaultLanguage = () => {
            return ext.opts.manifest.default_locale;
        };

        /**
         * Sorts the Collator for comparing strings
         *
         * @returns {Intl.Collator}
         */
        this.getLocaleSortCollator = () => {
            return new Intl.Collator([this.getUILanguage(), this.getDefaultLanguage()]);
        };

        /**
         * Returns the given date in local specific format
         *
         * @param dateObj
         * @returns {string}
         */
        this.getLocaleDate = (dateObj) => {
            return dateObj.toLocaleDateString([this.getUILanguage(), this.getDefaultLanguage()], {
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