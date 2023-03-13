($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.I18nHelper = function (ext) {

        let language = null;
        let langVars = {};
        let dir = null;

        /**
         * Initialises the language file
         *
         * @returns {Promise}
         */
        this.init = async () => {
            const obj = await ext.helper.model.call("langvars");
            language = obj.language;
            langVars = obj.vars;
            dir = obj.dir;
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
         * Returns whether the direction of the current language is right-to-left
         *
         * @returns {boolean}
         */
        this.isRtl = () => {
            return dir === "rtl";
        };

        /**
         * Returns the UI language of the browser in the format "de_DE" or "de"
         *
         * @returns {string}
         */
        this.getUILanguage = () => {
            return $.api.i18n.getUILanguage();
        };

        /**
         * Returns the default language of the extension
         *
         * @returns {string}
         */
        this.getDefaultLanguage = () => {
            return $.opts.manifest.default_locale;
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
            if (typeof dateObj === "number") {
                dateObj = new Date(dateObj);
            }

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
            $(context).find("[" + $.attr.i18n + "]").forEach((elm) => {
                let msg = null;
                const val = $(elm).attr($.attr.i18n);

                if (val) {
                    let replaces = [];
                    const replacesRaw = $(elm).attr($.attr.i18nReplaces);
                    if (replacesRaw) {
                        replaces = replacesRaw.split(",");
                    }
                    msg = this.get(val, replaces);
                }

                if (msg) {
                    $(elm).removeAttr($.attr.i18n);
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
         * @param {boolean} encoded
         * @returns {string}
         */
        this.get = (msg, replaces = [], encoded = false) => {
            let ret = "";
            const langVar = langVars[msg];

            if (langVar && langVar.message) {
                ret = langVar.message;

                ret = ret.replace(/\{browserName\}/gi, $.browserName);

                if (replaces && replaces.length > 0) {
                    replaces.forEach((replace, i) => {
                        ret = ret.replace(new RegExp("\\{" + (i + 1) + "\\}"), replace);
                    });
                }

                ret = ret.replace(/\[b\](.*)\[\/b\]/, "<strong>$1</strong>");
                ret = ret.replace(/\[a\](.*)\[\/a\]/, "<a href='#'>$1</a>");
                ret = ret.replace(/\[em\](.*)\[\/em\]/, "<em>$1</em>");
            }

            if (encoded) {
                ret = ret.replace(/'/g, "&#x27;");
            }

            return ret;
        };
    };

})(jsu);