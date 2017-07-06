($ => {
    "use strict";

    window.TooltipHelper = function (ext) {

        let timeout = {};

        /**
         * Creates the tooltip for the given element and shows it after the configured delay,
         * closes other tooltips
         *
         * @param {jsu} elm
         */
        this.create = (elm) => {
            let id = elm.attr(ext.opts.attr.id);
            if (id) {
                closeAllExcept(id);
                let existingTooltip = ext.elements.iframeBody.find("div." + ext.opts.classes.tooltip.wrapper + "[" + ext.opts.attr.id + "='" + id + "']");

                if (existingTooltip.length() > 0) { // tooltip is already there -> show it
                    if (existingTooltip[0].getBoundingClientRect().top !== 0) { // tooltip is positioned correctly
                        existingTooltip.addClass(ext.opts.classes.tooltip.visible);
                    }
                } else { // no tooltip for the given element yet -> generate and show it after the configured delay
                    let config = ext.helper.model.getData(["b/tooltipContent", "b/tooltipDelay", "a/sidebarPosition"]);

                    if (+config.tooltipDelay !== -1) { // show only if delay > -1
                        let tooltip = $("<div />")
                            .addClass(ext.opts.classes.tooltip.wrapper)
                            .attr(ext.opts.attr.id, id)
                            .appendTo(ext.elements.iframeBody);

                        let data = ext.helper.entry.getData(id);

                        if (config.tooltipContent === "all" || config.tooltipContent === "title") {
                            tooltip.append("<h3>" + data.title + "</h3>");
                        }

                        if (data.isDir) {
                            tooltip.append("<span>" + data.children.length + " " + ext.helper.i18n.get("sidebar_dir_children") + "</span>");
                        } else if (config.tooltipContent === "all" || config.tooltipContent === "url") {
                            tooltip.append("<span>" + data.url + "</span>");
                        }

                        if (timeout[id]) {
                            clearTimeout(timeout[id]);
                            timeout[id] = null;
                        }

                        timeout[id] = setTimeout(() => {
                            tooltip.addClass(ext.opts.classes.tooltip.visible);
                            tooltip.css("top", (elm[0].getBoundingClientRect().top + elm.realHeight() / 2 - tooltip.realHeight() / 2) + "px");

                            if (config.sidebarPosition === "right") {
                                tooltip.css("right", (elm.realWidth() + 10) + "px");
                            } else {
                                tooltip.css("left", (elm.parent("li")[0].offsetLeft + elm.realWidth()) + "px");
                            }
                        }, +config.tooltipDelay * 1000);
                    }
                }
            } else {
                closeAllExcept();
            }
        };

        /**
         * Closes all tooltips
         */
        this.close = () => {
            closeAllExcept();
        };

        /**
         * Closes all tooltips except the given one
         *
         * @param {int} except
         */
        let closeAllExcept = (except) => {
            Object.values(timeout).forEach((id) => {
                if (id) {
                    clearTimeout(timeout[id]);
                }
            });
            timeout = {};

            let tooltips = ext.elements.iframeBody.find("div." + ext.opts.classes.tooltip.wrapper + (except ? ":not([" + ext.opts.attr.id + "='" + except + "'])" : ""));

            tooltips.removeClass(ext.opts.classes.tooltip.visible);
            $.delay(300).then(() => {
                tooltips.remove();
            });
        };
    };

})(jsu);