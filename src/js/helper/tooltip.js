($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.TooltipHelper = function (ext) {

        let timeout = {};
        let config = {};
        let styles = {};
        let isSidepanel = false;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            config = ext.helper.model.getData(["b/tooltipContent", "b/tooltipAdditionalInfo", "b/tooltipDelay", "b/sidebarPosition"]);
            isSidepanel = ext.helper.utility.getPageType() === "sidepanel";
            styles = ext.helper.model.getData("a/styles");
            config.scrollBarWidth = +(styles.scrollBarWidth.toString()).replace("px", "");
        };

        /**
         * Creates the tooltip for the given element and shows it after the configured delay,
         * closes other tooltips
         *
         * @param {jsu} elm
         */
        this.create = (elm) => {
            const id = elm.attr($.attr.id);

            if (id && ext.helper.entry.isSeparator(id) === false) {
                ext.helper.toggle.addSidebarHoverClass();

                closeAllExcept(id);
                const existingTooltip = ext.elm.iframeBody.find("div." + $.cl.tooltip.wrapper + "[" + $.attr.id + "='" + id + "']");

                if (existingTooltip.length() > 0) { // tooltip is already there -> show it
                    setVerticalPosition(existingTooltip, elm);
                    setHorizontalPosition(existingTooltip, elm);
                } else if (+config.tooltipDelay !== -1) { // no tooltip for the given element yet -> generate and show it after the configured delay (if delay > -1)
                    const data = ext.helper.entry.getDataById(id);

                    if (data) {
                        const tooltip = $("<div></div>")
                            .addClass($.cl.tooltip.wrapper)
                            .attr($.attr.id, id)
                            .appendTo(ext.elm.iframeBody);

                        addContent(tooltip, data);

                        if (timeout[id]) {
                            clearTimeout(timeout[id]);
                            timeout[id] = null;
                        }

                        setVerticalPosition(tooltip, elm);
                        setHorizontalPosition(tooltip, elm);

                        timeout[id] = setTimeout(() => {
                            tooltip.addClass($.cl.visible);
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
        const addContent = (tooltip, data) => {
            if (config.tooltipContent === "all" || config.tooltipContent === "title") {
                $("<h3></h3>").text(data.title).appendTo(tooltip);
            }

            if (data.isDir) {
                $("<span></span>").text(data.children.length + " " + ext.helper.i18n.get("sidebar_dir_children")).appendTo(tooltip);
            } else if (config.tooltipContent === "all" || config.tooltipContent === "url") {
                $("<span></span>").text(data.url).appendTo(tooltip);
            }

            if (ext.helper.search.isResultsVisible()) {
                const parentInfos = ext.helper.entry.getParentsById(data.id);

                if (parentInfos.length > 0) {
                    const breadcrumb = $("<ul></ul>").addClass($.cl.sidebar.breadcrumb).appendTo(tooltip);
                    parentInfos.forEach((parentInfo) => {
                        $("<li></li>").text(parentInfo.title).prependTo(breadcrumb);
                    });
                }
            }

            if (config.tooltipAdditionalInfo && data.additionalInfo && data.additionalInfo.desc) {
                const additionalInfo = data.additionalInfo.desc.replace(/\n/g, "<br />");
                $("<p></p>").html(additionalInfo).appendTo(tooltip);
            }
        };

        /**
         * Sets the vertical position of the given tooltip
         *
         * @param {jsu} tooltip
         * @param {jsu} elm
         */
        const setVerticalPosition = (tooltip, elm) => {
            let top = elm[0].getBoundingClientRect().top;
            if (isSidepanel) {
                top += elm.realHeight();
            } else {
                top += (elm.realHeight() / 2) - (tooltip.realHeight() / 2);
            }
            tooltip.css("top", top + "px");
        };

        /**
         * Sets the horizontal position of the given tooltip
         *
         * @param {jsu} tooltip
         * @param {jsu} elm
         */
        const setHorizontalPosition = (tooltip, elm) => {
            const isRtl = ext.helper.i18n.isRtl();

            if (isSidepanel) {
                const left = elm[0].getBoundingClientRect().left;
                const padding = +(styles.bookmarksHorizontalPadding.toString()).replace("px", "");
                tooltip.css(isRtl ? "right" : "left", (left + padding / 2) + "px");
            } else {
                const ref = {
                    l: ext.elm.sidebar.realWidth() - config.scrollBarWidth,
                    r: elm.realWidth() + 10
                };

                if (config.sidebarPosition === "right") {
                    tooltip.css("right", ref[isRtl ? "l" : "r"] + "px");
                } else {
                    tooltip.css("left", ref[isRtl ? "r" : "l"] + "px");
                }
            }
        };

        /**
         * Closes all tooltips except the given one
         *
         * @param {int} except
         */
        const closeAllExcept = async (except = null) => {
            Object.values(timeout).forEach((id) => {
                if (id) {
                    clearTimeout(timeout[id]);
                }
            });
            timeout = {};

            const tooltips = ext.elm.iframeBody.find("div." + $.cl.tooltip.wrapper + (except ? ":not([" + $.attr.id + "='" + except + "'])" : ""));
            let hasVisibleTooltips = false;

            tooltips.forEach((tooltip) => {
                if ($(tooltip).hasClass($.cl.visible)) {
                    hasVisibleTooltips = true;
                    return false;
                }
            });

            tooltips.removeClass($.cl.visible);
            await $.delay(hasVisibleTooltips ? 300 : 0);
            tooltips.remove();
            ext.helper.toggle.removeSidebarHoverClass();
        };
    };

})(jsu);