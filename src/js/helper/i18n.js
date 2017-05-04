($ => {
    "use strict";

    window.I18nHelper = function (ext) {

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
         * Parses all language vars in the given html context
         *
         * @param context
         */
        this.parseHtml = (context) => {
            $(context).find("[" + ext.opts.attr.i18n + "]").forEach((elm) => {
                let msg = null;
                let val = $(elm).attr(ext.opts.attr.i18n);

                if (val) {
                    msg = this.get(val);
                }

                if (msg) {
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