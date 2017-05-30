($ => {
    "use strict";

    window.StylesheetHelper = function (ext) {

        let styles = {};

        /**
         * Retrieves the replacements for the stylesheets from the storage
         */
        this.init = () => {
            styles = ext.helper.model.getData("a/styles");
        };

        /**
         * Adds the stylesheets to the document
         *
         * @param {Array} files
         * @param {jsu} context
         */
        this.addStylesheets = (files, context = null) => {
            if (context === null) {
                context = $(document);
            } else {
                ext.helper.font.addStylesheet(context);
                if (styles.isEE && ext.opts.classes && ext.opts.classes.page && ext.opts.classes.page.ee) {
                    context.find("body").addClass(ext.opts.classes.page.ee);
                }
            }

            let head = null;
            if (context.find("head").length() === 0) { // document does not have a head -> append styles to the body
                head = context.find("body");
            } else {
                head = context.find("head");
            }

            files.forEach((file) => {
                let xhr = new XMLHttpRequest();
                xhr.open("GET", chrome.extension.getURL("css/" + file + ".css"), true);
                xhr.onload = () => {
                    if (xhr.response) {
                        let css = xhr.response;
                        Object.keys(styles).forEach((key) => {
                            css = css.replace(new RegExp('"?%' + key + '"?', 'g'), styles[key]);
                        });
                        head.append("<style>" + css + "</style>");
                    }
                };
                xhr.send();
            });
        };

    };

})(jsu);