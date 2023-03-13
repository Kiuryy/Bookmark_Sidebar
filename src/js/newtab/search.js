($ => {
    "use strict";

    $.SearchHelper = function (n) {

        let suggestionCache = {};
        let searchEngine = {};
        let searchEngineList = {};
        let searchAlreadyFocussed = false;

        const searchSuggestion = {
            queries: true,
            bookmarks: true,
            history: true
        };

        const searchEngineInfo = {
            google: {
                name: "Google",
                url: "https://www.google.com/",
                queryUrl: "https://www.google.com/search?q={1}",
                favicon: "https://www.google.com/favicon.ico",
                sorting: 10
            },
            bing: {
                name: "Bing",
                url: "https://www.bing.com/",
                queryUrl: "https://www.bing.com/search?q={1}",
                favicon: "https://www.bing.com/favicon.ico",
                sorting: 20
            },
            yandex: {
                name: "Yandex",
                url: "https://yandex.com/",
                queryUrl: "https://yandex.com/search/?text={1}",
                favicon: "https://yandex.com/favicon.ico",
                sorting: 30,
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
                favicon: "https://www.baidu.com/favicon.ico",
                sorting: 40,
                lang: {
                    "zh-CN": {
                        name: "百度",
                        sorting: 5
                    }
                }
            },
            custom: {
                sorting: 50
            }
        };

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initSearchEngineList();
            initEvents();

            this.updateSearchEngine(n.helper.model.getData("n/searchEngine"), n.helper.model.getData("n/searchEngineCustom"));
            this.setVisibility(n.helper.model.getData("n/searchField"));

            this.setSearchSuggestion("queries", n.helper.model.getData("n/searchSuggestQueries"));
            this.setSearchSuggestion("bookmarks", n.helper.model.getData("n/searchSuggestBookmarks"));
            this.setSearchSuggestion("history", n.helper.model.getData("n/searchSuggestHistory"));
        };

        /**
         *
         * @param type
         * @param val
         */
        this.setSearchSuggestion = (type, val) => {
            searchSuggestion[type] = val;
            suggestionCache = {};
        };

        /**
         *
         * @param visibility
         */
        this.setVisibility = (visibility) => {
            if (visibility === "hide") {
                n.elm.search.wrapper.addClass($.cl.hidden);
            } else {
                n.elm.search.wrapper.removeClass($.cl.hidden);
            }
        };

        /**
         * Updates the currently used search engine
         *
         * @param {string} name
         * @param {object} opts
         */
        this.updateSearchEngine = (name, opts = {}) => {
            if (searchEngineList[name]) {
                searchEngine = {
                    name: name,
                    title: opts.title || "",
                    homepage: opts.homepage || "",
                    queryUrl: opts.queryUrl || ""
                };

                const label = searchEngine.name === "custom" && searchEngine.title ? searchEngine.title : searchEngineList[name].label;
                n.elm.search.field.attr("placeholder", n.helper.i18n.get("newtab_search_placeholder", [label]));
            }
        };

        /**
         * Focus the search field of the website, or the search of the sidebar
         */
        this.focusSearch = () => {
            if (n.elm.search.wrapper.hasClass($.cl.hidden) === false) { // Search field is visible
                if (searchAlreadyFocussed === false) { // first time the search field get's focussed -> prefill with already typed keyboard inputs
                    searchAlreadyFocussed = true;
                    n.elm.search.field[0].value = (window.cachedKeys || []).join("");
                }

                n.elm.search.field[0].focus();
            } else if (n.elm.sidebar && n.elm.sidebar.iframe && n.helper.model.getData("n/autoOpen")) { // Search field is hidden -> focus sidebar search instead
                $(document).trigger($.opts.events.openSidebar);
                n.elm.sidebar.iframe[0].focus();
            }
        };

        /**
         *
         * @returns {string}
         */
        this.getCurrentSearchEngine = () => searchEngine;

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

            Object.entries(searchEngineInfo).forEach(([alias, obj]) => {
                if (alias === "custom") {
                    const customData = n.helper.model.getData("n/searchEngineCustom");
                    obj.name = n.helper.i18n.get("newtab_search_engine_custom");
                    obj.label = customData.title;
                    obj.url = customData.homepage;
                    obj.queryUrl = customData.queryUrl;
                }

                const entry = {
                    alias: alias,
                    name: obj.name,
                    label: obj.label || obj.name,
                    favicon: obj.favicon || null,
                    url: obj.url,
                    queryUrl: obj.queryUrl,
                    sorting: obj.sorting
                };

                if (obj.lang && obj.lang[lang]) {
                    Object.entries(obj.lang[lang]).forEach(([field, val]) => {
                        entry[field] = val;
                    });
                }

                if (entry.name) {
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
                    n.elm.search.field[0].value = (suggestion.attr($.attr.src) || suggestion.text()).trim();
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
         * @param {object} opts
         */
        const handleSearch = (val, opts = {}) => {
            if (!val || val.trim().length === 0) {
                return;
            }

            const openLink = (url) => {
                n.helper.model.call("openLink", {
                    href: url,
                    newTab: opts.newtab || false,
                    position: n.helper.model.getData("b/newTabPosition"),
                    active: !opts.newtab
                });
            };

            if (val.search(/https?\:\/\//) === 0 || val.search(/s?ftps?\:\/\//) === 0 || val.search(/chrome\:\/\//) === 0) {
                openLink(val);
            } else if (searchEngineList[searchEngine.name]) {
                let url = "";

                if (searchEngine.name === "custom" && searchEngine.queryUrl) {
                    url = searchEngine.queryUrl;
                } else if (searchEngineList[searchEngine.name].queryUrl) {
                    url = searchEngineList[searchEngine.name].queryUrl;
                }

                if (url) {
                    if (url.includes("{1}") === false) { // query url is missing the {1} placeholder -> paste it at the end
                        url += "{1}";
                    }
                    openLink(url.replace("{1}", encodeURIComponent(val)));
                }
            }
        };

        /**
         * Returns suggestions (words, urls, bookmarks) for the given input using the google search api and the according Chrome API for bookmark search
         *
         * @param {string} val
         * @returns {Promise}
         */
        const getSearchSuggestions = async (val) => {
            if (!val) { // empty input -> no suggestions
                return [];
            }

            if (suggestionCache[val]) { // suggestions for the input already fetched -> return from cached object
                return suggestionCache[val];
            }

            let xhr, searchResults, historyResults;

            if (searchSuggestion.queries) {
                // determine suggestions via xhr on the google search api
                xhr = await $.xhr("http://google.com/complete/search?client=chrome&q=" + encodeURIComponent(val), {responseType: "json"});
            }

            if (searchSuggestion.bookmarks && val.length >= 2) {
                searchResults = await n.helper.model.call("searchBookmarks", {searchVal: val});
            }

            if (searchSuggestion.history && val.length >= 3 && $.api.history) {
                historyResults = await n.helper.model.call("searchHistory", {searchVal: val});
            }

            const urls = [];
            const words = [];

            let historyBookmarkMaxSuggestions = 2;
            if (!searchSuggestion.queries) {
                historyBookmarkMaxSuggestions++;
            }
            if (!searchSuggestion.bookmarks || !searchSuggestion.history) {
                historyBookmarkMaxSuggestions++;
            }

            try {
                if (searchResults && searchResults.bookmarks && searchResults.bookmarks.length > 0) { // add bookmarks to the suggestions
                    let i = 0;
                    searchResults.bookmarks.some((bookmark) => {
                        if (bookmark.url) {
                            urls.push({type: "bookmark", label: bookmark.title, url: bookmark.url});
                            i++;
                            if (i >= historyBookmarkMaxSuggestions) {
                                return true;
                            }
                        }
                    });
                }
            } catch (e) {
                //
            }

            try {
                if (historyResults && historyResults.history && historyResults.history.length > 0) { // add history to the suggestions
                    let i = 0;
                    historyResults.history.some((history) => {
                        if (history.url) {
                            urls.push({type: "history", label: history.title, url: history.url});
                            i++;
                            if (i >= historyBookmarkMaxSuggestions) {
                                return true;
                            }
                        }
                    });
                }
            } catch (e) {
                //
            }

            try {
                if (xhr.response && xhr.response.length > 1 && xhr.response[0] === val) { // there are suggestions of the google search api
                    xhr.response[1].forEach((suggestion, i) => {
                        let label = suggestion;

                        if (xhr.response[4]["google:suggesttype"][i] === "NAVIGATION") { // show url suggestions at first in the list
                            label = label.replace(/^https?:\/\//, "");
                            label = label.replace(/\/$/, "");
                            label = label.replace(/^www\./, "");

                            urls.push({
                                type: "url",
                                url: suggestion,
                                label: label
                            });
                        } else {
                            words.push({
                                type: "word",
                                label: label
                            });
                        }
                    });
                }
            } catch (e) {
                //
            }

            const suggestion = [...urls, ...words]; // display urls first and then the words
            suggestionCache[val] = suggestion;
            return suggestion;
        };

        /**
         * Initialises the eventhandler
         */
        const initEvents = () => {
            n.elm.search.speechSearch.on("click", (e) => {
                e.preventDefault();
                handleSpeechInput();
            });

            n.elm.search.wrapper.on("submit", (e) => {
                e.preventDefault();
                const val = n.elm.search.field[0].value.trim();

                if (val && val.trim().length > 0) {
                    handleSearch(val);
                } else if (searchEngineList[searchEngine.name]) {
                    let url = "";

                    if (searchEngine.name === "custom" && searchEngine.homepage) {
                        url = searchEngine.homepage;
                    } else if (searchEngineList[searchEngine.name].url) {
                        url = searchEngineList[searchEngine.name].url;
                    }

                    if (url) {
                        n.helper.model.call("openLink", {
                            href: url,
                            newTab: false
                        });
                    }
                }
            });

            n.elm.search.field.on("keyup click", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
                    selectSuggestion("next");
                } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
                    selectSuggestion("prev");
                } else if (e.key !== "Enter") {
                    const val = e.currentTarget.value.trim();
                    n.elm.search.field.data("typedVal", val);

                    const suggestions = await getSearchSuggestions(val);
                    if (n.elm.search.field.data("typedVal") !== val) { // the search string changed in the meantime (e.g. when the user types fast) -> suggestions are outdated, so not display them
                        return;
                    }

                    $("ul." + $.cl.newtab.suggestions).remove();

                    if (suggestions.length === 0) { // no suggestions -> don't display any box below the search field
                        return;
                    }

                    const list = $("<ul></ul>").addClass($.cl.newtab.suggestions).insertAfter(n.elm.search.field);

                    suggestions.some((suggestion, i) => {
                        const elm = $("<li></li>")
                            .attr($.attr.type, suggestion.type)
                            .text(suggestion.label)
                            .appendTo(list);

                        if (suggestion.url) {
                            elm.attr({
                                "title": suggestion.url,
                                [$.attr.src]: suggestion.url
                            }).append("<span>" + suggestion.url + "</span>");
                        }

                        if (i > 5) {
                            return true;
                        }
                    });

                    list.css({
                        top: n.elm.search.field[0].offsetTop + "px",
                        left: n.elm.search.field[0].offsetLeft + "px"
                    });
                }
            });

            $(document).on("mousemove", "ul." + $.cl.newtab.suggestions + " > li", (e) => {
                $("ul." + $.cl.newtab.suggestions + " > li").removeClass($.cl.active);
                $(e.currentTarget).addClass($.cl.active);
            }).on("click auxclick", "ul." + $.cl.newtab.suggestions + " > li", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const suggestion = ($(e.currentTarget).attr($.attr.src) || $(e.currentTarget).text()).trim();
                handleSearch(suggestion, {newtab: e.type === "auxclick"});
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
                    this.focusSearch();
                }
            });

            $(window).on("resize", () => {
                $("ul." + $.cl.newtab.suggestions).remove();
            }, {passive: true});
        };

        /**
         * Handles the speech input
         */
        const handleSpeechInput = () => {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;

            if (SpeechRecognition) {
                if (n.elm.search.wrapper.hasClass($.cl.newtab.listening) && n.elm.search.wrapper.data("recognition")) { // already listening -> abort
                    n.elm.search.wrapper.data("recognition").stop();
                    return;
                }

                const recognition = new SpeechRecognition();
                n.elm.search.wrapper.data("recognition", recognition);
                let hasInput = false;

                recognition.continuous = false;
                recognition.interimResults = true;
                recognition.start();

                recognition.onresult = (e) => {
                    let transcript = "";
                    let isFinal = false;

                    for (let i = e.resultIndex; i < e.results.length; ++i) {
                        transcript += e.results[i][0].transcript;
                        if (e.results[i].isFinal) {
                            isFinal = true;
                        }
                    }

                    if (transcript.length > 0) {
                        n.elm.search.field[0].value = transcript;
                        hasInput = true;
                    }

                    if (isFinal) {
                        handleSearch(transcript);
                    }
                };

                recognition.onstart = () => {
                    n.elm.search.wrapper.addClass($.cl.newtab.listening);
                    n.elm.search.field[0].value = n.helper.i18n.get("newtab_speech_search_listening") + " ...";
                };

                recognition.onend = () => {
                    n.elm.search.wrapper.removeClass($.cl.newtab.listening);
                    if (hasInput === false) {
                        n.elm.search.field[0].value = "";
                    }
                };

                recognition.onerror = (e) => {
                    recognition.stop();
                    recognition.onend(null);

                    if (e.error === "not-allowed") {
                        alert(n.helper.i18n.get("newtab_speech_search_error"));
                    }
                };
            }
        };
    };

})(jsu);