($ => {
    "use strict";

    $.SearchHelper = function (n) {

        const suggestionCache = {};
        let searchEngine = null;
        let searchEngineList = {};

        const searchEngineInfo = {
            google: {
                name: "Google",
                url: "https://www.google.com/",
                queryUrl: "https://www.google.com/search?q={1}",
                sorting: 10
            },
            bing: {
                name: "Bing",
                url: "https://www.bing.com/",
                queryUrl: "https://www.bing.com/search?q={1}",
                sorting: 20
            },
            yahoo: {
                name: "Yahoo",
                url: "https://search.yahoo.com/",
                queryUrl: "https://search.yahoo.com/search?p={1}",
                sorting: 30,
                lang: {
                    de: {
                        url: "https://de.search.yahoo.com/",
                        queryUrl: "https://de.search.yahoo.com/search?p={1}",
                    },
                    jp: {
                        url: "https://search.yahoo.co.jp/",
                        queryUrl: "https://search.yahoo.co.jp/search?p={1}",
                    }
                }
            },
            duckduckgo: {
                name: "DuckDuckGo",
                url: "https://duckduckgo.com/",
                queryUrl: "https://duckduckgo.com/?q={1}",
                sorting: 40
            },
            yandex: {
                name: "Yandex",
                url: "https://yandex.com/",
                queryUrl: "https://yandex.com/search/?text={1}",
                sorting: 50,
                lang: {
                    ru: {
                        name: "Яндекс",
                        url: "https://yandex.ru/",
                        queryUrl: "https://yandex.ru/search/?text={1}",
                        sorting: 15
                    },
                    uk: {
                        name: "Яндекс",
                        url: "https://yandex.ua/",
                        queryUrl: "https://yandex.ua/search/?text={1}",
                        sorting: 15
                    },
                    tr: {
                        url: "https://yandex.com.tr/",
                        queryUrl: "https://yandex.com.tr/search/?text={1}",
                        sorting: 15
                    }
                }
            },
            baidu: {
                name: "Baidu",
                url: "https://www.baidu.com/",
                queryUrl: "https://www.baidu.com/s?wd={1}",
                sorting: 60,
                lang: {
                    "zh-CN": {
                        name: "百度",
                        sorting: 15
                    }
                }
            }
        };

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initSearchEngineList();
            initEvents();

            this.updateSearchEngine(n.helper.model.getData("n/searchEngine"));
        };

        /**
         * Updates the currently used search engine
         *
         * @param {string} name
         */
        this.updateSearchEngine = (name) => {
            if (searchEngineList[name]) {
                searchEngine = name;
                const text = n.helper.i18n.get("newtab_search_placeholder", [searchEngineList[name].name]);
                n.elm.search.field.attr("placeholder", text);
            }
        };

        /**
         *
         * @returns {object}
         */
        this.getSearchEngineList = () => searchEngineList;

        /**
         * Initialises the list of search engines depending on the language of the user
         */
        const initSearchEngineList = () => {
            const lang = n.helper.i18n.getUILanguage();
            const list = [];

            Object.entries(searchEngineInfo).forEach(([alias, searchEngine]) => {
                const entry = {
                    alias: alias,
                    name: searchEngine.name,
                    url: searchEngine.url,
                    queryUrl: searchEngine.queryUrl,
                    sorting: searchEngine.sorting
                };

                if (searchEngine.lang && searchEngine.lang[lang]) {
                    Object.entries(searchEngine.lang[lang]).forEach(([field, val]) => {
                        entry[field] = val;
                    });
                }

                if (entry.name && entry.url && entry.queryUrl) {
                    list.push(entry);
                }
            });

            list.sort((a, b) => {
                return (a.sorting || 9999) - (b.sorting || 9999);
            });

            searchEngineList = {};
            list.forEach((entry) => {
                searchEngineList[entry.alias] = entry;
            });
        };

        /**
         * Selects the next or previous suggestion from the suggestion list
         *
         * @param {string} dir "next" or "prev"
         */
        const selectSuggestion = (dir) => {
            const activeSuggestion = $("ul." + $.cl.newtab.suggestions + " > li." + $.cl.active);
            let idx = dir === "next" ? 0 : -1;

            if (activeSuggestion.length() > 0) {
                idx = activeSuggestion.prevAll("li").length() + (dir === "next" ? 1 : -1);
                activeSuggestion.removeClass($.cl.active);
            }

            let fromSuggestion = false;

            if (idx >= 0) {
                const suggestion = $("ul." + $.cl.newtab.suggestions + " > li").eq(idx);

                if (suggestion.length() > 0) { // show the suggestion value in the search field
                    fromSuggestion = true;
                    suggestion.addClass($.cl.active);
                    n.elm.search.field[0].value = suggestion.text().trim();
                }
            }

            if (fromSuggestion === false) { // no suggestion matches -> show the typed input
                n.elm.search.field[0].value = n.elm.search.field.data("typedVal") || "";
            }
        };

        /**
         * Checks if the given value is an url or not,
         * if it is an url the current tab url will be changed to this,
         * if not the value will be searched with a search engine
         *
         * @param {string} val
         */
        const handleSearch = (val) => {
            if (val && val.trim().length > 0) {
                if (val.search(/https?\:\/\//) === 0 || val.search(/s?ftps?\:\/\//) === 0 || val.search(/chrome\:\/\//) === 0) {
                    chrome.tabs.update({url: val});
                } else if (searchEngineList[searchEngine]) {
                    chrome.tabs.update({url: searchEngineList[searchEngine].queryUrl.replace("{1}", encodeURIComponent(val))});
                }
            }
        };

        /**
         * Returns suggestions for the given input using the google search api
         *
         * @param {string} val
         * @returns {Promise}
         */
        const getSearchSuggestions = (val) => {
            return new Promise((resolve) => {
                if (!val) { // empty input -> no suggestions
                    resolve([]);
                } else if (suggestionCache[val]) { // suggestions for the input already fetched -> return from cached object
                    resolve(suggestionCache[val]);
                } else { // determine suggestions via xhr on the google search api
                    const encodedVal = encodeURIComponent(val);

                    const finishObj = (obj = []) => {
                        suggestionCache[val] = obj;
                        resolve(obj);
                    };

                    $.xhr("http://google.com/complete/search?client=chrome&q=" + encodedVal, {responseType: "json"}).then((xhr) => {
                        try {
                            if (xhr.response && xhr.response[0] === val) {
                                const urls = [];
                                const words = [];

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

        const initEvents = () => {
            n.elm.search.submit.on("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const val = n.elm.search.field[0].value;
                if (val && val.trim().length > 0) {
                    handleSearch(val);
                } else if (searchEngineList[searchEngine]) {
                    chrome.tabs.update({url: searchEngineList[searchEngine].url});
                }
            });

            n.elm.search.field.on("keyup click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const val = e.currentTarget.value;
                const keyCode = event.which || event.keyCode;

                if (keyCode === 13) {
                    handleSearch(val);
                } else if (keyCode === 40) {
                    selectSuggestion("next");
                } else if (keyCode === 38) {
                    selectSuggestion("prev");
                } else {
                    n.elm.search.field.data("typedVal", val);

                    getSearchSuggestions(val).then((suggestions) => {
                        $("ul." + $.cl.newtab.suggestions).remove();

                        if (suggestions.length > 0) {
                            const list = $("<ul />").addClass($.cl.newtab.suggestions).insertAfter(n.elm.search.field);

                            suggestions.some((suggestion, i) => {
                                $("<li />").attr($.attr.type, suggestion.type).text(suggestion.label).appendTo(list);
                                if (i > 4) {
                                    return true;
                                }
                            });

                            list.css({
                                top: n.elm.search.field[0].offsetTop + "px",
                                left: n.elm.search.field[0].offsetLeft + "px"
                            });
                        }
                    });
                }
            });

            $(document).on("mousemove", "ul." + $.cl.newtab.suggestions + " > li", (e) => {
                $("ul." + $.cl.newtab.suggestions + " > li").removeClass($.cl.active);
                $(e.currentTarget).addClass($.cl.active);
            }).on("click", "ul." + $.cl.newtab.suggestions + " > li", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const suggestion = $(e.currentTarget).text().trim();
                n.elm.search.field[0].value = suggestion;
                handleSearch(suggestion);
            });

            $(document).on("keydown", (e) => {
                if (e.key === "f" && (e.ctrlKey || e.metaKey)) { // open the search field of the sidebar
                    e.preventDefault();
                    if (n.sidebarHelper && n.sidebarHelper.search && n.elm.sidebar && n.elm.sidebar.iframe) {
                        $(document).trigger($.opts.events.openSidebar);
                        n.elm.sidebar.iframe[0].focus();
                        n.sidebarHelper.search.showSearchField();
                    }
                }
            });

            $(document).on("click", () => {
                $("ul." + $.cl.newtab.suggestions).remove();
                if (n.helper.edit.isEditMode() === false) {
                    n.elm.search.field[0].focus();
                }
            });

            $(window).on("resize", () => {
                $("ul." + $.cl.newtab.suggestions).remove();
            }, {passive: true});
        };
    };

})(jsu);