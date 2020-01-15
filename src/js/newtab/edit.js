($ => {
    "use strict";

    $.EditHelper = function (n) {

        let editMode = false;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            $("<a />").addClass($.cl.newtab.edit).appendTo(n.elm.body);

            initGeneralEvents();

            if (location.href.search(/#edit$/i) > -1) {
                enterEditMode();
            }
        };

        /**
         *
         * @returns {boolean}
         */
        this.isEditMode = () => editMode;

        /**
         * Initialises the general eventhandlers
         */
        const initGeneralEvents = () => {
            n.elm.body.on("click", "a." + $.cl.newtab.edit, (e) => { // enter edit mode
                e.preventDefault();

                if (!editMode) {
                    enterEditMode();
                }
            });
        };

        /**
         * Initialises the menu eventhandlers
         */
        const initMenuEvents = () => {
            $("menu." + $.cl.newtab.infoBar + " > a").on("click", (e) => { // save changes or leave edit mode
                e.preventDefault();
                const elm = $(e.currentTarget);

                if (elm.hasClass($.cl.newtab.cancel)) {
                    leaveEditMode();
                } else if (elm.hasClass($.cl.newtab.save)) {
                    saveChanges().then(() => {
                        leaveEditMode();
                    });
                }
            });

            if (n.helper.model.getUserType() === "premium") {
                $("menu." + $.cl.newtab.infoBar + " > div." + $.cl.newtab.upload + " input").on("change", (e) => { // upload background image
                    if (e.currentTarget.files) {
                        const reader = new FileReader();

                        reader.onload = (e) => {
                            try {
                                n.elm.body.addClass($.cl.newtab.customBackground).css("background-image", "url(" + e.target.result + ")");
                            } catch (e) {
                                //
                            }
                        };

                        reader.readAsDataURL(e.currentTarget.files[0]);
                    }
                });

                $("menu." + $.cl.newtab.infoBar + " > div." + $.cl.newtab.upload + " a." + $.cl.newtab.remove).on("click", () => { // remove background image
                    n.elm.body.removeClass($.cl.newtab.customBackground).css("background-image", "");
                });
            } else {
                $("menu." + $.cl.newtab.infoBar + " > div." + $.cl.newtab.upload).on("click", () => {
                    n.helper.model.call("openLink", {
                        href: $.api.extension.getURL("html/settings.html#premium"),
                        newTab: true
                    });
                });
            }
        };

        /**
         * Saves the changes which were made
         *
         * @returns {Promise}
         */
        const saveChanges = () => {
            return new Promise((resolve) => {
                const shortcuts = [];
                n.elm.topNav.find("a." + $.cl.newtab.link).forEach((elm) => {
                    const label = $(elm).text().trim();
                    const url = $(elm).data("href").trim();

                    if (label && label.length > 0 && url && url.length > 0) {
                        shortcuts.push({
                            label: label,
                            url: url
                        });
                    }
                });

                const loadStartTime = +new Date();
                const loader = n.helper.template.loading().appendTo(n.elm.body);
                n.elm.body.addClass($.cl.loading);

                const searchEngineObj = n.helper.search.getCurrentSearchEngine();
                const searchEngineName = searchEngineObj.name;
                delete searchEngineObj.name;

                const data = {
                    "n/searchField": n.elm.search.wrapper.children("select[" + $.attr.type + "='searchField']")[0].value,
                    "n/searchEngine": searchEngineName,
                    "n/searchEngineCustom": searchEngineObj,
                    "n/topPagesType": n.elm.topPages.children("select[" + $.attr.type + "='type']")[0].value,
                    "n/shortcutsPosition": n.elm.topNav.children("select")[0].value,
                    "n/shortcuts": shortcuts
                };

                if (n.helper.model.getUserType() === "premium" && n.elm.topPages.children("select[" + $.attr.type + "='appearance']").length() > 0) {
                    data["n/topPagesAppearance"] = n.elm.topPages.children("select[" + $.attr.type + "='appearance']")[0].value;
                }

                n.helper.model.setData(data).then(() => {
                    const background = n.elm.body.css("background-image").replace(/(^url\("?|"?\)$)/g, "");

                    return new Promise((rslv) => {
                        $.api.storage.local.set({
                            newtabBackground_1: background && background !== "none" ? background : null
                        }, () => {
                            $.api.runtime.lastError; // do nothing specific with the error -> is thrown if too many save attempts are triggered
                            rslv();
                        });
                    });
                }).then(() => { // load at least 1s
                    return $.delay(Math.max(0, 1000 - (+new Date() - loadStartTime)));
                }).then(() => {
                    n.elm.body.removeClass($.cl.loading);
                    loader.remove();
                    resolve();
                });
            });
        };

        /**
         * Removes all html markup which was used to edit the page
         */
        const leaveEditMode = () => {
            editMode = false;
            history.pushState({}, null, location.href.replace(/#edit/g, ""));
            n.elm.body.removeClass($.cl.newtab.edit);

            n.elm.search.wrapper.children("a." + $.cl.newtab.edit).remove();
            n.elm.search.wrapper.children("select").remove();
            n.elm.topPages.children("select").remove();
            n.elm.topNav.children("select").remove();
            n.elm.topNav.find("a:not(." + $.cl.newtab.link + ")").remove();

            n.helper.search.updateSearchEngine(n.helper.model.getData("n/searchEngine"), n.helper.model.getData("n/searchEngineCustom"));
            n.helper.search.setVisibility(n.helper.model.getData("n/searchField"));
            n.helper.topPages.setType(n.helper.model.getData("n/topPagesType"));
            n.helper.topPages.setAppearance(n.helper.model.getData("n/topPagesAppearance"));
            n.helper.shortcuts.refreshEntries();

            n.getBackground().then((background) => {
                n.setBackground(background);
            });

            $.delay(500).then(() => {
                $("menu." + $.cl.newtab.infoBar).remove();
            });
        };

        /**
         * Initialises the edit mode -> adds fields and submit button
         */
        const enterEditMode = () => {
            editMode = true;
            history.pushState({}, null, location.href.replace(/#edit/g, "") + "#edit");

            const menu = $("<menu />")
                .addClass($.cl.newtab.infoBar)
                .append("<a class='" + $.cl.newtab.cancel + "'>" + n.helper.i18n.get("overlay_cancel") + "</a>")
                .append("<a class='" + $.cl.newtab.save + "'>" + n.helper.i18n.get("settings_save") + "</a>")
                .appendTo(n.elm.body);

            const uploadWrapper = $("<div />").addClass($.cl.newtab.upload).appendTo(menu);

            if (n.helper.model.getUserType() === "premium") {
                $("<a />").addClass($.cl.newtab.remove).appendTo(uploadWrapper);
                $("<div />").html("<span>" + n.helper.i18n.get("newtab_upload_background") + "</span><input type=\"file\" accept=\"image/*\" />").appendTo(uploadWrapper);
            } else {
                uploadWrapper.attr("title", n.helper.i18n.get("premium_restricted_text"));
                $("<span />").text(n.helper.i18n.get("settings_menu_premium")).addClass($.cl.premium).appendTo(uploadWrapper);
                $("<div />").html("<span>" + n.helper.i18n.get("newtab_upload_background") + "</span>").appendTo(uploadWrapper);
            }

            initMenuEvents();

            $.delay().then(() => {
                n.elm.body.addClass($.cl.newtab.edit);
                initSearchConfig();
                initTopPagesTypeConfig();
                initShortcutsConfig();

                if (n.helper.model.getUserType() === "premium") {
                    initTopPagesAppearanceConfig();
                }

                $.delay(500).then(() => {
                    $(window).trigger("resize");
                });
            });
        };

        /**
         * Initialises the buttons to edit/remove the shortcuts in the top/right corner
         */
        const initShortcutsConfig = () => {
            const buttons = ["<a class='" + $.cl.newtab.edit + "' />", "<a class='" + $.cl.newtab.remove + "' />", "<a " + $.attr.position + "='left' />", "<a " + $.attr.position + "='right' />"];
            n.elm.topNav.find("> ul > li").forEach((elm) => {
                $(elm).append(buttons);
            });

            const currentPos = n.helper.model.getData("n/shortcutsPosition");
            const select = $("<select />").addClass($.cl.newtab.edit).appendTo(n.elm.topNav);
            ["left", "right"].forEach((pos) => {
                $("<option value='" + pos + "' " + (currentPos === pos ? "selected" : "") + " />").text(n.helper.i18n.get("settings_sidebar_position_" + pos)).appendTo(select);
            });

            select.on("input change", (e) => {
                n.elm.topNav.attr($.attr.position, e.currentTarget.value);
            });

            $("<a class='" + $.cl.newtab.add + "' />").prependTo(n.elm.topNav);

            n.elm.topNav.off("click.edit").on("click.edit", "a." + $.cl.newtab.edit, (e) => { // edit
                e.stopPropagation();
                const entry = $(e.currentTarget).parent("li");
                showShortcutEditTooltip(entry);
            }).on("click.edit", "a." + $.cl.newtab.add, () => {  // add
                const entry = $("<li />")
                    .append("<a class='" + $.cl.newtab.link + "'>&nbsp;</a>")
                    .append(buttons)
                    .prependTo(n.elm.topNav.children("ul"));

                $.delay().then(() => {
                    showShortcutEditTooltip(entry);
                });
            }).on("click.edit", "a." + $.cl.newtab.remove, (e) => {  // remove
                $(e.currentTarget).parent("li").remove();
            }).on("click.edit", "a[" + $.attr.position + "]", (e) => { // move
                const pos = $(e.currentTarget).attr($.attr.position);
                const entry = $(e.currentTarget).parent("li");

                switch (pos) {
                    case "left": {
                        if (entry.prev("li").length() > 0) {
                            entry.insertBefore(entry.prev("li"));
                        }
                        break;
                    }
                    case "right": {
                        if (entry.next("li").length() > 0) {
                            entry.insertAfter(entry.next("li"));
                        }
                        break;
                    }
                }
            }).on("click.edit", "> ul > li > div", (e) => { // prevent closing when clicking inside the tooltip (except when clicking the close button)
                if (e.target.tagName !== "BUTTON") {
                    e.stopPropagation();
                }
            });

            $(document).off("click.edit").on("click.edit", () => {
                n.elm.topNav.find("> ul > li > div").remove();
            });
        };

        /**
         * Shows the edit tooltip for the given element
         *
         * @param {jsu} elm
         */
        const showShortcutEditTooltip = (elm) => {
            n.elm.topNav.find("> ul > li > div").remove();

            const link = elm.children("a." + $.cl.newtab.link).eq(0);
            const href = (link.data("href") || "").trim();

            const tooltip = $("<div />")
                .append("<label>" + n.helper.i18n.get("overlay_bookmark_title") + "</label>")
                .append("<input type='text' value='" + link.text().trim().replace(/'/g, "&#x27;") + "' " + $.attr.type + "='label' />")
                .append("<label>" + n.helper.i18n.get("overlay_bookmark_url") + "</label>")
                .append("<input type='text' value='" + href.replace(/'/g, "&#x27;") + "' " + $.attr.type + "='url' />")
                .append("<button type='submit'>" + n.helper.i18n.get("overlay_close") + "</button>")
                .appendTo(elm);

            tooltip.find("input[type='text']").on("change input", (e) => {
                let val = e.currentTarget.value.trim();

                switch ($(e.currentTarget).attr($.attr.type)) {
                    case "url": {
                        link.removeAttr("href").removeData("href");

                        if (val && val.length > 0) {
                            if (val.search(/^[\w-]+:\/\//) !== 0) { // prepend http if no protocol specified
                                val = "http://" + val;
                            }
                            link.data("href", val);
                        }
                        break;
                    }
                    case "label": {
                        if (val && val.length > 0) {
                            link.text(val.trim());
                        } else {
                            link.html("&nbsp;");
                        }
                        break;
                    }
                }
            });
        };

        /**
         * Initialises the dropdown for the top pages types
         */
        const initTopPagesTypeConfig = () => {
            const select = $("<select />")
                .addClass($.cl.newtab.edit)
                .attr($.attr.type, "type")
                .prependTo(n.elm.topPages);

            const types = n.helper.topPages.getAllTypes();
            const currentType = n.helper.model.getData("n/topPagesType");

            Object.keys(types).forEach((name) => {
                const label = n.helper.i18n.get("newtab_top_pages_" + types[name]);
                $("<option value='" + name + "' " + (currentType === name ? "selected" : "") + " />").text(label).appendTo(select);
            });

            select.on("input change", (e) => {
                n.helper.topPages.setType(e.currentTarget.value);
            });
        };

        /**
         * Initialises the dropdown for the top pages appearances
         */
        const initTopPagesAppearanceConfig = () => {
            const select = $("<select />")
                .addClass($.cl.newtab.edit)
                .attr($.attr.type, "appearance")
                .prependTo(n.elm.topPages);

            const currentAppearance = n.helper.model.getData("n/topPagesAppearance");

            n.helper.topPages.getAllAppearances().forEach((name) => {
                const label = n.helper.i18n.get("newtab_top_pages_appearance_" + name);
                $("<option value='" + name + "' " + (currentAppearance === name ? "selected" : "") + " />").text(label).appendTo(select);
            });

            select.on("input change", (e) => {
                n.helper.topPages.setAppearance(e.currentTarget.value);
            });
        };

        /**
         * Initialises the edit button for the search engine and the dropdown to show/hide the search field
         */
        const initSearchConfig = () => {
            const select = $("<select />")
                .addClass($.cl.newtab.edit)
                .attr($.attr.type, "searchField")
                .prependTo(n.elm.search.wrapper);

            const currentType = n.helper.model.getData("n/searchField");

            ["show", "hide"].forEach((name) => {
                const label = n.helper.i18n.get("newtab_search_field_" + name);
                $("<option value='" + name + "' " + (currentType === name ? "selected" : "") + " />").text(label).appendTo(select);
            });

            select.on("input change", (e) => {
                n.helper.search.setVisibility(e.currentTarget.value);
            });


            const edit = $("<a />").addClass($.cl.newtab.edit).appendTo(n.elm.search.wrapper);
            edit.on("click", (e) => {
                e.preventDefault();
                n.helper.overlay.create("searchEngine", n.helper.i18n.get("newtab_search_engine_headline"));
            });
        };
    };

})(jsu);