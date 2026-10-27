($ => {
    "use strict";

    $.SettingsPreviewHelper = function (s) {

        let iframe = null;
        let lastTooltipChange = 0; // the tooltip is only shown after one of the tooltip settings was changed
        let tooltipTimeout = null;
        const themeCss = {};

        const SIDEBAR_WIDTH = 280;
        const TOOLTIP_DURATION = 2000;

        /**
         * Builds the sidebar preview and binds the events to update it
         *
         * @returns {Promise}
         */
        this.init = async () => {
            [
                s.helper.form.elements.select.tooltipContent,
                s.helper.form.elements.checkbox.tooltipAdditionalInfo.children("input"),
                s.helper.form.elements.range.tooltipFontSize
            ].forEach((elm) => {
                elm.on("change input", showTooltip);
            });

            $(document).on($.opts.events.systemColorChanged, async () => {
                await this.update();
            });

            await this.rebuild();
        };

        /**
         * Builds the sidebar preview from scratch, e.g. because the text direction changed
         *
         * @returns {Promise}
         */
        this.rebuild = async () => {
            if (iframe) {
                iframe.remove();
            }

            iframe = $("<iframe></iframe>")
                .addClass("sidebar-preview")
                .appendTo("body");

            const xhr = await $.xhr($.api.runtime.getURL("html/template/sidebar.html"));
            if (xhr && xhr.responseText) {
                const isRtl = s.helper.i18n.isRtl();
                const previewBody = iframe.find("body");
                previewBody.html(xhr.responseText.replace(/__POSITION__/g, isRtl ? "left" : "right"));
                previewBody.parent("html").attr("dir", isRtl ? "rtl" : "ltr");
                this.translate();
            }

            await loadThemeCss();
            await this.update();
        };

        /**
         * Applies the language variables to the sidebar preview
         */
        this.translate = () => {
            if (iframe) {
                s.helper.i18n.parseHtml(iframe);
            }
        };

        /**
         * Updates the sidebar preview to reflect the current state of the form
         *
         * @returns {Promise}
         */
        this.update = async () => {
            if (!iframe) { // not built yet
                return;
            }

            const config = await s.helper.config.get();
            const body = iframe.find("body");

            // fall back to the defaults for styles which are neither stored nor part of the form (e.g. sidebarWidth)
            const styles = Object.assign({}, s.helper.model.getDefaultData().appearance.styles, config.appearance.styles, s.helper.font.getFontWeights());
            styles.sidebarWidth = SIDEBAR_WIDTH + "px";

            body.attr($.attr.theme, config.appearance.theme);

            iframe.find("head > style").remove();
            const css = (themeCss[config.appearance.theme] || themeCss["default"] || "") + config.utility.customCss;
            iframe.find("head").append("<style>" + replaceStyleVars(css, styles) + "</style>");

            iframe.find("[" + $.attr.style + "]").forEach((elm) => {
                elm.style.cssText = replaceStyleVars($(elm).attr($.attr.style), styles);
            });

            iframe.find("[" + $.attr.settings.hideOnValue + "]").forEach((elm) => {
                const [key, value] = $(elm).attr($.attr.settings.hideOnValue).split(";");
                const expected = value === "true" ? true : (value === "false" ? false : value);
                const confValue = config.appearance[key] || styles[key] || config.behaviour[key];
                const hidden = confValue === expected || (typeof confValue === "undefined" && expected === false);
                $(elm).css("display", hidden ? "none" : "block");
            });

            const isDark = config.appearance.surface === "dark" || (config.appearance.surface === "auto" && s.helper.stylesheet.getSystemSurface() === "dark");
            s.setConditionalClass(body, $.cl.page.dark, isDark);
            s.setConditionalClass(iframe.find("div#bookmarkBox a.dir"), $.cl.sidebar.dirArrow, config.appearance.directoryArrows);

            updateTooltip();
        };

        /**
         * Shows the tooltip in the preview for a while after one of the tooltip settings was changed
         */
        const showTooltip = () => {
            lastTooltipChange = +new Date();
            if (tooltipTimeout) {
                clearTimeout(tooltipTimeout);
            }
            tooltipTimeout = setTimeout(async () => { // hide the tooltip again
                await this.update();
            }, TOOLTIP_DURATION + 1);
        };

        /**
         * Positions the tooltip next to the hovered entry of the preview, if a tooltip setting was changed recently, or hides it otherwise
         */
        const updateTooltip = () => {
            const tooltip = iframe.find("div.tooltip");
            const entry = iframe.find("li > a.hover");
            if (tooltip.length() === 0 || entry.length() === 0) {
                return;
            }

            const rect = entry[0].getBoundingClientRect();
            if (+new Date() - lastTooltipChange >= TOOLTIP_DURATION || rect.width === 0) { // no recent change or the preview is not rendered (e.g. another tab is shown) -> the position can't be determined
                tooltip.removeClass($.cl.visible);
                return;
            }

            tooltip.addClass($.cl.visible);

            const left = s.helper.i18n.isRtl() ? rect.x + entry[0].offsetWidth : rect.x - tooltip[0].offsetWidth;
            tooltip.css({
                top: (rect.y + entry.realHeight() / 2 - tooltip.realHeight() / 2) + "px",
                left: left + "px"
            });
        };

        /**
         * Loads the sidebar stylesheets of every theme, which is selectable on the page (only once)
         *
         * @returns {Promise}
         */
        const loadThemeCss = async () => {
            if (Object.keys(themeCss).length > 0) {
                return;
            }

            const themes = [];
            $(`a.btn[${$.attr.type}='theme'][${$.attr.value}]`).forEach((elm) => {
                themes.push($(elm).attr($.attr.value));
            });

            for (const theme of themes) {
                themeCss[theme] = "";
                for (const stylesheet of s.helper.stylesheet.getStylesheetFilesWithThemes(["sidebar"], theme)) {
                    const xhr = await $.xhr($.api.runtime.getURL("css/" + stylesheet + ".css"));
                    if (xhr && xhr.responseText) {
                        themeCss[theme] += xhr.responseText;
                    }
                }
            }
        };

        /**
         * Replaces the placeholders (%name) in the given css with the values of the given styles
         *
         * @param {string} css
         * @param {object} styles
         * @returns {string}
         */
        const replaceStyleVars = (css, styles) => {
            Object.keys(styles).forEach((key) => {
                css = css.replace(new RegExp("\"?%" + key + "\"?", "g"), styles[key]);
            });
            return css;
        };
    };

})(jsu);
