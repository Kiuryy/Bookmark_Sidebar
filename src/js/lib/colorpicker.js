/**
 * Colorpicker.js
 *
 * Philipp König
 * https://blockbyte.de
 */
window.Colorpicker = (() => {
    "use strict";

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
         * @param {int} value
         * @returns {boolean}
         */
        let isNumeric = (value) => {
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
        let setRGBA = (red, green, blue, alpha) => {
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
        let setRGBAFromRaw = (value) => {
            let digits = value.match(/(\d*\.\d*|\d+)/g);

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
        let setHexFromRaw = (value) => {
            let valid = /(^#{0,1}[0-9A-F]{6}$)|(^#{0,1}[0-9A-F]{3}$)/i.test(value);

            if (valid) {
                if (value[0] === "#") {
                    value = value.slice(1, value.length);
                }

                if (value.length === 3) {
                    value = value.replace(/([0-9A-F])([0-9A-F])([0-9A-F])/i, "$1$1$2$2$3$3");
                }

                this.r = parseInt(value.substr(0, 2), 16);
                this.g = parseInt(value.substr(2, 2), 16);
                this.b = parseInt(value.substr(4, 2), 16);

                this.a = 1;
                RGBtoHSV();
            }
        };

        /**
         * Sets the rgb values from the hsv values
         */
        let HSVtoRGB = () => {
            let sat = this.saturation / 100;
            let value = this.value / 100;
            let C = sat * value;
            let H = this.hue / 60;
            let X = C * (1 - Math.abs(H % 2 - 1));
            let m = value - C;
            let precision = 255;

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
        let RGBtoHSV = () => {
            let red = this.r / 255;
            let green = this.g / 255;
            let blue = this.b / 255;

            let cmax = Math.max(red, green, blue);
            let cmin = Math.min(red, green, blue);
            let delta = cmax - cmin;
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
            let value = "#" + r + g + b;
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

            let rgb = "(" + this.r + "," + this.g + "," + this.b;
            let a = "";
            let v = "";
            let x = parseFloat(this.a);
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
        opts = opts || {};
        let wrapper = null;
        let preview = null;
        let alpha = null;
        let subscribers = [];
        let callbacks = {};
        this.color = new Color();

        /**
         * Initialize the picker object
         */
        let init = () => {
            initPreview();
            initPickingArea();
            initHueSlider();

            let rgbFields = ["r", "g", "b"];

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
                let value = e.target.value;
                this.color.setFromRaw(value);
                updateUI();
            });

            updateUI();
        };

        /**
         * Adds the mousedown/mouseup listener for the given element
         *
         * @param {Element} elm
         * @param {function} callback
         */
        let addMouseListener = (elm, callback) => {
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
        let initPreview = () => {
            wrapper = document.createElement("div");
            wrapper.className = "color-picker";
            document.body.appendChild(wrapper);

            preview = document.createElement("span");
            preview.className = "color-preview";
            field.parentNode.insertBefore(preview, field.nextSibling);

            preview.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                [].forEach.call(document.getElementsByClassName("color-picker"), (elm) => {
                    elm.classList.remove("visible");
                });

                wrapper.classList.add("visible");
                this.reposition();
                triggerEvent("show");
                updateUI();
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
        let initPickingArea = () => {
            let area = document.createElement("div");
            let picker = document.createElement("div");

            area.className = "picking-area";
            picker.className = "picker";

            this.pickingArea = area;
            this.colorPicker = picker;
            addMouseListener(area, (e) => {
                let rect = this.pickingArea.getBoundingClientRect();

                let offset = 5;
                let size = this.pickingArea.clientWidth;
                let pos = [e.pageX - rect.left, e.pageY - rect.top];

                pos.forEach((v, k) => {
                    if (v > size) {
                        v = size;
                    }
                    if (v < 0) {
                        v = 0;
                    }
                    pos[k] = v;
                });

                let saturation = Math.trunc(pos[0] * 100 / size);
                let value = 100 - Math.trunc(pos[1] * 100 / size);

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
        let initHueSlider = () => {
            let area = document.createElement("div");
            let picker = document.createElement("div");

            area.className = "hue";
            picker.className = "slider-picker";

            this.hueArea = area;
            this.huePicker = picker;
            addMouseListener(area, (e) => {
                let rect = this.hueArea.getBoundingClientRect();
                let x = Math.max(0, e.pageX - rect.left);
                let width = this.hueArea.clientWidth;

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
        let initAlphaSlider = () => {
            let area = document.createElement("div");
            let mask = document.createElement("div");
            let picker = document.createElement("div");

            area.className = "alpha";
            mask.className = "alpha-mask";
            picker.className = "slider-picker";

            alpha = {
                area: area,
                mask: mask,
                picker: picker
            };

            addMouseListener(area, (e) => {
                let rect = alpha.area.getBoundingClientRect();
                let x = e.pageX - rect.left;
                let width = alpha.area.clientWidth;

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
        let addInputField = (type, func) => {
            let elm = document.createElement("div");
            let input = document.createElement("input");
            let info = document.createElement("span");

            elm.className = "input-" + type;
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
        let updateUI = () => {
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
        let updatePickerPosition = () => {
            let size = this.pickingArea.clientWidth;
            let value = this.color.value;
            let offset = 5;

            let x = Math.trunc(this.color.saturation * size / 100);
            let y = size - Math.trunc(value * size / 100);

            this.colorPicker.style.left = x - offset + "px";
            this.colorPicker.style.top = y - offset + "px";
        };

        /**
         * Updates the hue slider thumb position
         */
        let updateHuePicker = () => {
            let size = this.hueArea.clientWidth;
            let offset = 1;
            let pos = Math.trunc(this.color.hue * size / 360);
            this.huePicker.style.left = pos - offset + "px";
        };

        /**
         * Updates the alpha slider thumb position
         */
        let updateAlphaPicker = () => {
            if (alpha) {
                let size = alpha.area.clientWidth;
                let offset = 1;
                let pos = Math.trunc(this.color.a * size);
                alpha.picker.style.left = pos - offset + "px";
            }
        };

        /**
         * Updates the background color of the picking area
         */
        let updatePickerBackground = () => {
            let nc = new Color();
            nc.setHSV(this.color.hue, 100, 100);
            this.pickingArea.style.backgroundColor = nc.getHex();
        };

        /**
         * Updates the background color of the alpha slider
         */
        let updateAlphaGradient = () => {
            if (alpha) {
                alpha.mask.style.background = "linear-gradient(to right, transparent 0%," + this.color.getHex() + " 100%)";
            }
        };

        /**
         * Updates the color of the preview
         */
        let updatePreview = () => {
            field.value = this.color.getColor();
            preview.style.backgroundColor = this.color.getColor();
            triggerEvent("change");
        };

        /**
         * Triggers an event of the given type
         *
         * @param {string} type
         */
        let triggerEvent = (type) => {
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
        let notifyAll = () => {
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
        let notify = (topic, value) => {
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
            if (wrapper.classList.contains("visible")) {
                let rect = preview.getBoundingClientRect();
                wrapper.style.top = (rect.top + preview.offsetHeight) + "px";
                wrapper.style.left = rect.left + "px";
            }
        };

        /**
         * Closes the color picker
         *
         * @public
         */
        this.close = () => {
            if (wrapper.classList.contains("visible")) {
                triggerEvent("hide");
                wrapper.classList.remove("visible");
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