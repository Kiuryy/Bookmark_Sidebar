($ => {
    "use strict";

    $.InfosHelper = function (s) {

        /**
         * Initialises the information tab
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        const initEvents = async () => {
            chrome.storage.sync.get(["shareInfo"], (obj) => {
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