($ => {
    "use strict";

    window.SupportHelper = function (s) {

        /**
         * Initialises the contribution tab
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
        };

        /**
         * Initialises the eventhandler for the contribution tab
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            chrome.storage.sync.get(["shareUserdata"], (obj) => {
                if (obj.shareUserdata && obj.shareUserdata === true) {
                    s.opts.elm.checkbox.shareUserdata.trigger("click");
                }

                s.opts.elm.checkbox.shareUserdata.children("input[type='checkbox']").on("change", () => { // update the shareUserdata checkbox
                    chrome.storage.sync.set({
                        shareUserdata: s.helper.checkbox.isChecked(s.opts.elm.checkbox.shareUserdata)
                    }, () => {
                        s.showSuccessMessage("saved_share_userdata");
                    });
                });
            });

            s.opts.elm.support.donateButton.on("click", (e) => {
                e.preventDefault();
                window.open(s.opts.donateLink, "_blank");
            });
        };
    };

})(jsu);