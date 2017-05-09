($ => {
    "use strict";

    window.AppearanceHelper = function (s) {

        let previews = {
            sidebar: {template: "sidebar", styles: ["sidebar"]},
            general: {template: "sidebar", styles: ["sidebar"]},
            overlay: {template: "overlay", styles: ["overlay"]},
            indicator: {template: "indicator", styles: ["contentBase", "content"]}
        };

        /**
         * Initialises the appearance settings
         */
        this.init = () => {
            initPreviews();

            ["sidebarPosition", "language"].forEach((field) => {
                let value = s.helper.model.getData("a/" + field);
                s.opts.elm.select[field][0].value = value;
                s.opts.elm.select[field].data("initial", value);
            });

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
                    } else if (s.opts.elm.select[key]) {
                        if (key === "fontFamily" && s.opts.elm.select[key].children("option[value='" + value + "']").length() === 0) {
                            value = "default";
                        }

                        s.opts.elm.select[key][0].value = value;
                        s.opts.elm.select[key].data("initial", value);
                    }
                });

                initEvents();
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
                if (config.styles.fontFamily === "default") {
                    let fontInfo = s.helper.font.getDefaultFontInfo();
                    config.styles.fontFamily = fontInfo.name;
                }

                Object.assign(config.styles, s.helper.font.getFontWeights(config.styles.fontFamily));

                let css = previews[key].css;
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

                let sidebar = s.opts.elm.preview[key].find("section#sidebar");
                if (sidebar.length() > 0) {
                    let sidebarHeader = sidebar.find("> header");
                    sidebarHeader.find("> h1 > span").removeClass(s.opts.classes.hidden);
                    let computedStyle = window.getComputedStyle(sidebarHeader[0]);
                    let headerPaddingTop = parseInt(computedStyle.getPropertyValue('padding-top'));

                    sidebarHeader.children("a").forEach((icon) => {
                        if (icon.offsetTop > headerPaddingTop) { // icons are not in one line anymore -> header to small -> remove the label of the headline
                            sidebarHeader.find("> h1 > span").addClass(s.opts.classes.hidden);
                            return true;
                        }
                    });
                }
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
                language: s.opts.elm.select.language[0].value,
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
                } else if (s.opts.elm.select[key]) {
                    ret.styles[key] = s.opts.elm.select[key][0].value;
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
         * Initialises the previews
         */
        let initPreviews = () => {
            Object.keys(previews).forEach((key) => {
                previews[key].css = "";

                s.opts.elm.preview[key] = $("<iframe />")
                    .attr(s.opts.attr.appearance, key)
                    .addClass(s.opts.classes.hidden)
                    .appendTo(s.opts.elm.body);

                sendAjax("html/template/" + previews[key].template + ".html", (html) => {
                    html = html.replace(/__MSG_\@\@extension_id__/g, chrome.runtime.id);
                    html = html.replace(/__DATE__CREATED__/g, s.helper.i18n.getLocaleDate(new Date("2016-11-25")));
                    s.opts.elm.preview[key].find("body").html(html);
                    s.helper.i18n.parseHtml(s.opts.elm.preview[key]);
                    s.helper.font.addStylesheet(s.opts.elm.preview[key]);
                });

                previews[key].styles.forEach((stylesheet) => {
                    sendAjax("css/" + stylesheet + ".css", (css) => {
                        previews[key].css += css;
                        updatePreviewStyle(key);
                    });
                });
            });
        };

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            s.opts.elm.appearance.content.find("input, select").on("change input", (e) => {
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

                let tabName = elm.parents("[" + s.opts.attr.name + "]").eq(0).attr(s.opts.attr.name);
                updatePreviewStyle(tabName);
            });

            s.opts.elm.appearance.content.on("click", "a." + s.opts.classes.revert, (e) => {
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

            s.opts.elm.appearance.backgroundChanger.on("click", (e) => {
                e.preventDefault();
                let bg = $(e.currentTarget).attr(s.opts.attr.bg);
                s.opts.elm.appearance.backgroundChanger.removeClass(s.opts.classes.tabs.active);
                $(e.currentTarget).addClass(s.opts.classes.tabs.active);
                s.opts.elm.body.attr(s.opts.attr.bg, bg);
            });
            s.opts.elm.appearance.backgroundChanger.eq(0).trigger("click");

            $(document).on(s.opts.events.contentTabChanged, (e) => {
                if (e.detail.headerTab === "appearance") {
                    Object.keys(s.opts.elm.preview).forEach((key) => {
                        let elm = s.opts.elm.preview[key];

                        if (key === e.detail.contentTab) {
                            updatePreviewStyle(key);
                            elm.removeClass(s.opts.classes.hidden);
                        } else {
                            elm.addClass(s.opts.classes.hidden);
                        }
                    });
                }
            });
        };
    };

})(jsu);