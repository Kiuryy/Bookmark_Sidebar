($ => {
    "use strict";

    $.InfosHelper = function (s) {

        /**
         * Initialises the information tab
         *
         * @returns {Promise}
         */
        this.init = async () => {
            return new Promise((resolve) => {
                if (s.elm.infos.aboutWrapper.hasClass($.cl.active)) {
                    s.loadImages(s.elm.infos.aboutWrapper);
                }

                Promise.all([
                    initPermissionList(),
                    initEvents()
                ]).then(resolve);
            });
        };

        /**
         * Initialises the labels of the required permissions by fetching the permission warnings
         *
         * @returns {Promise}
         */
        const initPermissionList = () => {
            return new Promise((resolve) => {
                $.api.management.getPermissionWarningsByManifest(JSON.stringify($.opts.manifest), (obj) => { // returns the warnings of the required permissions in the browser language
                    const permissions = {};
                    [permissions.contentscript, permissions.bookmarks] = obj;

                    Object.entries(permissions).forEach(([key, text]) => {
                        s.elm.infos.permissionsWrapper.find("h3[" + $.attr.name + "='" + key + "']").text(text);
                    });

                    resolve();
                });
            });
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        const initEvents = async () => {
            $(document).on($.opts.events.pageChanged, (e) => {
                if (e.detail.path && e.detail.path[0] === "infos") {
                    s.loadImages(s.elm.infos.aboutWrapper);
                }
            });

            $.api.storage.sync.get(["shareInfo"], (obj) => {
                if (obj.shareInfo) {
                    if (obj.shareInfo.config) {
                        s.elm.checkbox.shareConfig.trigger("click");
                    }

                    if (obj.shareInfo.activity) {
                        s.elm.checkbox.shareActivity.trigger("click");
                    }
                }

                s.elm.infos.shareInfoWrapper.find("input[type='checkbox']").on("change", () => {
                    s.helper.model.call("updateShareInfo", {
                        config: s.helper.checkbox.isChecked(s.elm.checkbox.shareConfig),
                        activity: s.helper.checkbox.isChecked(s.elm.checkbox.shareActivity)
                    }).then(() => {
                        s.showSuccessMessage("saved_share_userdata");
                    });
                });
            });
        };
    };

})(jsu);