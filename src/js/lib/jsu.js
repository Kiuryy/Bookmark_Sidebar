/**
 * jsu v1.0.3
 *
 * Philipp König
 * https://moonware.de/
 *
 */
(() => {
    "use strict";

    // >>> Global Methods
    let isDefined = "isDefined";
    let forEach = "forEach";
    // <<< Global Methods

    let jsuHelper = (() => {
        return class {
            static [isDefined](v) {
                return typeof v !== "undefined" && v !== null;
            }

            static [forEach](list, callback, reverse = false) {
                let listLength = list.length;

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
        }
    })();


    /**
     * jsuNode
     */
    let jsuNode = ((h) => {
        let d = document;
        let eventHandlerMap = new WeakMap();
        let dataMap = new WeakMap();
        let nodes = Symbol();

        // >>> Methods
        let private_fillNodes = "_fillNodeList";

        let doc = "document";

        let eq = "eq";
        let get = "get";

        let length = "length";

        let remove = "remove";

        let private_addEventListener = "_addEventListener";
        let private_cloneEventListener = "_cloneEventListener";
        let private_addData = "_addData";
        let private_cloneData = "_cloneData";
        let private_clone = "_cloneElement";

        let clone = "clone";

        let on = "on";
        let off = "off";
        let trigger = "trigger";

        let find = "find";
        let children = "children";

        let private_htmlText = "_htmlText";
        let html = "html";
        let text = "text";

        let data = "data";
        let removeData = "removeData";

        let css = "css";

        let attr = "attr";
        let removeAttr = "removeAttr";

        let addClass = "addClass";
        let removeClass = "removeClass";
        let toggleClass = "toggleClass";
        let hasClass = "hasClass";

        let private_elementMove = "_moveElement";
        let private_elementMoveTo = "_moveElementTo";
        let append = "append";
        let prepend = "prepend";
        let appendTo = "appendTo";
        let prependTo = "prependTo";
        let after = "after";
        let before = "before";
        let insertAfter = "insertAfter";
        let insertBefore = "insertBefore";

        let private_nextPrev = "_nextPrev";
        let next = "next";
        let prev = "prev";
        let private_siblings = "_siblings";
        let siblings = "siblings";
        let nextAll = "nextAll";
        let prevAll = "prevAll";

        let parent = "parent";
        let parents = "parents";

        let private_realDimension = "_realDimension";
        let realWidth = "realWidth";
        let realHeight = "realHeight";
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

                if (typeof param === "string" && (asSelector === false || param.search("<") > -1)) {
                    let div = d.createElement('div');
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
                        let eachCallback = (node) => {
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
             * @returns {mixed|jsuNode}
             */
            [css](opts, val) {
                let isSetter = true;
                let hasOpts = h[isDefined](opts);
                let hasVal = h[isDefined](val);
                let ret = [];

                this[forEach]((node) => {
                    if (hasOpts && hasVal && typeof opts === "string") { // set
                        node.style[opts] = val;
                    } else if (hasOpts) {
                        if (typeof opts === "string") { // get specific
                            ret.push(window.getComputedStyle(node)[opts]);
                            isSetter = false;
                        } else if (typeof opts === "object") { // set by object
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
             * @returns {mixed|jsuNode}
             */
            [attr](opts, val) {
                let isSetter = true;
                let hasOpts = h[isDefined](opts);
                let hasVal = h[isDefined](val);
                let ret = [];

                this[forEach]((node) => {
                    let setAttr = (key, val) => {
                        if (h[isDefined](node[key])) {
                            node[key] = val;
                        } else {
                            node.setAttribute(key, val);
                        }
                    };

                    let getAttr = (key) => {
                        return h[isDefined](node[key]) ? node[key] : node.getAttribute(key);
                    };


                    if (hasOpts && hasVal && typeof opts === "string") { // set
                        setAttr(opts, val);
                    } else if (hasOpts) {
                        if (typeof opts === "string") { // get specific
                            ret.push(getAttr(opts));
                            isSetter = false;
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
                let eventHandlerList = eventHandlerMap.get(elm);

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
                let dataList = dataMap.get(elm);

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
                let clonedList = [];

                elmObj[forEach]((elm) => {
                    let clonedElm = elm.cloneNode(true);
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
             * @returns {mixed|jsuNode}
             */
            [data](key, val) {
                let isSetter = true;
                let hasKey = h[isDefined](key);
                let hasVal = h[isDefined](val);
                let ret = [];

                this[forEach]((node) => {
                    let elmDataList = dataMap.get(node);
                    let hasData = h[isDefined](elmDataList);

                    if (hasKey && hasVal) { // set
                        jsuNode[private_addData](node, key, val);
                    } else if (hasKey) {

                        if (typeof key === "string") { // get specific
                            ret.push(hasData ? elmDataList[key] : undefined);
                            isSetter = false;
                        } else if (typeof key === "object") { // set by object
                            Object.keys(key)[forEach]((k) => {
                                if (typeof k === "string") {
                                    jsuNode[private_addData](node, k, key[k]);
                                }
                            });
                        }
                    } else { // get all
                        ret.push(hasData ? elmDataList : {});
                        isSetter = false;
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
                let removeAll = !h[isDefined](key);

                this[forEach]((node) => {
                    let elmDataList = dataMap.get(node);

                    if (h[isDefined](elmDataList)) {
                        if (removeAll) { // remove all
                            dataMap.delete(node);
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
                let x = 0;
                let updateEventObject = (e, overrideObj) => {
                    Object.keys(overrideObj)[forEach]((key) => {
                        try {
                            Object.defineProperty(e, key, {
                                value: overrideObj[key]
                            });
                        } catch (ex) {


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

                let eventDelegation = typeof callbackOrElm === "string";

                this[forEach]((node) => {
                    let events = eventStr.split(/\s+/g);
                    events[forEach]((event) => {

                        let fn = (e) => {
                            updateEventObject(e, {type: event});

                            if (eventDelegation) { // event delegation
                                h[forEach](node.querySelectorAll(":scope " + callbackOrElm), (element) => {
                                    let el = e.target;
                                    while (el && el !== node) {
                                        if (el === element) {
                                            let clonedEventObj = new MouseEvent(event, e);
                                            updateEventObject(clonedEventObj, {
                                                preventDefault: () => {
                                                    e.preventDefault()
                                                },
                                                stopPropagation: () => {
                                                    e.stopPropagation()
                                                },
                                                target: e.target,
                                                currentTarget: el
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
                            event: event,
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
                    let eventHandlerList = eventHandlerMap.get(node);

                    if (h[isDefined](eventHandlerList)) {

                        let events = eventStr.split(/\s+/g);
                        events[forEach]((event) => {
                            if (eventHandlerList[event]) {
                                h[forEach](eventHandlerList[event], (info, idx) => {
                                    node.removeEventListener(event, info.fn);
                                    eventHandlerList[event].splice(idx, 1);
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
                let events = eventStr.split(/\s+/g);
                events[forEach]((event) => {
                    let eventObj = new Event(event, opts);
                    this[forEach]((node) => {
                        node.dispatchEvent(eventObj);
                    });
                });

                return this;
            };


            /**
             * [ AddClass ]
             *
             * @param cl
             * @returns {jsuNode}
             */
            [addClass](cl) {
                this[forEach]((node) => {
                    node.classList.add(cl);
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
                this[forEach]((node) => {
                    node.classList.remove(cl);
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
                let ret = [];
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
                let ret = [];
                let type = "width";
                let margins = ["left", "right"];

                if (dim === "h") {
                    type = "height";
                    margins = ["top", "bottom"];
                }

                this[forEach]((node) => {
                    let boundClientRect = node.getBoundingClientRect();
                    let computedStyle = window.getComputedStyle(node);

                    let dim = boundClientRect[type];
                    if (includeMargins) {
                        dim += parseInt(computedStyle.getPropertyValue('margin-' + margins[0]));
                        dim += parseInt(computedStyle.getPropertyValue('margin-' + margins[1]));
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
                let ret = [];
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
                let ret = [];
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
                let hasContent = h[isDefined](content);
                let ret = hasContent ? this : "";

                this[forEach]((node) => {
                    if (hasContent) {
                        node[methodName] = content;
                    } else {
                        ret += node[methodName];
                    }
                });

                return ret;
            };


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
                        eventHandlerMap.delete(node);
                        dataMap.delete(node);
                        node.parentElement.removeChild(node);
                    }
                });
            }


            /**
             *
             * @param s
             * @param asSelector
             * @param type
             * @returns {jsuNode}
             */
            [private_elementMove](s, asSelector = true, type) {
                if (typeof s === "string" && s.search("<") > -1) {
                    asSelector = false;
                }

                let elmObj = new jsuNode(s, asSelector);

                this[forEach]((node) => {
                    let clonedElmObj = jsuNode[private_clone](elmObj);
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

                return this;
            }


            /**
             *
             * @param s
             * @param type
             * @returns {jsuNode}
             */
            [private_elementMoveTo](s, type) {
                let ret = [];
                let elmObj = new jsuNode(s);

                elmObj[forEach]((node) => {
                    let clonedThis = jsuNode[private_clone](this);
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
                return this[private_elementMove](s, asSelector, "append");
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
                return this[private_elementMove](s, asSelector, "prepend");
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
                return this[private_elementMove](s, asSelector, "before");
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
                return this[private_elementMove](s, asSelector, "after");
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
                let hasSelector = h[isDefined](s);
                let ret = [];

                this[forEach]((node) => {
                    let siblingElm = type === "prev" ? node.previousElementSibling : node.nextElementSibling;

                    if (h[isDefined](siblingElm)
                        && (!hasSelector || (h[isDefined](siblingElm.matches) && siblingElm.matches(s)))) {
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
                let hasSelector = h[isDefined](s);
                let ret = [];

                this[forEach]((node) => {
                    let el = null;
                    let elmList = [];

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

                return this[nodes].length > 1 ? ret : ret[0];
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
                let hasSelector = h[isDefined](s);
                let ret = [];

                this[forEach]((node) => {
                    let parentElm = node.parentNode;

                    if (hasSelector && (!h[isDefined](parentElm.matches) || !parentElm.matches(s))) {
                        parentElm = null;
                    }

                    ret.push(new jsuNode(parentElm));
                });

                return this[nodes].length > 1 ? ret : ret[0];
            }


            /**
             * [ Parents ]
             *
             * @param s
             * @returns {jsuNode|Array}
             */
            [parents](s) {
                let hasSelector = h[isDefined](s);
                let ret = [];

                this[forEach]((node) => {
                    let parentsList = [];
                    let el = node.parentNode;

                    while (el && el.matches && el !== this) {
                        if (!hasSelector || el.matches(s)) {
                            parentsList.push(el);
                        }

                        el = el.parentNode;
                    }

                    ret.push(new jsuNode(parentsList));
                });

                return this[nodes].length > 1 ? ret : ret[0];
            }


            /**
             * [ Document ]
             *
             * @returns {jsuNode}
             */
            [doc]() {
                let ret = [];

                this[forEach]((node) => {
                    ret.push(new jsuNode(node.ownerDocument));
                });

                return this[nodes].length > 1 ? ret : ret[0];
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

        }
    })(jsuHelper);


    window.jsu = function (s) {
        return new jsuNode(s);
    }

})();