($ => {
    "use strict";

    window.AppearanceHelper = function (s) {

        let previews = {
            sidebar: ["sidebar"],
            general: ["overlay"],
            overlay: ["overlay"],
            indicator: ["contentBase", "content"]
        };

        /**
         * Initialises the appearance settings
         */
        this.init = () => {
            initPreviews();
            initEvents();

            let sidebarPosition = s.helper.model.getData("a/sidebarPosition");
            s.opts.elm.select.sidebarPosition[0].value = sidebarPosition;
            s.opts.elm.select.sidebarPosition.data("initial", sidebarPosition);

            let styles = s.helper.model.getData("a/styles");

            setTimeout(() => {
                Object.keys(styles).forEach((key) => {
                    let value = styles[key];

                    if (s.opts.elm.range[key]) {
                        s.opts.elm.range[key][0].value = value.replace("px", "");
                        s.opts.elm.range[key].data("initial", value.replace("px", ""));
                        s.opts.elm.range[key].trigger("change");
                    } else if (s.opts.elm.color[key]) {
                        s.opts.elm.color[key].data("initial", value);
                        changeColorValue(s.opts.elm.color[key], value);
                    }
                });
            }, 0);
        };

        /**
         * Saves the appearance settings
         */
        this.save = () => {
            chrome.storage.sync.set({appearance: getCurrentConfig()}, () => {
                s.showSuccessMessage("saved_message");
            });
        };

        /**
         * Changes the value of the color picker
         *
         * @param elm
         * @param value
         */
        let changeColorValue = (elm, value) => {
            let picker = elm.data("picker");

            if (value.search(/rgba\(/) > -1) {
                let colorParsed = value.replace(/(rgba|\(|\))/gi, "").split(",");
                value = "rgb(" + colorParsed[0] + "," + colorParsed[1] + "," + colorParsed[2] + ")";
                if (picker.alpha) {
                    picker.alpha[0].value = colorParsed[3];
                }
            }

            picker.set(value);
            picker.trigger("change");
        };

        /**
         * Sends a request to the given path and calls the callback function after retrieving
         *
         * @param path
         * @param callback
         */
        let sendAjax = (path, callback) => {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", chrome.extension.getURL(path), true);
            xhr.onload = () => {
                if (xhr.response) {
                    callback(xhr.response);
                }
            };
            xhr.send();
        };

        /**
         * Updates the given preview
         *
         * @param key
         */
        let updatePreviewStyle = (key) => {
            if (s.opts.elm.preview[key]) {
                s.opts.elm.preview[key].find("head > style").remove();

                let config = getCurrentConfig();

                let css = previews[key];
                Object.keys(config.styles).forEach((key) => {
                    css = css.replace(new RegExp('"?%' + key + '"?', 'g'), config.styles[key]);
                });

                s.opts.elm.preview[key].find("[" + s.opts.attr.style + "]").forEach((elm) => {
                    let style = $(elm).attr(s.opts.attr.style);
                    Object.keys(config.styles).forEach((key) => {
                        style = style.replace(new RegExp('"?%' + key + '"?', 'g'), config.styles[key]);
                    });
                    elm.style.cssText = style;
                });

                s.opts.elm.preview[key].find("[" + s.opts.attr.hideOnFalse + "]").forEach((elm) => {
                    let attr = $(elm).attr(s.opts.attr.hideOnFalse);

                    if (typeof config[attr] === "undefined" || config[attr] === false) {
                        $(elm).css("display", "none");
                    } else {
                        $(elm).css("display", "block");
                    }
                });

                s.opts.elm.body.attr(s.opts.attr.pos, config.sidebarPosition);
                s.opts.elm.preview[key].find("[" + s.opts.attr.pos + "]").attr(s.opts.attr.pos, config.sidebarPosition);

                s.opts.elm.preview[key].find("head").append("<style>" + css + "</style>");
            }
        };

        /**
         * Returns the current values of the appearance configuration
         *
         * @returns object
         */
        let getCurrentConfig = () => {
            let ret = {
                sidebarPosition: s.opts.elm.select.sidebarPosition[0].value,
                showIndicator: true,
                showBookmarkIcons: true,
                styles: {}
            };

            let styles = s.helper.model.getData("a/styles");

            Object.keys(styles).forEach((key) => {
                if (s.opts.elm.range[key]) {
                    ret.styles[key] = s.opts.elm.range[key][0].value + "px";
                } else if (s.opts.elm.color[key]) {
                    ret.styles[key] = s.opts.elm.color[key][0].value;
                }
            });

            if (parseInt(ret.styles.indicatorWidth) === 0) {
                ret.showIndicator = false;
            }

            if (parseInt(ret.styles.bookmarksIconSize) === 0) {
                ret.showBookmarkIcons = false;
            }

            return ret;
        };

        /**
         * Returns the given date in local specific format
         *
         * @param dateObj
         * @returns {string}
         */
        let getLocaleDate = (dateObj) => {
            return dateObj.toLocaleDateString([chrome.i18n.getUILanguage(), s.opts.manifest.default_locale], {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            });
        };


        /**
         * Initialises the previews
         */
        let initPreviews = () => {
            Object.keys(previews).forEach((key) => {
                let stylesheets = previews[key];
                previews[key] = "";

                s.opts.elm.preview[key] = $("<iframe />")
                    .attr(s.opts.attr.appearance, key)
                    .addClass(s.opts.classes.tabs.hidden)
                    .appendTo(s.opts.elm.body);

                sendAjax("html/template/" + key + ".html", (html) => {
                    html = html.replace(/__MSG_\@\@extension_id__/g, chrome.runtime.id);
                    html = html.replace(/__DATE__CREATED__/g, getLocaleDate(new Date("2016-11-25")));
                    s.opts.elm.preview[key].find("body").html(html);
                    $("<link />").attr({
                        rel: "stylesheet",
                        type: "text/css",
                        href: s.opts.fontHref
                    }).appendTo(s.opts.elm.preview[key].find("head"));
                });

                stylesheets.forEach((stylesheet) => {
                    sendAjax("css/" + stylesheet + ".css", (css) => {
                        previews[key] += css;
                        updatePreviewStyle(key);
                    });
                });
            });
        };

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            s.opts.elm.appearanceSections.find("input, select").on("change input", (e) => {
                let elm = $(e.currentTarget);
                let val = e.currentTarget.value;
                let initialVal = elm.data("initial");

                let revertPrevSibling = elm;
                if (elm.next("span").length() > 0) {
                    revertPrevSibling = elm.next("span");
                }

                if (val !== initialVal) {
                    if (revertPrevSibling.next("a." + s.opts.classes.revert).length() === 0) {
                        $("<a href='#' />").addClass(s.opts.classes.revert).data("elm", elm).insertAfter(revertPrevSibling);
                    }
                } else {
                    revertPrevSibling.next("a." + s.opts.classes.revert).remove();
                }

                let tabName = elm.parents("[" + s.opts.attr.appearance + "]").eq(0).attr(s.opts.attr.appearance);
                updatePreviewStyle(tabName);
            });

            s.opts.elm.appearanceSections.on("click", "a." + s.opts.classes.revert, (e) => {
                e.preventDefault();
                let elm = $(e.currentTarget).data("elm");
                let value = elm.data("initial");

                if (elm.data("picker")) {
                    changeColorValue(elm, value)
                } else {
                    elm[0].value = value;
                    elm.trigger("change");
                }
            });

            s.opts.elm.backgroundChanger.on("click", (e) => {
                e.preventDefault();
                let bg = $(e.currentTarget).attr(s.opts.attr.bg);
                s.opts.elm.backgroundChanger.removeClass(s.opts.classes.tabs.active);
                $(e.currentTarget).addClass(s.opts.classes.tabs.active);
                s.opts.elm.body.attr(s.opts.attr.bg, bg);
            });
            s.opts.elm.backgroundChanger.eq(0).trigger("click");

            s.opts.elm.appearanceLabels.children("a").on("click", (e) => {
                e.preventDefault();
                s.opts.elm.appearanceLabels.removeClass(s.opts.classes.tabs.active);
                let tabElm = $(e.currentTarget).parent("li");
                let tabName = tabElm.attr(s.opts.attr.type);
                tabElm.addClass(s.opts.classes.tabs.active);

                s.opts.elm.appearanceSections.forEach((section) => {
                    let name = $(section).attr(s.opts.attr.appearance);

                    if (name === tabName) {
                        $(section).removeClass(s.opts.classes.tabs.hidden);
                    } else {
                        $(section).addClass(s.opts.classes.tabs.hidden);
                    }
                });

                Object.keys(s.opts.elm.preview).forEach((key) => {
                    let elm = s.opts.elm.preview[key];

                    if (key === tabName) {
                        updatePreviewStyle(key);
                        elm.removeClass(s.opts.classes.tabs.hidden);
                    } else {
                        elm.addClass(s.opts.classes.tabs.hidden);
                    }
                });
            });
            s.opts.elm.appearanceLabels.children("a").eq(0).trigger("click");
        };

    };

})(jsu);