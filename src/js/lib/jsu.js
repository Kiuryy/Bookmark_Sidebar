/**
 * jsu - Javascript Utilities
 *
 * Philipp König
 * https://blockbyte.de/
 */
(() => {
    "use strict";

    if (window.jsu) { // already initialized
        return false;
    }

    const runningXhr = [];

    // >>> Global Methods
    const isDefined = "isDefined";
    const forEach = "forEach";
    // <<< Global Methods

    /**
     * jsuHelper
     */
    const jsuHelper = (() => {
        return class {
            static [isDefined](v) {
                return typeof v !== "undefined" && v !== null;
            }

            static [forEach](list, callback, reverse = false) {
                const listLength = list.length;

                if (reverse) {
                    for (let i = listLength - 1; i >= 0; i--) {
                        if (this[isDefined](list[i][forEach])) {
                            this[forEach](list[i], callback, reverse);
                        } else if (callback(list[i], i) === false) {
                            break;
                        }
                    }
                } else {
                    for (let i = 0; i < listLength; i++) {
                        if (this[isDefined](list[i][forEach])) {
                            this[forEach](list[i], callback, reverse);
                        } else if (callback(list[i], i) === false) {
                            break;
                        }
                    }
                }
            }
        };
    })();

    /**
     * jsuTools
     */
    const jsuTools = (() => {

        // >>> Methods
        const delay = "delay";
        const xhr = "xhr";
        const cancelXhr = "cancelXhr";
        // <<< Methods

        return {
            /**
             * Promise for a delay of the given duration
             *
             * @param {int} t
             * @returns {Promise}
             */
            [delay]: (t = 0) => {
                return new Promise((resolve) => {
                    setTimeout(resolve, t);
                });
            },
            /**
             * Performs an XMLHttpRequest with the given options
             *
             * @param {string} url
             * @param {object} opts
             * @returns {Promise}
             */
            [xhr]: (url, opts = {}) => {
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    const idx = runningXhr.push({url: url, xhr: xhr}) - 1;

                    xhr.open(opts.method || "GET", url, true);
                    ["load", "error", "timeout", "abort"].forEach((eventName) => {
                        xhr.addEventListener(eventName, () => {
                            runningXhr[idx] = null;

                            if (eventName === "load" && xhr.status < 400) {
                                resolve(xhr);
                            } else {
                                reject(xhr);
                            }
                        });
                    });

                    let formData = null;
                    if (opts.data) { // submit data
                        formData = new FormData();
                        Object.entries(opts.data).forEach(([key, value]) => {
                            if (typeof value === "object") {
                                value = JSON.stringify(value);
                            }

                            formData.append(key, value);
                        });
                    }

                    if (opts.files) { // submit files
                        if (formData === null) {
                            formData = new FormData();
                        }
                        opts.files.forEach((file) => {
                            file.files.forEach((fileObj) => {
                                formData.append(file.name + "[]", fileObj);
                            });
                        });
                    }

                    if (opts.header) {
                        Object.entries(opts.header).forEach(([key, value]) => { // set additional headers
                            xhr.setRequestHeader(key, value);
                        });
                    }

                    Object.entries(opts).forEach(([key, value]) => { // set specific variables
                        if (key !== "method" && key !== "data" && key !== "header") {
                            xhr[key] = value;
                        }
                    });

                    xhr.send(formData);
                });
            },
            /**
             * Cancels all XMLHttpRequests or only the ones with the given url
             *
             * @param {string} url
             */
            [cancelXhr]: (url = null) => {
                runningXhr.forEach((obj) => {
                    if (obj && obj.xhr && obj.xhr.readyState && obj.xhr.abort && (url === null || obj.url === url)) {
                        obj.xhr.abort();
                        obj = null;
                    }
                });
            }
        };
    })();


    /**
     * jsuNode
     */
    const jsuNode = ((h) => {
        const d = document;
        const eventHandlerMap = new WeakMap();
        const dataMap = new WeakMap();
        const nodes = Symbol();

        // >>> Methods
        const private_fillNodes = "_fillNodeList";

        const doc = "document";

        const eq = "eq";
        const get = "get";

        const length = "length";

        const remove = "remove";

        const private_addEventListener = "_addEventListener";
        const private_cloneEventListener = "_cloneEventListener";
        const private_addData = "_addData";
        const private_cloneData = "_cloneData";
        const private_clone = "_cloneElement";

        const clone = "clone";

        const on = "on";
        const off = "off";
        const trigger = "trigger";

        const find = "find";
        const children = "children";

        const private_htmlText = "_htmlText";
        const html = "html";
        const text = "text";

        const data = "data";
        const removeData = "removeData";

        const css = "css";

        const attr = "attr";
        const removeAttr = "removeAttr";

        const addClass = "addClass";
        const removeClass = "removeClass";
        const toggleClass = "toggleClass";
        const hasClass = "hasClass";

        const private_elementMove = "_moveElement";
        const private_elementMoveTo = "_moveElementTo";
        const append = "append";
        const prepend = "prepend";
        const appendTo = "appendTo";
        const prependTo = "prependTo";
        const after = "after";
        const before = "before";
        const insertAfter = "insertAfter";
        const insertBefore = "insertBefore";

        const private_nextPrev = "_nextPrev";
        const next = "next";
        const prev = "prev";
        const private_siblings = "_siblings";
        const siblings = "siblings";
        const nextAll = "nextAll";
        const prevAll = "prevAll";

        const parent = "parent";
        const parents = "parents";

        const private_realDimension = "_realDimension";
        const realWidth = "realWidth";
        const realHeight = "realHeight";
        // <<< Methods

        return class {

            /**
             * Constructor
             *
             * @param param
             * @param asSelector
             */
            constructor(param, asSelector = true) {
                let s = param;

                if (typeof param === "string" && (asSelector === false || param.indexOf("<") > -1)) {
                    const div = d.createElement("div");
                    div.innerHTML = param;
                    s = div.childNodes;
                }

                this[private_fillNodes](s);
            }


            /**
             *
             * @param s
             */
            [private_fillNodes](s) {
                if (!h[isDefined](s)) {
                    this[nodes] = [];
                } else if (s instanceof jsuNode) {
                    this[nodes] = s[get]();
                } else if (typeof s === "string") {
                    this[nodes] = d.querySelectorAll(s);
                } else if (s instanceof Node || s instanceof HTMLDocument || s instanceof Window) {
                    this[nodes] = [s];
                } else if (s instanceof NodeList || s instanceof HTMLCollection) {
                    this[nodes] = s;
                } else if (typeof s === "object") {
                    this[nodes] = [];

                    if (!h[isDefined](s[forEach])) {
                        s = [s];
                    }

                    s[forEach]((entry) => {
                        const eachCallback = (node) => {
                            if (this[nodes].indexOf(node) === -1) {
                                this[nodes].push(node);
                            }
                        };

                        if (entry instanceof jsuNode) {
                            entry[forEach](eachCallback);
                        } else if (Array.isArray(entry) || entry instanceof NodeList || entry instanceof HTMLCollection || /^\[object (HTMLCollection|NodeList|Object)\]$/.test(entry.toString())) {
                            h[forEach](entry, eachCallback);
                        } else {
                            this[nodes].push(entry);
                        }
                    });

                } else {
                    throw new DOMException("invalid parameter for jsu");
                }

                this[forEach]((node, idx) => {
                    this[idx] = node;
                });
            }


            /**
             * [ ForEach ]
             *
             * @param callback
             * @param reverse
             * @returns {jsuNode}
             */
            [forEach](callback, reverse = false) {
                h[forEach](this[nodes], callback, reverse);
                return this;
            }


            /**
             * [ Css ]
             *
             * @param opts
             * @param val
             * @returns {*|jsuNode}
             */
            [css](opts, val) {
                let isSetter = false;
                const hasOpts = h[isDefined](opts);
                const hasVal = h[isDefined](val);
                const ret = [];

                this[forEach]((node) => {
                    if (hasOpts && hasVal && typeof opts === "string") { // set
                        node.style[opts] = val;
                        isSetter = true;
                    } else if (hasOpts) {
                        if (typeof opts === "string") { // get specific
                            ret.push(window.getComputedStyle(node)[opts]);
                        } else if (typeof opts === "object") { // set by object
                            isSetter = true;
                            Object.keys(opts)[forEach]((key) => {
                                if (typeof key === "string") {
                                    node.style[key] = opts[key];
                                }
                            });
                        }
                    }
                });

                if (isSetter) {
                    return this;
                } else {
                    return this[nodes].length > 1 ? ret : ret[0];
                }
            }


            /**
             * [ Attr ]
             *
             * @param opts
             * @param val
             * @returns {*|jsuNode}
             */
            [attr](opts, val) {
                let isSetter = false;
                const hasOpts = h[isDefined](opts);
                const hasVal = h[isDefined](val);
                const ret = [];

                this[forEach]((node) => {
                    const setAttr = (key, val) => {
                        isSetter = true;
                        if (h[isDefined](node[key])) {
                            node[key] = val;
                        } else {
                            node.setAttribute(key, val);
                        }
                    };

                    const getAttr = (key) => {
                        return h[isDefined](node[key]) ? node[key] : node.getAttribute(key);
                    };


                    if (hasOpts && hasVal && typeof opts === "string") { // set
                        setAttr(opts, val);
                    } else if (hasOpts) {
                        if (typeof opts === "string") { // get specific
                            ret.push(getAttr(opts));
                        } else if (typeof opts === "object") { // set by object
                            Object.keys(opts)[forEach]((key) => {
                                if (typeof key === "string") {
                                    setAttr(key, opts[key]);
                                }
                            });
                        }
                    }
                });

                if (isSetter) {
                    return this;
                } else {
                    return this[nodes].length > 1 ? ret : ret[0];
                }
            }


            /**
             * [ RemoveAttr ]
             *
             * @param key
             * @returns {jsuNode}
             */
            [removeAttr](key) {
                this[forEach]((node) => {
                    node.removeAttribute(key);
                });

                return this;
            }


            /**
             *
             * @param elm
             * @param info
             */
            static [private_addEventListener](elm, info) {
                let eventHandlerList = eventHandlerMap.get(elm);

                if (!h[isDefined](eventHandlerList)) {
                    eventHandlerList = {};
                    eventHandlerMap.set(elm, eventHandlerList);
                }

                if (!eventHandlerList[info.event]) {
                    eventHandlerList[info.event] = [];
                }

                eventHandlerList[info.event].push({
                    fn: info.fn,
                    name: info.name || (info.event + "_" + (+new Date()) + Math.random().toString(36).substr(2, 12)),
                    opts: info.opts,
                    wantsUntrusted: info.wantsUntrusted
                });

                elm.addEventListener(info.event, info.fn, info.opts, info.wantsUntrusted);
            }


            /**
             *
             * @param elm
             * @param newElm
             */
            static [private_cloneEventListener](elm, newElm) {
                const eventHandlerList = eventHandlerMap.get(elm);

                if (h[isDefined](eventHandlerList)) {
                    Object.keys(eventHandlerList)[forEach]((eventType) => {
                        eventHandlerList[eventType][forEach]((event) => {
                            jsuNode[private_addEventListener](newElm, {
                                event: eventType,
                                fn: event.fn,
                                opts: event.opts,
                                wantsUntrusted: event.wantsUntrusted
                            });
                        });
                    });
                }

                if (newElm.children) {
                    h[forEach](newElm.children, (node, idx) => {
                        jsuNode[private_cloneEventListener](elm.children[idx], node);
                    });
                }
            }


            /**
             *
             * @param elm
             * @param key
             * @param val
             */
            static [private_addData](elm, key, val) {
                let dataList = dataMap.get(elm);

                if (!h[isDefined](dataList)) {
                    dataList = {};
                    dataMap.set(elm, dataList);
                }

                dataList[key] = val;
            }


            /**
             *
             * @param elm
             * @param newElm
             */
            static [private_cloneData](elm, newElm) {
                const dataList = dataMap.get(elm);

                if (h[isDefined](dataList)) {
                    Object.keys(dataList)[forEach]((k) => {
                        jsuNode[private_addData](newElm, k, dataList[k]);
                    });
                }

                if (newElm.children) {
                    h[forEach](newElm.children, (node, idx) => {
                        jsuNode[private_cloneData](elm.children[idx], node);
                    });
                }
            }


            /**
             *
             * @param elmObj
             * @returns {jsuNode}
             */
            static [private_clone](elmObj) {
                const clonedList = [];

                elmObj[forEach]((elm) => {
                    const clonedElm = elm.cloneNode(true);
                    jsuNode[private_cloneEventListener](elm, clonedElm);
                    jsuNode[private_cloneData](elm, clonedElm);
                    clonedList.push(clonedElm);
                });

                return new jsuNode(clonedList);
            }


            /**
             * [ Clone ]
             *
             * @returns {jsuNode}
             */
            [clone]() {
                return jsuNode[private_clone](this);
            }


            /**
             * [ Data ]
             *
             * @param key
             * @param val
             * @returns {*|jsuNode}
             */
            [data](key, val) {
                let isSetter = false;
                const hasKey = h[isDefined](key);
                const hasVal = h[isDefined](val);
                const ret = [];

                this[forEach]((node) => {
                    const elmDataList = dataMap.get(node);
                    const hasData = h[isDefined](elmDataList);

                    if (hasKey && hasVal) { // set
                        isSetter = true;
                        jsuNode[private_addData](node, key, val);
                    } else if (hasKey) {
                        if (typeof key === "string") { // get specific
                            ret.push(hasData ? elmDataList[key] : undefined);

                        } else if (typeof key === "object") { // set by object
                            isSetter = true;
                            Object.keys(key)[forEach]((k) => {
                                if (typeof k === "string") {
                                    jsuNode[private_addData](node, k, key[k]);
                                }
                            });
                        }
                    } else { // get all
                        ret.push(hasData ? elmDataList : {});
                    }
                });

                if (isSetter) {
                    return this;
                } else {
                    return this[nodes].length > 1 ? ret : ret[0];
                }
            }


            /**
             * [ RemoveData ]
             *
             * @param key
             * @returns {jsuNode}
             */
            [removeData](key) {
                const removeAll = !h[isDefined](key);

                this[forEach]((node) => {
                    const elmDataList = dataMap.get(node);

                    if (h[isDefined](elmDataList)) {
                        if (removeAll) { // remove all
                            dataMap["delete"](node);
                        } else if (h[isDefined](elmDataList[key])) { // remove specific
                            delete elmDataList[key];
                        }
                    }
                });

                return this;
            }


            /**
             * [ On ]
             *
             * @param eventStr
             * @param callbackOrElm
             * @param callbackOrOpts
             * @param optsOrWantsUntrusted
             * @param wantsUntrusted
             * @returns {jsuNode}
             */
            [on](eventStr, callbackOrElm, callbackOrOpts, optsOrWantsUntrusted, wantsUntrusted) {
                const updateEventObject = (e, overrideObj) => {
                    Object.keys(overrideObj)[forEach]((key) => {
                        try {
                            Object.defineProperty(e, key, {
                                value: overrideObj[key]
                            });
                        } catch (ex) {
                            //
                        }
                    });
                };

                let opts = callbackOrOpts;

                if (typeof callbackOrOpts === "function") {
                    opts = optsOrWantsUntrusted;
                } else {
                    wantsUntrusted = optsOrWantsUntrusted;
                }

                if (typeof opts === "undefined") {
                    opts = null;
                }

                if (typeof wantsUntrusted === "undefined") {
                    wantsUntrusted = null;
                }

                const eventDelegation = typeof callbackOrElm === "string";

                this[forEach]((node) => {
                    const events = eventStr.split(/\s+/g);
                    events[forEach]((event) => {
                        const eventInfo = event.split(/\./);

                        const fn = (e) => {
                            updateEventObject(e, {type: eventInfo[0]});

                            if (eventDelegation) { // event delegation
                                const opts = {
                                    preventDefault: () => {
                                        e.preventDefault();
                                    },
                                    stopPropagation: () => {
                                        e.stopPropagation();
                                    }
                                };

                                h[forEach](node.querySelectorAll(":scope " + callbackOrElm), (element) => {
                                    let el = e.target;
                                    while (el && el !== node) {
                                        if (el === element) {
                                            const clonedEventObj = eventInfo[0].startsWith("key") ? new KeyboardEvent(eventInfo[0], e) : new MouseEvent(eventInfo[0], e);
                                            updateEventObject(clonedEventObj, {
                                                preventDefault: opts.preventDefault,
                                                stopPropagation: opts.stopPropagation,
                                                currentTarget: el,
                                                target: e.target
                                            });
                                            callbackOrOpts(clonedEventObj);
                                        }
                                        el = el.parentNode;
                                    }
                                });
                            } else if (typeof callbackOrElm === "function") { // normal eventListener
                                callbackOrElm(e);
                            }
                        };

                        jsuNode[private_addEventListener](node, {
                            event: eventInfo[0],
                            name: eventInfo[1],
                            fn: fn,
                            opts: opts,
                            wantsUntrusted: wantsUntrusted
                        });
                    });
                }, true);

                return this;
            }


            /**
             * [ Off ]
             *
             * @param eventStr
             * @returns {jsuNode}
             */
            [off](eventStr) {
                this[forEach]((node) => {
                    const eventHandlerList = eventHandlerMap.get(node);

                    if (h[isDefined](eventHandlerList)) {
                        const events = eventStr.split(/\s+/g);
                        events[forEach]((event) => {
                            const eventInfo = event.split(/\./);

                            if (eventInfo[0] === "*") { // remove all eventlisteners
                                Object.entries(eventHandlerList)[forEach](([eventName, entries]) => {
                                    h[forEach](entries, (info, idx) => {
                                        if (typeof eventInfo[1] === "undefined" || eventInfo[1] === info.name) {
                                            node.removeEventListener(eventName, info.fn);
                                            eventHandlerList[eventName].splice(idx, 1);
                                        }
                                    }, true);
                                });
                            } else if (eventHandlerList[eventInfo[0]]) { // remove specific eventlisteners (e.g. click, mouseover, ...)
                                h[forEach](eventHandlerList[eventInfo[0]], (info, idx) => {
                                    if (typeof eventInfo[1] === "undefined" || eventInfo[1] === info.name) {
                                        node.removeEventListener(eventInfo[0], info.fn);
                                        eventHandlerList[eventInfo[0]].splice(idx, 1);
                                    }
                                }, true);
                            }
                        });
                    }
                });

                return this;
            }


            /**
             * [ Trigger ]
             *
             * @param eventStr
             * @param opts
             * @returns {jsuNode}
             */
            [trigger](eventStr, opts) {
                const events = eventStr.split(/\s+/g);
                events[forEach]((event) => {
                    const eventInfo = event.split(/\./);
                    const eventObj = new CustomEvent(eventInfo[0], opts);
                    this[forEach]((node) => {
                        node.dispatchEvent(eventObj);
                    });
                });

                return this;
            }


            /**
             * [ AddClass ]
             *
             * @param cl
             * @returns {jsuNode}
             */
            [addClass](cl) {
                if (typeof cl !== "object") {
                    cl = [cl];
                }

                this[forEach]((node) => {
                    cl.forEach((c) => {
                        node.classList.add(c);
                    });
                });
                return this;
            }


            /**
             * [ RemoveClass ]
             *
             * @param cl
             * @returns {jsuNode}
             */
            [removeClass](cl) {
                if (typeof cl !== "object") {
                    cl = [cl];
                }

                this[forEach]((node) => {
                    cl.forEach((c) => {
                        node.classList.remove(c);
                    });
                });
                return this;
            }


            /**
             * [ ToggleClass ]
             *
             * @param cl
             * @returns {jsuNode}
             */
            [toggleClass](cl) {
                this[forEach]((node) => {
                    node.classList.toggle(cl);
                });
                return this;
            }


            /**
             * [ HasClass ]
             *
             * @param cl
             * @returns {boolean|array}
             */
            [hasClass](cl) {
                const ret = [];
                this[forEach]((node) => {
                    ret.push(node.classList.contains(cl));
                });
                return this[nodes].length > 1 ? ret : ret[0];
            }


            /**
             *
             * @param dim
             * @param includeMargins
             * @returns {int|Array}
             */
            [private_realDimension](dim, includeMargins = false) {
                const ret = [];
                let type = "width";
                let margins = ["left", "right"];

                if (dim === "h") {
                    type = "height";
                    margins = ["top", "bottom"];
                }

                this[forEach]((node) => {
                    const boundClientRect = node.getBoundingClientRect();
                    const computedStyle = window.getComputedStyle(node);

                    let dim = parseFloat((boundClientRect[type] + "").replace(/,/g, "."));

                    if (includeMargins) {
                        margins.forEach((margin) => {
                            const value = computedStyle.getPropertyValue("margin-" + margin);
                            dim += parseFloat((value + "").replace(/,/g, "."));
                        });
                    }

                    ret.push(dim);
                });

                return this[nodes].length > 1 ? ret : ret[0];
            }


            /**
             * [ RealWidth ]
             *
             * @param includeMargins
             * @returns {int|Array}
             */
            [realWidth](includeMargins = false) {
                return this[private_realDimension]("w", includeMargins);
            }


            /**
             * [ RealHeight ]
             *
             * @param includeMargins
             * @returns {int|Array}
             */
            [realHeight](includeMargins = false) {
                return this[private_realDimension]("h", includeMargins);
            }


            /**
             * [ Find ]
             *
             * @param selector
             * @returns {jsuNode}
             */
            [find](selector) {
                const ret = [];
                this[forEach]((node) => {
                    if (node instanceof HTMLIFrameElement) {
                        ret.push(node.contentDocument.querySelectorAll(":scope " + selector));
                    } else {
                        ret.push(node.querySelectorAll(":scope " + selector));
                    }

                });

                return new jsuNode(ret);
            }


            /**
             * [ Children ]
             *
             * @param selector
             * @returns {jsuNode}
             */
            [children](selector) {
                const ret = [];
                if (!selector) {
                    selector = "*";
                }

                this[forEach]((node) => {
                    ret.push(node.querySelectorAll(":scope > " + selector));
                });

                return new jsuNode(ret);
            }


            /**
             *
             * @param content
             * @param methodName
             * @returns {string|jsuNode}
             */
            [private_htmlText](content, methodName) {
                const hasContent = h[isDefined](content);
                let ret = hasContent ? this : "";

                this[forEach]((node) => {
                    if (hasContent) {
                        node[methodName] = content;
                    } else {
                        ret += node[methodName];
                    }
                });

                return ret;
            }


            /**
             * [ Html ]
             *
             * @param content
             * @returns {string|jsuNode}
             */
            [html](content) {
                return this[private_htmlText](content, "innerHTML");
            }


            /**
             * [ Text ]
             *
             * @param content
             * @returns {string|jsuNode}
             */
            [text](content) {
                return this[private_htmlText](content, "innerText");
            }

            /**
             * [ Remove ]
             */
            [remove]() {
                this[forEach]((node) => {
                    if (node && node.parentElement) {
                        eventHandlerMap["delete"](node);
                        dataMap["delete"](node);
                        node.parentElement.removeChild(node);
                    }
                });
            }


            /**
             *
             * @param s
             * @param type
             * @param asSelector
             * @returns {jsuNode}
             */
            [private_elementMove](s, type, asSelector = true) {
                if (Array.isArray(s)) {
                    s.forEach((s) => {
                        this[private_elementMove](s, type, asSelector);
                    });
                } else {
                    if (typeof s === "string" && s.indexOf("<") > -1) {
                        asSelector = false;
                    }

                    const elmObj = new jsuNode(s, asSelector);

                    this[forEach]((node) => {
                        const clonedElmObj = jsuNode[private_clone](elmObj);
                        clonedElmObj[forEach]((elm) => {
                            switch (type) {
                                case "append": {
                                    node.appendChild(elm);
                                    break;
                                }
                                case "prepend": {
                                    node.insertBefore(elm, node.firstChild);
                                    break;
                                }
                                case "before": {
                                    node.parentNode.insertBefore(elm, node);
                                    break;
                                }
                                case "after": {
                                    node.parentNode.insertBefore(elm, node.nextSibling);
                                    break;
                                }
                            }
                        });
                    });

                    elmObj[remove]();
                }

                return this;
            }


            /**
             *
             * @param s
             * @param type
             * @returns {jsuNode}
             */
            [private_elementMoveTo](s, type) {
                const ret = [];
                const elmObj = new jsuNode(s);

                elmObj[forEach]((node) => {
                    const clonedThis = jsuNode[private_clone](this);
                    clonedThis[forEach]((elm) => {
                        switch (type) {
                            case "append": {
                                node.appendChild(elm);
                                break;
                            }
                            case "prepend": {
                                node.insertBefore(elm, node.firstChild);
                                break;
                            }
                            case "before": {
                                node.parentNode.insertBefore(elm, node);
                                break;
                            }
                            case "after": {
                                node.parentNode.insertBefore(elm, node.nextSibling);
                                break;
                            }
                        }
                        ret.push(elm);
                    });
                });

                this[remove]();

                return new jsuNode(ret);
            }

            /**
             * [ Append ]
             *
             * @param s
             * @param asSelector
             * @returns {jsuNode}
             */
            [append](s, asSelector) {
                return this[private_elementMove](s, "append", asSelector);
            }


            /**
             * [ AppendTo ]
             *
             * @param s
             * @returns {jsuNode}
             */
            [appendTo](s) {
                return this[private_elementMoveTo](s, "append");
            }


            /**
             * [ Prepend ]
             *
             * @param s
             * @param asSelector
             * @returns {jsuNode}
             */
            [prepend](s, asSelector = true) {
                return this[private_elementMove](s, "prepend", asSelector);
            }


            /**
             * [ PrependTo ]
             *
             * @param s
             * @returns {jsuNode}
             */
            [prependTo](s) {
                return this[private_elementMoveTo](s, "prepend");
            }


            /**
             * [ Before ]
             *
             * @param s
             * @param asSelector
             * @returns {jsuNode}
             */
            [before](s, asSelector = true) {
                return this[private_elementMove](s, "before", asSelector);
            }


            /**
             * [ InsertBefore ]
             *
             * @param s
             * @returns {jsuNode}
             */
            [insertBefore](s) {
                return this[private_elementMoveTo](s, "before");
            }


            /**
             * [ After ]
             *
             * @param s
             * @param asSelector
             * @returns {jsuNode}
             */
            [after](s, asSelector = true) {
                return this[private_elementMove](s, "after", asSelector);
            }


            /**
             * [ InsertAfter ]
             *
             * @param s
             * @returns {jsuNode}
             */
            [insertAfter](s) {
                return this[private_elementMoveTo](s, "after");
            }


            /**
             *
             * @param s
             * @param type
             * @returns {jsuNode}
             */
            [private_nextPrev](s, type) {
                const hasSelector = h[isDefined](s);
                const ret = [];

                this[forEach]((node) => {
                    const siblingElm = type === "prev" ? node.previousElementSibling : node.nextElementSibling;

                    if (h[isDefined](siblingElm) &&
                        (!hasSelector || (h[isDefined](siblingElm.matches) && siblingElm.matches(s)))) {
                        ret.push(siblingElm);
                    }
                });

                return new jsuNode(ret);
            }


            /**
             * [ Next ]
             *
             * @param s
             * @returns {jsuNode}
             */
            [next](s) {
                return this[private_nextPrev](s, "next");
            }


            /**
             * [ Prev ]
             *
             * @param s
             * @returns {jsuNode}
             */
            [prev](s) {
                return this[private_nextPrev](s, "prev");
            }


            /**
             *
             * @param s
             * @param type
             * @returns {jsuNode|Array}
             */
            [private_siblings](s, type = "siblings") {
                const hasSelector = h[isDefined](s);
                const ret = [];

                this[forEach]((node) => {
                    let el = null;
                    const elmList = [];

                    if (type === "siblings" && node.parentNode.firstElementChild) {
                        el = node.parentNode.firstElementChild;
                        type = "next";
                    } else if (type === "previous" || type === "next") {
                        el = node[type + "ElementSibling"];
                    }

                    while (el && el.matches) {
                        if (el !== node && (!hasSelector || el.matches(s))) {
                            elmList.push(el);
                        }
                        el = el[type + "ElementSibling"];
                    }

                    ret.push(new jsuNode(elmList));
                });

                return this[nodes].length > 1 ? new jsuNode(ret) : ret[0];
            }


            /**
             * [ Siblings ]
             *
             * @param s
             * @returns {jsuNode|Array}
             */
            [siblings](s) {
                return this[private_siblings](s);
            }


            /**
             * [ NextAll ]
             *
             * @param s
             * @returns {jsuNode|Array}
             */
            [nextAll](s) {
                return this[private_siblings](s, "next");
            }


            /**
             * [ PrevAll ]
             *
             * @param s
             * @returns {jsuNode|Array}
             */
            [prevAll](s) {
                return this[private_siblings](s, "previous");
            }


            /**
             * [ Parent ]
             *
             * @param s
             * @returns {jsuNode|Array}
             */
            [parent](s) {
                const hasSelector = h[isDefined](s);
                const ret = [];

                this[forEach]((node) => {
                    let parentElm = node.parentNode;

                    if (hasSelector && (!h[isDefined](parentElm.matches) || !parentElm.matches(s))) {
                        parentElm = null;
                    }

                    ret.push(new jsuNode(parentElm));
                });

                return this[nodes].length > 1 ? new jsuNode(ret) : ret[0];
            }


            /**
             * [ Parents ]
             *
             * @param s
             * @returns {jsuNode|Array}
             */
            [parents](s) {
                const hasSelector = h[isDefined](s);
                const ret = [];

                this[forEach]((node) => {
                    const parentsList = [];
                    let el = node.parentNode;

                    while (el && el.matches && el !== this) {
                        if (!hasSelector || el.matches(s)) {
                            parentsList.push(el);
                        }

                        el = el.parentNode;
                    }

                    ret.push(new jsuNode(parentsList));
                });

                return this[nodes].length > 1 ? new jsuNode(ret) : ret[0];
            }


            /**
             * [ Document ]
             *
             * @returns {jsuNode}
             */
            [doc]() {
                const ret = [];

                this[forEach]((node) => {
                    ret.push(new jsuNode(node.ownerDocument));
                });

                return this[nodes].length > 1 ? new jsuNode(ret) : ret[0];
            }


            /**
             * [ Eq ]
             *
             * @param idx
             * @returns {jsuNode}
             */
            [eq](idx) {
                if (idx < 0) {
                    idx = this[nodes].length + idx;
                }
                return new jsuNode(this[nodes][idx]);
            }


            /**
             * [ Get ]
             *
             * @param idx
             * @returns {Array}
             */
            [get](idx) {
                if (h[isDefined](idx)) {
                    if (idx < 0) {
                        idx = this[nodes].length + idx;
                    }
                    return this[nodes][idx];
                }

                return this[nodes];
            }


            /**
             * [ Length ]
             *
             * @returns {int}
             */
            [length]() {
                return this[nodes].length;
            }

        };
    })(jsuHelper);

    /**
     * Bind jsu to window object
     */
    (() => {
        const obj = s => new jsuNode(s);

        Object.entries(jsuTools).forEach(([name, func]) => { // append tools
            obj[name] = func;
        });

        window.jsu = obj;
    })();

})();