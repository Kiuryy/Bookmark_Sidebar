($ => {
    "use strict";

    $.ExpertHelper = function (s) {
        let configObj = {};
        let defaultConfigObj = {};
        let searchVal = null;
        const searchTmpClass = "__visible";

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            if (s.helper.model.getUserType() !== "default") {
                defaultConfigObj = s.helper.model.getDefaultData();
                delete defaultConfigObj.utility;

                initSearch();
                this.updateRawConfigList();
            } else {
                s.elm.expert.search.remove();
                s.addNoPremiumText(s.elm.expert.content.children("div"));
            }
        };


        /**
         * Reloads the list of configuration flags with the most recent config values
         *
         * @param {boolean} updateConfigObject
         */
        this.updateRawConfigList = (updateConfigObject = true) => {
            if (updateConfigObject) {
                configObj = JSON.parse(JSON.stringify(s.helper.model.getAllData()));
                delete configObj.utility;
            }

            const template = s.elm.expert.template[0].content;
            s.elm.expert.content.children("div[" + $.attr.type + "]").remove();

            Object.entries(defaultConfigObj).forEach(([key, config]) => {
                $(template).appendTo(s.elm.expert.content);
                const wrapper = s.elm.expert.content.children("div[" + $.attr.type + "]").eq(-1);
                const list = wrapper.children("ul");

                wrapper.attr($.attr.type, key);
                wrapper.children("h2").text(key);

                fillList(list, config, configObj[key] || null);
                filterConfigListBySearch(wrapper);
            });

            initInputEvents();
        };


        /**
         * Saves the configuration to the storage, if none of the input fields has an error
         *
         * @returns {Promise}
         */
        this.save = () => {
            return new Promise((resolve, reject) => {
                if (s.helper.model.getUserType() !== "default") {
                    if (s.elm.expert.content.find("input[type='text']." + $.cl.error).length() > 0) { // atleast one of the input fields has an invalid value -> don't save
                        alert(s.helper.i18n.get("settings_expert_save_error"));
                        reject();
                    } else { // no errors -> save to sync storage
                        $.api.storage.sync.set({
                            behaviour: configObj.behaviour || {},
                            appearance: configObj.appearance || {},
                            newtab: configObj.newtab || {}
                        }, resolve);
                    }
                } else { // no premium -> do nothing
                    resolve();
                }
            });
        };

        /**
         * Removes all configuration from the list, which are not matching against the current search value
         *
         * @param {jsu} wrapper
         */
        const filterConfigListBySearch = (wrapper) => {
            if (searchVal) {
                const list = wrapper.children("ul");

                list.find("li").forEach((elm) => {
                    const key = $(elm).attr($.attr.name);
                    if (key.toLowerCase().indexOf(searchVal) !== -1 || $(elm).parents("." + searchTmpClass).length() > 0) {
                        $(elm).addClass(searchTmpClass);
                    }
                });

                list.find("li:not(." + searchTmpClass + ")").forEach((elm) => {
                    if ($(elm).find("." + searchTmpClass).length() === 0) {
                        $(elm).remove();
                    }
                });

                $("li." + searchTmpClass).removeClass(searchTmpClass);

                if (list.children("li").length() === 0) {
                    wrapper.remove();
                }
            }
        };

        /**
         * Initialises the search field
         */
        const initSearch = () => {
            s.elm.expert.search.attr("placeholder", s.helper.i18n.get("settings_search_placeholder", null, true));

            s.elm.expert.search.on("keyup change input", (e) => {
                searchVal = e.currentTarget.value.trim().toLowerCase();
                if (searchVal.length === 0) {
                    searchVal = null;
                }
                this.updateRawConfigList(false);
            });
        };

        /**
         * Initialises the eventhandler when editing a configuration value
         */
        const initInputEvents = () => {
            s.elm.expert.content.find("ul > li > input[type='text']").on("keyup change input", (e) => {
                s.highlightUnsavedChanges();
                const elm = $(e.currentTarget);
                const path = elm.parent("li").data("path");
                elm.removeClass($.cl.error);

                if (path && path.length > 0) {
                    try {
                        let val = e.currentTarget.value;

                        if (elm.attr($.attr.type) === "json") {
                            val = JSON.parse(val);
                        }

                        changeConfigObj(path, val);
                    } catch (e) {
                        elm.addClass($.cl.error);
                    }
                }
            });
        };

        /**
         * Returns the config path for the given element in the list
         * e.g. ["behaviour", "toggleArea", "top"]
         *
         * @param {jsu} elm
         * @returns {Array}
         */
        const getConfigPathByInput = (elm) => {
            const type = elm.parents("div[" + $.attr.type + "]").eq(0).attr($.attr.type);

            if (type && configObj[type]) {
                const path = [type];

                elm.parents("li[" + $.attr.name + "]").forEach((_elm) => {
                    const name = $(_elm).attr($.attr.name);
                    path.push(name);
                }, true);

                path.push($(elm).attr($.attr.name));

                return path;
            }

            return [];
        };

        /**
         * Determines the translation of the given configuration to display as info text
         *
         * @param {Array} path
         */
        const getInfoTextByPath = (path) => {
            let ret = null;
            const paths = [path, [...path]];
            paths[1].shift();

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
         * Updates the value of the given configuration path,
         * parses the given value before assigning it ("5" -> 5, "true" -> true)
         *
         * @param {Array} path
         * @param {*} value
         */
        const changeConfigObj = (path, value) => {
            if (value === "false" || value === "true") {
                value = value === "true";
            } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
                value = parseFloat(value);
            }

            let level = 0;

            path.reduce((a, b) => {
                level++;

                if (level === path.length) {
                    a[b] = value;
                    return value;
                } else {
                    return a[b];
                }
            }, configObj);
        };

        /**
         * Recursively fills the configuration list
         *
         * @param {jsu} list
         * @param {object} config
         * @param {object} configValues
         */
        const fillList = (list, config, configValues) => {
            Object.entries(config).forEach(([key, value]) => {
                let _val = JSON.parse(JSON.stringify(value));

                const entry = $("<li></li>")
                    .attr($.attr.name, key)
                    .append("<label>" + key + "</label>")
                    .appendTo(list);

                const path = getConfigPathByInput(entry);
                entry.data("path", path);

                const info = getInfoTextByPath(path);

                if (info) { // info text is available -> show as tooltip when hovering
                    $("<div></div>")
                        .addClass($.cl.info)
                        .html("<span>" + info + "</span>")
                        .appendTo(entry.children("label"));
                }

                if (configValues && typeof configValues === "object" && typeof configValues[key] !== "undefined") { // fill with user configuration, rather than the default value
                    _val = configValues[key];
                }

                const isArray = Array.isArray(_val);

                if (typeof _val === "object" && isArray === false) { // configuration is nested -> recursive call of the function with the child configuration
                    const childList = $("<ul></ul>").appendTo(entry);
                    fillList(childList, value, configValues[key] || null);
                } else {
                    const input = $("<input />").attr("type", "text").appendTo(entry);

                    if (isArray) {
                        _val = JSON.stringify(_val);
                        input.attr($.attr.type, "json");
                    }

                    input[0].value = _val;
                }
            });
        };
    };

})(jsu);