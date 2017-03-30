($ => {
    "use strict";

    window.ContributeHelper = function (s) {

        /**
         * Initialises the contribution tab
         */
        this.init = () => {
            chrome.storage.sync.get(["shareUserdata"], (obj) => {
                if (obj.shareUserdata && obj.shareUserdata === true) {
                    s.opts.elm.checkbox.shareUserdata.trigger("click");
                }

                s.opts.elm.checkbox.shareUserdata.children("input[type='checkbox']").on("change", () => {
                    chrome.storage.sync.set({
                        shareUserdata: s.helper.checkbox.isChecked(s.opts.elm.checkbox.shareUserdata)
                    }, () => {
                        s.showSuccessMessage("saved_share_userdata");
                    });
                });
            });
        };


    };

})(jsu);