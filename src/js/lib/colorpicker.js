/**
 * Colorpicker v1.0.0
 *
 * Philipp König
 * https://blockbyte.de/
 *
 * based on https://codepen.io/yep/pen/PGJNYv
 */
window.Colorpicker = (() => {
    "use strict";

    /*====================*/
    // Color Class
    /*====================*/
    function Color() {
        this.r = 0;
        this.g = 0;
        this.b = 0;
        this.a = 1;
        this.hue = 0;
        this.saturation = 0;
        this.value = 0;

        let isValidRGBValue = (value) => {
            return typeof(value) === 'number' && isNaN(value) === false && value >= 0 && value <= 255;
        };

        /*========== Methods to set Color Properties ==========*/

        let setRGBA = (red, green, blue, alpha) => {
            if (isValidRGBValue(red) && isValidRGBValue(green) && isValidRGBValue(blue)) {
                this.r = red | 0;
                this.g = green | 0;
                this.b = blue | 0;

                if (isValidRGBValue(alpha) === true) {
                    this.a = alpha;
                }
            }
        };

        this.setByName = (name, value) => {
            if ((name === 'r' || name === 'g' || name === 'b') && isValidRGBValue(value)) {
                this[name] = value;
                RGBtoHSV();
            }
        };

        this.setHSV = (hue, saturation, value) => {
            this.hue = hue;
            this.saturation = saturation;
            this.value = value;
            HSVtoRGB();
        };

        this.setHue = (value) => {
            if (typeof(value) !== 'number' || isNaN(value) === true ||
                value < 0 || value > 359) {
                return;
            }
            this.hue = value;
            HSVtoRGB();
        };

        this.setFromRaw = (value) => {
            value = value.trim();

            if (/(^#{0,1}[0-9A-F]{6}$)|(^#{0,1}[0-9A-F]{3}$)/i.test(value)) {
                setHexFromRaw(value);
            } else if (/^rgba?\([^)]+\)$/i.test(value)) {
                setRGBAFromRaw(value);
            }
        };

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

        let setHexFromRaw = (value) => {
            let valid = /(^#{0,1}[0-9A-F]{6}$)|(^#{0,1}[0-9A-F]{3}$)/i.test(value);

            if (valid) {
                if (value[0] === '#') {
                    value = value.slice(1, value.length);
                }

                if (value.length === 3) {
                    value = value.replace(/([0-9A-F])([0-9A-F])([0-9A-F])/i, '$1$1$2$2$3$3');
                }

                this.r = parseInt(value.substr(0, 2), 16);
                this.g = parseInt(value.substr(2, 2), 16);
                this.b = parseInt(value.substr(4, 2), 16);

                this.a = 1;
                RGBtoHSV();
            }
        };

        /*========== Update Methods ==========*/

        let HSVtoRGB = () => {
            let sat = this.saturation / 100;
            let value = this.value / 100;
            let C = sat * value;
            let H = this.hue / 60;
            let X = C * (1 - Math.abs(H % 2 - 1));
            let m = value - C;
            let precision = 255;

            C = (C + m) * precision | 0;
            X = (X + m) * precision | 0;
            m = m * precision | 0;

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

            this.hue = 60 * hue | 0;
            if (this.hue < 0) {
                this.hue += 360;
            }
            this.saturation = (saturation * 100) | 0;
            this.value = (cmax * 100) | 0;
        };


        /*========== Get Methods ==========*/

        this.getHex = () => {
            let r = this.r.toString(16);
            let g = this.g.toString(16);
            let b = this.b.toString(16);
            if (this.r < 16) {
                r = '0' + r;
            }
            if (this.g < 16) {
                g = '0' + g;
            }
            if (this.b < 16) {
                b = '0' + b;
            }
            let value = '#' + r + g + b;
            return value.toLowerCase();
        };

        this.getColor = () => {
            if (this.a | 0 === 1) {
                return this.getHex();
            }

            let rgb = '(' + this.r + ',' + this.g + ',' + this.b;
            let a = '';
            let v = '';
            let x = parseFloat(this.a);
            if (x !== 1) {
                a = 'a';
                v = ',' + x;
            }

            return 'rgb' + a + rgb + v + ')';
        };
    }


    /*====================*/
    // Picker Class
    /*====================*/
    return function (field, opts) {
        opts = opts || {};
        let wrapper = null;
        let preview = null;
        let alpha = null;
        let subscribers = [];
        let callbacks = {};
        this.color = new Color();

        /**
         * Initialize
         */
        let run = () => {
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
                    let val = parseInt(e.target.value);
                    this.color.setByName(c, val);
                    e.target.value = this.color[c];
                    updateUI();
                });
            });

            addInputField('color', (e) => {
                let value = e.target.value;
                this.color.setFromRaw(value);
                updateUI();
            });

            updateUI();
        };

        /*========== Capture Mouse Movement ==========*/

        let setMouseTracking = (elm, callback) => {
            elm.addEventListener('mousedown', (e) => {
                callback(e);
                document.addEventListener('mousemove', callback);
            });

            document.addEventListener('mouseup', (e) => {
                document.removeEventListener('mousemove', callback);
            });
        };

        /*************************************************************************/
        //				Function for generating the color-picker
        /*************************************************************************/

        let initPreview = () => {
            wrapper = document.createElement('div');
            wrapper.className = 'color-picker';
            document.body.appendChild(wrapper);

            preview = document.createElement('span');
            preview.className = 'color-preview';
            field.parentNode.insertBefore(preview, field.nextSibling);

            preview.addEventListener('click', (e) => {
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

            document.addEventListener('click', (e) => {
                if (e.target !== wrapper && !wrapper.contains(e.target)) {
                    this.close();
                }
            });
        };

        let initPickingArea = () => {
            let area = document.createElement('div');
            let picker = document.createElement('div');

            area.className = 'picking-area';
            picker.className = 'picker';

            this.pickingArea = area;
            this.colorPicker = picker;
            setMouseTracking(area, updateColor);

            area.appendChild(picker);
            wrapper.appendChild(area);
        };

        let initHueSlider = () => {
            let area = document.createElement('div');
            let picker = document.createElement('div');

            area.className = 'hue';
            picker.className = 'slider-picker';

            this.hueArea = area;
            this.huePicker = picker;
            setMouseTracking(area, updateHueSlider);

            area.appendChild(picker);
            wrapper.appendChild(area);
        };

        let initAlphaSlider = () => {
            let area = document.createElement('div');
            let mask = document.createElement('div');
            let picker = document.createElement('div');

            area.className = 'alpha';
            mask.className = 'alpha-mask';
            picker.className = 'slider-picker';

            alpha = {
                area: area,
                mask: mask,
                picker: picker
            };

            setMouseTracking(area, updateAlphaSlider);

            area.appendChild(mask);
            mask.appendChild(picker);
            wrapper.appendChild(area);
        };

        let addInputField = (title, func) => {
            let elm = document.createElement('div');
            let input = document.createElement('input');
            let info = document.createElement('span');

            elm.className = 'input-' + title;
            info.textContent = title;
            input.setAttribute('type', 'text');

            elm.appendChild(info);
            elm.appendChild(input);
            wrapper.appendChild(elm);

            input.addEventListener('change', func);

            subscribers[title] = (value) => {
                input.value = value;
            };
        };


        /*************************************************************************/
        //					Updates properties of UI elements
        /*************************************************************************/

        let updateColor = (e) => {
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

            let saturation = pos[0] * 100 / size | 0;
            let value = 100 - (pos[1] * 100 / size) | 0;

            this.color.setHSV(this.color.hue, saturation, value);

            this.colorPicker.style.left = pos[0] - offset + 'px';
            this.colorPicker.style.top = pos[1] - offset + 'px';

            updateAlphaGradient();
            updatePreview();
            notifyAll();
        };

        let updateHueSlider = (e) => {
            let rect = this.hueArea.getBoundingClientRect();
            let x = Math.max(0, e.pageX - rect.left);
            let width = this.hueArea.clientWidth;

            if (x > width) {
                x = width;
            }

            updateSliderPosition(this.huePicker, x);
            this.color.setHue(((359 * x) / width) | 0);

            updateUI();
        };

        let updateAlphaSlider = (e) => {
            let rect = alpha.area.getBoundingClientRect();
            let x = e.pageX - rect.left;
            let width = alpha.area.clientWidth;

            if (x < 0) {
                x = 0;
            }
            if (x > width) {
                x = width;
            }

            this.color.a = (x / width).toFixed(2);

            updateSliderPosition(alpha.picker, x);
            updatePreview();

            notifyAll();
        };

        /*************************************************************************/
        //				Update positions of various UI elements
        /*************************************************************************/

        let updateUI = () => {
            notifyAll();

            updateHuePicker();
            updatePickerBackground();
            updatePickerPosition();
            updateAlphaPicker();
            updateAlphaGradient();
            updatePreview();
        };

        let updatePickerPosition = () => {
            let size = this.pickingArea.clientWidth;
            let value = this.color.value;
            let offset = 5;

            let x = (this.color.saturation * size / 100) | 0;
            let y = size - (value * size / 100) | 0;

            this.colorPicker.style.left = x - offset + 'px';
            this.colorPicker.style.top = y - offset + 'px';
        };

        let updateSliderPosition = (elm, pos) => {

            elm.style.left = Math.max(pos - 3, -2) + 'px';
        };

        let updateHuePicker = () => {
            let size = this.hueArea.clientWidth;
            let offset = 1;
            let pos = (this.color.hue * size / 360) | 0;
            this.huePicker.style.left = pos - offset + 'px';
        };

        let updateAlphaPicker = () => {
            if (alpha) {
                let size = alpha.area.clientWidth;
                let offset = 1;
                let pos = (this.color.a * size) | 0;
                alpha.picker.style.left = pos - offset + 'px';
            }
        };

        let updatePickerBackground = () => {
            let nc = new Color();
            nc.setHSV(this.color.hue, 100, 100);
            this.pickingArea.style.backgroundColor = nc.getHex();
        };

        let updateAlphaGradient = () => {
            if (alpha) {
                alpha.mask.style.background = "linear-gradient(to right, transparent 0%," + this.color.getHex() + " 100%)";
            }
        };

        let updatePreview = () => {
            field.value = this.color.getColor();
            preview.style.backgroundColor = this.color.getColor();
            triggerEvent("change");
        };

        /*************************************************************************/
        //							Notifications (external/internal)
        /*************************************************************************/

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

        let notifyAll = () => {
            notify('r', this.color.r);
            notify('g', this.color.g);
            notify('b', this.color.b);
            notify('a', this.color.a);
            notify('color', this.color.getColor());
        };

        let notify = (topic, value) => {
            if (subscribers[topic]) {
                subscribers[topic](value);
            }
        };

        /*************************************************************************/
        //							Public methods
        /*************************************************************************/

        this.setColor = (c) => {
            this.color.setFromRaw(c);
            updateUI();
        };

        this.getElements = () => {
            return {
                wrapper: wrapper,
                preview: preview,
                field: field
            };
        };

        this.reposition = () => {
            if (wrapper.classList.contains("visible")) {
                let rect = preview.getBoundingClientRect();
                wrapper.style.top = (rect.top + preview.offsetHeight) + "px";
                wrapper.style.left = rect.left + "px";
            }
        };

        this.close = () => {
            if (wrapper.classList.contains("visible")) {
                triggerEvent("hide");
                wrapper.classList.remove("visible");
            }
        };

        this.on = (type, func) => {
            if (typeof callbacks[type] === "undefined") {
                callbacks[type] = [];
            }

            callbacks[type].push(func);
        };

        /**
         * Execute constructor
         */
        run();
    };
})();