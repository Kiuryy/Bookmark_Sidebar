($ => {
    "use strict";

    /**
     * @requires helper: i18n, overlay, utility, template
     * @param {object} ext
     * @constructor
     */
    $.Linkchecker = function (ext) {

        let elements = {};
        let updated = false;

        /**
         * Initialises the bookmark url checker
         */
        this.run = (modal, entries) => {
            elements.modal = modal;
            elements.body = modal.parents("body");
            elements.buttonWrapper = elements.modal.find("menu." + $.cl.overlay.buttonWrapper);
            elements.loader = ext.helper.template.loading().appendTo(elements.modal);
            elements.desc = $("<p />").text(ext.helper.i18n.get("overlay_check_bookmarks_loading")).appendTo(elements.modal);

            ext.helper.model.call("websiteStatus").then((opts) => {
                if (opts.status === "available") {
                    let bookmarks = getFlatBookmarkList(entries);

                    elements.progressBar = $("<div />").addClass($.cl.overlay.progressBar).html("<div />").appendTo(elements.modal);
                    elements.progressLabel = $("<span />").addClass($.cl.overlay.checkUrlProgressLabel).html("<span>0</span>/<span>" + bookmarks.length + "</span>").appendTo(elements.modal);

                    $.delay(200).then(() => {
                        elements.modal.addClass($.cl.overlay.urlCheckLoading);
                    });

                    checkBookmarks(bookmarks).then((results) => {
                        displayResultPage(results);
                    });

                } else { // website not available -> show message
                    elements.loader.remove();
                    elements.desc.remove();

                    $("<div />").addClass($.cl.error)
                        .append("<h3>" + ext.helper.i18n.get("status_service_unavailable_headline") + "</h3>")
                        .append("<p>" + ext.helper.i18n.get("status_check_bookmarks_unavailable_desc") + "</p>")
                        .appendTo(elements.modal);

                    ext.helper.overlay.setCloseButtonLabel("close");
                }
            });
        };

        /**
         * Shows the results of the url checker
         *
         * @param {object} results
         */
        let displayResultPage = (results) => {
            let hasResults = results.count > 0;
            delete results.count;

            elements.desc.remove();
            elements.progressBar.remove();
            elements.progressLabel.remove();

            if (hasResults) { // results available -> increase modal size
                elements.modal.addClass($.cl.overlay.urlCheckResults);
            }

            $.delay(hasResults ? 500 : 0).then(() => {
                elements.loader.remove();
                elements.modal.removeClass($.cl.overlay.urlCheckLoading);
                ext.helper.overlay.setCloseButtonLabel("close");

                if (hasResults === false) {
                    showAllResolvedMessage();
                } else {
                    elements.menu = $("<menu />").addClass($.cl.overlay.urlCheckCategories).appendTo(elements.modal);
                    elements.results = {};
                    elements.actions = {};

                    let initialOpenedMenuEntry = null;

                    Object.entries(results).forEach(([key, result]) => { // create a menu entry and result list for each type (broken, changed, duplicate)
                        let menuEntry = $("<li />")
                            .html("<a>" + ext.helper.i18n.get("overlay_check_bookmarks_menu_" + key) + "<span></span></a>")
                            .attr($.attr.name, key)
                            .appendTo(elements.menu);

                        if (result.length > 0 && initialOpenedMenuEntry === null) { // menupoint has entries and no other menu entry is set to be opened initially yet
                            initialOpenedMenuEntry = menuEntry.children("a");
                        }

                        if (key !== "duplicate") { // show button to update all urls from the currently displayed list, except for the list with duplicates
                            elements.actions[key] = $("<a />")
                                .addClass($.cl.overlay.urlCheckAction)
                                .attr($.attr.name, key)
                                .text(ext.helper.i18n.get("overlay_check_bookmarks_" + (key === "broken" ? "remove" : "update") + "_selected"))
                                .appendTo(elements.buttonWrapper);
                        }

                        elements.results[key] = ext.helper.scroll.add($.opts.ids.overlay.urlCheckResult + "_" + key, $("<ul />").appendTo(elements.modal));

                        result.forEach((entry) => { // fill result list
                            let resultEntry = $("<li />").data("entry", entry).appendTo(elements.results[key].children("ul"));

                            switch (key) {
                                case "broken":
                                case "changed": {
                                    displayChangedOrBrokenUrl(entry, resultEntry);
                                    break;
                                }
                                case "duplicate": {
                                    // toDo
                                    break;
                                }
                            }
                        });
                    });

                    updateResultPage();
                    initEvents();

                    if (initialOpenedMenuEntry) { // open the first menu entry with results initially
                        initialOpenedMenuEntry.trigger("click");
                    }
                }
            });
        };

        /**
         * Displays the entry in the result list for the broken and changed urls
         *
         * @param {object} entry
         * @param {jsu} resultEntry
         */
        let displayChangedOrBrokenUrl = (entry, resultEntry) => {
            ext.helper.checkbox.get(elements.body, {checked: "checked"}).appendTo(resultEntry);

            $("<strong />").text(entry.title).appendTo(resultEntry);
            let list = $("<ul />").appendTo(resultEntry);

            ["url", "newUrl"].forEach((attr) => {
                if (entry[attr]) {
                    let elm = $("<li />").appendTo(list);
                    $("<a />").attr({href: entry[attr], title: entry[attr], target: "_blank"}).html(entry[attr]).appendTo(elm);
                }
            });

            $("<a />").addClass($.cl.overlay.urlCheckAction).appendTo(resultEntry);

            ext.helper.model.call("favicon", {url: entry.url}).then((response) => { // retrieve favicon of url
                if (response.img) { // favicon found -> add to entry
                    $("<img src='" + response.img + "' />").insertAfter(resultEntry.children("div." + $.cl.checkbox.box));
                }
            });
        };

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            elements.menu.find("a").on("click", (e) => { // click on menu element -> change view
                e.preventDefault();

                let entry = $(e.currentTarget).parent("li");
                let name = entry.attr($.attr.name);

                if (elements.results && elements.results[name]) {
                    elements.menu.children("li").removeClass($.cl.active);
                    entry.addClass($.cl.active);

                    ["results", "actions"].forEach((elmName) => {
                        if (elements[elmName]) {
                            Object.entries(elements[elmName]).forEach(([key, elm]) => {
                                if (name === key) {
                                    elm.addClass($.cl.visible);
                                } else {
                                    elm.removeClass($.cl.visible);
                                }
                            });
                        }
                    });
                }
            });

            Object.entries(elements.results).forEach(([key, elm]) => {
                elm.find("a." + $.cl.overlay.urlCheckAction).on("click", (e) => { // click on specific action button next to an entry in the list -> update only this entry
                    e.preventDefault();
                    let entry = $(e.currentTarget).parent("li");
                    let data = $(e.currentTarget).parent("li").data("entry");

                    entry.css("height", entry[0].offsetHeight + "px");

                    $.delay().then(() => {
                        entry.addClass($.cl.hidden);
                        updateBookmark(data);

                        return $.delay(500);
                    }).then(() => {
                        entry.remove();
                        updateResultPage();
                    });
                });
            });

            elements.buttonWrapper.find("a." + $.cl.overlay.urlCheckAction).on("click", (e) => { // click on action button in the footer -> update all urls from the currently displayed list
                e.preventDefault();
                let name = $(e.currentTarget).attr($.attr.name);

                if (elements.results && elements.results[name]) {
                    let entries = [];

                    elements.results[name].find("> ul > li").forEach((elm) => {
                        if ($(elm).find("input[type='checkbox']")[0].checked) {
                            entries.push($(elm).data("entry"));
                        }
                    });

                    elements.results[name].find("> ul > li").remove();

                    updateMultipleBookmarks(entries).then(() => {
                        updateResultPage();
                    });
                }
            });

            $(document).off($.opts.events.overlayClosed).on($.opts.events.overlayClosed, () => { // abort running check url ajax calls and reload sidebar if the overlay is getting closed
                ext.helper.model.call("checkUrls", {abort: true});

                if (updated) {
                    updated = false;
                    ext.helper.model.call("reload", {type: "Update"});
                }
            });
        };

        /**
         * Updates the list of entries, by calling the updateBookmark method one after each other
         *
         * @param {Array} entries
         * @returns {Promise}
         */
        let updateMultipleBookmarks = async (entries) => {
            for (const entry of entries) {
                await updateBookmark(entry);
            }
        };

        /**
         * Updates the url of the given entry if it has changed or removes the entry, if the status code of the url checker is 404
         *
         * @param {object} entry
         * @returns {Promise}
         */
        let updateBookmark = (entry) => {
            return new Promise((resolve) => {
                updated = true;

                if (entry.statusCode === 404) {
                    ext.helper.bookmark.performDeletion(entry, true).then(resolve);
                } else if (entry.url !== entry.newUrl) {
                    let additionalInfo = entry.additionalInfo && entry.additionalInfo.desc ? entry.additionalInfo.desc : null;

                    ext.helper.bookmark.editEntry({
                        id: entry.id,
                        title: entry.title,
                        url: entry.newUrl,
                        additionalInfo: additionalInfo
                    }).then(resolve);
                } else {
                    resolve();
                }
            });
        };

        /**
         * Updates the result page,
         * will be called everytime an entry in the result list has been updated or removed
         */
        let updateResultPage = () => {
            let allResolved = true;

            Object.entries(elements.results).forEach(([key, elm]) => {
                let count = elm.find("> ul > li").length();
                elements.menu.find("li[" + $.attr.name + "='" + key + "'] > a > span").text("(" + count + ")");

                if (count === 0) {
                    elm.children("ul").remove();
                    $("<p />").html("<span>" + ext.helper.i18n.get("overlay_check_bookmarks_no_results_" + key) + "</span>").appendTo(elm);

                    if (elements.actions && elements.actions[key]) {
                        elements.actions[key].remove();
                    }
                } else {
                    allResolved = false;
                }
            });

            if (allResolved) {
                showAllResolvedMessage();
            }
        };

        /**
         * Shows a message when all url check results have been resolved (or the result was already empty),
         * removes the menu and result lists from the overlay and shows the message instead
         */
        let showAllResolvedMessage = () => {
            elements.modal.addClass($.cl.overlay.urlCheckLoading);

            $.delay().then(() => {
                elements.modal.removeClass($.cl.overlay.urlCheckResults);
                elements.modal.find("menu." + $.cl.overlay.urlCheckCategories).remove();

                ["results", "actions"].forEach((elmName) => {
                    if (elements[elmName]) {
                        Object.values(elements[elmName]).forEach((elm) => {
                            elm.remove();
                        });
                    }
                });

                $("<p />").addClass($.cl.success).text(ext.helper.i18n.get("overlay_check_bookmarks_no_results")).appendTo(elements.modal);

                return $.delay(500);
            }).then(() => {
                elements.modal.removeClass($.cl.overlay.urlCheckLoading);
            });
        };

        /**
         * Checks the urls of the given bookmarks and returns the check results
         *
         * @param {Array} bookmarks
         * @returns {Promise}
         */
        let checkBookmarks = (bookmarks) => {
            return new Promise((resolve) => {
                let results = {
                    count: 0,
                    changed: [],
                    broken: [],
                    duplicate: []
                };

                let finished = 0;
                let info = {};

                let check = (urls) => {
                    ext.helper.model.call("checkUrls", {urls: urls}).then((response) => {
                        if (!response.error) { // not cancelled -> proceed
                            let x = -1;
                            Object.entries(response).forEach(([id, data]) => {
                                $.delay(++x * 50).then(() => { // smoothing the progress bar
                                    finished++;
                                    elements.progressBar.children("div").css("width", (finished / bookmarks.length * 100) + "%");
                                    elements.progressLabel.children("span").eq(0).text(finished);

                                    info[id].statusCode = +data.code;
                                    info[id].checkTimeout = data.timeout;

                                    if (info[id].statusCode === 404 || data.timeout) { // broken url
                                        results.broken.push(info[id]);
                                        results.count++;
                                    } else if (info[id].url !== data.url && info[id].statusCode !== 302) { // changed url
                                        info[id].newUrl = data.url;
                                        results.changed.push(info[id]);
                                        results.count++;
                                    }

                                    if (finished === bookmarks.length) { // all urls proceeded
                                        resolve(results);
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
                    info[bookmark.id] = bookmark;

                    if (Object.keys(chunk).length >= 10 || i === bookmarks.length) { // check multiple urls at once
                        check(chunk);
                        chunk = {};
                    }
                });
            });
        };

        /**
         * Extracts the bookmarks from the given tree and returns them as a flat list
         *
         * @param {object} entries
         * @returns {Array}
         */
        let getFlatBookmarkList = (entries) => {
            let ret = [];
            let process = (entries) => { // check all subordinate bookmarks of the given directory
                entries.forEach((entry) => {
                    if (entry.url && ext.helper.utility.isUrlOnBlacklist(entry.url) === false) {
                        ret.push(entry);
                    } else if (entry.children) {
                        process(entry.children);
                    }
                });
            };
            process(entries);

            return ret;
        };
    };

})(jsu);