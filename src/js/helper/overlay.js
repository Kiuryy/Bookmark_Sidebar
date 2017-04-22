($ => {
    "use strict";

    window.OverlayHelper = function (ext) {

        let elements = {};

        /**
         * Creates a new overlay for the given bookmark
         *
         * @param {string} type
         * @param {string} title
         * @param {object} infos
         */
        this.create = (type, title, infos) => {
            let isDir = !!(infos.children);

            elements.overlay = $('<iframe />').attr("id", ext.opts.ids.page.overlay).appendTo("body");
            ext.helper.stylesheet.addStylesheets(["overlay"], elements.overlay);

            elements.modal = $("<div />")
                .attr(ext.opts.attr.type, type)
                .data("infos", infos)
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
                    handleDeleteHtml(infos, isDir);
                    break;
                }
                case "edit": {
                    handleEditHtml(infos, isDir);
                    break;
                }
                case "infos": {
                    handleInfosHtml(infos, isDir);
                    break;
                }
                case "add": {
                    handleAddHtml(infos, isDir);
                    break;
                }
                case "hide": {
                    handleHideHtml(infos, isDir);
                    break;
                }
                case "openChildren": {
                    handleOpenChildrenHtml(infos, isDir);
                    break;
                }
                case "updateUrls": {
                    handleUpdateUrlsHtml(infos, isDir);
                    break;
                }
            }

            initEvents();

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

            setTimeout(() => {
                ext.helper.scroll.updateAll(true);
                elements.overlay.remove();
            }, 500);
        };

        /**
         * Appends the bookmark preview to the current overlay
         *
         * @param {object} infos
         * @param {boolean} isDir
         * @param {boolean} addUrl
         */
        let appendPreviewLink = (infos, isDir, addUrl) => {
            let preview = $("<" + (isDir ? "span" : "a") + " />")
                .attr("title", infos.title + (infos.url ? "\n" + infos.url : ""))
                .data("infos", infos)
                .addClass(ext.opts.classes.overlay.preview)
                .html(infos.title)
                .appendTo(elements.modal);

            if (isDir) {
                preview.prepend("<span class='" + ext.opts.classes.sidebar.dirIcon + "' />");
            } else if (infos.icon) {
                preview.prepend("<img src='" + infos.icon + "' />");
            }

            if (addUrl && addUrl === true && isDir === false) {
                $("<a />")
                    .addClass(ext.opts.classes.overlay.previewUrl)
                    .attr("title", infos.url)
                    .data("infos", infos)
                    .text(infos.url)
                    .insertAfter(preview);
            }
        };

        /**
         * Extends the overlay html for the delete operation
         *
         * @param {object} infos
         * @param {boolean} isDir
         */
        let handleDeleteHtml = (infos, isDir) => {
            $("<p />").text(ext.lang("overlay_delete_" + (isDir ? "dir" : "bookmark") + "_confirm")).appendTo(elements.modal);
            appendPreviewLink(infos, isDir);
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.lang("overlay_delete")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for the edit operation
         *
         * @param {object} infos
         * @param {boolean} isDir
         */
        let handleEditHtml = (infos, isDir) => {
            appendPreviewLink(infos, isDir);
            let list = $("<ul />").appendTo(elements.modal);
            list.append("<li><label>" + ext.lang("overlay_bookmark_title") + "</label><input type='text' name='title' value='" + infos.title + "' /></li>");
            if (!isDir) {
                list.append("<li><label>" + ext.lang("overlay_bookmark_url") + "</label><input type='text' name='url' value='" + infos.url + "' /></li>");
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
         * Appends the view info the the given list
         *
         * @param {jsu} list
         * @param {object} infos
         * @param {object} modelResponse
         */
        let appendViewAmount = (list, infos, modelResponse) => {
            let viewAmount = 0;

            if (typeof modelResponse.views !== "undefined") {
                viewAmount = modelResponse.views;
            } else if (typeof modelResponse.clickAmount !== "undefined") {
                viewAmount = modelResponse.clickAmount;
            }

            let startDate = new Date(Math.max(infos.dateAdded, modelResponse.counterStartDate));
            let monthDiff = Math.max(1, Math.round((+new Date() - startDate) / (30.416666 * 24 * 60 * 60 * 1000)));
            let viewsPerMonth = Math.round(viewAmount / monthDiff * 100) / 100;

            let viewsEntry = $("<li />")
                .addClass(ext.opts.classes.overlay.hasTooltip)
                .append("<span>" + viewAmount + "</span>")
                .append(" " + ext.lang("overlay_bookmark_views" + (viewAmount === 1 ? "_single" : "")), false)
                .appendTo(list);

            $("<ul />")
                .append("<li>" + ext.lang("overlay_bookmark_views_since") + " " + getLocaleDate(startDate) + "</li>")
                .append("<li>" + viewsPerMonth + " " + ext.lang("overlay_bookmark_views" + (viewsPerMonth === 1 ? "_single" : "")) + " " + ext.lang("overlay_bookmark_views_per_month") + "</li>")
                .appendTo(viewsEntry);
        };

        /**
         * Extends the overlay html for showing the confirm dialog for opening all the bookmarks below the clicked directory
         *
         * @param {object} infos
         * @param {boolean} isDir
         */
        let handleOpenChildrenHtml = (infos, isDir) => {
            let bookmarks = infos.children.filter(val => !!(val.url));
            let text = ext.lang("overlay_confirm_open_children").replace(/\{1\}/, bookmarks.length);

            $("<p />").text(text).appendTo(elements.modal);
            appendPreviewLink(infos, isDir, true);
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.lang("overlay_open_children")).data("bookmarks", bookmarks).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for showing the confirm dialog for hiding bookmarks from the sidebar
         *
         * @param {object} infos
         * @param {boolean} isDir
         */
        let handleHideHtml = (infos, isDir) => {
            $("<p />").text(ext.lang("overlay_hide_" + (isDir ? "dir" : "bookmark") + "_confirm")).appendTo(elements.modal);
            appendPreviewLink(infos, isDir, true);
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.lang("overlay_hide_from_sidebar")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for adding a bookmark or directory
         */
        let handleAddHtml = () => {
            let submit = $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.lang("overlay_save")).appendTo(elements.buttonWrapper);
            let menu = $("<menu />").appendTo(elements.modal);
            $("<a href='#' />").attr(ext.opts.attr.type, "bookmark").attr("title", ext.lang("overlay_label_bookmark")).appendTo(menu);
            $("<a href='#' />").attr(ext.opts.attr.type, "dir").attr("title", ext.lang("overlay_label_dir")).appendTo(menu);

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
                }, 200);
            });
        };

        /**
         * Extends the overlay html for showing infos about the bookmark
         *
         * @param {object} infos
         * @param {boolean} isDir
         */
        let handleInfosHtml = (infos, isDir) => {
            appendPreviewLink(infos, isDir, true);
            let list = $("<ul />").appendTo(elements.modal);

            let createdDate = new Date(infos.dateAdded);
            $("<li />").html(ext.lang("overlay_bookmark_created_date") + " " + getLocaleDate(createdDate)).appendTo(list);

            if (isDir) {
                ext.helper.model.call("dirInfos", {id: infos.id}, (response) => {
                    let childrenEntry = $("<li />")
                        .addClass(ext.opts.classes.overlay.hasTooltip)
                        .append("<span>" + response.childrenAmount.total + "</span>")
                        .append(" " + ext.lang("overlay_dir_children"), false)
                        .appendTo(list);

                    $("<ul />")
                        .append("<li>" + response.childrenAmount.bookmarks + " " + ext.lang("overlay_dir_children_bookmarks") + "</li>")
                        .append("<li>" + response.childrenAmount.dirs + " " + ext.lang("overlay_dir_children_dirs") + "</li>")
                        .appendTo(childrenEntry);

                    appendViewAmount(list, infos, response);
                });
            } else {
                ext.helper.model.call("viewAmount", {id: infos.id}, (response) => {
                    appendViewAmount(list, infos, response);
                });
            }
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
                                .data("infos", entry)
                                .append(ext.helper.checkbox.get(overlayBody, {checked: "checked"}))
                                .append("<strong>" + entry.title + "</strong>");

                            $("<a />").attr({
                                href: entry.url, title: entry.url, target: "_blank"
                            }).text(entry.url).appendTo(listEntry);

                            if (entry.urlStatusCode === 404) {
                                $("<span />").text(ext.lang("overlay_check_urls_not_found")).appendTo(listEntry);
                            } else if (entry.newUrl !== entry.url) {
                                $("<a />").attr({
                                    href: entry.newUrl, title: entry.newUrl, target: "_blank"
                                }).text(entry.newUrl).appendTo(listEntry);
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
         * @param {object} infos
         */
        let handleUpdateUrlsHtml = (infos) => {
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
            processBookmarks(infos.children);
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
         * @param {Array} bookmarks
         */
        let openChildren = (bookmarks) => {
            closeOverlay();
            bookmarks.forEach((bookmark) => {
                ext.helper.sidebarEvents.openUrl(bookmark, "newTab", ext.helper.model.getData("b/newTab") === "foreground");
            });
        };

        /**
         * Hides the given bookmark or directory from the sidebar
         *
         * @param {object} infos
         */
        let hideBookmark = (infos) => {
            ext.startLoading();
            closeOverlay();

            let hiddenEntries = ext.helper.model.getData("u/hiddenEntries");
            hiddenEntries[infos.id] = true;

            ext.helper.model.setData({"u/hiddenEntries": hiddenEntries}, () => {
                ext.updateBookmarkBox();
                ext.endLoading();
            });
        };

        /**
         * Deletes the given bookmark or directory recursively
         *
         * @param {object} infos
         */
        let deleteBookmark = (infos) => {
            closeOverlay();

            ext.helper.model.call("deleteBookmark", {id: infos.id}, () => {
                infos.element.parent("li").remove();
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
         * @param {object} infos
         */
        let editEntry = (infos) => {
            let formValues = getFormValues(!!(infos.children));

            if (formValues.errors === false) {
                ext.helper.model.call("updateBookmark", {
                    id: infos.id,
                    title: formValues.values.title,
                    url: formValues.values.url
                }, (result) => {
                    if (result.error) {
                        elements.modal.find("input[name='url']").addClass(ext.opts.classes.overlay.inputError);
                    } else {
                        closeOverlay();
                        infos.title = formValues.values.title;
                        infos.url = formValues.values.url;
                        infos.element.data("infos", infos);
                        infos.element.children("span." + ext.opts.classes.sidebar.bookmarkLabel).text(infos.title);
                    }
                });
            }
        };

        /**
         * Adds a bookmark or directory to the given directory
         *
         * @param {object} infos
         */
        let addEntry = (infos) => {
            let formValues = getFormValues(elements.modal.find("input[name='url']").length() === 0);

            if (formValues.errors === false) {
                ext.helper.model.call("createBookmark", {
                    parentId: infos.id,
                    index: 0,
                    title: formValues.values.title,
                    url: formValues.values.url
                }, (result) => {
                    if (result.error) {
                        elements.modal.find("input[name='url']").addClass(ext.opts.classes.overlay.inputError);
                    } else {
                        ext.startLoading();
                        ext.updateBookmarkBox();
                        closeOverlay();
                        ext.endLoading();
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
                    let infos = $(elm).data("infos");

                    if (infos.urlStatusCode === 404) {
                        ext.helper.model.call("deleteBookmark", {id: infos.id});
                    } else if (infos.url !== infos.newUrl) {
                        ext.helper.model.call("updateBookmark", {id: infos.id, title: infos.title, url: infos.newUrl});
                    }
                }
            });

            ext.startLoading();
            ext.updateBookmarkBox();
            closeOverlay();
            ext.endLoading();
        };

        /**
         * Initializes the events for the currently displayed overlay
         */
        let initEvents = () => {
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
                let infos = elements.modal.data("infos");
                switch (elements.modal.attr(ext.opts.attr.type)) {
                    case "delete": {
                        deleteBookmark(infos);
                        break;
                    }
                    case "hide": {
                        hideBookmark(infos);
                        break;
                    }
                    case "openChildren": {
                        openChildren($(e.currentTarget).data("bookmarks"));
                        break;
                    }
                    case "edit": {
                        editEntry(infos);
                        break;
                    }
                    case "add": {
                        addEntry(infos);
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
                let infos = $(e.currentTarget).data("infos");
                ext.helper.sidebarEvents.openUrl(infos, "newTab");
            });
        };
    };

})(jsu);