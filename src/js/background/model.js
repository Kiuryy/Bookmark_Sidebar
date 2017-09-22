($ => {
    "use strict";

    window.ModelHelper = function (b) {
        let shareUserdata = null;
        let data = {};

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                chrome.storage.sync.get(["model", "shareUserdata"], (obj) => {
                    data = obj.model || {};
                    shareUserdata = typeof obj.shareUserdata === "undefined" ? null : obj.shareUserdata;

                    if (typeof data.installationDate === "undefined") { // no date yet -> save a start date in storage
                        data.installationDate = +new Date();
                    }

                    let today = +new Date().setHours(0, 0, 0, 0);
                    if (typeof data.lastTrackDate === "undefined" || data.lastTrackDate !== today) {
                        data.lastTrackDate = today;
                        b.helper.analytics.trackUserData();
                    }

                    saveData().then(resolve);
                });
            });
        };

        this.shareUserdata = () => {
            return shareUserdata;
        };

        this.setData = (key, val) => {
            return new Promise((resolve) => {
                data[key] = val;
                saveData().then(resolve);
            });
        };

        this.getData = (key) => {
            return data[key] || null;
        };

        let saveData = () => {
            return new Promise((resolve) => {
                if (Object.getOwnPropertyNames(data).length > 0) {
                    chrome.storage.sync.set({
                        model: data
                    }, () => {
                        resolve();
                    });
                }
            });
        };
    };

})(jsu);