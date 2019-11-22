($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.Linkchecker = function (ext) {

        const elements = {};
        let updated = false;

        /**
         * Initialises the bookmark url checker
         *
         * @param {object }entries
         */
        this.run = (modal, entries) => {
            elements.modal = modal;
            elements.body = modal.parents("body");

            if (ext.helper.model.getUserType() !== "default") {
                initOverlay(entries);
            } else {
                initNoPremiumText();
            }
        };

        /**
         *
         */
        const initNoPremiumText = () => {
            const desc = $("<p />")
                .addClass($.cl.premium)
                .html("<span>" + ext.helper.i18n.get("premium_restricted_text") + "</span>")
                .appendTo(elements.modal);

            const link = $("<a />").text(ext.helper.i18n.get("more_link")).appendTo(desc);

            link.on("click", (e) => {
                e.preventDefault();
                ext.helper.model.call("openLink", {
                    href: $.api.extension.getURL("html/settings.html#premium"),
                    newTab: true
                });
            });

            ext.helper.overlay.setCloseButtonLabel("close");
        };

        /**
         *
         * @param {object }entries
         */
        const initOverlay = (entries) => {
            elements.buttonWrapper = elements.modal.find("menu." + $.cl.overlay.buttonWrapper);
            elements.loader = ext.helper.template.loading().appendTo(elements.modal);
            elements.desc = $("<p />").text(ext.helper.i18n.get("overlay_check_bookmarks_loading")).appendTo(elements.modal);

            ext.helper.model.call("websiteStatus").then((opts) => {
                if (opts.status === "available") {
                    const entryObj = getFlatEntryList(entries);
                    elements.progressBar = $("<div />").addClass($.cl.overlay.progressBar).html("<div />").appendTo(elements.modal);
                    elements.progressLabel = $("<span />").addClass($.cl.overlay.checkUrlProgressLabel).html("<span>0</span>/<span>" + entryObj.bookmarks.length.toLocaleString() + "</span>").appendTo(elements.modal);

                    $.delay(200).then(() => {
                        elements.modal.addClass($.cl.overlay.urlCheckLoading);
                    });

                    initGeneralEvents();

                    const results = {
                        count: 0,
                        changed: [],
                        broken: [],
                        duplicate: [],
                        empty: []
                    };

                    checkDirectories(entryObj.directories, results).then(() => {
                        return checkBookmarks(entryObj.bookmarks, results);
                    }).then(() => {
                        displayResultPage(results);
                    });
                } else { // website not available -> show message
                    displayErrorMessage();
                }
            });
        };

        /**
         * Displayes an error message telling the user, the service is not available
         */
        const displayErrorMessage = () => {
            elements.progressBar.remove();
            elements.progressLabel.remove();
            elements.loader.remove();
            elements.desc.remove();

            $("<div />").addClass($.cl.error)
                .append("<h3>" + ext.helper.i18n.get("status_service_unavailable_headline") + "</h3>")
                .append("<p>" + ext.helper.i18n.get("status_check_bookmarks_unavailable_desc") + "</p>")
                .appendTo(elements.modal);

            ext.helper.overlay.setCloseButtonLabel("close");
        };

        /**
         * Shows the results of the url checker
         *
         * @param {object} results
         */
        const displayResultPage = (results) => {
            if (elements.modal.children("div." + $.cl.error).length() > 0) { // if there is an error message -> don't show results
                return;
            }

            const hasResults = results.count > 0;
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
                        const menuEntry = $("<li />")
                            .html("<a>" + ext.helper.i18n.get("overlay_check_bookmarks_menu_" + key) + "<span></span></a>")
                            .attr($.attr.name, key)
                            .appendTo(elements.menu);

                        if (result.length > 0 && initialOpenedMenuEntry === null) { // menupoint has entries and no other menu entry is set to be opened initially yet
                            initialOpenedMenuEntry = menuEntry.children("a");
                        }

                        if (key !== "duplicate") { // show button to update all urls from the currently displayed list, except for the list with duplicates
                            let langVarPrefix = "overlay_check_bookmarks_update";
                            if (key === "broken" || key === "empty") {
                                langVarPrefix = "overlay_check_bookmarks_remove";
                            }

                            elements.actions[key] = $("<a />")
                                .addClass($.cl.overlay.urlCheckAction)
                                .attr($.attr.name, key)
                                .text(ext.helper.i18n.get(langVarPrefix + "_selected"))
                                .appendTo(elements.buttonWrapper);
                        }

                        elements.results[key] = ext.helper.scroll.add($.opts.ids.overlay.urlCheckResult + "_" + key, $("<ul />").appendTo(elements.modal));

                        result.forEach((entry) => { // fill result list
                            const resultEntry = $("<li />").data("entry", entry).appendTo(elements.results[key].children("ul"));

                            switch (key) {
                                case "broken":
                                case "changed": {
                                    displayChangedOrBrokenUrl(entry, resultEntry);
                                    break;
                                }
                                case "duplicate": {
                                    displayDuplicateUrls(entry, resultEntry);
                                    break;
                                }
                                case "empty": {
                                    displayEmptyDirectory(entry, resultEntry);
                                    break;
                                }
                            }
                        });
                    });

                    updateResultPage();
                    initResultPageEvents();

                    if (initialOpenedMenuEntry) { // open the first menu entry with results initially
                        initialOpenedMenuEntry.trigger("click");
                    }
                }
            });
        };

        /**
         * Displays the entry in the result list for the empty directory
         *
         * @param {object} entry
         * @param {jsu} resultEntry
         */
        const displayEmptyDirectory = (entry, resultEntry) => {
            const parentInfos = ext.helper.entry.getParentsById(entry.id);

            if (parentInfos.length > 0) {
                ext.helper.checkbox.get(elements.body, {checked: "checked"}).appendTo(resultEntry);

                const breadcrumb = $("<ul />").addClass($.cl.sidebar.breadcrumb).appendTo(resultEntry);

                parentInfos.forEach((parentInfo) => {
                    $("<li />").text(parentInfo.title).prependTo(breadcrumb);
                });

                $("<li />").text(entry.title).appendTo(breadcrumb);
            } else {
                resultEntry.remove();
            }

            $("<a />").addClass($.cl.overlay.urlCheckAction).appendTo(resultEntry);
        };

        /**
         * Displays the entry in the result list for duplicate urls
         *
         * @param {object} entry
         * @param {jsu} resultEntry
         */
        const displayDuplicateUrls = (entry, resultEntry) => {
            const title = $("<a />").addClass($.cl.info).attr({
                href: entry.url,
                title: entry.label,
                target: "_blank"
            }).html(entry.label).appendTo(resultEntry);
            const list = $("<ul />").attr($.attr.type, "duplicates").appendTo(resultEntry);

            entry.duplicates.forEach((duplicate) => {
                duplicate.duplicate = true;
                const elm = $("<li />").data("entry", duplicate).appendTo(list);
                $("<strong />").html(duplicate.title).appendTo(elm);

                const parentInfos = ext.helper.entry.getParentsById(duplicate.id);

                if (parentInfos.length > 0) {
                    const breadcrumb = $("<ul />").addClass($.cl.sidebar.breadcrumb).appendTo(elm);
                    parentInfos.forEach((parentInfo) => {
                        $("<li />").text(parentInfo.title).prependTo(breadcrumb);
                    });
                }

                $("<a />").addClass($.cl.overlay.urlCheckAction).appendTo(elm);
            });

            ext.helper.model.call("favicon", {url: entry.url}).then((response) => { // retrieve favicon of url
                if (response.img) { // favicon found -> add to entry
                    $("<img src='" + response.img + "' />").insertBefore(title);
                }
            });
        };

        /**
         * Displays the entry in the result list for the broken and changed urls
         *
         * @param {object} entry
         * @param {jsu} resultEntry
         */
        const displayChangedOrBrokenUrl = (entry, resultEntry) => {
            ext.helper.checkbox.get(elements.body, {checked: "checked"}).appendTo(resultEntry);

            $("<strong />").text(entry.title).appendTo(resultEntry);
            const list = $("<ul />").attr($.attr.type, "urls").appendTo(resultEntry);

            ["url", "newUrl"].forEach((attr) => {
                if (entry[attr]) {
                    const elm = $("<li />").appendTo(list);
                    $("<a />").attr({
                        href: entry[attr],
                        title: entry[attr],
                        target: "_blank"
                    }).html(entry[attr]).appendTo(elm);
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
         * Initialises the general eventhandlers
         */
        const initGeneralEvents = () => {
            $(document).on($.opts.events.overlayClosed, () => { // abort running check url ajax calls and reload sidebar if the overlay is getting closed
                ext.helper.model.call("checkUrls", {abort: true});

                if (updated) {
                    updated = false;
                    ext.helper.model.call("reload", {type: "Update"});
                }
            });
        };

        /**
         * Initialises the eventhandlers for the result age
         */
        const initResultPageEvents = () => {
            elements.menu.find("a").on("click", (e) => { // click on menu element -> change view
                e.preventDefault();

                const entry = $(e.currentTarget).parent("li");
                const name = entry.attr($.attr.name);

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
                    const entry = $(e.currentTarget).parent("li");
                    const data = $(e.currentTarget).parent("li").data("entry");

                    entry.css("height", entry[0].offsetHeight + "px");

                    $.delay().then(() => {
                        entry.addClass($.cl.hidden);
                        updateEntry(data);

                        return $.delay(500);
                    }).then(() => {
                        entry.remove();
                        updateResultPage();
                    });
                });
            });

            elements.buttonWrapper.find("a." + $.cl.overlay.urlCheckAction).on("click", (e) => { // click on action button in the footer -> update all urls from the currently displayed list
                e.preventDefault();
                const name = $(e.currentTarget).attr($.attr.name);

                if (elements.results && elements.results[name]) {
                    const entries = [];

                    elements.results[name].find("> ul > li").forEach((elm) => {
                        if ($(elm).find("input[type='checkbox']")[0].checked) {
                            entries.push($(elm).data("entry"));
                            $(elm).remove();
                        }
                    });

                    updateMultipleBookmarks(entries).then(() => {
                        updateResultPage();
                    });
                }
            });
        };

        /**
         * Updates the list of entries, by calling the updateEntry method one after each other
         *
         * @param {Array} entries
         * @returns {Promise}
         */
        const updateMultipleBookmarks = async (entries) => {
            for (const entry of entries) {
                await updateEntry(entry);
            }
        };

        /**
         * Updates the url of the given entry if it has changed or removes the entry, if the status code of the url checker is 404
         *
         * @param {object} entry
         * @returns {Promise}
         */
        const updateEntry = (entry) => {
            return new Promise((resolve) => {
                updated = true;

                if (entry.statusCode === 404 || entry.duplicate || (entry.children && entry.children.length === 0)) {
                    ext.helper.bookmark.performDeletion(entry, true).then(resolve);
                } else if (entry.url !== entry.newUrl) {
                    const additionalInfo = entry.additionalInfo && entry.additionalInfo.desc ? entry.additionalInfo.desc : null;

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
        const updateResultPage = () => {
            let allResolved = true;

            Object.entries(elements.results).forEach(([key, elm]) => {
                let count = elm.find("> ul > li").length();

                if (key === "duplicate") {
                    elm.find("> ul > li").forEach((listEntry) => {
                        const duplicateCount = $(listEntry).find("> ul > li").length();

                        if (duplicateCount === 0) {
                            $(listEntry).remove();
                            count--;
                        } else if (duplicateCount === 1) {
                            count--;
                        }
                    });
                }

                elements.menu.find("li[" + $.attr.name + "='" + key + "'] > a > span").text("(" + count + ")");

                if (count === 0) { // tab is empty -> show info text
                    elm.children("ul,p").remove();
                    $("<p />").html("<span>" + ext.helper.i18n.get("overlay_check_bookmarks_no_results_" + key) + "</span>").appendTo(elm);

                    if (elements.actions && elements.actions[key]) {
                        elements.actions[key].remove();
                    }
                } else {
                    allResolved = false;
                }
            });

            if (allResolved) { // all tabs are empty -> show success text
                showAllResolvedMessage();
            }
        };

        /**
         * Shows a message when all url check results have been resolved (or the result was already empty),
         * removes the menu and result lists from the overlay and shows the message instead
         */
        const showAllResolvedMessage = () => {
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
         * Checks the directories and adds all empty directories to the results
         *
         * @param {Array} directories
         * @param {object} results
         * @returns {Promise}
         */
        const checkDirectories = async (directories, results) => {
            directories.forEach((directory) => {
                if (directory.children.length === 0) {
                    results.empty.push(directory);
                    results.count++;
                }
            });
        };

        /**
         * Checks the urls of the given bookmarks and returns the check results
         *
         * @param {Array} bookmarks
         * @param {object} results
         * @returns {Promise}
         */
        const checkBookmarks = (bookmarks, results) => {
            return new Promise((resolve) => {
                let finished = 0;
                const info = {};
                const duplicateLabels = [];

                const checkChunk = (urls) => {
                    return new Promise((rslv) => {
                        ext.helper.model.call("checkUrls", {urls: urls}).then((response) => {
                            if (response.error) {
                                rslv({success: false});
                            } else {
                                let x = -1;

                                Object.entries(response.duplicates).forEach(([label, entries]) => { // duplicate url
                                    if (duplicateLabels.indexOf(label) === -1) { // prevent multiple entries of the same url
                                        results.duplicate.push({
                                            label: label,
                                            url: entries.url,
                                            duplicates: entries.duplicates
                                        });
                                        duplicateLabels.push(label);
                                        results.count++;
                                    }
                                });

                                Object.entries(response.xhr).forEach(([id, data]) => {
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

                                    $.delay(++x * 50).then(() => { // smoothing the progress bar
                                        finished++;
                                        elements.progressBar.children("div").css("width", (finished / bookmarks.length * 100) + "%");
                                        elements.progressLabel.children("span").eq(0).text(finished.toLocaleString());
                                    });
                                });

                                $.delay(Object.keys(response.xhr).length * 50).then(() => {
                                    rslv({success: true});
                                });
                            }
                        });
                    });
                };

                (async () => {
                    let i = 0;
                    let chunk = {};
                    for (const bookmark of bookmarks) {
                        i++;
                        chunk[bookmark.id] = bookmark.url;
                        info[bookmark.id] = bookmark;

                        if (Object.keys(chunk).length >= 15 || i === bookmarks.length) { // check multiple urls at once
                            const obj = await checkChunk(chunk);
                            chunk = {};

                            if (obj.success === false) { // a request failed

                                if (finished === 0) { // not even parsed a single bookmark url -> show error message
                                    displayErrorMessage();
                                }

                                break;
                            }
                        }
                    }

                    $.delay(500).then(() => {
                        resolve(results);
                    });
                })();
            });
        };

        /**
         * Extracts the bookmarks and directories from the given tree and returns them as a flat list
         *
         * @param {object} entries
         * @returns {object}
         */
        const getFlatEntryList = (entries) => {
            const ret = {
                bookmarks: [],
                directories: []
            };

            const process = (entries) => { // check all subordinate bookmarks of the given directory
                entries.forEach((entry) => {
                    if (entry.url && ext.helper.utility.isUrlOnBlacklist(entry.url) === false) {
                        ret.bookmarks.push(entry);
                    } else if (entry.children) {
                        ret.directories.push(entry);
                        process(entry.children);
                    }
                });
            };
            process(entries);

            return ret;
        };
    };

})(jsu);