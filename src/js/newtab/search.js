($ => {
    "use strict";

    window.SearchHelper = function (n) {

        let suggestionCache = {};

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
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

        let initEvents = () => {


            n.opts.elm.search.submit.on("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                let val = n.opts.elm.search.field[0].value;
                if (val && val.trim().length > 0) {
                    handleSearch(val);
                } else {
                    chrome.tabs.update({url: "https://www.google.com"});
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
                n.opts.elm.search.field[0].focus();
            });

            $(window).on("resize", () => {
                $("ul." + n.opts.classes.suggestions).remove();
            });
        };
    };

})(jsu);