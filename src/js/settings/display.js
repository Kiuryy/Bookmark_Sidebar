($ => {
    "use strict";

    $.SettingsDisplayHelper = function (s) {

        const themeDefaults = { // null = reset to default
            "default": {
                sidebarHeaderHeight: null,
                bookmarksFontSize: null,
                directoriesIconSize: null,
                bookmarksIconSize: null,
                bookmarksLineHeight: null,
                bookmarksDirIndentation: null,
                bookmarksHorizontalPadding: null
            },
            glass: {
                sidebarHeaderHeight: 60,
                bookmarksFontSize: null,
                directoriesIconSize: null,
                bookmarksIconSize: null,
                bookmarksLineHeight: null,
                bookmarksDirIndentation: null,
                bookmarksHorizontalPadding: null
            },
            soft: {
                sidebarHeaderHeight: 60,
                bookmarksFontSize: null,
                directoriesIconSize: null,
                bookmarksIconSize: null,
                bookmarksLineHeight: 36,
                bookmarksDirIndentation: null,
                bookmarksHorizontalPadding: 14
            },
            focus: {
                sidebarHeaderHeight: 0,
                bookmarksFontSize: 12,
                directoriesIconSize: 14,
                bookmarksIconSize: 14,
                bookmarksLineHeight: 26,
                bookmarksDirIndentation: 20,
                bookmarksHorizontalPadding: 10
            }
        };

        const presets = { // missing sizes = reset to default
            "default": {
                sidebarHeaderHeight: {xs: 32, s: 36, l: 55},
                bookmarksFontSize: {xs: 11, s: 12, l: 16},
                bookmarksLineHeight: {xs: 20, s: 26, l: 45},
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
            soft: {
                sidebarHeaderHeight: {xs: 48, s: 54, m: 60, l: 72},
                bookmarksLineHeight: {xs: 24, s: 30, m: 36, l: 45},
                bookmarksHorizontalPadding: {xs: 8, s: 10, m: 14, l: 18}
            },
            focus: {
                bookmarksDirIndentation: {xs: 18, s: 20, m: 24, l: 28}
            }
        };

        /**
         * Binds the events of the fields defining how the sidebar is displayed:
         * mode, visibility rules, theme, size presets and surface
         */
        this.init = () => {
            const elements = s.helper.form.elements;

            $(`a[${$.attr.type}='mode']`).on("click", (e) => {
                e.preventDefault();
                s.helper.form.setValue("select", "mode", $(e.currentTarget).attr($.attr.value));
            });

            elements.select.mode.on("change", (e) => {
                handleModeChange(e.currentTarget.value);
            });

            elements.select.visibility.on("change", (e) => {
                handleVisibilityChange(e.currentTarget.value);
            });

            $(`a[${$.attr.type}='theme']`).on("click", (e) => {
                e.preventDefault();
                s.helper.form.setValue("select", "theme", $(e.currentTarget).attr($.attr.value));
            });

            elements.select.theme.on("change", async (e) => {
                await handleThemeChange(e.currentTarget.value);
            });

            $("div.presets a").on("click", async (e) => {
                e.preventDefault();
                await applyPreset($(e.currentTarget).attr($.attr.value));
            });

            [elements.checkbox.surface, elements.checkbox.surfaceColorAuto].forEach((checkbox) => {
                checkbox.children("input").on("change input", async () => {
                    await handleSurfaceChange();
                });
            });
        };

        /**
         * Brings the page into the state matching the stored mode, visibility, theme and surface
         *
         * @returns {Promise}
         */
        this.applyInitialState = async () => {
            const elements = s.helper.form.elements;
            elements.select.mode.trigger("change");
            elements.select.visibility.trigger("change");
            elements.select.theme.trigger("change");

            const surface = await s.helper.model.getData("a/surface") || "auto";
            if (surface === "auto") {
                if (!s.helper.checkbox.isChecked(elements.checkbox.surfaceColorAuto)) {
                    elements.checkbox.surfaceColorAuto.trigger("click");
                }
            } else if (s.helper.checkbox.isChecked(elements.checkbox.surface) !== (surface === "dark")) {
                elements.checkbox.surface.trigger("click");
            }
        };

        /**
         * Highlights the wildcards ([*]) in the explanations of the visibility rules,
         * has to be called again after each parse of the language variables, since that replaces the explanations
         */
        this.highlightVisibilityRuleWildcards = () => {
            $("div.visibility-rules ul > li").forEach((elm) => {
                const text = $(elm).text();
                $(elm).html(text.replace(/(?<!\/)\*/g, "<em>*</em>"));
            });
        };

        /**
         * Updates the page to the given mode,
         * opening the sidebar via the extension icon is only possible in overlay mode, otherwise the icon opens the side panel
         *
         * @param {string} mode
         */
        const handleModeChange = (mode) => {
            $("body").attr("data-mode", mode);

            const openAction = s.helper.form.elements.select.openAction;
            const iconOption = openAction.children("option[value='icon']")[0];
            iconOption.hidden = mode !== "overlay";
            iconOption.disabled = mode !== "overlay";

            if (mode !== "overlay" && openAction[0].value === "icon") {
                s.helper.form.setValue("select", "openAction", s.helper.model.getData("b/openAction", true));
            }
        };

        /**
         * Shows the url rules unless the sidebar is visible on every page,
         * an empty rule field gets filled with the stored rules of the selected list
         *
         * @param {string} visibility
         */
        const handleVisibilityChange = (visibility) => {
            const rulesField = s.helper.form.elements.textarea.visibilityFilter;
            s.setConditionalClass($("div.visibility-rules"), $.cl.hidden, visibility === "always");

            if (visibility !== "always" && rulesField[0].value.length === 0) {
                rulesField[0].value = s.helper.model.getData("b/" + visibility).join("\n");
            }
        };

        /**
         * Updates the page to the given theme and applies its default sizes (not while the page is loading, since the stored values are shown then)
         *
         * @param {string} theme
         * @returns {Promise}
         */
        const handleThemeChange = async (theme) => {
            $("body").attr("data-theme", theme);
            await updateDefaultValues();

            if (s.isInitializing() || !themeDefaults[theme]) {
                return;
            }

            Object.entries(themeDefaults[theme]).forEach(([key, value]) => {
                if (s.helper.form.elements.range[key]) {
                    setRangeValue(key, value);
                }
            });

            await handleSurfaceChange();
        };

        /**
         * Applies the size preset with the given name (xs, s, m, l) of the current theme to the range fields
         *
         * @param {string} size
         * @returns {Promise}
         */
        const applyPreset = async (size) => {
            const conf = await s.helper.config.get();
            const themePresets = Object.assign({}, presets["default"], presets[conf.appearance.theme]);

            Object.entries(themePresets).forEach(([key, values]) => {
                setRangeValue(key, values[size] || null);
            });
        };

        /**
         * Updates the page to the selected surface, keeps the surface switch in line with the system surface in auto mode,
         * and applies the default colors of the surface to the color fields
         *
         * @returns {Promise}
         */
        const handleSurfaceChange = async () => {
            const conf = await s.helper.config.get();
            const surfaceCheckbox = s.helper.form.elements.checkbox.surface;
            const colorFields = s.helper.form.elements.color;
            const systemSurface = s.helper.stylesheet.getSystemSurface();

            $("body").attr("data-surface", conf.appearance.surface);
            surfaceCheckbox.parent().attr($.attr.type, conf.appearance.surface);

            if (conf.appearance.surface === "auto" && s.helper.checkbox.isChecked(surfaceCheckbox) !== (systemSurface === "dark")) { // adapt surface slider to match the current system surface
                surfaceCheckbox.trigger("click");
            }

            const defaultColors = s.helper.model.getDefaultColors(conf.appearance.theme);
            const surface = conf.appearance.surface === "auto" ? systemSurface : conf.appearance.surface;

            Object.entries(defaultColors).forEach(([key, value]) => {
                if (!colorFields[key]) {
                    return;
                }

                if (key === "colorScheme" && !s.helper.model.isDefaultColorScheme(colorFields[key][0].value)) { // only change if it was the default color (of any theme) before
                    return;
                }

                s.helper.form.changeColorValue(colorFields[key], value[surface]);
            });

            await updateDefaultValues();
        };

        /**
         * Lets the restore buttons of the sizes and colors revert to the defaults of the selected theme and surface,
         * instead of the defaults of the model, which only know the stored theme
         *
         * @returns {Promise}
         */
        const updateDefaultValues = async () => {
            const conf = await s.helper.config.get();
            const theme = conf.appearance.theme;
            const surface = conf.appearance.surface === "auto" ? s.helper.stylesheet.getSystemSurface() : conf.appearance.surface;
            const values = {};

            Object.entries(themeDefaults[theme] || {}).forEach(([key, value]) => {
                values[key] = value; // null = the default of the model
            });

            Object.entries(s.helper.model.getDefaultColors(theme)).forEach(([key, value]) => {
                if (value && value[surface]) {
                    values[key] = value[surface];
                }
            });

            s.helper.form.setDefaultValues(values);
        };

        /**
         * Changes the value of the given range field, null resets it to the default value
         *
         * @param {string} key
         * @param {number|null} value
         */
        const setRangeValue = (key, value) => {
            if (value === null) {
                value = s.helper.model.getData("a/styles", true)[key].replace("px", "");
            }
            s.helper.form.setValue("range", key, value);
        };
    };

})(jsu);
