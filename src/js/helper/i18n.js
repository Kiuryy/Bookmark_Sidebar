($ => {
    "use strict";

    window.I18nHelper = function (ext) {

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

            if (typeof callback === "function") {
                callback();
            }
        };

        /**
         * Returns the configured languages
         *
         * @returns {string}
         */
        this.getLanguage = () => {
            return chrome.i18n.getUILanguage();
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
            let ret = chrome.i18n.getMessage(msg);
            if (ret) {
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