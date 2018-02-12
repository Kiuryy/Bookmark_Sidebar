($ => {
    "use strict";

    window.OverlayHelper = function (ext) {

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
                .attr("id", ext.opts.ids.page.overlay)
                .data("info", data || {})
                .appendTo("body");

            ext.helper.stylesheet.addStylesheets(["overlay"], elements.overlay);

            let iframeBody = elements.overlay.find("body");
            iframeBody.parent("html").attr("dir", ext.helper.i18n.isRtl() ? "rtl" : "ltr");

            elements.modal = $("<div />")
                .attr(ext.opts.attr.type, type)
                .addClass(ext.opts.classes.overlay.modal)
                .appendTo(iframeBody);

            if (config.animations === false) {
                elements.overlay.addClass(ext.opts.classes.page.noAnimations);
            }

            if (config.darkMode) {
                iframeBody.addClass(ext.opts.classes.page.darkMode);
            } else if (config.highContrast) {
                iframeBody.addClass(ext.opts.classes.page.highContrast);
            }

            let header = $("<header />").appendTo(elements.modal);
            $("<h1 />").text(title).appendTo(header);
            $("<a />").addClass(ext.opts.classes.overlay.close).appendTo(header);

            elements.buttonWrapper = $("<menu />").addClass(ext.opts.classes.overlay.buttonWrapper).appendTo(elements.modal);
            $("<a />")
                .addClass(ext.opts.classes.overlay.close)
                .appendTo(elements.buttonWrapper);

            setCloseButtonLabel(type === "infos" ? "close" : "cancel");

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
                case "updateUrls": {
                    handleUpdateUrlsHtml(data);
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
            ext.helper.model.call("trackPageView", {page: "/overlay/" + type});
            initEvents();

            $.delay(100).then(() => {
                elements.modal.addClass(ext.opts.classes.overlay.visible);
                elements.overlay.addClass(ext.opts.classes.page.visible);
            });
        };

        /**
         * Performs the action of the current overlay
         */
        this.performAction = () => {
            let data = elements.overlay.data("info");

            switch (elements.modal.attr(ext.opts.attr.type)) {
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
                case "updateUrls": {
                    updateBookmarkUrls();
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
            ext.helper.model.call("checkUrls", {abort: true}); // abort running check url ajax calls
            ext.elements.bookmarkBox.all.find("li." + ext.opts.classes.drag.isDragged).remove();
            elements.overlay.removeClass(ext.opts.classes.page.visible);

            ext.helper.model.call("trackEvent", {
                category: "overlay",
                action: cancel ? "cancel" : "action",
                label: elements.modal.attr(ext.opts.attr.type) + labelAdd
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
        let setCloseButtonLabel = (type = "close") => {
            elements.buttonWrapper.children("a." + ext.opts.classes.overlay.close).text(ext.helper.i18n.get("overlay_" + type));
        };

        /**
         * Appends the additional information for the given entry
         *
         * @param {object} data
         */
        let appendAdditionalInfo = (data) => {
            if (data.additionalInfo && data.additionalInfo.desc) {
                let container = $("<div />").addClass(ext.opts.classes.overlay.info).appendTo(elements.modal);

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
                .addClass(ext.opts.classes.overlay.preview)
                .text(data.title)
                .appendTo(elements.modal);

            if (data.isDir) {
                preview.prepend("<span class='" + ext.opts.classes.sidebar.dirIcon + "' />");
            } else if (ext.opts.demoMode) {
                preview.prepend("<span class='" + ext.opts.classes.sidebar.dirIcon + "' data-color='" + (Math.floor(Math.random() * 10) + 1) + "' />");
            } else {
                ext.helper.model.call("favicon", {url: data.url}).then((response) => { // retrieve favicon of url
                    if (response.img) { // favicon found -> add to entry
                        preview.prepend("<img src='" + response.img + "' />");
                    }
                });
            }

            if (addUrl && addUrl === true && data.isDir !== true) {
                $("<a />")
                    .addClass(ext.opts.classes.overlay.previewUrl)
                    .attr("title", data.url)
                    .text(data.url)
                    .insertAfter(preview);
            }
        };

        /**
         * Extends the overlay html for the list of available keyboard shortcuts
         *
         * @param {object} data
         */
        let handleKeyboardShortcutsDescHtml = (data) => {
            let scrollBox = $("<div />").addClass(ext.opts.classes.scrollBox.wrapper).appendTo(elements.modal);
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

            setCloseButtonLabel("close");
        };

        /**
         * Extends the overlay html for the descriptions of the two types of user sharings (config and activity)
         *
         * @param {object} data
         */
        let handleShareInfoDescHtml = (data) => {
            elements.modal.attr(ext.opts.attr.value, data.type);
            let scrollBox = $("<div />").addClass(ext.opts.classes.scrollBox.wrapper).appendTo(elements.modal);

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

            setCloseButtonLabel("close");
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
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.helper.i18n.get("overlay_delete")).appendTo(elements.buttonWrapper);
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
                .addClass(ext.opts.classes.overlay.info)
                .append("<label>" + ext.helper.i18n.get("overlay_bookmark_additional_info") + "</label>")
                .appendTo(list);

            let infoField = $("<textarea name='info' />").appendTo(infoEntry);
            infoField[0].value = (data.additionalInfo ? (data.additionalInfo.desc || "") : "");

            infoEntry.append("<span>" + ext.helper.i18n.get("settings_not_synced") + "</span>");

            infoField.on("focus", () => {
                infoEntry.addClass(ext.opts.classes.sidebar.active);
            }).on("blur", () => {
                infoEntry.removeClass(ext.opts.classes.sidebar.active);
            });

            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.helper.i18n.get("overlay_save")).appendTo(elements.buttonWrapper);
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
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.helper.i18n.get("overlay_open_children")).appendTo(elements.buttonWrapper);
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
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.helper.i18n.get("overlay_hide_from_sidebar")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for adding a bookmark or directory
         *
         * @param {object} data
         */
        let handleAddHtml = (data) => {
            let submit = $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.helper.i18n.get("overlay_save")).appendTo(elements.buttonWrapper);
            let menu = $("<menu />").attr(ext.opts.attr.name, "select").appendTo(elements.modal);
            let bookmarkLink = $("<a />").attr(ext.opts.attr.type, "bookmark").attr("title", ext.helper.i18n.get("overlay_label_bookmark")).appendTo(menu);
            $("<a />").attr(ext.opts.attr.type, "dir").attr("title", ext.helper.i18n.get("overlay_label_dir")).appendTo(menu);
            $("<a />").attr(ext.opts.attr.type, "separator").attr("title", ext.helper.i18n.get("overlay_label_separator")).appendTo(menu);

            menu.on("mouseleave", (e) => {
                $(e.currentTarget).children("a").removeClass(ext.opts.classes.sidebar.hover);
            });

            menu.children("a").on("mouseenter", (e) => {
                menu.children("a").removeClass(ext.opts.classes.sidebar.hover);
                $(e.currentTarget).addClass(ext.opts.classes.sidebar.hover);
            }).on("mouseleave", (e) => {
                $(e.currentTarget).removeClass(ext.opts.classes.sidebar.hover);
            }).on("click", (e) => {
                e.preventDefault();
                let type = $(e.currentTarget).attr(ext.opts.attr.type);

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

                    menu.addClass(ext.opts.classes.sidebar.hidden);
                    menu.children("a").removeClass(ext.opts.classes.sidebar.hover);

                    $.delay(data && data.values ? 0 : 100).then(() => {
                        list.addClass(ext.opts.classes.overlay.visible);
                        list.find("input")[0].focus();
                        submit.addClass(ext.opts.classes.overlay.visible);
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
                    .addClass(ext.opts.classes.overlay.hasTooltip)
                    .append("<span>" + data.childrenAmount.total + "</span>")
                    .append(" " + ext.helper.i18n.get("overlay_dir_children"), false)
                    .appendTo(list);

                $("<ul />")
                    .append("<li>" + data.childrenAmount.bookmarks + " " + ext.helper.i18n.get("overlay_dir_children_bookmarks") + "</li>")
                    .append("<li>" + data.childrenAmount.directories + " " + ext.helper.i18n.get("overlay_dir_children_dirs") + "</li>")
                    .appendTo(childrenEntry);
            }

            let viewsEntry = $("<li />")
                .addClass(ext.opts.classes.overlay.hasTooltip)
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
         * Generates a list with all urls which have changed or could not be found
         *
         * @param {Array} updateList
         */
        let handleUpdateUrlsFinished = (updateList) => {
            let hasResults = updateList.length > 0;

            $.delay(1000).then(() => {
                elements.desc.remove();
                elements.progressBar.remove();
                elements.progressLabel.remove();

                if (hasResults) {
                    elements.modal.addClass(ext.opts.classes.overlay.urlCheckList);
                }

                return $.delay(hasResults ? 1000 : 0);
            }).then(() => {
                elements.loader.remove();
                elements.modal.removeClass(ext.opts.classes.overlay.urlCheckLoading);
                setCloseButtonLabel("close");

                if (updateList.length === 0) {
                    $("<p />").addClass(ext.opts.classes.overlay.success).text(ext.helper.i18n.get("overlay_check_urls_no_results")).appendTo(elements.modal);
                } else {
                    $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.helper.i18n.get("overlay_update")).appendTo(elements.buttonWrapper);
                    let scrollBox = ext.helper.scroll.add(ext.opts.ids.overlay.urlList, $("<ul />").appendTo(elements.modal));
                    let overlayBody = elements.overlay.find("body");

                    updateList.forEach((entry) => {
                        let listEntry = $("<li />")
                            .data("entry", entry)
                            .append(ext.helper.checkbox.get(overlayBody, {checked: "checked"}));

                        $("<strong />").text(entry.title).appendTo(listEntry);

                        $("<a />").attr({
                            href: entry.url, title: entry.url, target: "_blank"
                        }).html("<span>" + entry.url + "</span>").appendTo(listEntry);

                        if (entry.urlStatusCode === 404) {
                            $("<span />").text(ext.helper.i18n.get("overlay_check_urls_not_found")).appendTo(listEntry);
                        } else if (entry.newUrl !== entry.url) {
                            $("<a />").attr({
                                href: entry.newUrl, title: entry.newUrl, target: "_blank"
                            }).html("<span>" + entry.newUrl + "</span>").appendTo(listEntry);
                        }

                        listEntry = listEntry.appendTo(scrollBox.children("ul"));

                        ext.helper.model.call("favicon", {url: entry.url}).then((response) => { // retrieve favicon of url
                            if (response.img) { // favicon found -> add to entry
                                $("<img src='" + response.img + "' />").insertAfter(listEntry.children("div." + ext.opts.classes.checkbox.box));
                            }
                        });
                    });
                }
            });
        };


        /**
         * Extends the overlay html for the url update process
         *
         * @param {object} data
         */
        let handleUpdateUrlsHtml = (data) => {
            elements.loader = ext.helper.template.loading().appendTo(elements.modal);
            elements.desc = $("<p />").text(ext.helper.i18n.get("overlay_check_urls_loading")).appendTo(elements.modal);

            ext.helper.model.call("websiteStatus").then((opts) => {
                if (opts.status === "available") {
                    let bookmarks = [];

                    let processBookmarks = (entries) => { // check all subordinate bookmarks of the given directory
                        entries.forEach((entry) => {
                            if (entry.url) {
                                bookmarks.push(entry);
                            } else if (entry.children) {
                                processBookmarks(entry.children);
                            }
                        });
                    };
                    processBookmarks(data.children);
                    let bookmarkAmount = bookmarks.length;

                    elements.progressBar = $("<div />").addClass(ext.opts.classes.overlay.progressBar).html("<div />").appendTo(elements.modal);
                    elements.progressLabel = $("<span />").addClass(ext.opts.classes.overlay.checkUrlProgressLabel).html("<span>0</span>/<span>" + bookmarkAmount + "</span>").appendTo(elements.modal);

                    $.delay(500).then(() => {
                        elements.modal.addClass(ext.opts.classes.overlay.urlCheckLoading);
                    });

                    let finished = 0;
                    let updateList = [];
                    let bookmarkInfos = {};

                    let checkUrls = (urls) => {
                        ext.helper.model.call("checkUrls", {urls: urls}).then((response) => {
                            if (!response.error) { // not cancelled -> proceed
                                let x = -1;
                                Object.entries(response).forEach(([id, data]) => {
                                    $.delay(++x * 50).then(() => { // smoothing the progress bar
                                        finished++;
                                        elements.progressBar.children("div").css("width", (finished / bookmarkAmount * 100) + "%");
                                        elements.progressLabel.children("span").eq(0).text(finished);

                                        if (+data.code === 404 || (bookmarkInfos[id].url !== data.url && +data.code !== 302)) { // show all urls which have changed permanently and broken links
                                            bookmarkInfos[id].newUrl = data.url;
                                            bookmarkInfos[id].urlStatusCode = +data.code;
                                            updateList.push(bookmarkInfos[id]);
                                        }

                                        if (finished === bookmarkAmount) {
                                            handleUpdateUrlsFinished(updateList);
                                        }
                                    });
                                });
                            }
                        });
                    };

                    let i = 0;
                    let chunk = {};
                    bookmarks.forEach((bookmark) => {
                        i++;
                        chunk[bookmark.id] = bookmark.url;
                        bookmarkInfos[bookmark.id] = bookmark;

                        if (Object.keys(chunk).length >= 10 || i === bookmarkAmount) { // check multiple urls at once
                            checkUrls(chunk);
                            chunk = {};
                        }
                    });
                } else { // website not available -> show message
                    elements.loader.remove();
                    elements.desc.remove();

                    $("<div />").addClass(ext.opts.classes.overlay.inputError)
                        .append("<h3>" + ext.helper.i18n.get("status_service_unavailable_headline") + "</h3>")
                        .append("<p>" + ext.helper.i18n.get("status_check_urls_unavailable_desc") + "</p>")
                        .appendTo(elements.modal);

                    setCloseButtonLabel("close");
                }
            });
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
            ext.elements.bookmarkBox.all.find("a[" + ext.opts.attr.id + "='" + data.id + "']").parent("li").remove();
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
            let titleInput = elements.modal.find("input[name='title']").removeClass(ext.opts.classes.overlay.inputError);
            let urlInput = elements.modal.find("input[name='url']").removeClass(ext.opts.classes.overlay.inputError);
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
                titleInput.addClass(ext.opts.classes.overlay.inputError);
                ret.errors = true;
            }

            if (!isDir && ret.values.url.length === 0) {
                urlInput.addClass(ext.opts.classes.overlay.inputError);
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
                        elements.modal.find("input[name='url']").addClass(ext.opts.classes.overlay.inputError);
                    } else {
                        ext.helper.model.call("trackEvent", {
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
         * Adds a separator to the given directory
         *
         * @param {object} data
         */
        let addSeparator = (data) => {
            ext.helper.model.call("createBookmark", {
                title: "----------",
                url: "about:blank",
                parentId: data.id || null,
                index: 0
            }).then(() => {
                ext.helper.model.call("trackEvent", {
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
                }

                ext.helper.model.call("createBookmark", obj).then((result) => {
                    if (result.error) {
                        elements.modal.find("input[name='url']").addClass(ext.opts.classes.overlay.inputError);
                    } else {
                        ext.helper.model.call("trackEvent", {
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
         * Updates all bookmarks which are checked,
         * deletes entries with non existing urls,
         * updates entries with changed urls
         */
        let updateBookmarkUrls = () => {
            elements.modal.find("div#" + ext.opts.ids.overlay.urlList + " ul > li").forEach((elm) => {
                if ($(elm).find("input[type='checkbox']")[0].checked) {
                    let entry = $(elm).data("entry");

                    if (entry.urlStatusCode === 404) {
                        ext.helper.model.call("deleteBookmark", {
                            id: entry.id,
                            preventReload: true
                        });
                    } else if (entry.url !== entry.newUrl) {
                        ext.helper.model.call("updateBookmark", {
                            id: entry.id,
                            title: entry.title,
                            url: entry.newUrl,
                            preventReload: true
                        });
                    }
                }
            });

            ext.helper.model.call("reload", {type: "Update"});
            this.closeOverlay();
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

            elements.modal.find("a." + ext.opts.classes.overlay.close).on("click", (e) => { // close overlay by close button
                e.preventDefault();
                this.closeOverlay(true);
            });

            elements.modal.on("click", "a." + ext.opts.classes.overlay.action, (e) => { // perform the action
                e.preventDefault();
                this.performAction();
            });

            elements.modal.on("focus", "input", (e) => { // remove error class from input fields
                $(e.currentTarget).removeClass(ext.opts.classes.overlay.inputError);
            });

            elements.modal.find("a." + ext.opts.classes.overlay.preview + ", a." + ext.opts.classes.overlay.previewUrl).on("click", (e) => { // open bookmark
                e.preventDefault();
                ext.helper.model.call("trackEvent", {
                    category: "url",
                    action: "open",
                    label: "new_tab_overlay"
                });
                ext.helper.utility.openUrl(elements.overlay.data("info"), "newTab");
            });
        };
    };

})(jsu);