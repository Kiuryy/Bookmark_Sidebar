($ => {
    "use strict";

    /**
     * @requires helper: model, i18n, tooltip, stylesheet, keyboard, scroll, checkbox, template, utility
     * @param {object} ext
     * @constructor
     */
    $.OverlayHelper = function (ext) {

        let elements = {};

        /**
         * Creates a new overlay for the given bookmark
         *
         * @param {string} type
         * @param {string} title
         * @param {object} data
         */
        this.create = (type, title, data) => {
            ext.helper.tooltip.close();
            let config = ext.helper.model.getData(["b/animations", "a/darkMode", "a/highContrast"]);

            elements.overlay = $("<iframe />")
                .attr("id", $.opts.ids.page.overlay)
                .data("info", data || {})
                .appendTo("body");

            ext.helper.stylesheet.addStylesheets(["overlay"], elements.overlay);

            let iframeBody = elements.overlay.find("body");
            iframeBody.parent("html").attr("dir", ext.helper.i18n.isRtl() ? "rtl" : "ltr");

            elements.modal = $("<div />")
                .attr($.attr.type, type)
                .addClass($.cl.overlay.modal)
                .appendTo(iframeBody);

            if (config.animations === false) {
                elements.overlay.addClass($.cl.page.noAnimations);
            }

            if (config.darkMode) {
                iframeBody.addClass($.cl.page.darkMode);
            } else if (config.highContrast) {
                iframeBody.addClass($.cl.page.highContrast);
            }

            let header = $("<header />").appendTo(elements.modal);
            $("<h1 />").text(title).appendTo(header);
            $("<a />").addClass($.cl.close).appendTo(header);

            elements.buttonWrapper = $("<menu />").addClass($.cl.overlay.buttonWrapper).appendTo(elements.modal);
            $("<a />")
                .addClass($.cl.close)
                .appendTo(elements.buttonWrapper);

            this.setCloseButtonLabel(type === "infos" ? "close" : "cancel");

            switch (type) {
                case "delete": {
                    handleDeleteHtml(data);
                    break;
                }
                case "edit": {
                    handleEditHtml(data);
                    break;
                }
                case "infos": {
                    handleInfosHtml(data);
                    break;
                }
                case "add": {
                    handleAddHtml(data);
                    break;
                }
                case "hide": {
                    handleHideHtml(data);
                    break;
                }
                case "openChildren": {
                    handleOpenChildrenHtml(data);
                    break;
                }
                case "checkBookmarks": {
                    ext.helper.linkchecker.run(elements.modal, data.children);
                    break;
                }
                case "keyboardShortcuts": {
                    handleKeyboardShortcutsDescHtml(data);
                    break;
                }
                case "shareInfoDesc": {
                    handleShareInfoDescHtml(data);
                }
            }

            elements.overlay[0].focus();
            if (elements.modal.find("input").length() > 0) {
                elements.modal.find("input")[0].focus();
            }

            ext.helper.keyboard.initOverlayEvents(elements.overlay);
            ext.helper.model.call("trackPageView", {page: "/overlay/" + type}); // @deprecated
            initEvents();

            $.delay(100).then(() => {
                elements.modal.addClass($.cl.visible);
                elements.overlay.addClass($.cl.page.visible);
            });
        };

        /**
         * Performs the action of the current overlay
         */
        this.performAction = () => {
            let data = elements.overlay.data("info");

            switch (elements.modal.attr($.attr.type)) {
                case "delete": {
                    deleteBookmark(data);
                    break;
                }
                case "hide": {
                    hideEntry(data);
                    break;
                }
                case "openChildren": {
                    openChildren(data);
                    break;
                }
                case "edit": {
                    editEntry(data);
                    break;
                }
                case "add": {
                    addEntry(data);
                    break;
                }
            }
        };

        /**
         * Closes the overlay
         *
         * @param {boolean} cancel
         * @param {string} labelAdd what to add the tracking event label
         */
        this.closeOverlay = (cancel = false, labelAdd = "") => {
            ext.helper.utility.triggerEvent("overlayClosed");

            ext.elm.bookmarkBox.all.find("li." + $.cl.drag.isDragged).remove();
            elements.overlay.removeClass($.cl.page.visible);

            ext.helper.model.call("trackEvent", { // @deprecated
                category: "overlay",
                action: cancel ? "cancel" : "action",
                label: elements.modal.attr($.attr.type) + labelAdd
            });

            ext.helper.scroll.focus();

            $.delay(400).then(() => {
                elements.overlay.remove();
            });
        };

        /**
         * Sets the text for the close button
         *
         * @param {string} type
         */
        this.setCloseButtonLabel = (type = "close") => {
            elements.buttonWrapper.children("a." + $.cl.close).text(ext.helper.i18n.get("overlay_" + type));
        };

        /**
         * Returns true if the overlay iframe is in the DOM
         *
         * @returns {boolean}
         */
        this.isOpened = () => {
            return $("iframe#" + $.opts.ids.page.overlay).length() > 0;
        };

        /**
         * Appends the additional information for the given entry
         *
         * @param {object} data
         */
        let appendAdditionalInfo = (data) => {
            if (data.additionalInfo && data.additionalInfo.desc) {
                let container = $("<div />").addClass($.cl.info).appendTo(elements.modal);

                $("<h3 />").text(ext.helper.i18n.get("overlay_bookmark_additional_info")).appendTo(container);
                $("<p />").text(data.additionalInfo.desc).appendTo(container);
            }
        };

        /**
         * Appends the bookmark preview to the current overlay
         *
         * @param {object} data
         * @param {boolean} addUrl
         */
        let appendPreviewLink = (data, addUrl) => {
            let preview = $("<" + (data.isDir ? "span" : "a") + " />")
                .attr("title", data.title)
                .addClass($.cl.overlay.preview)
                .text(data.title)
                .appendTo(elements.modal);

            if (data.isDir) {
                preview.prepend("<span class='" + $.cl.sidebar.dirIcon + "' />");
            } else if ($.opts.demoMode) {
                preview.prepend("<span class='" + $.cl.sidebar.dirIcon + "' data-color='" + (Math.floor(Math.random() * 10) + 1) + "' />");
            } else {
                ext.helper.model.call("favicon", {url: data.url}).then((response) => { // retrieve favicon of url
                    if (response.img) { // favicon found -> add to entry
                        preview.prepend("<img src='" + response.img + "' />");
                    }
                });
            }

            if (addUrl && addUrl === true && data.isDir !== true) {
                $("<a />")
                    .addClass($.cl.overlay.previewUrl)
                    .attr("title", data.url)
                    .text(data.url)
                    .insertAfter(preview);
            }
        };

        /**
         * Extends the overlay html for the list of available keyboard shortcuts
         */
        let handleKeyboardShortcutsDescHtml = () => {
            let scrollBox = $("<div />").addClass($.cl.scrollBox.wrapper).appendTo(elements.modal);
            let list = $("<ul />").appendTo(scrollBox);

            let icons = {
                tab: "&#8633;",
                shift: "&#8679;",
                cmd: "&#8984;",
                enter: "&#9166;"
            };

            Object.entries({
                tab: ["tab"],
                enter: ["enter"],
                shift_enter: ["shift", "enter"],
                ctrl_c: [navigator.platform.indexOf("Mac") > -1 ? "cmd" : "ctrl", "c"],
                del: ["del"],
                esc: ["esc"]
            }).forEach(([name, keys]) => {
                keys = keys.map((k) => {
                    let ret = "<i>";
                    ret += ext.helper.i18n.get("keyboard_shortcuts_key_" + k) || k;
                    if (icons[k]) {
                        ret += " " + icons[k];
                    }
                    ret += "</i>";
                    return ret;
                });

                $("<li />")
                    .append("<strong>" + keys.join("+") + "</strong>")
                    .append("<span>" + ext.helper.i18n.get("keyboard_shortcuts_" + name + "_desc") + "</span>")
                    .appendTo(list);
            });

            this.setCloseButtonLabel("close");
        };

        /**
         * Extends the overlay html for the descriptions of the two types of user sharings (config and activity)
         *
         * @param {object} data
         */
        let handleShareInfoDescHtml = (data) => {
            elements.modal.attr($.attr.value, data.type);
            let scrollBox = $("<div />").addClass($.cl.scrollBox.wrapper).appendTo(elements.modal);

            if (data.type === "activity") {
                $("<p />").html(ext.helper.i18n.get("contribute_share_activity_desc1")).appendTo(scrollBox);
                $("<p />").html(ext.helper.i18n.get("contribute_share_activity_examples_intro")).appendTo(scrollBox);
                $("<ul />")
                    .append("<li>" + ext.helper.i18n.get("contribute_share_activity_example_1") + "</li>")
                    .append("<li>" + ext.helper.i18n.get("contribute_share_activity_example_2") + "</li>")
                    .append("<li>" + ext.helper.i18n.get("contribute_share_activity_example_3") + "</li>")
                    .append("<li>" + ext.helper.i18n.get("contribute_share_activity_example_4") + "</li>")
                    .append("<li>" + ext.helper.i18n.get("contribute_share_activity_example_5") + "</li>")
                    .appendTo(scrollBox);
                $("<p />").html(ext.helper.i18n.get("contribute_share_activity_desc2")).appendTo(scrollBox);
            } else if (data.type === "config") {
                $("<p />").html(ext.helper.i18n.get("contribute_share_config_desc")).appendTo(scrollBox);
            }

            this.setCloseButtonLabel("close");
        };

        /**
         * Extends the overlay html for the delete operation
         *
         * @param {object} data
         */
        let handleDeleteHtml = (data) => {
            $("<p />").text(ext.helper.i18n.get("overlay_delete_" + (data.isDir ? "dir" : "bookmark") + "_confirm")).appendTo(elements.modal);
            appendPreviewLink(data);
            appendAdditionalInfo(data);
            $("<a />").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_delete")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for the edit operation
         *
         * @param {object} data
         */
        let handleEditHtml = (data) => {
            appendPreviewLink(data);
            let list = $("<ul />").appendTo(elements.modal);

            $("<li />")
                .append("<label>" + ext.helper.i18n.get("overlay_bookmark_title") + "</label>")
                .append("<input type='text' name='title' value='" + data.title.replace(/'/g, "&#x27;") + "' />")
                .appendTo(list);

            if (!data.isDir) {
                $("<li />")
                    .append("<label>" + ext.helper.i18n.get("overlay_bookmark_url") + "</label>")
                    .append("<input type='text' name='url' value='" + data.url.replace(/'/g, "&#x27;") + "' />")
                    .appendTo(list);
            }

            let infoEntry = $("<li />")
                .addClass($.cl.info)
                .append("<label>" + ext.helper.i18n.get("overlay_bookmark_additional_info") + "</label>")
                .appendTo(list);

            let infoField = $("<textarea name='info' />").appendTo(infoEntry);
            infoField[0].value = (data.additionalInfo ? (data.additionalInfo.desc || "") : "");

            infoEntry.append("<span>" + ext.helper.i18n.get("settings_not_synced") + "</span>");

            infoField.on("focus", () => {
                infoEntry.addClass($.cl.active);
            }).on("blur", () => {
                infoEntry.removeClass($.cl.active);
            });

            $("<a />").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_save")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for showing the confirm dialog for opening all the bookmarks below the clicked directory
         *
         * @param {object} data
         */
        let handleOpenChildrenHtml = (data) => {
            let bookmarks = data.children.filter(val => val.url && val.url !== "about:blank");
            let text = ext.helper.i18n.get("overlay_confirm_open_children", [bookmarks.length]);

            $("<p />").text(text).appendTo(elements.modal);
            appendPreviewLink(data);
            $("<a />").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_open_children")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for showing the confirm dialog for hiding bookmarks from the sidebar
         *
         * @param {object} data
         */
        let handleHideHtml = (data) => {
            $("<p />").text(ext.helper.i18n.get("overlay_hide_" + (data.isDir ? "dir" : "bookmark") + "_confirm")).appendTo(elements.modal);
            appendPreviewLink(data);
            appendAdditionalInfo(data);
            $("<a />").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_hide_from_sidebar")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for adding a bookmark or directory
         *
         * @param {object} data
         */
        let handleAddHtml = (data) => {
            let submit = $("<a />").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_save")).appendTo(elements.buttonWrapper);
            let menu = $("<menu />").attr($.attr.name, "select").appendTo(elements.modal);
            let bookmarkLink = $("<a />").attr($.attr.type, "bookmark").attr("title", ext.helper.i18n.get("overlay_label_bookmark")).appendTo(menu);
            $("<a />").attr($.attr.type, "dir").attr("title", ext.helper.i18n.get("overlay_label_dir")).appendTo(menu);
            $("<a />").attr($.attr.type, "separator").attr("title", ext.helper.i18n.get("overlay_label_separator")).appendTo(menu);

            menu.on("mouseleave", (e) => {
                $(e.currentTarget).children("a").removeClass($.cl.hover);
            });

            menu.children("a").on("mouseenter", (e) => {
                menu.children("a").removeClass($.cl.hover);
                $(e.currentTarget).addClass($.cl.hover);
            }).on("mouseleave", (e) => {
                $(e.currentTarget).removeClass($.cl.hover);
            }).on("click", (e) => {
                e.preventDefault();
                let type = $(e.currentTarget).attr($.attr.type);

                if (type === "separator") {
                    addSeparator(data);
                } else {
                    let list = $("<ul />").appendTo(elements.modal);

                    let titleValue = "";
                    let urlValue = "";

                    if (type === "bookmark") { // default bookmark values -> current page information
                        titleValue = $(document).find("head > title").eq(0).text();
                        urlValue = location.href;
                    }

                    if (data && data.values) { // fill fields with given values
                        titleValue = data.values.title || "";
                        urlValue = data.values.url || "";
                    }

                    list.append("<li><h2>" + $(e.currentTarget).attr("title") + "</h2></li>");
                    list.append("<li><label>" + ext.helper.i18n.get("overlay_bookmark_title") + "</label><input type='text' name='title' value='" + titleValue.replace(/'/g, "&#x27;") + "' /></li>");

                    if (type === "bookmark") {
                        list.append("<li><label>" + ext.helper.i18n.get("overlay_bookmark_url") + "</label><input type='text' name='url' value='" + urlValue.replace(/'/g, "&#x27;") + "'  /></li>");
                    }

                    menu.addClass($.cl.hidden);
                    menu.children("a").removeClass($.cl.hover);

                    $.delay(data && data.values ? 0 : 100).then(() => {
                        list.addClass($.cl.visible);
                        list.find("input")[0].focus();
                        submit.addClass($.cl.visible);
                    });
                }
            });

            if (data && data.values) { // add bookmark with existing data (e.g. after dragging url into sidebar)
                bookmarkLink.trigger("click");
            }
        };

        /**
         * Extends the overlay html for showing infos about the bookmark
         *
         * @param {object} data
         */
        let handleInfosHtml = (data) => {
            appendPreviewLink(data, true);
            appendAdditionalInfo(data);

            let list = $("<ul />").appendTo(elements.modal);
            let createdDate = new Date(data.dateAdded);

            $("<li />").html(ext.helper.i18n.get("overlay_bookmark_created_date") + " " + ext.helper.i18n.getLocaleDate(createdDate)).appendTo(list);

            if (data.isDir) {
                let childrenEntry = $("<li />")
                    .addClass($.cl.tooltip.wrapper)
                    .append("<span>" + data.childrenAmount.total + "</span>")
                    .append(" " + ext.helper.i18n.get("overlay_dir_children"), false)
                    .appendTo(list);

                $("<ul />")
                    .append("<li>" + data.childrenAmount.bookmarks + " " + ext.helper.i18n.get("overlay_dir_children_bookmarks") + "</li>")
                    .append("<li>" + data.childrenAmount.directories + " " + ext.helper.i18n.get("overlay_dir_children_dirs") + "</li>")
                    .appendTo(childrenEntry);
            }

            let viewsEntry = $("<li />")
                .addClass($.cl.tooltip.wrapper)
                .append("<span>" + data.views.total + "</span>")
                .append(" " + ext.helper.i18n.get("overlay_bookmark_views" + (data.views.total === 1 ? "_single" : "")), false)
                .appendTo(list);

            let startDate = new Date(data.views.startDate);
            $("<ul />")
                .append("<li>" + ext.helper.i18n.get("overlay_bookmark_views_since") + " " + ext.helper.i18n.getLocaleDate(startDate) + "</li>")
                .append("<li>" + data.views.perMonth + " " + ext.helper.i18n.get("overlay_bookmark_views" + (data.views.perMonth === 1 ? "_single" : "")) + " " + ext.helper.i18n.get("overlay_bookmark_views_per_month") + "</li>")
                .appendTo(viewsEntry);
        };

        /**
         * Opens all the given bookmarks in new tab
         *
         * @param {object} data
         */
        let openChildren = (data) => {
            this.closeOverlay();
            let bookmarks = data.children.filter(val => val.url && val.url !== "about:blank");
            ext.helper.utility.openAllBookmarks(bookmarks);
        };

        /**
         * Hides the given bookmark or directory from the sidebar
         *
         * @param {object} data
         */
        let hideEntry = (data) => {
            ext.startLoading();
            this.closeOverlay();

            let hiddenEntries = ext.helper.model.getData("u/hiddenEntries");
            hiddenEntries[data.id] = true;

            ext.helper.model.setData({"u/hiddenEntries": hiddenEntries}).then(() => {
                return Promise.all([
                    ext.helper.model.call("removeCache", {name: "htmlList"}),
                    ext.helper.model.call("removeCache", {name: "htmlPinnedEntries"})
                ]);
            }).then(() => {
                ext.helper.model.call("reload", {type: "Hide"});
            });
        };

        /**
         * Deletes the given bookmark or directory recursively
         *
         * @param {object} data
         */
        let deleteBookmark = (data) => {
            this.closeOverlay();
            ext.elm.bookmarkBox.all.find("a[" + $.attr.id + "='" + data.id + "']").parent("li").remove();
            ext.helper.bookmark.performDeletion(data);
        };

        /**
         * Validates the modal form for editing or adding entries,
         * returns the content of the fields and whether the form is filled properly
         *
         * @param {boolean} isDir
         * @returns {Object}
         */
        let getFormValues = (isDir) => {
            let titleInput = elements.modal.find("input[name='title']").removeClass($.cl.error);
            let urlInput = elements.modal.find("input[name='url']").removeClass($.cl.error);
            let infoField = elements.modal.find("textarea[name='info']");

            let ret = {
                errors: false,
                values: {
                    title: titleInput[0].value.trim(),
                    url: isDir ? null : urlInput[0].value.trim(),
                    additionalInfo: infoField.length() > 0 ? (infoField[0].value || null) : null
                }
            };

            if (ret.values.title.length === 0) {
                titleInput.addClass($.cl.error);
                ret.errors = true;
            }

            if (!isDir && ret.values.url.length === 0) {
                urlInput.addClass($.cl.error);
                ret.errors = true;
            }

            if (ret.values.url !== null && ret.values.url.search(/^\w+\:\/\//) !== 0) { // prepend http if no protocol specified
                ret.values.url = "http://" + ret.values.url;
            }

            return ret;
        };

        /**
         * Updates the given bookmark or directory (title, url and additional info)
         *
         * @param {object} data
         */
        let editEntry = (data) => {
            let formValues = getFormValues(data.isDir);

            if (formValues.errors === false) {
                ext.helper.bookmark.editEntry({
                    id: data.id,
                    title: formValues.values.title,
                    url: formValues.values.url,
                    additionalInfo: formValues.values.additionalInfo
                }).then(([result]) => {
                    if (result.error) {
                        elements.modal.find("input[name='url']").addClass($.cl.error);
                    } else {
                        ext.helper.model.call("trackEvent", { // @deprecated
                            category: "extension",
                            action: "edit",
                            label: formValues.values.url ? "bookmark" : "directory"
                        });
                        ext.helper.model.call("reload", {type: "Edit"});
                        this.closeOverlay();
                    }
                });
            }
        };

        /**
         * Returns the index which the newly created element should be positioned at,
         * if the element is being created in the root of the tree, it should be appended, else prepended
         *
         * @param parentId
         * @returns {*}
         */
        let getIndexOfNewEntry = (parentId) => {
            let bookmarkList = ext.elm.bookmarkBox.all.children("ul");

            if (bookmarkList.hasClass($.cl.sidebar.hideRoot)) { // add entry to the root -> set index to the bottom
                let rootId = bookmarkList.find("> li > a").eq(0).attr($.attr.id);

                if (parentId && parentId === rootId) {
                    return bookmarkList.find("> li > ul > li").length();
                }
            }

            return 0;
        };

        /**
         * Adds a separator to the given directory
         *
         * @param {object} data
         */
        let addSeparator = (data) => {
            let parentId = data.id || null;

            ext.helper.model.call("createBookmark", {
                title: "----------",
                url: "about:blank",
                parentId: data.id || null,
                index: getIndexOfNewEntry(parentId)
            }).then(() => {
                ext.helper.model.call("trackEvent", { // @deprecated
                    category: "extension",
                    action: "add",
                    label: "separator"
                });
                this.closeOverlay(false, "_separator");
            });
        };

        /**
         * Adds a bookmark or directory to the given directory
         *
         * @param {object} data
         */
        let addEntry = (data) => {
            let formValues = getFormValues(elements.modal.find("input[name='url']").length() === 0);

            if (formValues.errors === false) {
                let obj = {
                    title: formValues.values.title,
                    url: formValues.values.url,
                    parentId: data.id || null,
                    index: 0
                };

                if (data && data.values) { // use given data (available e.g. after dragging a url into the sidebar)
                    if (data.values.index) {
                        obj.index = data.values.index;
                    }

                    if (data.values.parentId) {
                        obj.parentId = data.values.parentId;
                    }
                } else {
                    obj.index = getIndexOfNewEntry(obj.parentId);
                }

                ext.helper.model.call("createBookmark", obj).then((result) => {
                    if (result.error) {
                        elements.modal.find("input[name='url']").addClass($.cl.error);
                    } else {
                        ext.helper.model.call("trackEvent", { // @deprecated
                            category: "extension",
                            action: "add",
                            label: obj.url ? "bookmark" : "directory"
                        });
                        this.closeOverlay(false, "_" + (obj.url ? "bookmark" : "directory"));
                    }
                });
            }
        };

        /**
         * Initializes the events for the currently displayed overlay
         */
        let initEvents = () => {
            elements.overlay.find("body").on("click", (e) => { // close overlay when click outside the modal
                if (e.target.tagName === "BODY") {
                    this.closeOverlay(true);
                }
            });

            elements.modal.find("a." + $.cl.close).on("click", (e) => { // close overlay by close button
                e.preventDefault();
                this.closeOverlay(true);
            });

            elements.modal.on("click", "a." + $.cl.overlay.action, (e) => { // perform the action
                e.preventDefault();
                this.performAction();
            });

            elements.modal.on("focus", "input", (e) => { // remove error class from input fields
                $(e.currentTarget).removeClass($.cl.error);
            });

            elements.modal.find("a." + $.cl.overlay.preview + ", a." + $.cl.overlay.previewUrl).on("click", (e) => { // open bookmark
                e.preventDefault();
                ext.helper.model.call("trackEvent", { // @deprecated
                    category: "url",
                    action: "open",
                    label: "new_tab_overlay"
                });
                ext.helper.utility.openUrl(elements.overlay.data("info"), "newTab");
            });
        };
    };

})(jsu);