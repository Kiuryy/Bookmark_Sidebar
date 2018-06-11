($ => {
    "use strict";

    $.EditHelper = function (n) {

        let editMode = false;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();

            n.elm.body.attr($.attr.pos, n.helper.model.getData("b/sidebarPosition"));
            $("<a />").addClass($.cl.newtab.edit).appendTo(n.elm.body);

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
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            n.elm.body.on("click", "a." + $.cl.newtab.edit, (e) => { // enter edit mode
                e.preventDefault();

                if (!editMode) {
                    enterEditMode();
                }
            }).on("click", "menu." + $.cl.newtab.infoBar + " > a", (e) => { // save changes or leave edit mode
                e.preventDefault();
                let elm = $(e.currentTarget);

                if (elm.hasClass($.cl.newtab.cancel)) {
                    leaveEditMode();
                } else if (elm.hasClass($.cl.newtab.save)) {
                    saveChanges().then(() => {
                        leaveEditMode();
                    });
                }
            });
        };

        /**
         * Saves the changes which were made
         *
         * @returns {Promise}
         */
        let saveChanges = () => {
            return new Promise((resolve) => {
                let shortcuts = [];
                n.elm.topNav.find("a." + $.cl.newtab.link).forEach((elm) => {
                    let label = $(elm).text().trim();
                    let url = ($(elm).data("href") || $(elm).attr("href")).trim();

                    if (label && label.length > 0 && url && url.length > 0) {
                        shortcuts.push({
                            label: label,
                            url: url
                        });
                    }
                });

                let loadStartTime = +new Date();
                let loader = n.helper.template.loading().appendTo(n.elm.body);
                n.elm.body.addClass($.cl.general.loading);

                n.helper.model.setData({
                    "n/searchEngine": n.elm.search.wrapper.children("select")[0].value,
                    "n/topPagesType": n.elm.topPages.children("select")[0].value,
                    "n/shortcuts": shortcuts
                }).then(() => { // load at least 1s
                    return $.delay(Math.max(0, 1000 - (+new Date() - loadStartTime)));
                }).then(() => {
                    n.elm.body.removeClass($.cl.general.loading);
                    loader.remove();
                    resolve();
                });
            });
        };

        /**
         * Removes all html markup which was used to edit the page
         */
        let leaveEditMode = () => {
            editMode = false;
            history.pushState({}, null, location.href.replace(/#edit/g, ""));
            n.elm.body.removeClass($.cl.newtab.edit);

            n.elm.search.wrapper.children("select").remove();
            n.elm.topPages.children("select").remove();
            n.elm.topNav.find("a:not(." + $.cl.newtab.link + ")").remove();

            n.helper.search.updateSearchEngine(n.helper.model.getData("n/searchEngine"));
            n.helper.topPages.setType(n.helper.model.getData("n/topPagesType"));
            n.helper.shortcuts.refreshEntries();

            $.delay(500).then(() => {
                $("menu." + $.cl.newtab.infoBar).remove();
            });
        };

        /**
         * Initialises the edit mode -> adds fields and submit button
         */
        let enterEditMode = () => {
            editMode = true;
            history.pushState({}, null, location.href.replace(/#edit/g, "") + "#edit");

            $("<menu />")
                .addClass($.cl.newtab.infoBar)
                .append("<a class='" + $.cl.newtab.cancel + "'>" + n.helper.i18n.get("overlay_cancel") + "</a>")
                .append("<a class='" + $.cl.newtab.save + "'>" + n.helper.i18n.get("settings_save") + "</a>")
                .appendTo(n.elm.body);

            $.delay().then(() => {
                n.elm.body.addClass($.cl.newtab.edit);
                initSearchEngineConfig();
                initTopPagesConfig();
                initShortcutsConfig();

                $.delay(500).then(() => {
                    $(window).trigger("resize");
                });
            });
        };

        /**
         * Initialises the buttons to edit/remove the shortcuts in the top/right corner
         */
        let initShortcutsConfig = () => {
            let buttons = ["<a class='" + $.cl.newtab.edit + "' />", "<a class='" + $.cl.newtab.remove + "' />", "<a " + $.attr.pos + "='left' />", "<a " + $.attr.pos + "='right' />"];

            n.elm.topNav.find("> ul > li").forEach((elm) => {
                $(elm).append(buttons);
            });

            $("<a class='" + $.cl.newtab.add + "' />").prependTo(n.elm.topNav);

            n.elm.topNav.off("click.edit").on("click.edit", "a." + $.cl.newtab.edit, (e) => { // edit
                e.stopPropagation();
                let entry = $(e.currentTarget).parent("li");
                showShortcutEditTooltip(entry);
            }).on("click.edit", "a." + $.cl.newtab.add, () => {  // add
                let entry = $("<li />")
                    .append("<a class='" + $.cl.newtab.link + "'>&nbsp;</a>")
                    .append(buttons)
                    .prependTo(n.elm.topNav.children("ul"));

                $.delay().then(() => {
                    showShortcutEditTooltip(entry);
                });
            }).on("click.edit", "a." + $.cl.newtab.remove, (e) => {  // remove
                $(e.currentTarget).parent("li").remove();
            }).on("click.edit", "a[" + $.attr.pos + "]", (e) => { // move
                let pos = $(e.currentTarget).attr($.attr.pos);
                let entry = $(e.currentTarget).parent("li");

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
        let showShortcutEditTooltip = (elm) => {
            n.elm.topNav.find("> ul > li > div").remove();

            let link = elm.children("a." + $.cl.newtab.link).eq(0);

            let tooltip = $("<div />")
                .append("<label>" + n.helper.i18n.get("overlay_bookmark_title") + "</label>")
                .append("<input type='text' value='" + link.text().trim().replace(/'/g, "&#x27;") + "' " + $.attr.type + "='label' />")
                .append("<label>" + n.helper.i18n.get("overlay_bookmark_url") + "</label>")
                .append("<input type='text' value='" + (link.data("href") || link.attr("href")).trim().replace(/'/g, "&#x27;") + "' " + $.attr.type + "='url' />")
                .append("<button type='submit'>" + n.helper.i18n.get("overlay_close") + "</button>")
                .appendTo(elm);

            tooltip.find("input[type='text']").on("change input", (e) => {
                let val = e.currentTarget.value.trim();

                switch ($(e.currentTarget).attr($.attr.type)) {
                    case "url": {
                        link.removeAttr("href").removeData("href");

                        if (val && val.length > 0) {
                            if (val.startsWith("chrome://") || val.startsWith("chrome-extension://")) {
                                link.data("href", val);
                            } else {
                                if (val.search(/^\w+:\/\//) !== 0) { // prepend http if no protocol specified
                                    val = "http://" + val;
                                }
                                link.attr("href", val);
                            }
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
         * Initialises the dropdown for the top pages
         */
        let initTopPagesConfig = () => {
            let select = $("<select />").prependTo(n.elm.topPages);
            let types = n.helper.topPages.getAllTypes();
            let currentType = n.helper.model.getData("n/topPagesType");

            Object.keys(types).forEach((name) => {
                let label = n.helper.i18n.get("newtab_top_pages_" + types[name]);
                $("<option value='" + name + "' " + (currentType === name ? "selected" : "") + " />").text(label).appendTo(select);
            });

            select.on("input change", (e) => {
                n.helper.topPages.setType(e.currentTarget.value);
            });
        };

        /**
         * Initialises the dropdown for the search engine
         */
        let initSearchEngineConfig = () => {
            let select = $("<select />").appendTo(n.elm.search.wrapper);
            let searchEngines = n.helper.search.getSearchEngineList();
            let currentSearchEngine = n.helper.model.getData("n/searchEngine");

            Object.entries(searchEngines).forEach(([value, info]) => {
                $("<option value='" + value + "' " + (currentSearchEngine === value ? "selected" : "") + " />").text(info.name).appendTo(select);
            });

            select.on("input change", (e) => {
                n.helper.search.updateSearchEngine(e.currentTarget.value);
            });
        };

    };

})(jsu);