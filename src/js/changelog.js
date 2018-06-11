($ => {
    "use strict";

    window.changelog = function () {

        let info = {};

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.opts = {
            elm: {
                body: $("body"),
                title: $("head > title"),
                contentWrapper: $("body > main"),
                changelogWrapper: $("article#changelog"),
                releaseHistoryWrapper: $("article#releaseHistory"),
                versionInfo: $("main > div.version > span")
            },
            classes: {
                building: "building",
                initLoading: "initLoading",
                visible: "visible",
                error: "error",
                checkbox: {
                    box: "checkbox",
                    active: "active",
                    clicked: "clicked",
                    focus: "focus"
                }
            },
            attr: {
                type: "data-type",
                style: "data-style"
            },
            ajax: {
                versionHistory: "https://extensions.blockbyte.de/ajax/changelog/bs"
            },
            manifest: chrome.runtime.getManifest()
        };
        this.cl = this.opts.classes;
        this.attr = this.opts.attr;

        /**
         * Constructor
         */
        this.run = () => {
            initHelpers();
            let loader = this.helper.template.loading().appendTo(this.opts.elm.body);
            this.opts.elm.body.addClass(this.cl.initLoading);

            this.helper.model.init().then(() => {
                return this.helper.i18n.init();
            }).then(() => {
                this.opts.elm.body.parent("html").attr("dir", this.helper.i18n.isRtl() ? "rtl" : "ltr");

                this.helper.font.init("default");
                this.helper.stylesheet.init();
                this.helper.stylesheet.addStylesheets(["changelog"], $(document));

                this.helper.i18n.parseHtml(document);
                this.opts.elm.title.text(this.opts.elm.title.text() + " - " + this.helper.i18n.get("extension_name"));
                this.opts.elm.versionInfo.text(this.opts.manifest.version_name);

                return this.helper.model.call("trackPageView", {page: "/changelog"});
            }).then(() => {
                this.opts.elm.body.removeClass(this.cl.building);

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
                    $("<p />").addClass(this.cl.error).text(this.helper.i18n.get("status_changelog_unavailable_desc")).appendTo(this.opts.elm.contentWrapper);
                }

                loader.remove();
                this.opts.elm.body.removeClass(this.cl.initLoading);
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
                i18n: new window.I18nHelper(this),
                font: new window.FontHelper(this),
                template: new window.TemplateHelper(this),
                stylesheet: new window.StylesheetHelper(this),
                checkbox: new window.CheckboxHelper(this),
                model: new window.ModelHelper(this)
            };
        };

        /**
         * Initialises the switch for showing the changelog or the release history
         */
        let initViewSwitch = () => {
            let checkbox = this.helper.checkbox.get(this.opts.elm.body, {}, "checkbox", "switch").prependTo(this.opts.elm.contentWrapper);
            let trigger = $("<a />").html(this.helper.i18n.get("changelog_show_release_history")).insertAfter(checkbox);

            trigger.on("click", (e) => {
                e.preventDefault();
                checkbox.trigger("click");
            });

            checkbox.children("input[type='checkbox']").on("change", (e) => {
                if (e.currentTarget.checked) {
                    this.opts.elm.releaseHistoryWrapper.addClass(this.cl.visible);
                    this.opts.elm.changelogWrapper.removeClass(this.cl.visible);
                } else {
                    this.opts.elm.releaseHistoryWrapper.removeClass(this.cl.visible);
                    this.opts.elm.changelogWrapper.addClass(this.cl.visible);
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
            if (this.opts.manifest.version_name === "Dev" || !("update_url" in this.opts.manifest)) { // return false for dev version every time
                return false;
            }

            let diff = null;
            let regExStrip0 = /(\.0+)+$/;

            let segmentsA = this.opts.manifest.version.replace(regExStrip0, "").split(".");
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
                        let elm = $("<div />").append("<h2>" + version + "</h2>").appendTo(this.opts.elm.changelogWrapper);
                        let list = $("<ul />").appendTo(elm);

                        changes.forEach((change) => {
                            $("<li />").html(change).appendTo(list);
                        });
                    }
                });

                this.opts.elm.changelogWrapper.addClass(this.cl.visible);
            }
        };

        /**
         * Initialises the release history list
         */
        let initReleaseHistory = () => {
            if (info && info.releaseHistory) {
                info.releaseHistory.forEach((entry) => {
                    if (isNewerVersion(entry.version) === false) {
                        let elm = $("<div />").append("<h2>" + entry.version + "</h2>").appendTo(this.opts.elm.releaseHistoryWrapper);
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
                $.xhr(this.opts.ajax.versionHistory, {
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


    new window.changelog().run();

})(jsu);