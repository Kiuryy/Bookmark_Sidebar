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
            ext.helper.stylesheet.addStylesheets(elements.overlay, ["overlay"]);

            elements.modal = $("<div />")
                .attr("data-type", type)
                .data("infos", infos)
                .addClass(ext.opts.classes.overlay.modal)
                .appendTo(elements.overlay.find("body"));

            elements.modal.append("<h1>" + title + "</h1>");
            $("<a />").addClass(ext.opts.classes.overlay.close).appendTo(elements.modal);

            elements.buttonWrapper = $("<menu />").appendTo(elements.modal);
            $("<a />")
                .addClass(ext.opts.classes.overlay.close)
                .text(chrome.i18n.getMessage("overlay_" + (type === "infos" ? "close" : "cancel")))
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
         * Appends the bookmark preview to the current overlay
         *
         * @param {object} infos
         * @param {boolean} isDir
         * @param {boolean} addUrl
         */
        let appendPreviewLink = (infos, isDir, addUrl) => {
            let preview = $("<" + (isDir ? "span" : "a") + " />")
                .attr("title", infos.title + "\n" + infos.url)
                .data("infos", infos)
                .addClass(ext.opts.classes.overlay.preview)
                .html("<img src='" + infos.icon + "' />" + infos.title)
                .appendTo(elements.modal);

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
            $("<p />").text(chrome.i18n.getMessage("overlay_delete_" + (isDir ? "dir" : "bookmark") + "_confirm")).appendTo(elements.modal);
            appendPreviewLink(infos, isDir);
            $("<a />").addClass(ext.opts.classes.overlay.action).text(chrome.i18n.getMessage("overlay_delete")).appendTo(elements.buttonWrapper);
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
            list.append("<li><label>" + chrome.i18n.getMessage("overlay_bookmark_title") + "</label><input type='text' name='title' value='" + infos.title + "' /></li>");
            if (!isDir) {
                list.append("<li><label>" + chrome.i18n.getMessage("overlay_bookmark_url") + "</label><input type='text' name='url' value='" + infos.url + "' /></li>");
            }
            $("<a />").addClass(ext.opts.classes.overlay.action).text(chrome.i18n.getMessage("overlay_save")).appendTo(elements.buttonWrapper);
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
                .append(" " + chrome.i18n.getMessage("overlay_bookmark_views" + (viewAmount === 1 ? "_single" : "")), false)
                .appendTo(list);

            $("<ul />")
                .append("<li>" + chrome.i18n.getMessage("overlay_bookmark_views_since") + " " + getLocaleDate(startDate) + "</li>")
                .append("<li>" + viewsPerMonth + " " + chrome.i18n.getMessage("overlay_bookmark_views" + (viewsPerMonth === 1 ? "_single" : "")) + " " + chrome.i18n.getMessage("overlay_bookmark_views_per_month") + "</li>")
                .appendTo(viewsEntry);
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
            $("<li />").html(chrome.i18n.getMessage("overlay_bookmark_created_date") + " " + getLocaleDate(createdDate)).appendTo(list);

            if (isDir) {
                ext.helper.model.call("dirInfos", {id: infos.id}, (response) => {
                    let childrenEntry = $("<li />")
                        .addClass(ext.opts.classes.overlay.hasTooltip)
                        .append("<span>" + response.childrenAmount.total + "</span>")
                        .append(" " + chrome.i18n.getMessage("overlay_dir_children"), false)
                        .appendTo(list);

                    $("<ul />")
                        .append("<li>" + response.childrenAmount.bookmarks + " " + chrome.i18n.getMessage("overlay_dir_children_bookmarks") + "</li>")
                        .append("<li>" + response.childrenAmount.dirs + " " + chrome.i18n.getMessage("overlay_dir_children_dirs") + "</li>")
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
            setTimeout(() => {
                elements.desc.remove();
                elements.progressBar.remove();
                elements.progressLabel.remove();

                elements.modal.addClass(ext.opts.classes.overlay.urlCheckFinished);

                setTimeout(() => {
                    elements.loader.remove();
                    $("<a />").addClass(ext.opts.classes.overlay.action).text(chrome.i18n.getMessage("overlay_update")).appendTo(elements.buttonWrapper);
                    elements.modal.removeClass(ext.opts.classes.overlay.urlCheckLoading);

                    let scrollBox = ext.helper.scroll.add(ext.opts.ids.overlay.urlList, $("<ul />").appendTo(elements.modal));
                    updateList.forEach((entry) => {
                        let listEntry = $("<li />")
                            .data("infos", entry)
                            .append(ext.helper.checkbox.get(elements.overlay.find("body"), {checked: "checked"}))
                            .append("<strong>" + entry.title + "</strong>");

                        $("<a />").attr({
                            href: entry.url, title: entry.url, target: "_blank"
                        }).text(entry.url).appendTo(listEntry);

                        if (entry.urlStatusCode === 404) {
                            $("<span />").text(chrome.i18n.getMessage("overlay_check_urls_not_found")).appendTo(listEntry);
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
                }, 1000);

            }, 1000);
        };

        /**
         * Extends the overlay html for the url update process
         *
         * @param {object} infos
         * @param {boolean} isDir
         */
        let handleUpdateUrlsHtml = (infos, isDir) => {
            let bookmarkAmount = infos.bookmarks.length;

            elements.desc = $("<p />").text(chrome.i18n.getMessage("overlay_check_urls_loading")).appendTo(elements.modal);
            elements.progressBar = $("<div />").addClass(ext.opts.classes.overlay.progressBar).html("<div />").appendTo(elements.modal);
            elements.progressLabel = $("<span />").addClass(ext.opts.classes.overlay.checkUrlProgressLabel).html("<span>0</span>/<span>" + bookmarkAmount + "</span>").appendTo(elements.modal);
            elements.loader = ext.getLoaderHtml().appendTo(elements.modal);

            setTimeout(() => {
                elements.modal.addClass(ext.opts.classes.overlay.urlCheckLoading);
            }, 500);

            let finished = 0;
            let updateList = [];
            infos.bookmarks.forEach((bookmark) => {
                if (elements.overlay.length() > 0) {
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
                } else {
                    return false;
                }
            });

        };

        /**
         * Deletes the given bookmark or directory recursively
         *
         * @param {object} infos
         */
        let deleteBookmark = (infos) => {
            elements.modal.find("a." + ext.opts.classes.overlay.close).eq(0).trigger("click");

            ext.helper.model.call("deleteBookmark", {id: infos.id}, () => {
                infos.element.parent("li").remove();
            });
        };

        /**
         * Updates the given bookmark or directory (title, url)
         *
         * @param {object} infos
         */
        let editBookmark = (infos) => {
            let isDir = !!(infos.children);
            let titleInput = elements.modal.find("input[name='title']");
            let urlInput = elements.modal.find("input[name='url']");

            let title = titleInput[0].value.trim();
            let url = isDir ? null : urlInput[0].value.trim();

            if (title.length === 0) {
                titleInput.addClass(ext.opts.classes.overlay.inputError);
            } else if (!isDir && url.length === 0) {
                urlInput.addClass(ext.opts.classes.overlay.inputError);
            } else {
                elements.modal.find("a." + ext.opts.classes.overlay.close).eq(0).trigger("click");

                ext.helper.model.call("updateBookmark", {id: infos.id, title: title, url: url}, () => {
                    infos.title = title;
                    infos.url = url;
                    infos.element.data("infos", infos);
                    infos.element.children("span." + ext.opts.classes.sidebar.bookmarkLabel).text(infos.title);
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

            ext.elements.iframe.removeClass(ext.opts.classes.page.visible);
            elements.modal.find("a." + ext.opts.classes.overlay.close).eq(0).trigger("click");

            setTimeout(() => {
                ext.updateBookmarkBox();
            }, 300);
        };

        /**
         * Initializes the events for the currently displayed overlay
         */
        let initEvents = () => {
            elements.overlay.find("body").on("click", (e) => { // close overlay when click outside the modal
                if (e.target.tagName === "BODY") {
                    $(e.target).find("a." + ext.opts.classes.overlay.close).eq(0).trigger("click");
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
                ext.helper.model.call("realUrl", {abort: true}); // abort running check url ajax calls
                elements.overlay.removeClass(ext.opts.classes.page.visible);

                setTimeout(() => {
                    elements.overlay.remove();
                }, 500);
            });

            elements.modal.on("click", "a." + ext.opts.classes.overlay.action, (e) => { // perform the action
                e.preventDefault();
                let infos = elements.modal.data("infos");
                switch (elements.modal.attr("data-type")) {
                    case "delete": {
                        deleteBookmark(infos);
                        break;
                    }
                    case "edit": {
                        editBookmark(infos);
                        break;
                    }
                    case "updateUrls": {
                        updateBookmarkUrls(infos);
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
                ext.helper.model.call("openLink", {
                    parentId: infos.parentId,
                    id: infos.id,
                    href: infos.url,
                    newTab: true
                });
            });
        };
    };

})(jsu);