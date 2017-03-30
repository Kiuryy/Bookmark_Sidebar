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

            let styles = s.helper.model.getData("a/styles");

            setTimeout(() => {
                Object.keys(styles).forEach((key) => {
                    let value = styles[key];

                    if (s.opts.elm.range[key]) {
                        s.opts.elm.range[key][0].value = value.replace("px", "");
                        s.opts.elm.range[key].trigger("change");
                    } else if (s.opts.elm.color[key]) {
                        let picker = s.opts.elm.color[key].data("picker");

                        if (value.search(/rgba\(/) > -1) {
                            let colorParsed = value.replace(/(rgba|\(|\))/gi, "").split(",");
                            value = "rgb(" + colorParsed[0] + "," + colorParsed[1] + "," + colorParsed[2] + ")";
                            if (picker.alpha) {
                                picker.alpha[0].value = colorParsed[3];
                            }
                        }

                        picker.set(value);
                        picker.trigger("change");
                    }
                });
            }, 0);
        };

        /**
         * Saves the appearance settings
         */
        this.save = () => {
            let config = {
                sidebarPosition: "left",
                showIndicator: true,
                showBookmarkIcons: true,
                styles: getCurrentStyleSettings()
            };

            console.log(config);
        };

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

        let updatePreviewStyle = (key) => {
            if (s.opts.elm.preview[key]) {
                s.opts.elm.preview[key].find("head > style").remove();

                let styles = getCurrentStyleSettings();

                let css = previews[key];
                Object.keys(styles).forEach((key) => {
                    css = css.replace(new RegExp('"?%' + key + '"?', 'g'), styles[key]);
                });

                s.opts.elm.preview[key].find("[" + s.opts.attr.style + "]").forEach((elm) => {
                    let style = $(elm).attr(s.opts.attr.style);
                    Object.keys(styles).forEach((key) => {
                        style = style.replace(new RegExp('"?%' + key + '"?', 'g'), styles[key]);
                    });
                    elm.style.cssText = style;
                });

                s.opts.elm.preview[key].find("head").append("<style>" + css + "</style>");
            }
        };

        let getCurrentStyleSettings = () => {
            let ret = {};
            let styles = s.helper.model.getData("a/styles");

            Object.keys(styles).forEach((key) => {
                if (s.opts.elm.range[key]) {
                    ret[key] = s.opts.elm.range[key][0].value + "px";
                } else if (s.opts.elm.color[key]) {
                    ret[key] = s.opts.elm.color[key][0].value;
                }
            });

            return ret;
        };

        let getLocaleDate = (dateObj) => {
            return dateObj.toLocaleDateString([chrome.i18n.getUILanguage(), s.opts.manifest.default_locale], {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            });
        };


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
            s.opts.elm.appearanceSections.find("input").on("change input", (e) => {
                let tabName = $(e.currentTarget).parents("[" + s.opts.attr.appearance + "]").eq(0).attr(s.opts.attr.appearance);
                updatePreviewStyle(tabName);
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