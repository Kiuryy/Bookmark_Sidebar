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
            elements.overlay = $('<iframe />').attr("id", ext.opts.ids.page.overlay).appendTo("body");
            ext.helper.stylesheet.addStylesheets(["overlay"], elements.overlay);

            elements.modal = $("<div />")
                .attr(ext.opts.attr.type, type)
                .addClass(ext.opts.classes.overlay.modal)
                .appendTo(elements.overlay.find("body"));

            elements.modal.append("<h1>" + title + "</h1>");
            $("<a />").addClass(ext.opts.classes.overlay.close).appendTo(elements.modal);

            elements.buttonWrapper = $("<menu />").addClass(ext.opts.classes.overlay.buttonWrapper).appendTo(elements.modal);
            $("<a />")
                .addClass(ext.opts.classes.overlay.close)
                .text(ext.lang("overlay_" + (type === "infos" ? "close" : "cancel")))
                .appendTo(elements.buttonWrapper);

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
            }

            initEvents(data);

            setTimeout(() => {
                elements.modal.addClass(ext.opts.classes.overlay.visible);
                elements.overlay.addClass(ext.opts.classes.page.visible);
            }, 100);
        };

        /**
         * Closes the overlay
         */
        let closeOverlay = () => {
            ext.helper.model.call("realUrl", {abort: true}); // abort running check url ajax calls
            elements.overlay.removeClass(ext.opts.classes.page.visible);

            setTimeout(() => { // delay or it will not work properly
                ext.helper.scroll.updateAll(true, false);
            }, 100);

            setTimeout(() => {
                elements.overlay.remove();
            }, 500);
        };

        /**
         * Appends the bookmark preview to the current overlay
         *
         * @param {object} data
         * @param {boolean} addUrl
         */
        let appendPreviewLink = (data, addUrl) => {
            let preview = $("<" + (data.isDir ? "span" : "a") + " />")
                .attr("title", data.title + (data.url ? "\n" + data.url : ""))
                .addClass(ext.opts.classes.overlay.preview)
                .html(data.title)
                .appendTo(elements.modal);

            if (data.isDir) {
                preview.prepend("<span class='" + ext.opts.classes.sidebar.dirIcon + "' />");
            } else if (data.icon) {
                preview.prepend("<img src='" + data.icon + "' />");
            } else if (ext.opts.demoMode) {
                preview.prepend("<span class='" + ext.opts.classes.sidebar.dirIcon + "' data-color='" + (Math.floor(Math.random() * 10) + 1) + "' />");
            }

            if (addUrl && addUrl === true && data.isDir === false) {
                $("<a />")
                    .addClass(ext.opts.classes.overlay.previewUrl)
                    .attr("title", data.url)
                    .text(data.url)
                    .insertAfter(preview);
            }
        };

        /**
         * Extends the overlay html for the delete operation
         *
         * @param {object} data
         */
        let handleDeleteHtml = (data) => {
            $("<p />").text(ext.lang("overlay_delete_" + (data.isDir ? "dir" : "bookmark") + "_confirm")).appendTo(elements.modal);
            appendPreviewLink(data);
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.lang("overlay_delete")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for the edit operation
         *
         * @param {object} data
         */
        let handleEditHtml = (data) => {
            appendPreviewLink(data);
            let list = $("<ul />").appendTo(elements.modal);
            list.append("<li><label>" + ext.lang("overlay_bookmark_title") + "</label><input type='text' name='title' value='" + data.title + "' /></li>");
            if (!data.isDir) {
                list.append("<li><label>" + ext.lang("overlay_bookmark_url") + "</label><input type='text' name='url' value='" + data.url + "' /></li>");
            }
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.lang("overlay_save")).appendTo(elements.buttonWrapper);
        };

        /**
         * Returns the date string of the given date object
         *
         * @param {Date} dateObj
         * @returns {string}
         */
        let getLocaleDate = (dateObj) => {
            return dateObj.toLocaleDateString([chrome.i18n.getUILanguage(), ext.opts.manifest.default_locale], {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            });
        };

        /**
         * Extends the overlay html for showing the confirm dialog for opening all the bookmarks below the clicked directory
         *
         * @param {object} data
         */
        let handleOpenChildrenHtml = (data) => {
            let bookmarks = data.children.filter(val => !!(val.url));
            let text = ext.lang("overlay_confirm_open_children").replace(/\{1\}/, bookmarks.length);

            $("<p />").text(text).appendTo(elements.modal);
            appendPreviewLink(data, true);
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.lang("overlay_open_children")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for showing the confirm dialog for hiding bookmarks from the sidebar
         *
         * @param {object} data
         */
        let handleHideHtml = (data) => {
            $("<p />").text(ext.lang("overlay_hide_" + (data.isDir ? "dir" : "bookmark") + "_confirm")).appendTo(elements.modal);
            appendPreviewLink(data, true);
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.lang("overlay_hide_from_sidebar")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for adding a bookmark or directory
         */
        let handleAddHtml = () => {
            let submit = $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.lang("overlay_save")).appendTo(elements.buttonWrapper);
            let menu = $("<menu />").appendTo(elements.modal);
            $("<a />").attr(ext.opts.attr.type, "bookmark").attr("title", ext.lang("overlay_label_bookmark")).appendTo(menu);
            $("<a />").attr(ext.opts.attr.type, "dir").attr("title", ext.lang("overlay_label_dir")).appendTo(menu);

            menu.children("a").on("click", (e) => {
                e.preventDefault();
                let type = $(e.currentTarget).attr(ext.opts.attr.type);
                let list = $("<ul />").appendTo(elements.modal);
                list.append("<li><h2>" + $(e.currentTarget).attr("title") + "</h2></li>");
                list.append("<li><label>" + ext.lang("overlay_bookmark_title") + "</label><input type='text' name='title' /></li>");

                if (type === "bookmark") {
                    list.append("<li><label>" + ext.lang("overlay_bookmark_url") + "</label><input type='text' name='url' /></li>");
                }

                menu.addClass(ext.opts.classes.sidebar.hidden);

                setTimeout(() => {
                    list.addClass(ext.opts.classes.overlay.visible);
                    submit.addClass(ext.opts.classes.overlay.visible);
                }, 100);
            });
        };

        /**
         * Extends the overlay html for showing infos about the bookmark
         *
         * @param {object} data
         */
        let handleInfosHtml = (data) => {
            appendPreviewLink(data, true);
            let list = $("<ul />").appendTo(elements.modal);
            let createdDate = new Date(data.dateAdded);

            $("<li />").html(ext.lang("overlay_bookmark_created_date") + " " + getLocaleDate(createdDate)).appendTo(list);

            if (data.isDir) {
                let childrenEntry = $("<li />")
                    .addClass(ext.opts.classes.overlay.hasTooltip)
                    .append("<span>" + data.childrenAmount.total + "</span>")
                    .append(" " + ext.lang("overlay_dir_children"), false)
                    .appendTo(list);

                $("<ul />")
                    .append("<li>" + data.childrenAmount.bookmarks + " " + ext.lang("overlay_dir_children_bookmarks") + "</li>")
                    .append("<li>" + data.childrenAmount.directories + " " + ext.lang("overlay_dir_children_dirs") + "</li>")
                    .appendTo(childrenEntry);
            }

            let viewsEntry = $("<li />")
                .addClass(ext.opts.classes.overlay.hasTooltip)
                .append("<span>" + data.views.total + "</span>")
                .append(" " + ext.lang("overlay_bookmark_views" + (data.views.total === 1 ? "_single" : "")), false)
                .appendTo(list);

            $("<ul />")
                .append("<li>" + ext.lang("overlay_bookmark_views_since") + " " + getLocaleDate(data.views.startDate) + "</li>")
                .append("<li>" + data.views.perMonth + " " + ext.lang("overlay_bookmark_views" + (data.views.perMonth === 1 ? "_single" : "")) + " " + ext.lang("overlay_bookmark_views_per_month") + "</li>")
                .appendTo(viewsEntry);
        };

        /**
         * Generates a list with all urls which have changed or could not be found
         *
         * @param {Array} updateList
         */
        let handleUpdateUrlsFinished = (updateList) => {
            let hasResults = updateList.length > 0;

            setTimeout(() => {
                elements.desc.remove();
                elements.progressBar.remove();
                elements.progressLabel.remove();

                hasResults && elements.modal.addClass(ext.opts.classes.overlay.urlCheckList);

                setTimeout(() => {
                    elements.loader.remove();
                    elements.modal.removeClass(ext.opts.classes.overlay.urlCheckLoading);
                    elements.buttonWrapper.children("a." + ext.opts.classes.overlay.close).text(ext.lang("overlay_close"));

                    if (updateList.length === 0) {
                        $("<p />").addClass(ext.opts.classes.overlay.success).text(ext.lang("overlay_check_urls_no_results")).appendTo(elements.modal);
                    } else {
                        $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.lang("overlay_update")).appendTo(elements.buttonWrapper);
                        let scrollBox = ext.helper.scroll.add(ext.opts.ids.overlay.urlList, $("<ul />").appendTo(elements.modal));
                        let overlayBody = elements.overlay.find("body");

                        updateList.forEach((entry) => {
                            let listEntry = $("<li />")
                                .data("entry", entry)
                                .append(ext.helper.checkbox.get(overlayBody, {checked: "checked"}))
                                .append("<strong>" + entry.title + "</strong>");

                            $("<a />").attr({
                                href: entry.url, title: entry.url, target: "_blank"
                            }).html("<span>" + entry.url + "</span>").appendTo(listEntry);

                            if (entry.urlStatusCode === 404) {
                                $("<span />").text(ext.lang("overlay_check_urls_not_found")).appendTo(listEntry);
                            } else if (entry.newUrl !== entry.url) {
                                $("<a />").attr({
                                    href: entry.newUrl, title: entry.newUrl, target: "_blank"
                                }).html("<span>" + entry.newUrl + "</span>").appendTo(listEntry);
                            }

                            listEntry = listEntry.appendTo(scrollBox.children("ul"));

                            ext.helper.model.call("favicon", {url: entry.url}, (response) => { // retrieve favicon of url
                                if (response.img) { // favicon found -> add to entry
                                    $("<img src='" + response.img + "' />").insertAfter(listEntry.children("div." + ext.opts.classes.checkbox.box))
                                }
                            });
                        });

                        ext.helper.scroll.update(scrollBox);
                    }
                }, hasResults ? 1000 : 0);

            }, 1000);
        };

        /**
         * Extends the overlay html for the url update process
         *
         * @param {object} data
         */
        let handleUpdateUrlsHtml = (data) => {
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

            elements.desc = $("<p />").text(ext.lang("overlay_check_urls_loading")).appendTo(elements.modal);
            elements.progressBar = $("<div />").addClass(ext.opts.classes.overlay.progressBar).html("<div />").appendTo(elements.modal);
            elements.progressLabel = $("<span />").addClass(ext.opts.classes.overlay.checkUrlProgressLabel).html("<span>0</span>/<span>" + bookmarkAmount + "</span>").appendTo(elements.modal);
            elements.loader = ext.getLoaderHtml().appendTo(elements.modal);

            setTimeout(() => {
                elements.modal.addClass(ext.opts.classes.overlay.urlCheckLoading);
            }, 500);

            let finished = 0;
            let updateList = [];
            bookmarks.forEach((bookmark) => {
                ext.helper.model.call("realUrl", {url: bookmark.url}, (response) => {
                    finished++;
                    elements.progressBar.children("div").css("width", (finished / bookmarkAmount * 100) + "%");
                    elements.progressLabel.children("span").eq(0).text(finished);

                    if (+response.code === 404 || (bookmark.url !== response.url && +response.code !== 302)) { // show all urls which have changed permanently and broken links
                        bookmark.newUrl = response.url;
                        bookmark.urlStatusCode = +response.code;
                        updateList.push(bookmark);
                    }

                    if (finished === bookmarkAmount) {
                        handleUpdateUrlsFinished(updateList);
                    }
                });
            });
        };

        /**
         * Opens all the given bookmarks in new tab
         *
         * @param {object} data
         */
        let openChildren = (data) => {
            closeOverlay();
            let bookmarks = data.children.filter(val => !!(val.url));
            bookmarks.forEach((bookmark) => {
                ext.helper.sidebarEvents.openUrl(bookmark, "newTab", ext.helper.model.getData("b/newTab") === "foreground");
            });
        };

        /**
         * Hides the given bookmark or directory from the sidebar
         *
         * @param {object} data
         */
        let hideBookmark = (data) => {
            ext.startLoading();
            closeOverlay();

            let hiddenEntries = ext.helper.model.getData("u/hiddenEntries");
            hiddenEntries[data.id] = true;

            ext.helper.model.setData({"u/hiddenEntries": hiddenEntries}, () => {
                ext.helper.list.updateBookmarkBox();
                ext.endLoading();
            });
        };

        /**
         * Deletes the given bookmark or directory recursively
         *
         * @param {object} data
         */
        let deleteBookmark = (data) => {
            closeOverlay();

            ext.helper.model.call("deleteBookmark", {id: data.id}, () => {
                data.element.parent("li").remove();
            });
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

            let ret = {
                errors: false,
                values: {
                    title: titleInput[0].value.trim(),
                    url: isDir ? null : urlInput[0].value.trim()
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
         * Updates the given bookmark or directory (title, url)
         *
         * @param {object} data
         */
        let editEntry = (data) => {
            let formValues = getFormValues(data.isDir);

            if (formValues.errors === false) {
                ext.helper.model.call("updateBookmark", {
                    id: data.id,
                    title: formValues.values.title,
                    url: formValues.values.url
                }, (result) => {
                    if (result.error) {
                        elements.modal.find("input[name='url']").addClass(ext.opts.classes.overlay.inputError);
                    } else {
                        closeOverlay();
                        data.title = formValues.values.title;
                        data.url = formValues.values.url;
                        data.element.children("span." + ext.opts.classes.sidebar.bookmarkLabel).text(data.title);
                    }
                });
            }
        };

        /**
         * Adds a bookmark or directory to the given directory
         *
         * @param {object} data
         */
        let addEntry = (data) => {
            let formValues = getFormValues(elements.modal.find("input[name='url']").length() === 0);

            if (formValues.errors === false) {
                ext.helper.model.call("createBookmark", {
                    parentId: data.id,
                    index: 0,
                    title: formValues.values.title,
                    url: formValues.values.url
                }, (result) => {
                    if (result.error) {
                        elements.modal.find("input[name='url']").addClass(ext.opts.classes.overlay.inputError);
                    } else {
                        ext.helper.list.updateBookmarkBox();
                        closeOverlay();
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
                        ext.helper.model.call("deleteBookmark", {id: entry.id});
                    } else if (entry.url !== entry.newUrl) {
                        ext.helper.model.call("updateBookmark", {id: entry.id, title: entry.title, url: entry.newUrl});
                    }
                }
            });

            ext.helper.list.updateBookmarkBox();
            closeOverlay();
        };

        /**
         * Initializes the events for the currently displayed overlay
         *
         * @param {object} data
         */
        let initEvents = (data) => {
            elements.overlay.find("body").on("click", (e) => { // close overlay when click outside the modal
                if (e.target.tagName === "BODY") {
                    closeOverlay();
                }
            });

            elements.overlay.find("body").on('wheel', (e) => {
                if (!$(e.target).hasClass(ext.opts.classes.scrollBox.wrapper) && $(e.target).parents("." + ext.opts.classes.scrollBox.wrapper).length() === 0) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            elements.modal.find("a." + ext.opts.classes.overlay.close).on("click", (e) => { // close overlay by close button
                e.preventDefault();
                closeOverlay();
            });

            elements.modal.on("click", "a." + ext.opts.classes.overlay.action, (e) => { // perform the action
                e.preventDefault();

                switch (elements.modal.attr(ext.opts.attr.type)) {
                    case "delete": {
                        deleteBookmark(data);
                        break;
                    }
                    case "hide": {
                        hideBookmark(data);
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
            });

            elements.modal.on("focus", "input", (e) => { // remove error class from input fields
                $(e.currentTarget).removeClass(ext.opts.classes.overlay.inputError);
            });

            elements.modal.find("a." + ext.opts.classes.overlay.preview + ", a." + ext.opts.classes.overlay.previewUrl).on("click", (e) => { // open bookmark
                e.preventDefault();
                ext.helper.sidebarEvents.openUrl(data, "newTab");
            });
        };
    };

})(jsu);