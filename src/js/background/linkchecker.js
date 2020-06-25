($ => {
    "use strict";

    $.Linkchecker = function (b) {

        const importantURLParameters = {
            "youtube.com": ["v"],
            "google.com": ["q"],
            "google.de": ["q"],
        };

        this.check = (opts) => {
            return new Promise((resolve) => {
                Promise.all([
                    getHTTPInfo(opts.url),
                    getDuplicateInfo(opts.url)
                ]).then(([httpInfo, duplicateInfo]) => {
                    resolve({
                        httpInfo: httpInfo,
                        duplicateInfo: duplicateInfo
                    });
                }, () => {
                    resolve({error: true});
                });

            });
        };


        /**
         * Performs an XHR request to find out the real url of the given url (e.g. because of 302 redirects),
         * will return 'success: false' if the XHR request times out or the url is not available (e.g. 404)
         *
         * @param rawUrl
         * @param method
         * @returns {Promise}
         */
        const getHTTPInfo = (rawUrl, method = "HEAD") => {
            return new Promise((resolve) => {
                const fallbackOnError = () => {
                    if (method === "HEAD") {
                        getHTTPInfo(rawUrl, "GET").then(resolve);
                    } else {
                        resolve({url: rawUrl, success: false, status: null});
                    }
                };

                $.xhr(rawUrl, {
                    method: method,
                    timeout: 7000,
                }).then((xhr) => {
                    if (xhr.responseURL) {
                        if (xhr.responseURL.startsWith("http:")) { // http url detected -> try to access it with https
                            getHTTPInfo(xhr.responseURL.replace(/^http:/, "https:"), method).then((r) => {
                                if (r.url && r.success && r.status < 400) { // https version is available -> return this URL instead
                                    resolve(r);
                                } else { // no https available -> return the http URL
                                    resolve({url: xhr.responseURL, success: true, status: xhr.status});
                                }
                            });
                        } else {
                            resolve({url: xhr.responseURL, success: true, status: xhr.status});
                        }
                    } else {
                        fallbackOnError();
                    }
                })["catch"]((xhr) => {
                    if (xhr && xhr.status && xhr.status !== 404) { // ignore every other status code than 404
                        resolve({url: rawUrl, success: true, status: xhr.status});
                    } else {
                        fallbackOnError();
                    }
                });
            });
        };

        /**
         * Checks whether the given urls are used by multiple bookmarks and returns information about all duplicate bookmarks for the given url list
         *
         * @param {string} rawUrl
         * @returns {Promise}
         */
        const getDuplicateInfo = async (rawUrl) => {

            const getFilteredUrl = (url) => { // filters the given url -> e.g. https://www.google.com/?q=123#top -> google.com
                let urlObj = null;
                try {
                    urlObj = new URL(url);
                } catch (e) {
                    //
                }

                url = url.split("?")[0];
                url = url.split("#")[0];
                url = url.replace(/^https?:\/\//, "");
                url = url.replace(/^www\./, "");
                url = url.replace(/\/$/, "");

                const hostname = url.split("/")[0];

                if (urlObj && importantURLParameters[hostname]) { // keep important parameters of known urls -> e.g. https://www.youtube.com/?v=abcdefg&list=xyz -> youtube.com/?v=abcdefg
                    const params = [];
                    importantURLParameters[hostname].forEach((param) => {
                        const val = urlObj.searchParams.get(param);
                        if (val) {
                            params.push(param + "=" + val);
                        }
                    });
                    url += "?" + params.join("&");
                }

                return url;
            };

            const filteredUrl = getFilteredUrl(rawUrl);
            const result = await b.helper.bookmarks.api.search(filteredUrl); // will return some false positive (e.g. 'google.com/' will also return all subdomains of google.com and all subdirectories)

            if (result.length > 1) {
                const realResults = [];

                result.forEach((bookmark) => { // filter the result array and only add real duplicates to the final result list
                    if (getFilteredUrl(bookmark.url) === filteredUrl) {
                        realResults.push(bookmark);
                    }
                });

                if (realResults.length > 1) { // there are real duplicates -> return them
                    return {label: filteredUrl, duplicates: realResults};
                }
            }

            return {label: filteredUrl, duplicates: []};
        };
    };

})(jsu);