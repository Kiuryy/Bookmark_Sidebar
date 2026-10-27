($ => {
    "use strict";

    $.SettingsExpertHelper = function (s) {

        const scopes = ["behaviour", "appearance", "newtab"];

        let dialog = null;
        let list = null;
        let search = null;
        let configObj = {};

        /**
         * Initialises the expert settings dialog and the link opening it
         */
        this.init = () => {
            dialog = $(`section#expert-${$.cl.settings.dialog}`);
            list = dialog.find(`div.${$.cl.settings.expert.list}`);
            search = dialog.find(`input.${$.cl.settings.expert.search}`);

            search.attr("placeholder", s.helper.i18n.get("settings_search_placeholder", null, true));
            search.on("keyup change input", () => {
                filterList();
            });

            dialog.find(`a[${$.attr.type}='save']`).on("click", async (e) => {
                e.preventDefault();
                await save();
            });

            $(`a[${$.attr.name}='expert']`).on("click", (e) => {
                e.preventDefault();
                open();
            });
        };

        /**
         * Fills the dialog with the currently stored configuration and opens it
         */
        const open = () => {
            const storedConfig = JSON.parse(JSON.stringify(s.helper.model.getAllData()));
            const defaultConfig = s.helper.model.getDefaultData();

            configObj = {};
            list.html("");

            scopes.forEach((scope) => {
                configObj[scope] = storedConfig[scope] || {};

                const wrapper = $("<div></div>").attr($.attr.type, scope).appendTo(list);
                $("<h3></h3>").text(scope).appendTo(wrapper);
                const scopeList = $("<ul></ul>").appendTo(wrapper);

                fillList(scopeList, [scope], defaultConfig[scope] || {}, configObj[scope]);
            });

            search[0].value = "";
            filterList();
            s.helper.dialog.open("expert");
        };

        /**
         * Recursively fills the given list with the configuration, uses the stored value if available and the default value otherwise
         *
         * @param {jsu} parentList
         * @param {Array} path
         * @param {object} defaultValues
         * @param {object} storedValues
         */
        const fillList = (parentList, path, defaultValues, storedValues) => {
            Object.entries(defaultValues).forEach(([key, defaultValue]) => {
                const entryPath = [...path, key];
                let value = defaultValue;

                if (storedValues && typeof storedValues === "object" && typeof storedValues[key] !== "undefined") {
                    value = storedValues[key];
                }

                const entry = $("<li></li>").attr($.attr.name, key).appendTo(parentList);
                const label = $("<label></label>").text(key).appendTo(entry);

                const info = getInfoTextByPath(entryPath);
                if (info) { // info text is available -> show as tooltip when hovering
                    $("<div></div>")
                        .addClass($.cl.info)
                        .html("<span>" + info + "</span>")
                        .appendTo(label);
                }

                if (isNestedConfig(defaultValue) && isNestedConfig(value)) { // nested configuration -> fill a sub list with the child configuration
                    const childList = $("<ul></ul>").appendTo(entry);
                    fillList(childList, entryPath, defaultValue, value);
                } else {
                    const input = $("<input />").attr("type", "text").appendTo(entry);
                    input[0].value = typeof value === "string" ? value : JSON.stringify(value);
                    input.data("path", entryPath);
                    input.data("value", value);

                    input.on("keyup change input", (e) => {
                        handleInputChange($(e.currentTarget));
                    });
                }
            });
        };

        /**
         * Returns whether the given configuration value contains child configurations
         *
         * @param {*} value
         * @returns {boolean}
         */
        const isNestedConfig = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

        /**
         * Parses the value of the given input field and updates the configuration object with it,
         * marks the field as invalid if the value doesn't match the type of the initial value
         *
         * @param {jsu} input
         */
        const handleInputChange = (input) => {
            input.removeClass($.cl.error);

            try {
                const value = parseValue(input[0].value, input.data("value"));
                changeConfigObj(input.data("path"), value);
            } catch (e) {
                input.addClass($.cl.error);
            }
        };

        /**
         * Parses the given value based on the type of the initial value ("5" -> 5, "true" -> true, "[1,2]" -> [1, 2]),
         * throws an error if the value cannot be parsed or has a different type
         *
         * @param {string} value
         * @param {*} initialValue
         * @returns {*}
         */
        const parseValue = (value, initialValue) => {
            if (typeof initialValue === "string") {
                return value;
            }

            const parsed = JSON.parse(value);

            if (Array.isArray(initialValue) && !Array.isArray(parsed)) {
                throw new Error("Invalid value");
            } else if ((typeof initialValue === "number" || typeof initialValue === "boolean") && typeof parsed !== typeof initialValue) {
                throw new Error("Invalid value");
            }

            return parsed;
        };

        /**
         * Updates the value of the given configuration path, missing parent objects are created
         *
         * @param {Array} path
         * @param {*} value
         */
        const changeConfigObj = (path, value) => {
            let obj = configObj;

            path.slice(0, -1).forEach((key) => {
                if (!isNestedConfig(obj[key])) {
                    obj[key] = {};
                }
                obj = obj[key];
            });

            obj[path[path.length - 1]] = value;
        };

        /**
         * Determines the translation of the given configuration to display as info text
         *
         * @param {Array} path
         * @returns {string|null}
         */
        const getInfoTextByPath = (path) => {
            let ret = null;
            const paths = [path, path.slice(1)];

            paths.some((_path) => {
                let langVarName = "settings_" + _path.join("_");
                langVarName = langVarName.replace(/([A-Z])/g, "_$1").toLowerCase();
                langVarName = langVarName.replace(/_styles_/g, "_");

                const translatedLabel = s.helper.i18n.get(langVarName);
                const translatedDesc = s.helper.i18n.get(langVarName + "_desc");
                if (translatedDesc || translatedLabel) {
                    ret = translatedDesc || translatedLabel;
                    return true;
                }
            });

            return ret;
        };

        /**
         * Hides all configuration entries whose name doesn't match the search value,
         * entries stay visible if one of their parents or children matches
         */
        const filterList = () => {
            const searchVal = search[0].value.trim().toLowerCase();

            const filter = (parentList, parentMatches) => {
                let anyVisible = false;

                parentList.children("li").forEach((elm) => {
                    const entry = $(elm);
                    const matches = parentMatches || searchVal.length === 0 || entry.attr($.attr.name).toLowerCase().indexOf(searchVal) !== -1;
                    const childList = entry.children("ul");
                    const visible = childList.length() > 0 ? filter(childList, matches) || matches : matches;

                    if (visible) {
                        entry.removeClass($.cl.hidden);
                        anyVisible = true;
                    } else {
                        entry.addClass($.cl.hidden);
                    }
                });

                return anyVisible;
            };

            list.children(`div[${$.attr.type}]`).forEach((elm) => {
                const wrapper = $(elm);

                if (filter(wrapper.children("ul"), false)) {
                    wrapper.removeClass($.cl.hidden);
                } else {
                    wrapper.addClass($.cl.hidden);
                }
            });
        };

        /**
         * Saves the configuration, if none of the input fields has an invalid value, and reloads the settings page afterwards
         *
         * @returns {Promise}
         */
        const save = async () => {
            if (list.find(`input[type='text'].${$.cl.error}`).length() > 0) { // at least one of the input fields has an invalid value -> don't save
                window.alert(s.helper.i18n.get("settings_expert_save_error"));
                return;
            }

            s.helper.dialog.setLoading("expert", true);

            await $.api.storage.sync.set({
                behaviour: configObj.behaviour,
                appearance: configObj.appearance,
                newtab: configObj.newtab
            });

            s.showMessage("saved_message", "success");

            await s.helper.model.call("reinitialize");
            await $.delay(1500);
            s.helper.model.call("reloadIcon");
            s.helper.model.call("reloadBrowserAction");

            s.reload();
        };
    };

})(jsu);
