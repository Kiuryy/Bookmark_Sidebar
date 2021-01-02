($ => {
    "use strict";

    $.PortHelper = function (b) {

        this.init = async () => {
            let c = 0;

            const mapping = {
                checkUrl: b.helper.linkchecker.check,
                bookmarks: b.helper.bookmarks.getById,
                searchBookmarks: b.helper.bookmarks.getBySearchVal,
                moveBookmark: b.helper.bookmarks.move,
                updateBookmark: b.helper.bookmarks.update,
                createBookmark: b.helper.bookmarks.create,
                deleteBookmark: b.helper.bookmarks.remove,
                openWebsite: b.openWebsite,
                reload: b.reload,
                reinitialize: b.reinitialize,
                updateShareInfo: b.helper.model.setShareInfo,
                infoToDisplay: b.helper.model.getInfoToDisplay,
                languageInfos: b.helper.language.getAvailableLanguages,
                langvars: b.helper.language.getLangVars,
                rtlLangs: b.helper.language.getRtlLanguages,
                favicon: b.helper.image.getFavicon,
                openLink: b.helper.utility.openLink,
                userType: b.helper.model.getUserType,
                activatePremium: b.helper.utility.activatePremium,
                deactivatePremium: b.helper.utility.removePremiumState,
                licenseKey: b.helper.model.getLicenseKey,
                getCache: b.helper.cache.get,
                setCache: b.helper.cache.set,
                removeCache: b.helper.cache.remove,
                websiteStatus: b.helper.utility.checkWebsiteStatus,
                track: b.helper.analytics.track,
                updateIcon: b.helper.icon.set,
                reloadIcon: b.helper.icon.init,
                reloadContextmenus: b.helper.browserAction.initContextmenus,
                clearNotWorkingTimeout: b.helper.browserAction.clearTimeout,
                setNotWorkingReason: b.helper.browserAction.setReason,
                addViewAmount: b.helper.viewAmount.addByUrl,
                viewAmounts: b.helper.viewAmount.getAll,
                searchHistory: b.helper.utility.getHistoryBySearchVal
            };

            $.api.runtime.onConnect.addListener((port) => {
                if (port.name && port.name === "background") {
                    port.onMessage.addListener((message, info) => {
                        if (mapping[message.type]) { // function for message type exists
                            if (c === 100) { // check whether the userdata should be shared for today from time to time
                                b.helper.analytics.trackUserData();
                                c %= 100;
                            }
                            message.tabInfo = info.sender.tab;

                            mapping[message.type](message).then((result) => {
                                try { // can fail if port is closed in the meantime
                                    port.postMessage({
                                        uid: message.uid,
                                        result: result
                                    });
                                } catch (e) {
                                    //
                                }
                            });

                            c++;
                        }
                    });
                }
            });
        };
    };

})(jsu);