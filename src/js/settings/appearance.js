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
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                ["darkMode"].forEach((field) => {
                    let checked = false;
                    if (s.helper.model.getData("a/" + field) === true) {
                        s.opts.elm.checkbox[field].trigger("click");
                        checked = true;
                    }
                    s.opts.elm.checkbox[field].children("input").data("initial", checked);
                });

                initPreviews().then(() => {
                    let styles = s.helper.model.getData("a/styles");

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
                        } else if (s.opts.elm.radio[key]) {
                            s.opts.elm.radio[key][0].value = value;
                            s.opts.elm.radio[key].trigger("change");
                            s.opts.elm.radio[key].data("initial", value);
                        }
                    });

                    initEvents();

                    $.delay(100).then(() => {
                        updateAllPreviewStyles();
                        resolve();
                    });
                });
            });
        };

        /**
         * Saves the appearance settings
         * @returns {Promise}
         */
        this.save = () => {
            return new Promise((resolve) => {
                let config = getCurrentConfig();
                if (config.isEE) {
                    delete config.isEE;
                    config.styles.colorScheme = "__color_ee";
                }

                $.api.storage.sync.set({appearance: config}, () => {
                    s.helper.model.call("reload", {type: "Settings"});
                    s.showSuccessMessage("saved_message");
                    s.helper.model.call("reloadIcon");
                    resolve();
                });
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
         * Sends a request to the given path and resolves after retrieving
         *
         * @param path
         * @returns {Promise}
         */
        let sendAjax = (path) => {
            return new Promise((resolve) => {
                let xhr = new XMLHttpRequest();
                xhr.open("GET", $.api.extension.getURL(path), true);
                xhr.onload = () => {
                    if (xhr.response) {
                        resolve(xhr.response);
                    }
                };
                xhr.send();
            });
        };

        let updateAllPreviewStyles = () => {
            Object.keys(s.opts.elm.preview).forEach((key) => {
                updatePreviewStyle(key);
            });
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

                updatePageLayout(key);
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

                s.opts.elm.preview[key].find("head").append("<style>" + css + "</style>");

                if (config.isEE === true) {
                    s.opts.elm.preview[key].find("body").addClass(s.opts.classes.page.ee);
                }

                if (config.darkMode) {
                    s.opts.elm.preview[key].find("body").addClass(s.opts.classes.page.darkMode);
                } else {
                    s.opts.elm.preview[key].find("body").removeClass(s.opts.classes.page.darkMode);
                }

                let sidebar = s.opts.elm.preview[key].find("section#sidebar");
                if (sidebar.length() > 0) {
                    let sidebarHeader = sidebar.find("> header");
                    sidebarHeader.find("> h1").removeClass(s.opts.classes.hidden);
                    sidebarHeader.find("> h1 > span").removeClass(s.opts.classes.hidden);
                    let computedStyle = window.getComputedStyle(sidebarHeader[0]);
                    let headerPaddingTop = parseInt(computedStyle.getPropertyValue('padding-top'));

                    ["label", "amount"].forEach((type) => {
                        sidebarHeader.children("a").forEach((icon) => {
                            if (icon.offsetTop > headerPaddingTop) { // icons are not in one line anymore -> header to small -> remove some markup
                                if (type === "label") {
                                    sidebarHeader.find("> h1 > span").addClass(s.opts.classes.hidden);
                                } else if (type === "amount") {
                                    sidebarHeader.find("> h1").addClass(s.opts.classes.hidden);
                                }
                                return false;
                            }
                        });
                    });

                }
            } else if (key === "icon") {
                let config = getCurrentConfig();
                s.helper.model.call("updateIcon", {
                    name: config.styles.iconShape,
                    color: config.styles.iconColor,
                    onlyCurrentTab: true
                });
            }
        };

        /**
         * Adds a right padding to the content, so the preview doesn't cover the controls,
         * Adds a class to the content if the columns aren't lined next to each other anymore
         *
         * @param {string} key
         */
        let updatePageLayout = (key) => {
            if (s.opts.elm.preview[key]) {
                let config = getCurrentConfig();
                s.opts.elm.content.removeClass(s.opts.classes.small);

                if (s.opts.elm.preview[key][0].offsetParent !== null) { // preview is visible -> if screen is too small it's hidden
                    let headerRightPadding = 0;

                    if (key === "indicator") {
                        headerRightPadding = config.styles.indicatorWidth;
                    } else if (key === "sidebar" || key === "general") {
                        headerRightPadding = config.styles.sidebarWidth;
                    }
                    s.opts.elm.header.css("padding-right", headerRightPadding);
                    s.opts.elm.content.css("padding-right", headerRightPadding);
                } else {
                    s.opts.elm.header.css("padding-right", "");
                    s.opts.elm.content.css("padding-right", "");
                }

                let boxes = s.helper.menu.getPage().find("div." + s.opts.classes.box);

                if (boxes.length() > 1) { // set class for wrapper if there is only one box per row
                    let hasColumns = false;
                    let top = null;

                    s.helper.menu.getPage().find("div." + s.opts.classes.box).forEach((elm) => {
                        if (top === elm.offsetTop) {
                            hasColumns = true;
                            return false;
                        } else {
                            top = elm.offsetTop;
                        }
                    });

                    if (!hasColumns) {
                        s.opts.elm.content.addClass(s.opts.classes.small);
                    }
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
                darkMode: s.helper.checkbox.isChecked(s.opts.elm.checkbox.darkMode),
                showIndicator: true,
                showIndicatorIcon: true,
                showBookmarkIcons: true,
                showDirectoryIcons: true,
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
                } else if (s.opts.elm.radio[key]) {
                    ret.styles[key] = s.opts.elm.radio[key][0].value;
                }
            });

            Object.entries({
                indicatorWidth: "showIndicator",
                indicatorIconSize: "showIndicatorIcon",
                bookmarksIconSize: "showBookmarkIcons",
                directoriesIconSize: "showDirectoryIcons"
            }).forEach(([field, attr]) => {
                if (parseInt(ret.styles[field]) === 0) {
                    ret[attr] = false;
                }
            });

            if (styles.isEE === true) {
                ret.isEE = true;
            }

            return ret;
        };

        /**
         * Initialises the previews
         *
         * @returns {Promise}
         */
        let initPreviews = () => {
            return new Promise((resolve) => {
                let previewsLoaded = 0;
                let previewAmount = Object.keys(previews).length;

                Object.keys(previews).forEach((key) => {
                    previews[key].css = "";

                    s.opts.elm.preview[key] = $("<iframe />")
                        .attr(s.opts.attr.appearance, key)
                        .appendTo(s.opts.elm.body);

                    sendAjax("html/template/" + previews[key].template + ".html").then((html) => {
                        html = html.replace(/__MSG_\@\@extension_id__/g, $.api.runtime.id);
                        html = html.replace(/__DATE__CREATED__/g, s.helper.i18n.getLocaleDate(new Date("2016-11-25")));
                        s.opts.elm.preview[key].find("body").html(html);
                        s.helper.i18n.parseHtml(s.opts.elm.preview[key]);
                        s.helper.font.addStylesheet(s.opts.elm.preview[key]);

                        previewsLoaded++;

                        if (previewsLoaded === previewAmount) {
                            resolve();
                        }
                    });

                    previews[key].styles.forEach((stylesheet) => {
                        sendAjax("css/" + stylesheet + ".css").then((css) => {
                            previews[key].css += css;
                        });
                    });
                });
            });
        };

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            let code = "blockbyte".split("");
            let pos = 0;
            $(document).on("keydown", (e) => {
                let path = s.helper.menu.getPath();

                if (e.key === code[pos] && path[0] === "appearance") {
                    if (++pos >= code.length) {
                        s.opts.elm.color["colorScheme"][0].value = "__color_ee";
                        this.save();
                    }
                } else {
                    pos = 0;
                }
            });

            $(window).on("resize", function () {
                let path = s.helper.menu.getPath();
                updatePageLayout(path[1]);
            });

            s.opts.elm.appearance.content.find("input, select").on("change input", (e) => {
                let elm = $(e.currentTarget);
                let val = e.currentTarget.value;
                let initialVal = elm.data("initial");

                if (typeof initialVal !== "undefined") {

                    if (elm.attr("type") === "checkbox") {
                        val = e.currentTarget.checked;

                        if ($(elm).parent()[0] === s.opts.elm.checkbox.darkMode[0]) { // darkmode checkbox -> change some other colors, too
                            let textColor = s.helper.model.getDefaultColor("textColor", val ? "dark" : "light");
                            changeColorValue(s.opts.elm.color.textColor, textColor);
                            changeColorValue(s.opts.elm.color.bookmarksDirColor, textColor);

                            ["sidebarMaskColor", "colorScheme"].forEach((colorName) => {
                                let color = s.helper.model.getDefaultColor(colorName, val ? "dark" : "light");
                                changeColorValue(s.opts.elm.color[colorName], color);
                            });
                        }
                    }

                    let box = $(e.currentTarget).parents("div." + s.opts.classes.box).eq(0);
                    if (val !== initialVal) {
                        if (box.children("a." + s.opts.classes.revert).length() === 0) {
                            $("<a href='#' />").addClass(s.opts.classes.revert).data("elm", box).appendTo(box);
                        }
                    } else {
                        box.children("a." + s.opts.classes.revert).remove();
                    }

                    let path = s.helper.menu.getPath();
                    updatePreviewStyle(path[1]);
                }
            });

            s.opts.elm.appearance.content.on("click", "a." + s.opts.classes.revert, (e) => { // revert the changes of the specific field
                e.preventDefault();
                let box = $(e.currentTarget).parent("div." + s.opts.classes.box);

                box.find("input, select").forEach((elm) => {
                    let elmObj = $(elm);
                    let value = elmObj.data("initial");

                    if (elmObj.data("picker")) {
                        changeColorValue(elmObj, value)
                    } else if (typeof value !== "undefined") {
                        elm.value = value;
                        elmObj.trigger("change");
                    }
                });
            });

            $(document).on(s.opts.events.pageChanged, (e) => {
                if (e.detail.path && e.detail.path[0] === "appearance") {
                    updatePreviewStyle(e.detail.path[1]);
                }
            });
        };
    };

})(jsu);