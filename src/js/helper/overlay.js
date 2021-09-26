($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.OverlayHelper = function (ext) {

        /**
         *
         * @type {object}
         */
        let elements = {};

        /**
         *
         * @type {object}
         */
        const keyboardKeyIcons = {
            tab: "&#8633;",
            shift: "&#8679;",
            cmd: "&#8984;",
            enter: "&#9166;"
        };

        /**
         * Creates a new overlay for the given bookmark
         *
         * @param {string} type
         * @param {string} title
         * @param {object} data
         */
        this.create = (type, title, data) => {
            ext.helper.tooltip.close();

            elements = ext.helper.template.overlay(type, title);
            elements.overlay.data("info", data || {});

            this.setCloseButtonLabel(type === "infos" ? "close" : "cancel");

            switch (type) {
                case "delete": {
                    handleDeleteHtml(data);
                    break;
                }
                case "deleteSelected": {
                    handleDeleteSelectedHtml(data);
                    break;
                }
                case "edit": {
                    if (ext.helper.entry.isSeparator(data.id)) {
                        handleEditSeparatorHtml(data);
                    } else {
                        handleEditHtml(data);
                    }
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
                case "openSelected": {
                    handleOpenSelectedHtml(data);
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
            }

            if (elements.modal.find("input").length() > 0) {
                elements.modal.find("input")[0].focus();
            }

            ext.helper.keyboard.initOverlayEvents(elements.overlay);
            initEvents();
        };

        /**
         * Performs the action of the current overlay
         */
        this.performAction = () => {
            const data = elements.overlay.data("info");

            switch (elements.modal.attr($.attr.type)) {
                case "delete": {
                    deleteEntry(data);
                    break;
                }
                case "deleteSelected": {
                    deleteSelectedEntries(data);
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
                case "openSelected": {
                    openSelected(data);
                    break;
                }
                case "edit": {
                    if (ext.helper.entry.isSeparator(data.id)) {
                        editSeparator(data);
                    } else {
                        editEntry(data);
                    }
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
         */
        this.closeOverlay = () => {
            ext.helper.utility.triggerEvent("overlayClosed");

            ext.elm.bookmarkBox.all.find("li." + $.cl.drag.isDragged).remove();
            elements.overlay.removeClass($.cl.page.visible);
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
        const appendAdditionalInfo = (data) => {
            if (data.additionalInfo && data.additionalInfo.desc) {
                const container = $("<div></div>").addClass($.cl.info).appendTo(elements.modal);

                $("<h3></h3>").text(ext.helper.i18n.get("overlay_bookmark_additional_info")).appendTo(container);
                $("<p></p>").text(data.additionalInfo.desc).appendTo(container);
            }
        };

        /**
         * Appends the bookmark preview to the current overlay
         *
         * @param {object} data
         * @param {boolean} addUrl
         */
        const appendPreviewLink = (data, addUrl) => {
            const preview = $("<" + (data.isDir ? "span" : "a") + "></" + (data.isDir ? "span" : "a") + ">")
                .attr("title", data.title)
                .addClass($.cl.overlay.preview)
                .text(data.title)
                .appendTo(elements.modal);

            if (data.isDir) {
                preview.prepend("<span class='" + $.cl.sidebar.dirIcon + "'></span>");
            } else if ($.opts.demoMode) {
                preview.prepend("<span class='" + $.cl.sidebar.dirIcon + "' data-color='" + (Math.floor(Math.random() * 10) + 1) + "'></span>");
            } else {
                ext.helper.model.call("favicon", {url: data.url}).then((response) => { // retrieve favicon of url
                    if (response.img) { // favicon found -> add to entry
                        preview.prepend("<img src='" + response.img + "' />");
                    }
                });
            }

            if (addUrl && addUrl === true && data.isDir !== true) {
                $("<a></a>")
                    .addClass($.cl.overlay.previewUrl)
                    .attr("title", data.url)
                    .text(data.url)
                    .insertAfter(preview);
            }
        };

        /**
         * Extends the overlay html for the list of available keyboard shortcuts
         */
        const handleKeyboardShortcutsDescHtml = () => {
            const scrollBox = $("<div></div>").addClass($.cl.scrollBox.wrapper).appendTo(elements.modal);

            const wrapper = $("<div></div>")
                .append("<h3>" + ext.helper.i18n.get("settings_open_action") + "</h3>")
                .appendTo(scrollBox);

            const setupLink = $("<a></a>").text(ext.helper.i18n.get("settings_keyboard_shortcut_button")).appendTo(wrapper);
            setupLink.on("click", (e) => {
                e.preventDefault();
                ext.helper.model.call("openLink", {
                    href: "chrome://extensions/shortcuts",
                    newTab: true,
                    active: true
                });
            });

            const list = $("<ul></ul>").appendTo(wrapper);
            const shortcutList = {
                tab: [["&#8593;"], ["&#8595;"], ["tab"]],
                enter: [["enter"]],
                shift_enter: [["shift", "enter"]],
                ctrl_c: [[navigator.platform.indexOf("Mac") > -1 ? "cmd" : "ctrl", "c"]],
                del: [["del"]],
                esc: [["esc"]]
            };

            Object.entries(shortcutList).forEach(([name, shortcuts]) => {
                const shortcutHtmlArr = [];
                shortcuts.forEach((keys) => {
                    keys = keys.map((k) => {
                        let ret = "<i>";
                        ret += ext.helper.i18n.get("keyboard_shortcuts_key_" + k) || k;
                        if (keyboardKeyIcons[k]) {
                            ret += " " + keyboardKeyIcons[k];
                        }
                        ret += "</i>";
                        return ret;
                    });
                    shortcutHtmlArr.push("<strong>" + keys.join("+") + "</strong>");
                });

                $("<li></li>")
                    .html(shortcutHtmlArr.join(", "))
                    .append("<span>" + ext.helper.i18n.get("keyboard_shortcuts_" + name + "_desc") + "</span>")
                    .appendTo(list);
            });

            this.setCloseButtonLabel("close");
        };

        /**
         * Extends the overlay html for the delete operation of the selected entries
         *
         * @param selectedElements
         */
        const handleDeleteSelectedHtml = (selectedElements) => {
            $("<p></p>").text(ext.helper.i18n.get("overlay_delete_selected_confirm")).appendTo(elements.modal);

            $("<p></p>")
                .addClass($.cl.selected)
                .html("<strong>" + selectedElements.length + "</strong> <span>" + ext.helper.i18n.get("header_selected_entries") + "</span>")
                .appendTo(elements.modal);

            $("<a></a>").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_delete")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for the delete operation
         *
         * @param {object} data
         */
        const handleDeleteHtml = (data) => {
            $("<p></p>").text(ext.helper.i18n.get("overlay_delete_" + (data.isDir ? "dir" : "bookmark") + "_confirm")).appendTo(elements.modal);
            appendPreviewLink(data);
            appendAdditionalInfo(data);
            $("<a></a>").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_delete")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for the edit operation of a separator
         *
         * @param {object} data
         */
        const handleEditSeparatorHtml = (data) => {
            const list = $("<ul></ul>").appendTo(elements.modal);
            const title = data.title.replace(/'/g, "&#x27;").replace(/(^[-_]+|[-_]+$)/g, "").trim();

            $("<li></li>").html("<span>" + ext.helper.i18n.get("overlay_separator_title_desc") + "</span>").appendTo(list);
            $("<li></li>")
                .append("<label>" + ext.helper.i18n.get("overlay_bookmark_title") + "</label>")
                .append("<input type='text' name='title' value='" + title + "' />")
                .appendTo(list);

            $("<a></a>").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_save")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for the edit operation
         *
         * @param {object} data
         */
        const handleEditHtml = (data) => {
            appendPreviewLink(data);
            const list = $("<ul></ul>").appendTo(elements.modal);

            $("<li></li>")
                .append("<label>" + ext.helper.i18n.get("overlay_bookmark_title") + "</label>")
                .append("<input type='text' name='title' value='" + data.title.replace(/'/g, "&#x27;") + "' />")
                .appendTo(list);

            if (!data.isDir) {
                $("<li></li>")
                    .append("<label>" + ext.helper.i18n.get("overlay_bookmark_url") + "</label>")
                    .append("<input type='text' name='url' value='" + data.url.replace(/'/g, "&#x27;") + "' />")
                    .appendTo(list);
            }

            const infoEntry = $("<li></li>")
                .addClass($.cl.info)
                .append("<label>" + ext.helper.i18n.get("overlay_bookmark_additional_info") + "</label>")
                .appendTo(list);

            const infoField = $("<textarea name='info'></textarea>").appendTo(infoEntry);
            infoField[0].value = (data.additionalInfo ? (data.additionalInfo.desc || "") : "");

            infoEntry.append("<span>" + ext.helper.i18n.get("settings_not_synced") + "</span>");

            infoField.on("focus", () => {
                infoEntry.addClass($.cl.active);
            }).on("blur", () => {
                infoEntry.removeClass($.cl.active);
            });

            $("<a></a>").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_save")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for showing the confirm dialog for opening all the subfolder bookmarks of the clicked directory
         *
         * @param {object} data
         */
        const handleOpenChildrenHtml = (data) => {
            const bookmarks = data.children.filter(val => val.url && val.url !== "about:blank");
            const text = ext.helper.i18n.get("overlay_confirm_open_children", [bookmarks.length]);

            $("<p></p>").text(text).appendTo(elements.modal);
            appendPreviewLink(data);
            $("<a></a>").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_open_children")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for showing the confirm dialog for opening all of the selected bookmarks (and subfolder bookmarks of the selected directories)
         *
         * @param {object} data
         */
        const handleOpenSelectedHtml = (bookmarks) => {
            const text = ext.helper.i18n.get("overlay_confirm_open_selected", [bookmarks.length]);

            $("<p></p>").text(text).appendTo(elements.modal);
            $("<a></a>").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_open_children")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for showing the confirm dialog for hiding bookmarks from the sidebar
         *
         * @param {object} data
         */
        const handleHideHtml = (data) => {
            $("<p></p>").text(ext.helper.i18n.get("overlay_hide_" + (data.isDir ? "dir" : "bookmark") + "_confirm")).appendTo(elements.modal);
            appendPreviewLink(data);
            appendAdditionalInfo(data);
            $("<a></a>").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_hide_from_sidebar")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for adding a bookmark or directory
         *
         * @param {object} data
         */
        const handleAddHtml = (data) => {
            const submit = $("<a></a>").addClass($.cl.overlay.action).text(ext.helper.i18n.get("overlay_save")).appendTo(elements.buttonWrapper);
            const menu = $("<menu></menu>").attr($.attr.name, "select").appendTo(elements.modal);

            const links = {
                bookmark: $("<a></a>").attr($.attr.type, "bookmark").attr("title", ext.helper.i18n.get("overlay_label_bookmark")).appendTo(menu),
                dir: $("<a></a>").attr($.attr.type, "dir").attr("title", ext.helper.i18n.get("overlay_label_dir")).appendTo(menu),
                separator: $("<a></a>").attr($.attr.type, "separator").attr("title", ext.helper.i18n.get("overlay_label_separator")).appendTo(menu)
            };

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
                const type = $(e.currentTarget).attr($.attr.type);
                const list = $("<ul></ul>").attr($.attr.type, type).appendTo(elements.modal);

                let titleValue = "";
                let urlValue = "";

                if (type === "bookmark") { // default bookmark values -> current page information
                    titleValue = document.title || "";
                    urlValue = location.href;
                }

                if (data && data.values) { // fill fields with given values
                    titleValue = (data.values.title || "").trim();
                    urlValue = (data.values.url || "").trim();
                }

                list.append("<li><h2>" + $(e.currentTarget).attr("title") + "</h2></li>");

                if (type === "separator") {
                    list.append("<li><span>" + ext.helper.i18n.get("overlay_separator_title_desc") + "</span></li>");
                }

                list.append("<li><label>" + ext.helper.i18n.get("overlay_bookmark_title") + "</label><input type='text' name='title' value='" + titleValue.replace(/'/g, "&#x27;") + "' /></li>");

                if (type === "bookmark") {
                    list.append("<li><label>" + ext.helper.i18n.get("overlay_bookmark_url") + "</label><input type='text' name='url' value='" + urlValue.replace(/'/g, "&#x27;") + "'  /></li>");
                }

                const sort = ext.helper.model.getData("u/sort");
                if (sort.name === "custom" && (!data.values || typeof data.values.index === "undefined")) { // only show positioning option when there is not already a given index (like when dragging an url into the sidebar)
                    list.append("<li>" +
                        "<label>" + ext.helper.i18n.get("overlay_add_position") + "</label>" +
                        "<select name='position'>" +
                        " <option value='append'>" + ext.helper.i18n.get("overlay_add_position_append") + "</option>" +
                        " <option value='prepend'>" + ext.helper.i18n.get("overlay_add_position_prepend") + "</option>" +
                        "</select>" +
                        "</li>");

                    const defaultPos = ext.helper.model.getData("b/newEntryPosition");
                    if (list.find("select[name='position'] > option[value='" + defaultPos + "']").length() > 0) {
                        list.find("select[name='position']")[0].value = defaultPos;
                    }
                }

                menu.addClass($.cl.hidden);
                menu.children("a").removeClass($.cl.hover);

                $.delay(data && data.values ? 0 : 100).then(() => {
                    list.addClass($.cl.visible);
                    list.find("input")[0].focus();
                    submit.addClass($.cl.visible);
                });
            });

            if (data.overlayType && links[data.overlayType]) { // skip selection of what to create
                links[data.overlayType].trigger("click");
            } else if (data && data.values) { // add bookmark with existing data (e.g. after dragging url into sidebar)
                links.bookmark.trigger("click");
            }
        };

        /**
         * Extends the overlay html for showing infos about the bookmark
         *
         * @param {object} data
         */
        const handleInfosHtml = (data) => {
            appendPreviewLink(data, true);

            const parentInfos = ext.helper.entry.getParentsById(data.id);

            if (parentInfos.length > 0) {
                const breadcrumb = $("<ul></ul>").addClass($.cl.sidebar.breadcrumb).appendTo(elements.modal);
                parentInfos.forEach((parentInfo) => {
                    $("<li></li>").text(parentInfo.title).prependTo(breadcrumb);
                });
            }

            appendAdditionalInfo(data);

            const list = $("<ul></ul>").appendTo(elements.modal);
            const createdDate = new Date(data.dateAdded);

            $("<li></li>").html(ext.helper.i18n.get("overlay_bookmark_created_date") + " " + ext.helper.i18n.getLocaleDate(createdDate)).appendTo(list);

            if (data.isDir) {
                const childrenEntry = $("<li></li>")
                    .addClass($.cl.tooltip.wrapper)
                    .append("<span>" + data.childrenAmount.total + "</span>")
                    .append(" " + ext.helper.i18n.get("overlay_dir_children"), false)
                    .appendTo(list);

                $("<ul></ul>")
                    .append("<li>" + data.childrenAmount.bookmarks + " " + ext.helper.i18n.get("overlay_dir_children_bookmarks") + "</li>")
                    .append("<li>" + data.childrenAmount.directories + " " + ext.helper.i18n.get("overlay_dir_children_dirs") + "</li>")
                    .appendTo(childrenEntry);
            }

            const viewsEntry = $("<li></li>")
                .addClass($.cl.tooltip.wrapper)
                .append("<span>" + data.views.total + "</span>")
                .append(" " + ext.helper.i18n.get("overlay_bookmark_views" + (data.views.total === 1 ? "_single" : "")), false)
                .appendTo(list);

            const startDate = new Date(data.views.startDate);
            $("<ul></ul>")
                .append("<li>" + ext.helper.i18n.get("overlay_bookmark_views_since") + " " + ext.helper.i18n.getLocaleDate(startDate) + "</li>")
                .append("<li>" + data.views.perMonth + " " + ext.helper.i18n.get("overlay_bookmark_views" + (data.views.perMonth === 1 ? "_single" : "")) + " " + ext.helper.i18n.get("overlay_bookmark_views_per_month") + "</li>")
                .appendTo(viewsEntry);
        };

        /**
         * Opens all the subfolder bookmarks in new tab
         *
         * @param {object} data
         */
        const openChildren = (data) => {
            this.closeOverlay();
            const bookmarks = data.children.filter(val => val.url && val.url !== "about:blank");
            ext.helper.utility.openAllBookmarks(bookmarks);
        };

        /**
         * Opens all the given bookmarks in new tab
         *
         * @param {object} data
         */
        const openSelected = (bookmarks) => {
            this.closeOverlay();
            ext.helper.utility.openAllBookmarks(bookmarks);
        };

        /**
         * Hides the given bookmark or directory from the sidebar
         *
         * @param {object} data
         */
        const hideEntry = (data) => {
            ext.startLoading();
            this.closeOverlay();

            const hiddenEntries = ext.helper.model.getData("u/hiddenEntries");
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
         * Deletes the given bookmarks or directories
         *
         * @param data
         */
        const deleteSelectedEntries = async (selectedEntries) => {
            ext.startLoading();
            for (const entry of selectedEntries) {
                ext.elm.bookmarkBox.all.find("a[" + $.attr.id + "='" + entry.id + "']").parent("li").remove();
                await ext.helper.bookmark.performDeletion(entry.id, true);
            }

            ext.helper.model.call("reload", {type: "Hide"});
            this.closeOverlay();
        };

        /**
         * Deletes the given bookmark or directory
         *
         * @param {object} data
         */
        const deleteEntry = (data) => {
            this.closeOverlay();
            ext.elm.bookmarkBox.all.find("a[" + $.attr.id + "='" + data.id + "']").parent("li").remove();
            ext.helper.bookmark.performDeletion(data.id);
        };

        /**
         * Validates the modal form for editing or adding entries,
         * returns the content of the fields and whether the form is filled properly
         *
         * @param {boolean} isDir
         * @returns {Object}
         */
        const getFormValues = (isDir) => {
            const titleInput = elements.modal.find("input[name='title']").removeClass($.cl.error);
            const urlInput = elements.modal.find("input[name='url']").removeClass($.cl.error);
            const positionSelect = elements.modal.find("select[name='position']");
            const infoField = elements.modal.find("textarea[name='info']");

            const ret = {
                errors: false,
                values: {
                    title: titleInput[0].value.trim(),
                    url: isDir ? null : urlInput[0].value.trim(),
                    position: positionSelect.length() > 0 ? positionSelect[0].value : ext.helper.model.getData("b/newEntryPosition"),
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

            if (ret.values.url !== null && ret.values.url.search(/^[\w-]+\:/) !== 0) { // prepend http if no protocol specified
                ret.values.url = "http://" + ret.values.url;
            }

            return ret;
        };

        /**
         * Updates the title of the given separator
         *
         * @param {object} data
         */
        const editSeparator = (data) => {
            const title = elements.modal.find("input[name='title']")[0].value.trim();

            ext.helper.bookmark.editEntry({
                id: data.id,
                title: title.length > 0 ? "---- " + title + " ----" : "----------",
                url: "about:blank",
            }).then(() => {
                ext.helper.model.call("reload", {type: "Edit"});
                this.closeOverlay();
            });
        };

        /**
         * Updates the given bookmark or directory (title, url and additional info)
         *
         * @param {object} data
         */
        const editEntry = (data) => {
            const formValues = getFormValues(data.isDir);

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
                        ext.helper.model.call("reload", {type: "Edit"});
                        this.closeOverlay();
                    }
                });
            }
        };

        /**
         * Returns the index which the newly created element should be positioned at, depending on the given 'position' parameter
         *
         * @param {int} parentId
         * @param {string} position
         * @returns {*}
         */
        const getIndexOfNewEntry = (parentId, position) => {
            if (position === "prepend") { // prepend -> index = 0
                return 0;
            } else { // append to directory -> determine index based on the amount of existing bookmarks in the parent directory
                const parentList = ext.elm.bookmarkBox.all.find("ul > li > a[" + $.attr.id + "='" + parentId + "'] + ul");
                return parentList.children("li").length();
            }
        };

        /**
         * Adds a separator to the given directory
         *
         * @param {object} data
         */
        const addSeparator = (data) => {
            const title = elements.modal.find("input[name='title']")[0].value.trim();
            const position = elements.modal.find("select[name='position'")[0].value;
            const parentId = data.id || null;

            ext.helper.model.call("createBookmark", {
                title: title.length > 0 ? "---- " + title + " ----" : "----------",
                url: "about:blank",
                parentId: data.id || null,
                index: getIndexOfNewEntry(parentId, position)
            }).then(() => {
                this.closeOverlay();
            });
        };

        /**
         * Adds a bookmark or directory to the given directory
         *
         * @param {object} data
         */
        const addEntry = (data) => {
            if (elements.modal.children("ul").attr($.attr.type) === "separator") {
                addSeparator(data);
            } else {
                const formValues = getFormValues(elements.modal.find("input[name='url']").length() === 0);

                if (formValues.errors === false) {
                    const obj = {
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
                        obj.index = getIndexOfNewEntry(obj.parentId, formValues.values.position);
                    }

                    ext.helper.model.call("createBookmark", obj).then((result) => {
                        if (result.error) {
                            elements.modal.find("input[name='url']").addClass($.cl.error);
                        } else {
                            this.closeOverlay();
                        }
                    });
                }
            }
        };

        /**
         * Initializes the events for the currently displayed overlay
         */
        const initEvents = () => {
            const overlayBody = elements.overlay.find("body");

            if (ext.helper.model.getData("a/surface") === "auto") {
                $(document).on($.opts.events.systemColorChanged, () => {
                    if (ext.helper.stylesheet.getSystemSurface() === "dark") {
                        overlayBody.addClass($.cl.page.dark);
                    } else {
                        overlayBody.removeClass($.cl.page.dark);
                    }
                });
            }

            let clickstart = null;
            overlayBody.on("mousedown", (e) => {
                clickstart = e.target;
            }).on("click", (e) => { // close overlay when click outside the modal
                if (e.target.tagName === "BODY" && clickstart.tagName === "BODY") {
                    this.closeOverlay();
                }
            });

            elements.modal.find("a." + $.cl.close).on("click", (e) => { // close overlay by close button
                e.preventDefault();
                this.closeOverlay();
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
                ext.helper.utility.openUrl(elements.overlay.data("info"), "newTab");
            });
        };
    };

})(jsu);