($ => {
    "use strict";

    $.AppearanceHelper = function (s) {

        const previews = {
            sidebar: {template: "sidebar", styles: ["sidebar"]},
            general: {template: "sidebar", styles: ["sidebar"]},
            overlay: {template: "overlay", styles: ["overlay"]},
            indicator: {template: "indicator", styles: ["contentBase", "content"]}
        };

        const themeDefaults = {
            glass: {
                appearance: {
                    styles: {
                        sidebarHeaderHeight: "60px",
                        overlayHeaderHeight: "60px"
                    }
                }
            },
            focus: {
                behaviour: {
                    dirOpenDuration: 0,
                },
                appearance: {
                    styles: {
                        sidebarWidth: "300px",
                        sidebarHeaderHeight: "0px",
                        bookmarksFontSize: "12px",
                        directoriesIconSize: "14px",
                        bookmarksIconSize: "14px",
                        bookmarksLineHeight: "26px",
                        bookmarksDirIndentation: "20px",
                        bookmarksHorizontalPadding: "10px"
                    }
                }
            }
        };

        const presets = {
            "default": {
                sidebarHeaderHeight: {xs: 32, s: 36, l: 55},
                bookmarksFontSize: {xs: 11, s: 12, l: 16},
                bookmarksLineHeight: {xs: 20, s: 26, l: 45},
                sidebarWidth: {xs: 250, s: 300, l: 400},
                bookmarksDirIndentation: {xs: 20, s: 22, l: 30},
                bookmarksHorizontalPadding: {xs: 6, s: 10, l: 18},
                bookmarksIconSize: {xs: 12, s: 14, l: 18},
                directoriesIconSize: {xs: 12, s: 14, l: 18},
                scrollBarWidth: {xs: 10, s: 11, l: 12},
                tooltipFontSize: {xs: 9, s: 9, l: 12}
            },
            glass: {
                sidebarHeaderHeight: {xs: 32, s: 40, m: 60, l: 80}
            },
            focus: {
                bookmarksDirIndentation: {xs: 18, s: 20, m: 24, l: 28}
            }
        };

        const sidebarMaxSelectableWidth = 600;

        let lastTooltipChange = null;
        let tooltipTimeout = null;
        let theme = null;

        /**
         * Initialises the appearance settings
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                theme = s.helper.model.getData("a/theme");

                initPreviews().then(() => {
                    return initThemeSelector();
                }).then(() => {
                    $("[" + $.attr.theme + "]").forEach((elm) => { // hide all options, which aren't meant for the currently selected theme
                        if ($(elm).attr($.attr.theme) !== theme) {
                            $(elm).addClass($.cl.hidden);
                        }
                    });

                    ["directoryArrows"].forEach((field) => {
                        let checked = false;
                        if (s.helper.model.getData("a/" + field) === true) {
                            s.elm.checkbox[field].trigger("click");
                            checked = true;
                        }
                        s.elm.checkbox[field].children("input").data("initial", checked);
                    });

                    const surface = s.helper.model.getData("a/surface");
                    if (surface === "auto") {
                        s.elm.checkbox.surfaceColorAuto.trigger("click");
                    } else if (surface === "dark") {
                        s.elm.checkbox.surface.trigger("click");
                    }
                    s.elm.checkbox.surfaceColorAuto.children("input").data("initial", surface === "auto");
                    s.elm.checkbox.surface.children("input").data("initial", surface === "dark");

                    if (s.helper.model.getUserType() !== "default") {
                        const customCss = s.helper.model.getData("u/customCss");
                        s.elm.textarea.customCss[0].value = customCss;
                        s.elm.textarea.customCss.data("initial", customCss);
                        s.elm.textarea.customCss.attr("placeholder", "section#sidebar {\n   ...\n}");
                        s.elm.textarea.customCss.parent().append("<span>" + s.helper.i18n.get("settings_not_synced") + "</span>");
                    } else {
                        s.elm.textarea.customCss.addClass($.cl.settings.inactive);
                        s.addNoPremiumText(s.elm.textarea.customCss.parent());
                    }

                    const styles = s.helper.model.getData("a/styles");

                    Object.entries(styles).forEach(([key, value]) => {
                        if (s.elm.range[key]) {
                            value = ("" + value).replace("px", "");

                            if (key === "sidebarWidth" && +value > sidebarMaxSelectableWidth) { // wider sidebar is possible when the user expanded the width manually
                                s.elm.range[key].attr("max", value);
                            }

                            s.elm.range[key][0].value = value;
                            s.elm.range[key].data("initial", value);
                            s.elm.range[key].trigger("change");
                        } else if (s.elm.color[key]) {
                            if (key === "iconColor" && value === "auto") { // since 'auto' isn't a valid color for the picker, we choose the color of the first suggestion as predefined color
                                value = s.elm.color[key].siblings("span." + $.cl.settings.suggestion).eq(0).attr($.attr.value);
                                s.elm.select.iconColorType[0].value = "auto";
                            }

                            s.helper.form.changeColorValue(s.elm.color[key], value);
                            s.elm.color[key].data("initial", s.elm.color[key][0].value);
                        } else if (s.elm.select[key]) {
                            if (key === "fontFamily") {
                                value = value.replace(/(^'*)|('*$)/g, "");
                                if (s.elm.select[key].children("option[value='" + value + "']").length() === 0) {
                                    value = "default";
                                }
                            }

                            s.elm.select[key][0].value = value;
                            s.elm.select[key].data("initial", value);
                        } else if (s.elm.radio[key]) {
                            s.elm.radio[key][0].value = value;
                            s.elm.radio[key].trigger("change");
                            s.elm.radio[key].data("initial", value);
                        }
                    });

                    initEvents();

                    $.delay(100).then(() => {
                        updateAllPreviewStyles();
                        showHideSurfaceColorDependentOptions();
                        $(window).trigger("resize");
                        resolve();
                    });
                });
            });
        };

        /**
         * Saves the appearance settings
         * @returns {Promise}
         */
        this.save = () => {
            return new Promise((resolve) => {
                const newConfig = getCurrentConfig();

                $.api.storage.sync.get(["appearance"], (conf) => {
                    conf.appearance = conf.appearance || {};

                    if (!conf.appearance.theme && s.helper.model.getUserType() === "premium") { // explicitly save the theme for the premium users, since in the analytics only the users who switch back to the default theme will be listed
                        conf.appearance.theme = "default";
                    }

                    Object.entries(newConfig.appearance).forEach(([key, val]) => {
                        conf.appearance[key] = val;
                    });

                    $.api.storage.sync.set({appearance: conf.appearance}, () => {
                        $.api.storage.local.get(["utility"], (obj) => {
                            const utility = obj.utility || {};
                            utility.customCss = newConfig.utility.customCss;

                            $.api.storage.local.set({utility: utility}, () => {
                                resolve();
                            });
                        });
                    });
                });
            });
        };

        /**
         * Updates all previews
         */
        const updateAllPreviewStyles = () => {
            Object.keys(s.elm.preview).forEach((key) => {
                updatePreviewStyle(key);
            });
        };

        /**
         * Updates the given preview
         *
         * @param key
         */
        const updatePreviewStyle = (key) => {
            const config = getCurrentConfig();

            if (s.elm.preview[key]) {
                s.elm.preview[key].find("body").attr($.attr.theme, theme);
                s.elm.preview[key].find("head > style").remove();

                if (config.appearance.styles.fontFamily === "default") {
                    const fontInfo = s.helper.font.getDefaultFontInfo();
                    config.appearance.styles.fontFamily = fontInfo.name;
                }

                Object.assign(config.appearance.styles, s.helper.font.getFontWeights(config.appearance.styles.fontFamily));
                let css = previews[key].css;
                css += config.utility.customCss;

                Object.keys(config.appearance.styles).forEach((key) => {
                    let styleValue = config.appearance.styles[key];

                    if (key === "sidebarWidth") {
                        styleValue = styleValue.replace("px", "");
                        styleValue = Math.min(+styleValue, sidebarMaxSelectableWidth);
                        styleValue += "px";
                    }

                    css = css.replace(new RegExp("\"?%" + key + "\"?", "g"), styleValue);
                });

                s.elm.preview[key].find("[" + $.attr.style + "]").forEach((elm) => {
                    let style = $(elm).attr($.attr.style);
                    Object.keys(config.appearance.styles).forEach((key) => {
                        style = style.replace(new RegExp("\"?%" + key + "\"?", "g"), config.appearance.styles[key]);
                    });
                    elm.style.cssText = style;
                });

                s.elm.preview[key].find("[" + $.attr.settings.hideOnFalse + "]").forEach((elm) => {
                    const attr = $(elm).attr($.attr.settings.hideOnFalse);

                    if (typeof config.appearance[attr] === "undefined" || config.appearance[attr] === false) {
                        $(elm).css("display", "none");
                    } else {
                        $(elm).css("display", "block");
                    }
                });

                s.elm.preview[key].find("head").append("<style>" + css + "</style>");

                if (config.appearance.surface === "dark" || (config.appearance.surface === "auto" && s.helper.stylesheet.getSystemSurface() === "dark")) {
                    s.elm.preview[key].find("body").addClass($.cl.page.dark);
                } else {
                    s.elm.preview[key].find("body").removeClass($.cl.page.dark);
                }

                if (config.appearance.directoryArrows) {
                    s.elm.preview[key].find("div#bookmarkBox a.dir").addClass($.cl.sidebar.dirArrow);
                } else {
                    s.elm.preview[key].find("div#bookmarkBox a.dir").removeClass($.cl.sidebar.dirArrow);
                }

                updatePreviewTooltip(s.elm.preview[key]);
                updatePreviewSidebarHeader(s.elm.preview[key]);
                updatePreviewIndicator(s.elm.preview[key]);
            } else if (key === "icon") {
                s.helper.model.call("updateIcon", {
                    name: config.appearance.styles.iconShape,
                    color: s.elm.select.iconColorType[0].value === "auto" ? "auto" : config.appearance.styles.iconColor,
                    onlyCurrentTab: true
                });
            }
        };

        /**
         * Updates the preview of the indicator
         *
         * @param {jsu} preview
         */
        const updatePreviewIndicator = (preview) => {
            const indicator = preview.find("div#redeviation-bs-indicator");

            if (indicator.length() > 0) {
                const height = +s.elm.range.toggleArea_height[0].value;
                const top = +s.elm.range.toggleArea_top[0].value;

                indicator.css({
                    height: height + "%",
                    top: top + "%"
                });

                if (height === 100) {
                    indicator.addClass($.cl.settings.appearance.preview.fullHeight);
                } else {
                    indicator.removeClass($.cl.settings.appearance.preview.fullHeight);
                }
            }
        };

        /**
         * Updates the preview of the sidebar header
         *
         * @param {jsu} preview
         */
        const updatePreviewSidebarHeader = (preview) => {
            const sidebar = preview.find("section#sidebar");

            if (sidebar.length() > 0) {
                const sidebarHeader = sidebar.find("> header");
                sidebarHeader.find("> h1").removeClass($.cl.hidden);
                sidebarHeader.find("> h1 > span").removeClass($.cl.hidden);

                ["label", "amount"].forEach((type) => {
                    let lastOffset = null;

                    sidebarHeader.children("a").forEach((icon) => {
                        if (lastOffset === null) {
                            lastOffset = icon.offsetTop;
                        } else if (lastOffset !== icon.offsetTop || sidebarHeader.find("> h1")[0].offsetTop === 0) { // header elements  are not in one line anymore -> header to small -> remove some markup
                            if (type === "label") {
                                sidebarHeader.find("> h1 > span").addClass($.cl.hidden);
                            } else if (type === "amount") {
                                sidebarHeader.find("> h1").addClass($.cl.hidden);
                            }
                            return false;
                        }
                    });
                });
            }
        };

        /**
         * Updates the preview of the tooltip,
         * shows the tooltip if the last change was within the last 2s
         *
         * @param {jsu} preview
         */
        const updatePreviewTooltip = (preview) => {
            const tooltip = preview.find("div.tooltip");
            const entry = preview.find("li > a.hover");

            if (tooltip.length() > 0 && entry.length() > 0) {
                if (+new Date() - lastTooltipChange < 2000) {
                    const rect = entry[0].getBoundingClientRect();
                    tooltip.addClass($.cl.visible);

                    let left = rect.x - tooltip[0].offsetWidth;
                    if (s.helper.i18n.isRtl()) {
                        left = rect.x + entry[0].offsetWidth;
                    }

                    tooltip.css({
                        top: (rect.y + entry.realHeight() / 2 - tooltip.realHeight() / 2) + "px",
                        left: left + "px"
                    });
                } else {
                    tooltip.removeClass($.cl.visible);
                }
            }
        };

        /**
         * Returns the current values of the appearance configuration
         *
         * @returns object
         */
        const getCurrentConfig = () => {
            const styles = s.helper.model.getData("a/styles");
            let surface = s.helper.checkbox.isChecked(s.elm.checkbox.surface) ? "dark" : "light";
            if (s.helper.checkbox.isChecked(s.elm.checkbox.surfaceColorAuto)) {
                surface = "auto";
            }

            const ret = {
                utility: {
                    customCss: s.helper.model.getUserType() === "default" ? "" : s.elm.textarea.customCss[0].value.replace(/[\u200B-\u200D\uFEFF]/g, "").trim()
                },
                appearance: {
                    surface: surface,
                    directoryArrows: s.helper.checkbox.isChecked(s.elm.checkbox.directoryArrows),
                    highContrast: false,
                    showIndicator: true,
                    showIndicatorIcon: true,
                    showBookmarkIcons: true,
                    showDirectoryIcons: true,
                    styles: {}
                }
            };

            Object.keys(styles).forEach((key) => {
                if (s.elm.range[key]) {
                    const unit = s.elm.range[key].attr($.attr.settings.range.unit) || "";
                    ret.appearance.styles[key] = s.elm.range[key][0].value + unit;
                } else if (s.elm.color[key]) {
                    const colorValue = s.helper.form.getColorValue(key, s.elm.color[key][0].value);
                    ret.appearance.styles[key] = colorValue.color;

                    if (key === "colorScheme") {
                        const defaultColors = s.helper.model.getDefaultColors(theme);
                        const lum = colorValue.luminance ? colorValue.luminance : 0;
                        ret.appearance.styles.foregroundColor = defaultColors.foregroundColor[lum > 170 ? "dark" : "light"];

                        if (lum > 215) {
                            ret.appearance.highContrast = true;
                        }
                    }
                } else if (s.elm.select[key]) {
                    ret.appearance.styles[key] = s.elm.select[key][0].value;
                    if (key === "fontFamily" && ret.appearance.styles[key] !== "default") { // wrap ticks around the font name to prevent Chrome to ignore fonts with spaces or special characters in the css definition
                        ret.appearance.styles[key] = "'" + ret.appearance.styles[key] + "'";
                    }
                } else if (s.elm.radio[key]) {
                    ret.appearance.styles[key] = s.elm.radio[key][0].value;
                }
            });

            Object.entries({
                indicatorWidth: "showIndicator",
                indicatorIconSize: "showIndicatorIcon",
                bookmarksIconSize: "showBookmarkIcons",
                directoriesIconSize: "showDirectoryIcons"
            }).forEach(([field, attr]) => {
                if (parseInt(ret.appearance.styles[field]) === 0) {
                    ret.appearance[attr] = false;
                }
            });

            if (s.elm.select.iconColorType[0].value === "auto") {
                ret.appearance.styles.iconColor = "auto";
            }

            return ret;
        };

        /**
         * Applies the given theme,
         * resets the current style settings and sets the default configuration for the given theme,
         * will perform a browser refresh afterwards to update the previews, options, etc...
         *
         * @param {string} theme
         */
        const changeTheme = (theme) => {
            $.api.storage.sync.get(["behaviour", "appearance"], (conf) => {
                conf.behaviour = conf.behaviour || {};
                conf.appearance = conf.appearance || {};
                conf.appearance.styles = conf.appearance.styles || {};
                conf.appearance.theme = theme;

                if (conf.appearance.surface !== "auto") {
                    conf.appearance.surface = "light";
                }

                delete conf.behaviour.dirOpenDuration; // remove dirOpenDuration property, since all themes except "focus" use the default value

                Object.keys(conf.appearance.styles).forEach((key) => {
                    if (!key.startsWith("indicator") && !key.startsWith("icon")) { // remove all styles, but keep some (indicator, icon, ...)
                        delete conf.appearance.styles[key];
                    }
                });

                const defaultColors = s.helper.model.getDefaultColors(theme);
                Object.entries(defaultColors).forEach(([key, val]) => { // apply the default colors for the selected theme
                    conf.appearance.styles[key] = val.light;
                });


                if (themeDefaults[theme]) {
                    Object.entries(themeDefaults[theme]).forEach(([category, values]) => {
                        Object.entries(values).forEach(([key, value]) => {
                            if (typeof value === "object") {
                                Object.entries(value).forEach(([k, v]) => {
                                    conf[category][key][k] = v;
                                });
                            } else {
                                conf[category][key] = value;
                            }
                        });
                    });
                }

                $.api.storage.sync.set({appearance: conf.appearance, behaviour: conf.behaviour}, () => {
                    s.helper.model.call("reinitialize");
                    s.showSuccessMessage("theme_changed");
                    $.delay(1500).then(() => {
                        location.reload(true);
                    });
                });
            });
        };

        /**
         * Initializes the theme selector
         */
        const initThemeSelector = () => {
            const displayThemes = s.helper.model.getUserType() === "premium";
            if (displayThemes === false) {
                s.addNoPremiumText(s.elm.appearance.themeListWrapper.children("div"));
            }

            s.elm.appearance.selectedTheme.children("span").text(s.helper.i18n.get("settings_theme_" + theme));

            s.elm.appearance.themeListWrapper.find("> ul > li").forEach((elm) => {
                const elmObj = $(elm);
                const caption = elmObj.children("div");
                const availableTheme = elmObj.attr($.attr.name);

                if (theme === availableTheme) {
                    $("<span></span>").addClass($.cl.active).text(s.helper.i18n.get("settings_installed_theme_info")).appendTo(caption);
                } else if (displayThemes) {
                    $("<a></a>").text(s.helper.i18n.get("settings_install_theme")).appendTo(caption);
                }
            });

            if (displayThemes) {
                s.elm.appearance.themeListWrapper.find("> ul > li > div > a").on("click", (e) => {
                    e.preventDefault();
                    const theme = $(e.currentTarget).parents("li").eq(0).attr($.attr.name);
                    changeTheme(theme);
                });
            }

            s.elm.appearance.themeListWrapper.css("display", "none");
            $([s.elm.appearance.showThemes, s.elm.appearance.selectedTheme]).on("click", () => { // toggle the list with all available themes
                if (s.elm.appearance.themeListWrapper.hasClass($.cl.visible)) {
                    s.elm.appearance.themeListWrapper.removeClass($.cl.visible);

                    $.delay(300).then(() => {
                        s.elm.appearance.themeListWrapper.css("display", "none");
                    });
                } else {
                    s.elm.appearance.themeListWrapper.css("display", "block");

                    $.delay(0).then(() => {
                        s.elm.appearance.themeListWrapper.addClass($.cl.visible);
                    });
                }
            });
        };

        /**
         * Initialises the previews
         *
         * @returns {Promise}
         */
        const initPreviews = () => {
            return new Promise((resolve) => {
                const previewAmount = Object.keys(previews).length;

                const styles = {};
                let styleAmount = 0;
                Object.entries(previews).forEach(([key, preview]) => { // extend the styles of the preview with the selected theme
                    styles[key] = s.helper.stylesheet.getStylesheetFilesWithThemes(preview.styles);
                    styleAmount += styles[key].length;
                });

                let previewsLoaded = 0;
                let stylesLoaded = 0;

                const resolveWhenAllFinished = () => { // resolves the promise, once all preview html and css is loaded
                    if (previewsLoaded === previewAmount && stylesLoaded === previewAmount) {
                        resolve();
                    }
                };

                Object.keys(previews).forEach((key) => {
                    previews[key].css = "";

                    s.elm.preview[key] = $("<iframe></iframe>")
                        .attr($.attr.settings.appearance, key)
                        .appendTo(s.elm.body);

                    $.xhr($.api.extension.getURL("html/template/" + previews[key].template + ".html")).then((xhr) => {
                        if (xhr && xhr.responseText) {
                            let html = xhr.responseText;
                            html = html.replace(/__DATE__CREATED__/g, s.helper.i18n.getLocaleDate(new Date("2016-11-25")));
                            html = html.replace(/__POSITION__/g, s.helper.i18n.isRtl() ? "left" : "right");

                            const previewBody = s.elm.preview[key].find("body");
                            previewBody.html(html);
                            previewBody.parent("html").attr("dir", s.helper.i18n.isRtl() ? "rtl" : "ltr");

                            s.helper.i18n.parseHtml(s.elm.preview[key]);
                            s.helper.font.addStylesheet(s.elm.preview[key]);

                            previewsLoaded++;
                            resolveWhenAllFinished();
                        }
                    });

                    styles[key].forEach((stylesheet) => {
                        $.xhr($.api.extension.getURL("css/" + stylesheet + ".css")).then((xhr) => {
                            if (xhr && xhr.responseText) {
                                previews[key].css += xhr.responseText;
                                stylesLoaded++;
                                resolveWhenAllFinished();
                            }
                        });
                    });
                });
            });
        };

        /**
         * Changes all color related options to match the selected surface color
         */
        const handleSurfaceChange = () => {
            const config = getCurrentConfig();
            const surface = config.appearance.surface === "auto" ? s.helper.stylesheet.getSystemSurface() : config.appearance.surface;
            const defaultColors = s.helper.model.getDefaultColors(theme);

            ["textColor", "bookmarksDirColor", "sidebarMaskColor", "colorScheme", "hoverColor"].forEach((colorName) => {
                if (colorName === "colorScheme" &&
                    s.elm.color[colorName][0].value !== defaultColors[colorName].light &&
                    s.elm.color[colorName][0].value !== defaultColors[colorName].dark
                ) { // only change, if it was the default color before
                    return;
                }

                const color = defaultColors[colorName][surface];
                s.helper.form.changeColorValue(s.elm.color[colorName], color);
            });

            showHideSurfaceColorDependentOptions();
        };

        /**
         * Hide all surface color dependent options for the user, if the surface of the extension should adapt the system surface settings
         */
        const showHideSurfaceColorDependentOptions = () => {
            const styles = s.helper.model.getSurfaceColorDependentStyles();
            const config = getCurrentConfig();
            const isAuto = config.appearance.surface === "auto";
            const systemSurface = s.helper.stylesheet.getSystemSurface();

            if (isAuto && (
                s.helper.checkbox.isChecked(s.elm.checkbox.surface) && systemSurface === "light" ||
                !s.helper.checkbox.isChecked(s.elm.checkbox.surface) && systemSurface === "dark"
            )) { // adapt surface slider to match the current system surface
                s.elm.checkbox.surface.trigger("click");
            }

            s.elm.appearance.surfaceWrapper.attr($.attr.type, config.appearance.surface);

            for (const style of styles) {
                const box = s.elm.color[style].parents("div." + $.cl.settings.box);

                if (isAuto) {
                    box.addClass($.cl.hidden);
                } else {
                    box.removeClass($.cl.hidden);
                }
            }
        };

        /**
         * Initialises the eventhandlers
         */
        const initEvents = () => {
            s.elm.appearance.presetWrapper.children("a").on("click", (e) => {
                const type = $(e.currentTarget).attr($.attr.type);
                const defaults = s.helper.model.getData("a/styles", true);
                const themePresets = Object.assign({}, presets["default"], presets[theme]);

                Object.entries(themePresets).forEach(([key, values]) => {
                    if (values[type]) {
                        s.elm.range[key][0].value = values[type];
                    } else {
                        s.elm.range[key][0].value = defaults[key].replace("px", "");
                    }

                    s.elm.range[key].trigger("change");
                });
            });

            s.elm.select.iconColorType.on("change input", (e) => { //
                if (e.currentTarget.value === "auto") {
                    s.elm.appearance.iconColorWrapper.addClass($.cl.hidden);
                } else {
                    s.elm.appearance.iconColorWrapper.removeClass($.cl.hidden);
                }

                updatePreviewStyle("icon");
            }).trigger("input");

            s.elm.range.tooltipFontSize.on("change input", () => { // show tooltip in preview for 2s when changing the font size
                lastTooltipChange = +new Date();
                if (tooltipTimeout) {
                    clearTimeout(tooltipTimeout);
                }

                tooltipTimeout = setTimeout(() => {
                    updatePreviewStyle("sidebar");
                }, 2001);
            });

            s.elm.appearance.content.find("input, textarea, select").on("change input", (e) => {
                const elm = $(e.currentTarget);
                const initialVal = elm.data("initial");
                let val = e.currentTarget.value;

                if (typeof initialVal !== "undefined") {

                    if (elm.attr("type") === "checkbox") {
                        val = e.currentTarget.checked;

                        if ($(elm).parents("div." + $.cl.settings.box)[0] === s.elm.appearance.surfaceWrapper[0]) { // surface checkbox -> change some other colors, too
                            handleSurfaceChange();
                        }
                    }

                    const box = $(e.currentTarget).parents("div." + $.cl.settings.box).eq(0);
                    if (val !== initialVal) {
                        if (box.children("a." + $.cl.settings.revert).length() === 0) {
                            $("<a href='#'></a>").addClass($.cl.settings.revert).data("elm", box).appendTo(box);
                        }
                    } else {
                        box.children("a." + $.cl.settings.revert).remove();
                    }

                    const path = s.helper.menu.getPath();
                    updatePreviewStyle(path[1]);
                }
            });

            s.elm.appearance.content.on("click", "a." + $.cl.settings.revert, (e) => { // revert the changes of the specific field
                e.preventDefault();
                $(e.currentTarget).parent("div." + $.cl.settings.box).find("input, select").forEach((elm) => {
                    const elmObj = $(elm);
                    const value = elmObj.data("initial");

                    if (elmObj.data("picker")) {
                        s.helper.form.changeColorValue(elmObj, value);
                    } else if (typeof value !== "undefined") {
                        if (elmObj.attr("type") === "checkbox" && typeof value === "boolean") { // revert checkbox
                            if (elm.checked !== value) { // trigger click if value has changed
                                elmObj.parent("div").trigger("click");
                            }
                        } else { // revert any other field
                            elm.value = value;
                            elmObj.trigger("change");
                        }
                    }
                });
            });

            $(document).on($.opts.events.pageChanged, (e) => {
                if (e.detail.path && e.detail.path[0] === "appearance") {
                    updatePreviewStyle(e.detail.path[1]);
                }
            });

            $(document).on($.opts.events.systemColorChanged, () => {
                showHideSurfaceColorDependentOptions();
                updateAllPreviewStyles();
                updatePreviewStyle("icon");
            });
        };
    };

})(jsu);