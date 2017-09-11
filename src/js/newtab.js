($ => {
    "use strict";

    window.newtab = function () {

        let suggestionCache = {};

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.opts = {
            classes: {
                initLoading: "initLoading",
                loading: "loading",
                chromeApps: "chromeApps",
                suggestions: "suggestions",
                active: "active",
                darkMode: "dark"
            },
            attr: {
                type: "data-type"
            },
            elm: {
                body: $("body"),
                title: $("head > title"),
                content: $("section#content"),
                topNav: $("section#content > nav"),
                search: {
                    field: $("div#search > input[type='text']"),
                    submit: $("div#search > button[type='submit']")
                },
                topPages: $("ul.topPages")
            },
            manifest: chrome.runtime.getManifest()
        };

        /**
         * Constructor
         */
        this.run = () => {
            chrome.permissions.contains({
                permissions: ['tabs', 'topSites']
            }, function (result) {
                if (result) {
                    loadPage();
                } else {
                    chrome.tabs.update({url: "chrome-search://local-ntp/local-ntp.html"});
                }
            });
        };

        /*
         * ################################
         * PRIVATE
         * ################################
         */

        let loadPage = () => {
            loadSidebar();
            initHelpers();

            this.helper.model.init().then(() => {
                return this.helper.i18n.init();
            }).then(() => {
                this.helper.font.init();
                this.helper.stylesheet.init();
                this.helper.stylesheet.addStylesheets(["newtab"], $(document));
                this.helper.i18n.parseHtml(document);

                let darkMode = this.helper.model.getData("a/darkMode");
                if (darkMode === true) {
                    this.opts.elm.body.addClass(this.opts.classes.darkMode);
                }

                initTopPages();
                initEvents();

                return $.delay();
            }).then(() => {
                this.opts.elm.body.removeClass(this.opts.classes.initLoading);
            });
        };

        let initEvents = () => {
            this.opts.elm.topNav.on("click", "a." + this.opts.classes.chromeApps, (e) => { // open chrome apps page
                e.preventDefault();
                chrome.tabs.update({url: "chrome://apps"});
            });

            this.opts.elm.search.submit.on("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                let val = this.opts.elm.search.field[0].value;
                if (val && val.trim().length > 0) {
                    handleSearch(val);
                } else {
                    chrome.tabs.update({url: "https://www.google.com"});
                }
            });

            this.opts.elm.search.field.on("keyup click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                let val = e.currentTarget.value;
                let keyCode = event.which || event.keyCode;

                if (keyCode === 13) {
                    handleSearch(val);
                } else if (keyCode === 40) {
                    selectSuggestion("next");
                } else if (keyCode === 38) {
                    selectSuggestion("prev");
                } else {
                    this.opts.elm.search.field.data("typedVal", val);

                    getSearchSuggestions(val).then((suggestions) => {
                        $("ul." + this.opts.classes.suggestions).remove();

                        if (suggestions.length > 0) {
                            let list = $("<ul />").addClass(this.opts.classes.suggestions).insertAfter(this.opts.elm.search.field);

                            suggestions.some((suggestion, i) => {
                                $("<li />").attr(this.opts.attr.type, suggestion.type).text(suggestion.label).appendTo(list);
                                if (i > 4) {
                                    return true;
                                }
                            });

                            list.css({
                                top: this.opts.elm.search.field[0].offsetTop + "px",
                                left: this.opts.elm.search.field[0].offsetLeft + "px"
                            });
                        }
                    });
                }
            });

            $(document).on("mousemove", "ul." + this.opts.classes.suggestions + " > li", (e) => {
                $("ul." + this.opts.classes.suggestions + " > li").removeClass(this.opts.classes.active);
                $(e.currentTarget).addClass(this.opts.classes.active);
            }).on("click", "ul." + this.opts.classes.suggestions + " > li", (e) => {
                e.preventDefault();
                e.stopPropagation();
                let suggestion = $(e.currentTarget).text().trim();
                this.opts.elm.search.field[0].value = suggestion;
                handleSearch(suggestion);
            });

            $(document).on("click", () => {
                $("ul." + this.opts.classes.suggestions).remove();
                this.opts.elm.search.field[0].focus();
            });

            $(window).on("resize", () => {
                $("ul." + this.opts.classes.suggestions).remove();
            });
        };

        /**
         * Selects the next or previous suggestion from the suggestion list
         *
         * @param {string} dir "next" or "prev"
         */
        let selectSuggestion = (dir) => {
            let activeSuggestion = $("ul." + this.opts.classes.suggestions + " > li." + this.opts.classes.active);
            let idx = dir === "next" ? 0 : -1;

            if (activeSuggestion.length() > 0) {
                idx = activeSuggestion.prevAll("li").length() + (dir === "next" ? 1 : -1);
                activeSuggestion.removeClass(this.opts.classes.active);
            }

            let fromSuggestion = false;

            if (idx >= 0) {
                let suggestion = $("ul." + this.opts.classes.suggestions + " > li").eq(idx);

                if (suggestion.length() > 0) { // show the suggestion value in the search field
                    fromSuggestion = true;
                    suggestion.addClass(this.opts.classes.active);
                    this.opts.elm.search.field[0].value = suggestion.text().trim();
                }
            }

            if (fromSuggestion === false) { // no suggestion matches -> show the typed input
                this.opts.elm.search.field[0].value = this.opts.elm.search.field.data("typedVal");
            }
        };

        /**
         * Checks if the given value is an url or not,
         * if it is an url the current tab url will be changed to this,
         * if not the value will be searched with a search engine
         *
         * @param {string} val
         */
        let handleSearch = (val) => {
            if (val && val.trim().length > 0) {
                if (val.search(/https?\:\/\//) === 0 || val.search(/s?ftps?\:\/\//) === 0 || val.search(/chrome\:\/\//) === 0) {
                    chrome.tabs.update({url: val});
                } else { // @toDo configure search engine
                    chrome.tabs.update({url: "https://www.google.com/search?q=" + encodeURIComponent(val)});
                }
            }
        };

        /**
         * Returns suggestions for the given input of the google search api
         *
         * @param {string} val
         * @returns {Promise}
         */
        let getSearchSuggestions = (val) => {
            return new Promise((resolve,) => {
                if (!val) { // empty input -> no suggestions
                    resolve([]);
                } else if (suggestionCache[val]) { // suggestions for the input already fetched -> return from cached object
                    resolve(suggestionCache[val]);
                } else { // determine suggestions via xhr on the google search api
                    let encodedVal = encodeURIComponent(val);

                    let finishObj = (obj = []) => {
                        suggestionCache[val] = obj;
                        resolve(obj);
                    };

                    $.xhr("http://google.com/complete/search?client=chrome&q=" + encodedVal, {responseType: "json"}).then((xhr) => {
                        try {
                            if (xhr.response && xhr.response[0] === val) {
                                let urls = [];
                                let words = [];

                                xhr.response[1].forEach((suggestion, i) => {
                                    if (xhr.response[4]["google:suggesttype"][i] === "NAVIGATION") { // show url suggestions at first in the list
                                        urls.push({
                                            type: "url",
                                            label: suggestion
                                        });
                                    } else {
                                        words.push({
                                            type: "word",
                                            label: suggestion
                                        });
                                    }
                                });

                                finishObj(urls.concat(words));
                            }
                        } catch (e) {
                            finishObj();
                        }
                    }, () => {
                        finishObj();
                    });
                }
            });
        };

        let initTopPages = () => {
            chrome.topSites.get((list) => {
                list.some((page, i) => {
                    let entry = $("<li />").html("<a href='" + page.url + "' title='" + page.title + "'>" + page.title + "</a>").appendTo(this.opts.elm.topPages);

                    this.helper.model.call("favicon", {url: page.url}).then((response) => { // retrieve favicon of url
                        if (response.img) { // favicon found -> add to entry
                            entry.children("a").prepend("<img src='" + response.img + "' />")
                        }
                    });

                    if (i >= 7) {
                        return true;
                    }
                });
            });
        };

        /**
         * Initialises the helper objects
         */
        let initHelpers = () => {
            this.helper = {
                model: new window.ModelHelper(this),
                template: new window.TemplateHelper(this),
                i18n: new window.I18nHelper(this),
                font: new window.FontHelper(this),
                stylesheet: new window.StylesheetHelper(this)
            };
        };

        /**
         * Loads the sidebar with the specified configuration
         */
        let loadSidebar = () => {
            this.opts.manifest.content_scripts[0].css.forEach((css) => {
                $("head").append("<link href='" + chrome.extension.getURL(css) + "' type='text/css' rel='stylesheet' />");
            });

            let loadJs = (i = 0) => {
                let js = this.opts.manifest.content_scripts[0].js[i];

                if (typeof js !== "undefined") {
                    let script = document.createElement('script');
                    document.head.appendChild(script);
                    script.onload = () => loadJs(i + 1);
                    script.src = "/" + js;
                }
            };

            loadJs();
        };
    };

    new window.newtab().run();

})(jsu);