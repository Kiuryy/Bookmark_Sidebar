($ => {
    "use strict";

    let Changelog = function () {

        let info = {};

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.elm = {
            body: $("body"),
            title: $("head > title"),
            contentWrapper: $("body > main"),
            changelogWrapper: $("article#changelog"),
            releaseHistoryWrapper: $("article#releaseHistory"),
            versionInfo: $("main > div.version > span")
        };

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();
            let loader = this.helper.template.loading().appendTo(this.elm.body);
            this.elm.body.addClass($.cl.initLoading);

            this.helper.model.init().then(() => {
                return this.helper.i18n.init();
            }).then(() => {
                this.elm.body.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

                this.helper.font.init();
                this.helper.stylesheet.init({defaultVal: true});
                this.helper.stylesheet.addStylesheets(["changelog"], $(document));

                this.helper.i18n.parseHtml(document);
                this.elm.title.text(this.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));
                this.elm.versionInfo.text($.opts.manifest.version_name);

                return this.helper.model.call("trackPageView", {page: "/changelog"}); // @deprecated
            }).then(() => {
                this.elm.body.removeClass($.cl.building);

                return Promise.all([
                    initData(),
                    $.delay(700)
                ]);
            }).then(() => {
                if (info && info.changelog && info.releaseHistory) {
                    initViewSwitch();
                    initChangelog();
                    initReleaseHistory();
                } else {
                    $("<p />").addClass($.cl.error).text(this.helper.i18n.get("status_changelog_unavailable_desc")).appendTo(this.elm.contentWrapper);
                }

                loader.remove();
                this.elm.body.removeClass($.cl.initLoading);
            });
        };

        /*
         * ################################
         * PRIVATE
         * ################################
         */

        /**
         * Initialises the helper objects
         */
        let initHelpers = () => {
            this.helper = {
                i18n: new $.I18nHelper(this),
                font: new $.FontHelper(this),
                template: new $.TemplateHelper(this),
                stylesheet: new $.StylesheetHelper(this),
                checkbox: new $.CheckboxHelper(this),
                model: new $.ModelHelper(this)
            };
        };

        /**
         * Initialises the switch for showing the changelog or the release history
         */
        let initViewSwitch = () => {
            let checkbox = this.helper.checkbox.get(this.elm.body, {}, "checkbox", "switch").prependTo(this.elm.contentWrapper);
            let trigger = $("<a />").html(this.helper.i18n.get("changelog_show_release_history")).insertAfter(checkbox);

            trigger.on("click", (e) => {
                e.preventDefault();
                checkbox.trigger("click");
            });

            checkbox.children("input[type='checkbox']").on("change", (e) => {
                if (e.currentTarget.checked) {
                    this.elm.releaseHistoryWrapper.addClass($.cl.visible);
                    this.elm.changelogWrapper.removeClass($.cl.visible);
                } else {
                    this.elm.releaseHistoryWrapper.removeClass($.cl.visible);
                    this.elm.changelogWrapper.addClass($.cl.visible);
                }
            });
        };

        /**
         * Returns true if the given version is newer than the extension version, otherwise false
         *
         * @param {string} version
         * @returns {boolean}
         */
        let isNewerVersion = (version) => {
            if ($.opts.manifest.version_name === "Dev" || !("update_url" in $.opts.manifest)) { // return false for dev version every time
                return false;
            }

            let diff = null;
            let regExStrip0 = /(\.0+)+$/;

            let segmentsA = $.opts.manifest.version.replace(regExStrip0, "").split(".");
            let segmentsB = version.replace(regExStrip0, "").split(".");
            let len = Math.max(segmentsA.length, segmentsB.length);

            for (let i = 0; i < len; i++) {
                diff = parseInt(segmentsA[i] || 0, 10) - parseInt(segmentsB[i] || 0, 10);
                if (diff) {
                    return diff < 0;
                }
            }
            return false;
        };

        /**
         * Initialises the changelog list
         */
        let initChangelog = () => {
            if (info && info.changelog) {
                Object.entries(info.changelog).forEach(([version, changes]) => {
                    if (isNewerVersion(version) === false) {
                        let elm = $("<div />").append("<h2>" + version + "</h2>").appendTo(this.elm.changelogWrapper);
                        let list = $("<ul />").appendTo(elm);

                        changes.forEach((change) => {
                            $("<li />").html(change).appendTo(list);
                        });
                    }
                });

                this.elm.changelogWrapper.addClass($.cl.visible);
            }
        };

        /**
         * Initialises the release history list
         */
        let initReleaseHistory = () => {
            if (info && info.releaseHistory) {
                info.releaseHistory.forEach((entry) => {
                    if (isNewerVersion(entry.version) === false) {
                        let elm = $("<div />").append("<h2>" + entry.version + "</h2>").appendTo(this.elm.releaseHistoryWrapper);
                        let list = $("<ul />").appendTo(elm);

                        entry.changes.forEach((change) => {
                            $("<li />").html(change).appendTo(list);
                        });
                    }
                });
            }
        };

        /**
         * Fetches the changelog and release history information via ajax request
         *
         * @returns {Promise}
         */
        let initData = () => {
            return new Promise((resolve) => {
                $.xhr($.opts.ajax.versionHistory, {
                    method: "POST",
                    responseType: "json"
                }).then((xhr) => {
                    if (xhr.response && xhr.response.changelog && xhr.response.releaseHistory) {
                        info = xhr.response;
                    }
                    resolve();
                }, () => {
                    resolve();
                });
            });
        };
    };

    new Changelog().run();
})(jsu);