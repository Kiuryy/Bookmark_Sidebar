/**
 * Colorpicker.js
 *
 * Philipp König
 * https://redeviation.com/
 */
window.Colorpicker = (() => {
    "use strict";

    const DEFAULT_OPTS = {
        alpha: false,
        classes: {
            picker: "color-picker",
            preview: "color-preview",
            pickingArea: "picking-area",
            pickingAreaThumb: "picker",
            hueSlider: "hue",
            hueSliderThumb: "slider-picker",
            alphaSlider: "alpha",
            alphaSliderThumb: "slider-picker",
            inputFieldPreview: "input-",
            visible: "visible"
        }
    };

    /**
     * Color class -> Provides information about the current color of the picker
     *
     * @constructor
     */
    function Color() {
        this.r = 0;
        this.g = 0;
        this.b = 0;
        this.a = 1;
        this.hue = 0;
        this.saturation = 0;
        this.value = 0;

        /**
         * Returns whether the given value is an numeric value or not
         *
         * @param value
         * @returns {boolean}
         */
        const isNumeric = (value) => {
            return typeof value === "number" && isNaN(value) === false;
        };

        /**
         * Sets the color to the given rgba values
         *
         * @param {int} red
         * @param {int} green
         * @param {int} blue
         * @param {float} alpha
         */
        const setRGBA = (red, green, blue, alpha) => {
            if (isNumeric(red) && isNumeric(green) && isNumeric(blue)) {
                this.r = Math.max(0, Math.min(255, Math.trunc(red)));
                this.g = Math.max(0, Math.min(255, Math.trunc(green)));
                this.b = Math.max(0, Math.min(255, Math.trunc(blue)));

                if (isNumeric(alpha) === true) {
                    this.a = Math.max(0, Math.min(1, alpha));
                }
            }
        };

        /**
         * Sets the color from the given raw rgba string
         *
         * @param {string} value
         */
        const setRGBAFromRaw = (value) => {
            const digits = value.match(/(\d*\.\d*|\d+)/g);

            if (digits.length === 3) {
                digits.push(1);
            }

            if (digits.length === 4) {
                setRGBA(...digits.map((x) => {
                    return +x;
                }));
                RGBtoHSV();
            }
        };

        /**
         * Sets the color from the given raw hex string
         *
         * @param {string} value
         */
        const setHexFromRaw = (value) => {
            const valid = /(^#{0,1}[0-9A-F]{6}$)|(^#{0,1}[0-9A-F]{3}$)/i.test(value);

            if (valid) {
                if (value[0] === "#") {
                    value = value.slice(1, value.length);
                }

                if (value.length === 3) {
                    value = value.replace(/([0-9A-F])([0-9A-F])([0-9A-F])/i, "$1$1$2$2$3$3");
                }

                this.r = parseInt(value.substring(0, 2), 16);
                this.g = parseInt(value.substring(2, 4), 16);
                this.b = parseInt(value.substring(4, 6), 16);

                this.a = 1;
                RGBtoHSV();
            }
        };

        /**
         * Sets the rgb values from the hsv values
         */
        const HSVtoRGB = () => {
            const sat = this.saturation / 100;
            const value = this.value / 100;
            let C = sat * value;
            const H = this.hue / 60;
            let X = C * (1 - Math.abs(H % 2 - 1));
            let m = value - C;
            const precision = 255;

            C = Math.trunc((C + m) * precision);
            X = Math.trunc((X + m) * precision);
            m = Math.trunc(m * precision);

            if (H >= 0 && H < 1) {
                setRGBA(C, X, m);
            } else if (H >= 1 && H < 2) {
                setRGBA(X, C, m);
            } else if (H >= 2 && H < 3) {
                setRGBA(m, C, X);
            } else if (H >= 3 && H < 4) {
                setRGBA(m, X, C);
            } else if (H >= 4 && H < 5) {
                setRGBA(X, m, C);
            } else if (H >= 5 && H < 6) {
                setRGBA(C, m, X);
            }
        };

        /**
         * Sets the hsv values from the rgb values
         */
        const RGBtoHSV = () => {
            const red = this.r / 255;
            const green = this.g / 255;
            const blue = this.b / 255;

            const cmax = Math.max(red, green, blue);
            const cmin = Math.min(red, green, blue);
            const delta = cmax - cmin;
            let hue = 0;
            let saturation = 0;

            if (delta) {
                if (cmax === red) {
                    hue = ((green - blue) / delta);
                }
                if (cmax === green) {
                    hue = 2 + (blue - red) / delta;
                }
                if (cmax === blue) {
                    hue = 4 + (red - green) / delta;
                }
                if (cmax) {
                    saturation = delta / cmax;
                }
            }

            this.hue = Math.trunc(60 * hue);
            if (this.hue < 0) {
                this.hue += 360;
            }
            this.saturation = Math.trunc(saturation * 100);
            this.value = Math.trunc(cmax * 100);
        };

        /**
         * Sets the color from the given raw string
         *
         * @param {string} value
         */
        this.setFromRaw = (value) => {
            value = value.trim();

            if (value === "transparent") {
                this.r = 0;
                this.g = 0;
                this.b = 0;
                this.a = 0;
                RGBtoHSV();
            } else if (/(^#{0,1}[0-9A-F]{6}$)|(^#{0,1}[0-9A-F]{3}$)/i.test(value)) {
                setHexFromRaw(value);
            } else if (/^rgba?\([^)]+\)$/i.test(value)) {
                setRGBAFromRaw(value);
            }
        };

        /**
         * Sets the given rgb value to the given value
         *
         * @param {string} name "r", "g", "b" or "a"
         * @param {int|float} value
         */
        this.setByName = (name, value) => {
            if ((name === "r" || name === "g" || name === "b" || name === "a") && isNumeric(value)) {
                let maxLimit = 1;

                if (name !== "a") {
                    value = Math.trunc(value);
                    maxLimit = 255;
                }

                this[name] = Math.max(0, Math.min(maxLimit, value));
                RGBtoHSV();
            }
        };

        /**
         * Sets the color to the given hsv values
         *
         * @param {int} hue
         * @param {int} saturation
         * @param {int} value
         */
        this.setHSV = (hue, saturation, value) => {
            if (isNumeric(hue) && isNumeric(saturation) && isNumeric(value)) {
                this.hue = Math.max(0, Math.min(360, hue));
                this.saturation = Math.max(0, Math.min(100, saturation));
                this.value = Math.max(0, Math.min(100, value));
                HSVtoRGB();
            }
        };

        /**
         * Sets the hue value for the color
         *
         * @param {int} value
         */
        this.setHue = (value) => {
            if (isNumeric(value)) {
                this.hue = Math.max(0, Math.min(360, value));
                HSVtoRGB();
            }
        };

        /**
         * Returns the hex string of the color
         *
         * @returns {string} e.g. "#ffaa00"
         */
        this.getHex = () => {
            let r = this.r.toString(16);
            let g = this.g.toString(16);
            let b = this.b.toString(16);
            if (this.r < 16) {
                r = "0" + r;
            }
            if (this.g < 16) {
                g = "0" + g;
            }
            if (this.b < 16) {
                b = "0" + b;
            }
            const value = "#" + r + g + b;
            return value.toLowerCase();
        };

        /**
         * Returns the color string
         *
         * @returns {string} e.g. "#ffaa00" or "rgba(255,255,255,0.5)"
         */
        this.getColor = () => {
            if (Math.trunc(this.a) === 1) { // no alpha channel -> return as hex string
                return this.getHex();
            }

            const rgb = "(" + this.r + "," + this.g + "," + this.b;
            let a = "";
            let v = "";
            const x = parseFloat(this.a);
            if (x !== 1) {
                a = "a";
                v = "," + x;
            }

            return "rgb" + a + rgb + v + ")";
        };
    }


    /**
     * Picker class -> Adds a colorpicker for the given field with the given options
     *
     * @param {Element} field
     * @param {object} opts
     * @constructor
     */
    function Picker(field, opts) {
        let wrapper = null;
        let preview = null;
        let alpha = null;
        const subscribers = [];
        const callbacks = {};
        this.color = new Color();

        /**
         * Initialize the picker object
         */
        const init = () => {
            opts = getOpts(opts);

            initPreview();
            initPickingArea();
            initHueSlider();

            const rgbFields = ["r", "g", "b"];

            if (opts.alpha) {
                initAlphaSlider();
                rgbFields.push("a");
            }

            rgbFields.forEach((c) => {
                addInputField(c, (e) => {
                    let val = e.target.value;

                    if (c === "a") {
                        val = +val.replace(/,/g, ".");
                    } else {
                        val = parseInt(val);
                    }

                    this.color.setByName(c, val);
                    e.target.value = this.color[c];
                    updateUI();
                });
            });

            addInputField("color", (e) => {
                const value = e.target.value;
                this.color.setFromRaw(value);
                updateUI();
            });

            updateUI();
        };

        const getOpts = (obj) => {
            const merge = (target, source) => {
                for (const key of Object.keys(source)) { // Iterate through source and if a key is an object, set the property to a merge of target and source
                    if (source[key] instanceof Object) {
                        Object.assign(source[key], merge(target[key], source[key]));
                    }
                }
                Object.assign(target || {}, source);
                return target;
            };

            return merge(Object.assign({}, DEFAULT_OPTS), obj || {});
        };

        /**
         * Adds the mousedown/mouseup listener for the given element
         *
         * @param {Element} elm
         * @param {function} callback
         */
        const addMouseListener = (elm, callback) => {
            elm.addEventListener("mousedown", (e) => {
                callback(e);
                document.addEventListener("mousemove", callback);
            });

            document.addEventListener("mouseup", () => {
                document.removeEventListener("mousemove", callback);
            });
        };

        /**
         * Initialises the picker html and binds the general eventhandlers
         */
        const initPreview = () => {
            wrapper = document.createElement("div");
            wrapper.className = opts.classes.picker;
            document.body.appendChild(wrapper);

            preview = document.createElement("span");
            preview.className = opts.classes.preview;
            field.parentNode.insertBefore(preview, field.nextSibling);

            field.ownerDocument.defaultView.addEventListener("resize", () => {
                this.reposition();
            });

            preview.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.show();
            });

            document.addEventListener("click", (e) => {
                if (e.target !== wrapper && !wrapper.contains(e.target)) {
                    this.close();
                }
            });
        };

        /**
         * Initialises the picking area
         */
        const initPickingArea = () => {
            const area = document.createElement("div");
            const picker = document.createElement("div");

            area.className = opts.classes.pickingArea;
            picker.className = opts.classes.pickingAreaThumb;

            this.pickingArea = area;
            this.colorPicker = picker;
            addMouseListener(area, (e) => {
                const rect = this.pickingArea.getBoundingClientRect();

                const offset = 5;
                const size = this.pickingArea.clientWidth;
                const pos = [e.pageX - rect.left, e.pageY - rect.top];

                pos.forEach((v, k) => {
                    if (v > size) {
                        v = size;
                    }
                    if (v < 0) {
                        v = 0;
                    }
                    pos[k] = v;
                });

                const saturation = Math.trunc(pos[0] * 100 / size);
                const value = 100 - Math.trunc(pos[1] * 100 / size);

                this.color.setHSV(this.color.hue, saturation, value);

                this.colorPicker.style.left = pos[0] - offset + "px";
                this.colorPicker.style.top = pos[1] - offset + "px";

                updateAlphaGradient();
                updatePreview();
                notifyAll();
            });

            area.appendChild(picker);
            wrapper.appendChild(area);
        };

        /**
         * Initialises the hue slider
         */
        const initHueSlider = () => {
            const area = document.createElement("div");
            const picker = document.createElement("div");

            area.className = opts.classes.hueSlider;
            picker.className = opts.classes.hueSliderThumb;

            this.hueArea = area;
            this.huePicker = picker;
            addMouseListener(area, (e) => {
                const rect = this.hueArea.getBoundingClientRect();
                let x = Math.max(0, e.pageX - rect.left);
                const width = this.hueArea.clientWidth;

                if (x > width) {
                    x = width;
                }

                this.huePicker.style.left = Math.max(x - 3, -2) + "px";
                this.color.setHue(Math.trunc((359 * x) / width));

                updateUI();
            });

            area.appendChild(picker);
            wrapper.appendChild(area);
        };

        /**
         * Initialises the alpha slider
         */
        const initAlphaSlider = () => {
            const area = document.createElement("div");
            const mask = document.createElement("div");
            const picker = document.createElement("div");

            area.className = opts.classes.alphaSlider;
            picker.className = opts.classes.alphaSliderThumb;

            alpha = {
                area: area,
                mask: mask,
                picker: picker
            };

            addMouseListener(area, (e) => {
                const rect = alpha.area.getBoundingClientRect();
                let x = e.pageX - rect.left;
                const width = alpha.area.clientWidth;

                if (x < 0) {
                    x = 0;
                }
                if (x > width) {
                    x = width;
                }

                this.color.setByName("a", +(x / width).toFixed(2));

                alpha.picker.style.left = Math.max(x - 3, -2) + "px";
                updatePreview();

                notifyAll();
            });

            area.appendChild(mask);
            mask.appendChild(picker);
            wrapper.appendChild(area);
        };

        /**
         * Initialises an input field of the given type
         *
         * @param {string} type
         * @param {function} func
         */
        const addInputField = (type, func) => {
            const elm = document.createElement("div");
            const input = document.createElement("input");
            const info = document.createElement("span");

            elm.className = opts.classes.inputFieldPreview + type;
            info.textContent = type;
            input.setAttribute("type", "text");

            elm.appendChild(info);
            elm.appendChild(input);
            wrapper.appendChild(elm);

            input.addEventListener("change", func);

            subscribers[type] = (value) => {
                input.value = value;
            };
        };

        /**
         * Updates the positions of the ui elements
         */
        const updateUI = () => {
            notifyAll();

            updateHuePicker();
            updatePickerBackground();
            updatePickerPosition();
            updateAlphaPicker();
            updateAlphaGradient();
            updatePreview();
        };

        /**
         * Updated the position of the picker based on the currently selected color
         */
        const updatePickerPosition = () => {
            const size = this.pickingArea.clientWidth;
            const value = this.color.value;
            const offset = 5;

            const x = Math.trunc(this.color.saturation * size / 100);
            const y = size - Math.trunc(value * size / 100);

            this.colorPicker.style.left = x - offset + "px";
            this.colorPicker.style.top = y - offset + "px";
        };

        /**
         * Updates the hue slider thumb position
         */
        const updateHuePicker = () => {
            const size = this.hueArea.clientWidth;
            const offset = 1;
            const pos = Math.trunc(this.color.hue * size / 360);
            this.huePicker.style.left = pos - offset + "px";
        };

        /**
         * Updates the alpha slider thumb position
         */
        const updateAlphaPicker = () => {
            if (alpha) {
                const size = alpha.area.clientWidth;
                const offset = 1;
                const pos = Math.trunc(this.color.a * size);
                alpha.picker.style.left = pos - offset + "px";
            }
        };

        /**
         * Updates the background color of the picking area
         */
        const updatePickerBackground = () => {
            const nc = new Color();
            nc.setHSV(this.color.hue, 100, 100);
            this.pickingArea.style.backgroundColor = nc.getHex();
        };

        /**
         * Updates the background color of the alpha slider
         */
        const updateAlphaGradient = () => {
            if (alpha) {
                alpha.mask.style.background = "linear-gradient(to right, transparent 0%," + this.color.getHex() + " 100%)";
            }
        };

        /**
         * Updates the color of the preview
         */
        const updatePreview = () => {
            field.value = this.color.getColor();
            preview.style.backgroundColor = this.color.getColor();
            triggerEvent("change");
        };

        /**
         * Triggers an event of the given type
         *
         * @param {string} type
         */
        const triggerEvent = (type) => {
            if (typeof callbacks[type] !== "undefined") {
                callbacks[type].forEach((func) => {
                    func({
                        color: this.color.getColor(),
                        colorObj: this.color,
                        elm: this.getElements()
                    });
                });
            }
        };

        /**
         * Sends all notifications to the subscribers
         */
        const notifyAll = () => {
            notify("r", this.color.r);
            notify("g", this.color.g);
            notify("b", this.color.b);
            notify("a", this.color.a);
            notify("color", this.color.getColor());
        };

        /**
         * Sends a notifications for the given topic to all subscribers
         *
         * @param {string} topic
         * @param {string} value
         */
        const notify = (topic, value) => {
            if (subscribers[topic]) {
                subscribers[topic](value);
            }
        };

        /**
         * Sets the color of the picker
         *
         * @public
         * @param {string} c
         */
        this.setColor = (c) => {
            this.color.setFromRaw(c);
            updateUI();
        };

        /**
         * Returns the color object of the picker
         *
         * @public
         * @returns {Color}
         */
        this.getColorObj = () => {
            return this.color;
        };

        /**
         * Returns the ui elements
         *
         * @public
         * @returns {object}
         */
        this.getElements = () => {
            return {
                wrapper: wrapper,
                preview: preview,
                field: field
            };
        };

        /**
         * Updates the position of the color picker in the document
         *
         * @public
         */
        this.reposition = () => {
            if (wrapper.classList.contains(opts.classes.visible)) {
                const isRtl = document.documentElement.getAttribute("dir") === "rtl";
                const rect = preview.getBoundingClientRect();

                const leftDefaults = {
                    l: rect.left,
                    r: rect.left - wrapper.offsetWidth + preview.offsetWidth
                };

                const pos = ["bottom", isRtl ? "right" : "left"];
                let top = rect.top + preview.offsetHeight;
                let left = leftDefaults[isRtl ? "r" : "l"];

                if (wrapper.offsetHeight + top > window.innerHeight) {
                    top = rect.top - wrapper.offsetHeight;
                    pos[0] = "top";
                }

                if (wrapper.offsetWidth + left > window.innerWidth) {
                    left = leftDefaults.r;
                    pos[1] = "right";
                }

                if (left < 0) {
                    left = leftDefaults.l;
                    pos[1] = "left";
                }

                wrapper.setAttribute("data-pos", pos.join("-"));
                wrapper.style.top = top + "px";
                wrapper.style.left = left + "px";
            }
        };

        /**
         * Opens the colorpicker
         *
         * @public
         */
        this.show = () => {
            [].forEach.call(document.getElementsByClassName(opts.classes.picker), (elm) => {
                elm.classList.remove(opts.classes.visible);
            });

            wrapper.classList.add(opts.classes.visible);
            this.reposition();
            triggerEvent("show");
            updateUI();
        };

        /**
         * Closes the colorpicker
         *
         * @public
         */
        this.close = () => {
            if (wrapper.classList.contains(opts.classes.visible)) {
                triggerEvent("hide");
                wrapper.classList.remove(opts.classes.visible);
            }
        };

        /**
         * Binds an event of the given type to the picker object
         *
         * @public
         * @param {string} type
         * @param {function} func
         */
        this.on = (type, func) => {
            if (typeof callbacks[type] === "undefined") {
                callbacks[type] = [];
            }

            callbacks[type].push(func);
        };

        /**
         * Execute constructor
         */
        init();
    }

    return Picker;
})();