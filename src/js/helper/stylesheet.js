($ => {
    "use strict";

    /**
     * @requires helper: model, font
     * @param {object} ext
     * @constructor
     */
    $.StylesheetHelper = function (ext) {

        let styles = {};
        let customCss = "";

        /**
         * Retrieves the replacements for the stylesheets from the storage
         */
        this.init = () => {
            styles = ext.helper.model.getData("a/styles");
            customCss = ext.helper.model.getData("u/customCss");
        };

        /**
         * Adds the stylesheets to the document
         *
         * @param {Array} files
         * @param {jsu} context
         */
        this.addStylesheets = (files, context = null) => {
            if (context === null) { // page context
                context = $(document);
            } else { // extension context
                ext.helper.font.addStylesheet(context);

                if ($.cl && $.cl.page) {
                    if (ext.helper.model.getData("b/animations") === false && $.cl.page.noAnimations) {
                        context.find("body").addClass($.cl.page.noAnimations);
                    }
                }
            }

            let head = null;
            if (context.find("head").length() === 0) { // document does not have a head -> append styles to the body
                head = context.find("body");
            } else {
                head = context.find("head");
            }

            files.forEach((file) => {
                $.xhr(chrome.extension.getURL("css/" + file + ".css")).then((xhr) => {
                    if (xhr.response) {
                        let css = xhr.response;
                        css += customCss;

                        Object.keys(styles).forEach((key) => {
                            css = css.replace(new RegExp("\"?%" + key + "\"?", "g"), styles[key]);
                        });

                        if ($.cl && $.cl.page && $.cl.page.style && $.attr && $.attr.name) {
                            head.find("style." + $.cl.page.style + "[" + $.attr.name + "='" + file + "']").remove();
                            head.append("<style class='" + $.cl.page.style + "' " + $.attr.name + "='" + file + "'>" + css + "</style>");
                        } else {
                            head.append("<style>" + css + "</style>");
                        }
                    }
                });
            });
        };
    };

})(jsu);