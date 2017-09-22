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
            if (context === null) { // page context
                context = $(document);
            } else { // extension context
                ext.helper.font.addStylesheet(context);

                if (ext.opts.classes && ext.opts.classes.page) {
                    if (ext.helper.model.getData("b/animations") === false && ext.opts.classes.page.noAnimations) {
                        context.find("body").addClass(ext.opts.classes.page.noAnimations);
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
                $.xhr($.api.extension.getURL("css/" + file + ".css")).then((xhr) => {
                    if (xhr.response) {
                        let css = xhr.response;
                        Object.keys(styles).forEach((key) => {
                            css = css.replace(new RegExp('"?%' + key + '"?', 'g'), styles[key]);
                        });
                        if (ext.opts.classes && ext.opts.classes.page && ext.opts.classes.style && ext.opts.attr && ext.opts.attr.name) {
                            head.find("style." + ext.opts.classes.page.style + "[" + ext.opts.attr.name + "='" + file + "]").remove();
                            head.append("<style class='" + ext.opts.classes.page.style + "' " + ext.opts.attr.name + "='" + file + "'>" + css + "</style>");
                        } else {
                            head.append("<style>" + css + "</style>");
                        }
                    }
                });
            });
        };
    };

})(jsu);