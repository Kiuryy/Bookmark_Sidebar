($ => {
    "use strict";

    window.SearchHelper = function (n) {

        let suggestionCache = {};
        let searchEngine = null;
        let searchEngineList = {};

        let searchEngineInfo = {
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
            yandex: {
                name: "Yandex",
                url: "https://yandex.com/",
                queryUrl: "https://yandex.com/search/?text={1}",
                sorting: 40,
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
                sorting: 50,
                lang: {
                    'zh-CN': {
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
                let text = n.helper.i18n.get("newtab_search_placeholder", [searchEngineList[name].name]);
                n.opts.elm.search.field.attr("placeholder", text);
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
        let initSearchEngineList = () => {
            let lang = n.helper.i18n.getUILanguage();
            let list = [];
            
            Object.entries(searchEngineInfo).forEach(([alias, searchEngine]) => {
                let entry = {
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
        let selectSuggestion = (dir) => {
            let activeSuggestion = $("ul." + n.opts.classes.suggestions + " > li." + n.opts.classes.active);
            let idx = dir === "next" ? 0 : -1;

            if (activeSuggestion.length() > 0) {
                idx = activeSuggestion.prevAll("li").length() + (dir === "next" ? 1 : -1);
                activeSuggestion.removeClass(n.opts.classes.active);
            }

            let fromSuggestion = false;

            if (idx >= 0) {
                let suggestion = $("ul." + n.opts.classes.suggestions + " > li").eq(idx);

                if (suggestion.length() > 0) { // show the suggestion value in the search field
                    fromSuggestion = true;
                    suggestion.addClass(n.opts.classes.active);
                    n.opts.elm.search.field[0].value = suggestion.text().trim();
                }
            }

            if (fromSuggestion === false) { // no suggestion matches -> show the typed input
                n.opts.elm.search.field[0].value = n.opts.elm.search.field.data("typedVal");
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
                } else if (searchEngineList[searchEngine]) {
                    chrome.tabs.update({url: searchEngineList[searchEngine].queryUrl.replace("{1}", encodeURIComponent(val))});
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

        let initEvents = () => {
            n.opts.elm.search.submit.on("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                let val = n.opts.elm.search.field[0].value;
                if (val && val.trim().length > 0) {
                    handleSearch(val);
                } else if (searchEngineList[searchEngine]) {
                    chrome.tabs.update({url: searchEngineList[searchEngine].url});
                }
            });

            n.opts.elm.search.field.on("keyup click", (e) => {
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
                    n.opts.elm.search.field.data("typedVal", val);

                    getSearchSuggestions(val).then((suggestions) => {
                        $("ul." + n.opts.classes.suggestions).remove();

                        if (suggestions.length > 0) {
                            let list = $("<ul />").addClass(n.opts.classes.suggestions).insertAfter(n.opts.elm.search.field);

                            suggestions.some((suggestion, i) => {
                                $("<li />").attr(n.opts.attr.type, suggestion.type).text(suggestion.label).appendTo(list);
                                if (i > 4) {
                                    return true;
                                }
                            });

                            list.css({
                                top: n.opts.elm.search.field[0].offsetTop + "px",
                                left: n.opts.elm.search.field[0].offsetLeft + "px"
                            });
                        }
                    });
                }
            });

            $(document).on("mousemove", "ul." + n.opts.classes.suggestions + " > li", (e) => {
                $("ul." + n.opts.classes.suggestions + " > li").removeClass(n.opts.classes.active);
                $(e.currentTarget).addClass(n.opts.classes.active);
            }).on("click", "ul." + n.opts.classes.suggestions + " > li", (e) => {
                e.preventDefault();
                e.stopPropagation();
                let suggestion = $(e.currentTarget).text().trim();
                n.opts.elm.search.field[0].value = suggestion;
                handleSearch(suggestion);
            });

            $(document).on("click", () => {
                $("ul." + n.opts.classes.suggestions).remove();
                if (n.helper.edit.isEditMode() === false) {
                    n.opts.elm.search.field[0].focus();
                }
            });

            $(window).on("resize", () => {
                $("ul." + n.opts.classes.suggestions).remove();
            });
        };
    };

})(jsu);