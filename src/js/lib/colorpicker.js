/*!
 * ==========================================================
 *  COLOR PICKER PLUGIN 1.3.4
 * ==========================================================
 * Author: Taufik Nurrohman <https://github.com/tovic>
 * Edited: Philipp König (offset function)
 * License: MIT
 * ----------------------------------------------------------
 */

(function(win, doc) {

    var instance = '__instance__',
        first = 'firstChild',
        scroll_left = 'scrollLeft',
        scroll_top = 'scrollTop',
        offset_left = 'offsetLeft',
        offset_top = 'offsetTop',
        delay = setTimeout;

    function is_set(x) {
        return typeof x !== "undefined";
    }

    function is_string(x) {
        return typeof x === "string";
    }

    function is_object(x) {
        return typeof x === "object";
    }

    function object_length(x) {
        return Object.keys(x).length;
    }

    function edge(a, b, c) {
        if (a < b) return b;
        if (a > c) return c;
        return a;
    }

    function num(i, j) {
        return parseInt(i, j || 10);
    }

    function round(i) {
        return Math.round(i);
    }

    // [h, s, v] ... 0 <= h, s, v <= 1
    function HSV2RGB(a) {
        var h = +a[0],
            s = +a[1],
            v = +a[2],
            r, g, b, i, f, p, q, t;
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        i = i || 0;
        q = q || 0;
        t = t || 0;
        switch (i % 6) {
            case 0:
                r = v, g = t, b = p;
                break;
            case 1:
                r = q, g = v, b = p;
                break;
            case 2:
                r = p, g = v, b = t;
                break;
            case 3:
                r = p, g = q, b = v;
                break;
            case 4:
                r = t, g = p, b = v;
                break;
            case 5:
                r = v, g = p, b = q;
                break;
        }
        return [round(r * 255), round(g * 255), round(b * 255)];
    }

    function HSV2HEX(a) {
        return RGB2HEX(HSV2RGB(a));
    }

    // [r, g, b] ... 0 <= r, g, b <= 255
    function RGB2HSV(a) {
        var r = +a[0],
            g = +a[1],
            b = +a[2],
            max = Math.max(r, g, b),
            min = Math.min(r, g, b),
            d = max - min,
            h, s = (max === 0 ? 0 : d / max),
            v = max / 255;
        switch (max) {
            case min:
                h = 0;
                break;
            case r:
                h = (g - b) + d * (g < b ? 6 : 0);
                h /= 6 * d;
                break;
            case g:
                h = (b - r) + d * 2;
                h /= 6 * d;
                break;
            case b:
                h = (r - g) + d * 4;
                h /= 6 * d;
                break;
        }
        return [h, s, v];
    }

    function RGB2HEX(a) {
        var s = +a[2] | (+a[1] << 8) | (+a[0] << 16);
        s = '000000' + s.toString(16);
        return s.slice(-6);
    }

    // rrggbb or rgb
    function HEX2HSV(s) {
        return RGB2HSV(HEX2RGB(s));
    }

    function HEX2RGB(s) {
        if (s.length === 3) {
            s = s.replace(/./g, '$&$&');
        }
        return [num(s[0] + s[1], 16), num(s[2] + s[3], 16), num(s[4] + s[5], 16)];
    }

    // convert range from `0` to `360` and `0` to `100` in color into range from `0` to `1`
    function _2HSV_pri(a) {
        return [+a[0] / 360, +a[1] / 100, +a[2] / 100];
    }

    // convert range from `0` to `1` into `0` to `360` and `0` to `100` in color
    function _2HSV_pub(a) {
        return [round(+a[0] * 360), round(+a[1] * 100), round(+a[2] * 100)];
    }

    // convert range from `0` to `255` in color into range from `0` to `1`
    function _2RGB_pri(a) {
        return [+a[0] / 255, +a[1] / 255, +a[2] / 255];
    }

    // *
    function parse(x) {
        if (is_object(x)) return x;
        var rgb = /\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*$/i.exec(x),
            hsv = /\s*hsv\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)\s*$/i.exec(x),
            hex = x[0] === '#' && x.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
        if (hex) {
            return HEX2HSV(x.slice(1));
        } else if (hsv) {
            return _2HSV_pri([+hsv[1], +hsv[2], +hsv[3]]);
        } else if (rgb) {
            return RGB2HSV([+rgb[1], +rgb[2], +rgb[3]]);
        }
        return [0, 1, 1]; // default is red
    }

    (function($) {

        // plugin version
        $.version = '1.3.4';

        // collect all instance(s)
        $[instance] = {};

        // plug to all instance(s)
        $.each = function(fn, t) {
            return delay(function() {
                var ins = $[instance], i;
                for (i in ins) {
                    fn(ins[i], i, ins);
                }
            }, t === 0 ? 0 : (t || 1)), $;
        };

        // static method(s)
        $.parse = parse;
        $._HSV2RGB = HSV2RGB;
        $._HSV2HEX = HSV2HEX;
        $._RGB2HSV = RGB2HSV;
        $._HEX2HSV = HEX2HSV;
        $._HEX2RGB = function(a) {
            return _2RGB_pri(HEX2RGB(a));
        };
        $.HSV2RGB = function(a) {
            return HSV2RGB(_2HSV_pri(a));
        };
        $.HSV2HEX = function(a) {
            return HSV2HEX(_2HSV_pri(a));
        };
        $.RGB2HSV = function(a) {
            return _2HSV_pub(RGB2HSV(a));
        };
        $.RGB2HEX = RGB2HEX;
        $.HEX2HSV = function(s) {
            return _2HSV_pub(HEX2HSV(s));
        };
        $.HEX2RGB = HEX2RGB;

    })(win.CP = function(target, events) {

        var b = doc.body,
            h = doc.documentElement,
            $ = this,
            _ = false,
            hooks = {},
            picker = doc.createElement('div'),
            on_down = "touchstart mousedown",
            on_move = "touchmove mousemove",
            on_up = "touchend mouseup",
            on_resize = "orientationchange resize";

        // return a new instance if `CP` was called without the `new` operator
        if (!($ instanceof CP)) {
            return new CP(target, events);
        }

        // store color picker instance to `CP.__instance__`
        CP[instance][target.id || target.name || object_length(CP[instance])] = $;

        // trigger color picker panel on click by default
        if (!is_set(events)) {
            events = on_down;
        }

        // add event
        function on(ev, el, fn) {
            ev = ev.split(/\s+/);
            for (var i = 0, ien = ev.length; i < ien; ++i) {
                el.addEventListener(ev[i], fn, false);
            }
        }

        // remove event
        function off(ev, el, fn) {
            ev = ev.split(/\s+/);
            for (var i = 0, ien = ev.length; i < ien; ++i) {
                el.removeEventListener(ev[i], fn);
            }
        }

        // get mouse/finger coordinate
        function point(el, e) {
            var x = !!e.touches ? e.touches[0].pageX : e.pageX,
                y = !!e.touches ? e.touches[0].pageY : e.pageY,
                o = offset(el);
            return {
                x: x - o.l,
                y: y - o.t
            };
        }

        // get position
        function offset(el) {
            if (el === win) {
                var left = win.pageXOffset || h[scroll_left],
                    top = win.pageYOffset || h[scroll_top];
            } else {
                var left = el[offset_left]-el.scrollLeft,
                    top = el[offset_top]-el.scrollTop;
                while (el = el.offsetParent) {
                    left += el[offset_left]-el.scrollLeft;
                    top += el[offset_top]-el.scrollTop;
                }
            }
            return {
                l: left,
                t: top
            };
        }

        // get closest parent
        function closest(a, b) {
            while ((a = a.parentElement) && a !== b);
            return a;
        }

        // prevent default
        function prevent(e) {
            if (e) e.preventDefault();
        }

        // get dimension
        function size(el) {
            return el === win ? {
                w: win.innerWidth,
                h: win.innerHeight
            } : {
                w: el.offsetWidth,
                h: el.offsetHeight
            };
        }

        // get color data
        function get_data(a) {
            return _ || (is_set(a) ? a : false);
        }

        // set color data
        function set_data(a) {
            _ = a;
        }

        // add hook
        function add(ev, fn, id) {
            if (!is_set(ev)) return hooks;
            if (!is_set(fn)) return hooks[ev];
            if (!is_set(hooks[ev])) hooks[ev] = {};
            if (!is_set(id)) id = object_length(hooks[ev]);
            return hooks[ev][id] = fn, $;
        }

        // remove hook
        function remove(ev, id) {
            if (!is_set(ev)) return hooks = {}, $;
            if (!is_set(id)) return hooks[ev] = {}, $;
            return delete hooks[ev][id], $;
        }

        // trigger hook
        function trigger(ev, a, id) {
            if (!is_set(hooks[ev])) return $;
            if (!is_set(id)) {
                for (var i in hooks[ev]) {
                    hooks[ev][i].apply($, a);
                }
            } else {
                if (is_set(hooks[ev][id])) {
                    hooks[ev][id].apply($, a);
                }
            }
            return $;
        }

        // initialize data ...
        set_data(CP.parse(target.getAttribute('data-color') || target.value || [0, 1, 1]));

        // generate color picker pane ...
        picker.className = 'color-picker';
        picker.innerHTML = '<div class="color-picker-control"><span class="color-picker-h"><i></i></span><span class="color-picker-sv"><i></i></span></div>';
        var c = picker[first].children,
            HSV = get_data([0, 1, 1]), // default is red
            H = c[0],
            SV = c[1],
            H_point = H[first],
            SV_point = SV[first],
            start_H = 0,
            start_SV = 0,
            drag_H = 0,
            drag_SV = 0,
            left = 0,
            top = 0,
            P_W = 0,
            P_H = 0,
            v = HSV2HEX(HSV),
            set;

        // on update ...
        function trigger_(k, x) {
            if (!k || k === "h") {
                trigger("change:h", x);
            }
            if (!k || k === "sv") {
                trigger("change:sv", x);
            }
            trigger("change", x);
        }

        // is visible?
        function visible() {
            return picker.parentNode;
        }

        // create
        function create(first, bucket) {
            if (!first) {
                (bucket || b).appendChild(picker), $.visible = true;
            }
            P_W = size(picker).w;
            P_H = size(picker).h;
            var SV_size = size(SV),
                SV_point_size = size(SV_point),
                H_H = size(H).h,
                SV_W = SV_size.w,
                SV_H = SV_size.h,
                H_point_H = size(H_point).h,
                SV_point_W = SV_point_size.w,
                SV_point_H = SV_point_size.h;
            if (first) {
                picker.style.left = picker.style.top = '-9999px';
                function click(e) {
                    var t = e.target,
                        is_target = t === target || closest(t, target) === target;
                    if (is_target) {
                        create();
                    } else {
                        $.exit();
                    }
                    trigger(is_target ? "enter" : "exit", [$]);
                }
                if (events !== false) {
                    on(events, target, click);
                }
                $.create = function() {
                    return create(1), trigger("create", [$]), $;
                };
                $.destroy = function() {
                    if (events !== false) {
                        off(events, target, click);
                    }
                    $.exit(), set_data(false);
                    return trigger("destroy", [$]), $;
                };
            } else {
                fit();
            }
            set = function() {
                HSV = get_data(HSV), color();
                H_point.style.top = (H_H - (H_point_H / 2) - (H_H * +HSV[0])) + 'px';
                SV_point.style.right = (SV_W - (SV_point_W / 2) - (SV_W * +HSV[1])) + 'px';
                SV_point.style.top = (SV_H - (SV_point_H / 2) - (SV_H * +HSV[2])) + 'px';
            };
            $.exit = function(e) {
                if (visible()) {
                    visible().removeChild(picker);
                    $.visible = false;
                }
                off(on_down, H, down_H);
                off(on_down, SV, down_SV);
                off(on_move, doc, move);
                off(on_up, doc, stop);
                off(on_resize, win, fit);
                return $;
            };
            function color(e) {
                var a = HSV2RGB(HSV),
                    b = HSV2RGB([HSV[0], 1, 1]);
                SV.style.backgroundColor = 'rgb(' + b.join(',') + ')';
                set_data(HSV);
                prevent(e);
            };
            set();
            function do_H(e) {
                var y = edge(point(H, e).y, 0, H_H);
                HSV[0] = (H_H - y) / H_H;
                H_point.style.top = (y - (H_point_H / 2)) + 'px';
                color(e);
            }
            function do_SV(e) {
                var o = point(SV, e),
                    x = edge(o.x, 0, SV_W),
                    y = edge(o.y, 0, SV_H);
                HSV[1] = 1 - ((SV_W - x) / SV_W);
                HSV[2] = (SV_H - y) / SV_H;
                SV_point.style.right = (SV_W - x - (SV_point_W / 2)) + 'px';
                SV_point.style.top = (y - (SV_point_H / 2)) + 'px';
                color(e);
            }
            function move(e) {
                if (drag_H) {
                    do_H(e), v = HSV2HEX(HSV);
                    if (!start_H) {
                        trigger("drag:h", [v, $]);
                        trigger("drag", [v, $]);
                        trigger_("h", [v, $]);
                    }
                }
                if (drag_SV) {
                    do_SV(e), v = HSV2HEX(HSV);
                    if (!start_SV) {
                        trigger("drag:sv", [v, $]);
                        trigger("drag", [v, $]);
                        trigger_("sv", [v, $]);
                    }
                }
                start_H = 0,
                    start_SV = 0;
            }
            function stop(e) {
                var t = e.target,
                    k = drag_H ? "h" : "sv",
                    a = [HSV2HEX(HSV), $],
                    is_target = t === target || closest(t, target) === target,
                    is_picker = t === picker || closest(t, picker) === picker;
                if (!is_target && !is_picker) {
                    // click outside the target or picker element to exit
                    if (visible() && events !== false) $.exit(), trigger("exit", [$]), trigger_(0, a);
                } else {
                    if (is_picker) {
                        trigger("stop:" + k, a);
                        trigger("stop", a);
                        trigger_(k, a);
                    }
                }
                drag_H = 0,
                    drag_SV = 0;
            }
            function down_H(e) {
                start_H = 1,
                    drag_H = 1,
                    move(e), prevent(e);
                trigger("start:h", [v, $]);
                trigger("start", [v, $]);
                trigger_("h", [v, $]);
            }
            function down_SV(e) {
                start_SV = 1,
                    drag_SV = 1,
                    move(e), prevent(e);
                trigger("start:sv", [v, $]);
                trigger("start", [v, $]);
                trigger_("sv", [v, $]);
            }
            if (!first) {
                on(on_down, H, down_H);
                on(on_down, SV, down_SV);
                on(on_move, doc, move);
                on(on_up, doc, stop);
                on(on_resize, win, fit);
            }
        } create(1);

        delay(function() {
            var a = [HSV2HEX(HSV), $];
            trigger("create", a);
            trigger_(0, a);
        }, 0);

        // fit to window
        $.fit = function(o) {
            var w = size(win),
                y = size(h),
                z = y.h > w.h, // has vertical scroll bar
                ww = offset(win),
                yy = offset(h),
                w_W = z ? /* Math.max(y.w, w.w) */ y.w : w.w + ww.l,
                w_H = z ? w.h + ww.t : Math.max(y.h, w.h),
                to = offset(target);
            left = to.l;
            top = to.t + size(target).h; // drop!
            if (is_object(o)) {
                is_set(o[0]) && (left = o[0]);
                is_set(o[1]) && (top = o[1]);
            } else {
                if (left + P_W > w_W) {
                    left = w_W - P_W;
                }
                if (top + P_H > w_H) {
                    top = w_H - P_H;
                }
            }
            picker.style.left = left + 'px';
            picker.style.top = top + 'px';
            return trigger("fit", [$]), $;
        };

        // for event listener ID
        function fit() {
            return $.fit();
        }

        // set hidden color picker data
        $.set = function(a) {
            if (!is_set(a)) return get_data();
            if (is_string(a)) {
                a = CP.parse(a);
            }
            return set_data(a), set(), $;
        };

        // alias for `$.set()`
        $.get = function(a) {
            return get_data(a);
        };

        // register to global ...
        $.target = target;
        $.picker = picker;
        $.visible = false;
        $.on = add;
        $.off = remove;
        $.trigger = trigger;
        $.hooks = hooks;
        $.enter = function(bucket) {
            return create(0, bucket);
        };

        // return the global object
        return $;

    });

})(window, document);
