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
         * @param {jsu} doc
         * @param {Array} files
         */
        this.addStylesheets = (doc, files) => {
            let head = doc.find("head");

            $("<link />").attr({
                rel: "stylesheet",
                type: "text/css",
                href: ext.opts.fontHref
            }).appendTo(head);


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