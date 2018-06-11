($ => {
    "use strict";

    /**
     * @requires helper: model, i18n, entry, toggle
     * @param {object} ext
     * @constructor
     */
    window.TooltipHelper = function (ext) {

        let timeout = {};
        let config = {};

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            config = ext.helper.model.getData(["b/tooltipContent", "b/tooltipDelay", "b/sidebarPosition"]);

            let styles = ext.helper.model.getData("a/styles");
            config.scrollBarWidth = +styles.scrollBarWidth.replace("px", "");
        };

        /**
         * Creates the tooltip for the given element and shows it after the configured delay,
         * closes other tooltips
         *
         * @param {jsu} elm
         */
        this.create = (elm) => {
            let id = elm.attr($.attr.id);

            if (id && ext.helper.entry.isSeparator(id) === false) {
                ext.helper.toggle.addSidebarHoverClass();

                closeAllExcept(id);
                let existingTooltip = ext.elements.iframeBody.find("div." + $.cl.tooltip.wrapper + "[" + $.attr.id + "='" + id + "']");

                if (existingTooltip.length() > 0) { // tooltip is already there -> show it
                    if (existingTooltip[0].getBoundingClientRect().top !== 0) { // tooltip is positioned correctly
                        existingTooltip.addClass($.cl.general.visible);
                    }
                } else if (+config.tooltipDelay !== -1) { // no tooltip for the given element yet -> generate and show it after the configured delay (if delay > -1)
                    let data = ext.helper.entry.getDataById(id);

                    if (data) {
                        let tooltip = $("<div />")
                            .addClass($.cl.tooltip.wrapper)
                            .attr($.attr.id, id)
                            .appendTo(ext.elements.iframeBody);

                        addContent(tooltip, data);

                        if (timeout[id]) {
                            clearTimeout(timeout[id]);
                            timeout[id] = null;
                        }

                        timeout[id] = setTimeout(() => {
                            tooltip.addClass($.cl.general.visible);
                            tooltip.css("top", (elm[0].getBoundingClientRect().top + elm.realHeight() / 2 - tooltip.realHeight() / 2) + "px");

                            setHorizontalPosition(tooltip, elm);
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
         * Adds the title and url to the given tooltip
         *
         * @param {jsu} tooltip
         * @param {object} data
         */
        let addContent = (tooltip, data) => {
            if (config.tooltipContent === "all" || config.tooltipContent === "title") {
                $("<h3 />").text(data.title).appendTo(tooltip);
            }

            if (data.isDir) {
                $("<span />").text(data.children.length + " " + ext.helper.i18n.get("sidebar_dir_children")).appendTo(tooltip);
            } else if (config.tooltipContent === "all" || config.tooltipContent === "url") {
                $("<span />").text(data.url).appendTo(tooltip);
            }
        };

        /**
         * Sets the horizontal position of the given tooltip
         *
         * @param {jsu} tooltip
         * @param {jsu} elm
         */
        let setHorizontalPosition = (tooltip, elm) => {
            let isRtl = ext.helper.i18n.isRtl();
            let ref = {
                l: ext.elements.sidebar.realWidth() - config.scrollBarWidth,
                r: elm.realWidth() + 10
            };

            if (config.sidebarPosition === "right") {
                tooltip.css("right", ref[isRtl ? "l" : "r"] + "px");
            } else {
                tooltip.css("left", ref[isRtl ? "r" : "l"] + "px");
            }
        };

        /**
         * Closes all tooltips except the given one
         *
         * @param {int} except
         */
        let closeAllExcept = (except = null) => {
            Object.values(timeout).forEach((id) => {
                if (id) {
                    clearTimeout(timeout[id]);
                }
            });
            timeout = {};

            let tooltips = ext.elements.iframeBody.find("div." + $.cl.tooltip.wrapper + (except ? ":not([" + $.attr.id + "='" + except + "'])" : ""));
            let hasVisibleTooltips = false;

            tooltips.forEach((tooltip) => {
                if ($(tooltip).hasClass($.cl.general.visible)) {
                    hasVisibleTooltips = true;
                    return false;
                }
            });

            tooltips.removeClass($.cl.general.visible);
            $.delay(hasVisibleTooltips ? 300 : 0).then(() => {
                tooltips.remove();
                ext.helper.toggle.removeSidebarHoverClass();
            });
        };
    };

})(jsu);