($ => {
    "use strict";

    $.FeedbackHelper = function (s) {

        let data = null;
        const suggestionInfo = {
            displayed: [],
            opened: [],
            closed: []
        };

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                if (s.serviceAvailable) {
                    const path = s.helper.menu.getPath();
                    const showOnlySuggestions = path.length >= 2 && path[0] === "feedback" && path[1] === "error" && path[2];

                    if (showOnlySuggestions) { // user is visiting the page from the fallback new tab page -> do not show form, but suggestions first
                        s.elm.feedback.wrapper.addClass($.cl.settings.feedback.onlySuggestions);
                    }

                    initEvents();

                    Promise.all([
                        initSuggestions()
                    ]).then(() => {
                        if (showOnlySuggestions) { // show suggestions why the fallback new tab page was shown
                            showCommonSuggestions(path[2]);
                        }

                        return $.delay(700);
                    }).then(() => {
                        resolve();
                    });
                } else {
                    s.elm.feedback.form.addClass($.cl.hidden);

                    $("<p />")
                        .addClass($.cl.error)
                        .html(s.helper.i18n.get("status_feedback_unavailable_desc") + "<br />")
                        .append("<a href='mailto:feedback@blockbyte.de'>feedback@blockbyte.de</a>")
                        .insertAfter(s.elm.feedback.form);

                    resolve();
                }
            });
        };

        /**
         * Updates the height of the suggestion wrapper,
         * the height needs to be a defined value, because otherwise new suggestions wouldn't push old suggestions to the top1
         */
        const updateSuggestionWrapperHeight = () => {
            const height = s.elm.feedback.feedback[0].offsetHeight;
            s.elm.feedback.suggestions.css("max-height", height + "px");
        };

        /**
         *
         * @returns {Promise}
         */
        const initSuggestions = () => {
            return new Promise((resolve) => {
                $.xhr($.opts.website.feedback.suggestions).then((xhr) => {
                    if (xhr && xhr.responseText) {
                        const response = JSON.parse(xhr.responseText);

                        if (response && response.suggestions && response.controls) {
                            data = response;
                        }
                    }

                    resolve();
                });
            });
        };

        /**
         * Shows the most common reasons why the sidebar could not be opened,
         * Will be called when a user clicks the notification, that the sidebar could not be opened
         *
         * @param {string} type
         */
        const showCommonSuggestions = (type) => {
            let suggestions = [];
            let showAnswer = false;

            if (type === "general") {
                suggestions = ["not_working", "webstore", "system_pages"];
            } else if (type === "filter") {
                suggestions = ["blacklisted_whitelisted"];
                showAnswer = true;
            }

            suggestions.forEach((key) => {
                if (data && data.suggestions && data.suggestions[key]) {
                    suggestionInfo.displayed.push(key);
                    showSuggestion(key, data.suggestions[key], showAnswer);
                }
            });
        };

        /**
         * Scans the text for keywords and show the appropriate suggestion, if a keyword is found
         *
         * @param {string} text
         */
        const scanForKeywords = (text) => {
            if (data && data.suggestions) {

                Object.entries(data.suggestions).some(([key, suggestion]) => {
                    let foundMatch = false;

                    suggestion.keywords.some((keyword) => { // search keywords in the text
                        if (text.search(new RegExp(keyword, "i")) > -1) {
                            foundMatch = true;
                            return true;
                        }
                    });

                    if (foundMatch && suggestionInfo.displayed.indexOf(key) === -1) { // found suggestion -> show if not already displayed yet
                        suggestionInfo.displayed.push(key);
                        showSuggestion(key, suggestion);
                        return true;
                    }
                });
            }
        };

        /**
         * Shows the given suggestion
         *
         * @param {string} key
         * @param {object} obj
         * @param {bool} showAnswer
         */
        const showSuggestion = (key, obj, showAnswer = false) => {
            if (data && data.controls) {
                s.helper.model.call("track", {
                    name: "action",
                    value: {name: "suggestion_display", value: key},
                    always: true
                });

                const suggestion = $("<div />")
                    .addClass([$.cl.settings.suggestion, $.cl.hidden, $.cl.settings.feedback.absolute])
                    .attr($.attr.type, key)
                    .append("<strong>" + obj.question.message + "</strong>")
                    .append("<div class='" + $.cl.settings.feedback.answer + "'>" + obj.answer.message + "</div>")
                    .appendTo(s.elm.feedback.suggestions);

                $("<p />")
                    .append("<a " + $.attr.value + "='1'>" + data.controls.yes.message + "</a>")
                    .append("<a " + $.attr.value + "='0'>" + data.controls.no.message + "</a>")
                    .appendTo(suggestion);

                suggestion.data("links", obj.answer.links || []);

                const answer = suggestion.children("div." + $.cl.settings.feedback.answer);

                $.delay().then(() => {
                    answer.css("height", answer[0].offsetHeight + "px");
                    answer.addClass([$.cl.settings.feedback.noHeight, $.cl.hidden]);

                    return $.delay(300);
                }).then(() => {
                    suggestion.css("height", suggestion[0].offsetHeight + "px");
                    suggestion.addClass($.cl.settings.feedback.noHeight);

                    return $.delay(300);
                }).then(() => {
                    suggestion.removeClass([$.cl.settings.feedback.absolute, $.cl.settings.feedback.noHeight]);
                    return $.delay(300);
                }).then(() => {
                    suggestion
                        .css("height", "")
                        .removeClass($.cl.hidden);

                    s.elm.feedback.suggestions.addClass($.cl.visible);

                    if (showAnswer) {
                        showSuggestionAnswer(suggestion);
                    }
                });
            }
        };

        /**
         *
         * @param {jsu} suggestion
         */
        const showSuggestionAnswer = (suggestion) => {
            const type = suggestion.attr($.attr.type);
            suggestionInfo.opened.push(type);

            s.helper.model.call("track", {
                name: "action",
                value: {name: "suggestion_clicked", value: type},
                always: true
            });

            const controlWrapper = suggestion.children("p").html("");

            suggestion.data("links").forEach((link) => {
                $("<a />")
                    .attr("href", link.target)
                    .text(link.message)
                    .appendTo(controlWrapper);
            });

            $("<a />")
                .attr($.attr.value, "0")
                .text(data.controls.close.message)
                .appendTo(controlWrapper);

            suggestion.children("div." + $.cl.settings.feedback.answer).removeClass($.cl.settings.feedback.noHeight);

            $.delay(300).then(() => {
                suggestion.children("div." + $.cl.settings.feedback.answer).removeClass($.cl.hidden);
            });
        };

        /**
         *
         * @param {jsu} suggestion
         */
        const hideSuggestion = (suggestion) => {
            suggestionInfo.closed.push(suggestion.attr($.attr.type));

            suggestion
                .css("height", suggestion[0].offsetHeight + "px")
                .addClass($.cl.hidden);

            $.delay(200).then(() => {
                suggestion.addClass($.cl.settings.feedback.noHeight);
                return $.delay(300);
            }).then(() => {
                suggestion.remove();
                return $.delay();
            }).then(() => {
                if (s.elm.feedback.suggestions.children("div." + $.cl.settings.suggestion).length() === 0) {
                    s.elm.feedback.suggestions.removeClass($.cl.visible);

                    $.delay(300).then(() => {
                        s.elm.feedback.wrapper.removeClass($.cl.settings.feedback.onlySuggestions);
                    });
                }
            });
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        const initEvents = async () => {
            $(window).on("resize", () => {
                updateSuggestionWrapperHeight();
            }, {passive: true});

            s.elm.textarea.feedbackMsg.on("mouseup", () => {
                updateSuggestionWrapperHeight();
            }).on("keyup", (e) => {
                scanForKeywords(e.currentTarget.value);
            });

            s.elm.feedback.showForm.on("click", (e) => { // show feedback form -> is only visible if the feedback form is hidden
                e.preventDefault();
                s.elm.feedback.wrapper.removeClass($.cl.settings.feedback.onlySuggestions);
            });

            s.elm.feedback.suggestions.on("click", "a[href]:not([href^='#'])", (e) => { // open non local links in the suggestion in a new tab
                e.preventDefault();
                chrome.tabs.create({
                    url: $(e.currentTarget).attr("href"),
                    active: true
                });
            });

            s.elm.feedback.suggestions.on("click", "a[" + $.attr.value + "]", (e) => { // hide suggestion when user clicked 'no' or show answer when user clicked 'yes'
                e.preventDefault();
                const val = +$(e.currentTarget).attr($.attr.value);
                const suggestion = $(e.currentTarget).parents("div." + $.cl.settings.suggestion).eq(0);

                if (val === 1) { // show answer of the suggestion
                    showSuggestionAnswer(suggestion);
                } else { // hide suggestion
                    hideSuggestion(suggestion);
                }
            });

            s.elm.feedback.uploadField.on("change", (e) => { // upload screenshots
                if (e.currentTarget.files) {
                    handleFileUpload(e.currentTarget.files);
                }
            });

            s.elm.feedback.uploadedFiles.on("click", "a." + $.cl.close, (e) => { // remove uploaded screenshot from the list
                e.preventDefault();
                $(e.currentTarget).parent("li").remove();
            });

            s.elm.feedback.send.on("click", (e) => { // submit feedback form
                e.preventDefault();
                sendFeedback();
            });
        };

        /**
         * Adds the files from the screenshot upload to the list below the message textarea
         *
         * @param {Array} files
         */
        const handleFileUpload = (files) => {
            if (files.length + s.elm.feedback.uploadedFiles.children("li").length() > 3) { // too many files -> cancel and show error message
                window.alert(s.helper.i18n.get("settings_feedback_screenshot_error_amount", [3]));
                return;
            }

            for (const file of files) {
                if (!file.type.match("image")) {
                    continue;
                }

                const reader = new FileReader();
                const filesize = ((file.size / 1024)).toFixed(4); // KB

                if (filesize > 1024) { // filesize is too big -> show error message
                    window.alert(s.helper.i18n.get("settings_feedback_screenshot_error_filesize", [file.name]));
                } else {
                    reader.onload = (e) => {
                        try {
                            $("<li />")
                                .append("<img src='" + e.target.result + "' />")
                                .append("<span>" + file.name + "</span>")
                                .append("<a class='" + $.cl.close + "' />")
                                .appendTo(s.elm.feedback.uploadedFiles);
                        } catch (e) {
                            //
                        }
                    };

                    reader.readAsDataURL(file);
                }
            }

            s.elm.feedback.uploadField[0].value = "";
        };


        /**
         * Checks the content of the feedback fields and sends the content via ajax if they are filled properly
         */
        const sendFeedback = () => {
            const messageText = s.elm.textarea.feedbackMsg[0].value;
            const emailText = s.elm.field.feedbackEmail[0].value;

            const isEmailValid = emailText.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailText);
            const isMessageValid = messageText.length > 0;

            if (isEmailValid && isMessageValid) { // email is valid and the message is not empty
                const loadStartTime = +new Date();
                const loader = s.helper.template.loading().appendTo(s.elm.body);
                s.elm.body.addClass($.cl.loading);

                let infos = null;
                const screenshots = [];

                s.elm.feedback.uploadedFiles.find("> li > img").forEach((screenshot) => {
                    screenshots.push($(screenshot).attr("src"));
                });

                const config = s.helper.importExport.getExportConfig();
                if (config.utility && config.utility.newtabBackground) { // don't send newtab background
                    delete config.utility.newtabBackground;
                }

                $.xhr($.opts.website.feedback.form, {
                    method: "POST",
                    timeout: 30000,
                    data: {
                        email: emailText,
                        msg: messageText,
                        version: $.opts.manifest.version_name,
                        ua: navigator.userAgent,
                        lang: s.helper.i18n.getLanguage(),
                        userType: s.helper.model.getUserType(),
                        screenshots: JSON.stringify(screenshots),
                        config: config,
                        suggestions: suggestionInfo
                    }
                }).then((xhr) => { // got a response
                    infos = JSON.parse(xhr.responseText);
                    return $.delay(Math.max(0, 1000 - (+new Date() - loadStartTime))); // load at least 1s
                }, () => { // timeout or xhr failed
                    infos = {success: false};
                    return $.delay();
                }).then(() => {
                    s.elm.body.removeClass($.cl.loading);
                    loader.remove();

                    if (infos && infos.success && infos.success === true) { // successfully submitted -> show message and clear form
                        s.helper.model.call("track", {
                            name: "action",
                            value: {name: "feedback", value: 1},
                            always: true
                        });

                        s.elm.textarea.feedbackMsg[0].value = "";
                        s.elm.field.feedbackEmail[0].value = "";
                        s.elm.feedback.uploadedFiles.html("");

                        s.showSuccessMessage("feedback_sent_message");
                    } else { // not submitted -> raise error
                        $.delay().then(() => {
                            alert(s.helper.i18n.get("settings_feedback_send_failed"));
                        });
                    }
                });
            } else if (!isEmailValid) {
                s.elm.field.feedbackEmail.addClass($.cl.error);
            } else if (!isMessageValid) {
                s.elm.textarea.feedbackMsg.addClass($.cl.error);
            }

            $.delay(700).then(() => {
                $("." + $.cl.error).removeClass($.cl.error);
            });
        };
    };

})(jsu);