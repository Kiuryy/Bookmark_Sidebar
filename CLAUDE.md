# Bookmark Sidebar

Browser extension (Manifest V3, Chrome + Firefox). No framework, no bundler —
plain ES2020+ concatenated with terser, SCSS compiled with `sass`, DOM handled by the
in-house jQuery-like library **jsu**.

## Build

```bash
npm run build:chrome     # dev build (source maps, version_name "Dev") -> dist/ with dist/manifest.json
npm run build:firefox    # same for Firefox
npm run build:demo       # build:chrome with version_name "Demo" -> $.opts.demoMode (placeholder titles + icons)
npm run release          # ESLint (aborts on errors), re-downloads src/js/lib/*.js from upstream, minified build for Chrome + Firefox
                         # -> extension.chrome.zip, extension.firefox.zip, source-code.zip

npm run launch-demo:chrome -- --viewport --size=1280x720   # build:demo, then Chrome with a fresh profile (deleted on close) and dist/ installed (also launch-demo:edge)
npm run record-demo:chrome -- --viewport --size=1280x720   # same, recording the window (also record-demo:edge)
npm run convert-demo-recordings   # demo/recordings/*.mov -> .webm via ffmpeg (VP9 with alpha, the only format Chrome/Edge show transparent on every OS); --crf=24, --force

npm run extract-webstore-descriptions   # writes the store texts to webstore/descriptions/{chrome,edge}/<lang>.txt and lists the files that changed since the last dashboard update
npm run confirm-webstore-descriptions   # after updating the dashboards: stores the hashes of all languages in webstore/published.json
                                        # (only some: npm run extract-webstore-descriptions -- --mark-published=de,fr)
```

Demo (`demo/launch-browser.mjs`, all options in its header comment):

- The profile gets `demo/profile/bookmarks.js` (bookmarks), `extension-settings.js` (merged into the extension storage) and
  `browser-settings.js` (browser preferences) — CommonJS, so they can have comments — plus `demo/theme` (blue browser
  theme, same colors in Chrome and Edge). All folders are expanded in the sidebar.
- `demo/website/example.html` is served as https://example.com/ and `example-images.html` (a grid of colorful Unsplash
  photos to show the sidebar transparency) as https://example.com/images.
- Options: `--size=`, `--viewport`, `--position=`, `--scale=`, `--lang=`, `--dark`/`--light`, `--bookmarks=`, `--storage=`,
  `--theme=` (`none` for an empty/default one). `--record[=<file>]` records via `demo/recorder` (macOS, HEVC with alpha,
  30 fps, display resolution -> `demo/recordings/`; `--record-fps=`, `--record-scale=1`, `--record-quality=0.9`,
  `--record-codec=prores`).

Web Store descriptions (`webstore/descriptions.mjs`):

- The texts are translated like every other text in `src/_locales/<lang>/messages.json`: `extension_desc` (the manifest
  description, max. 132 characters, which the Chrome Web Store shows above the long one) and `extension_webstore_desc`
  (the long one, stripped from `dist/` by `build.mjs`).
- Chrome gets `extension_webstore_desc` only, Edge (which doesn't show the manifest description) gets `extension_desc` +
  `extension_webstore_desc`, so the intro must not be repeated in the long text.
- `published.json` has one hash per store and language, so a change of `extension_desc` only lists the Edge file.
  Languages missing one of the two keys are skipped.

`build.mjs` is the single source of truth for what ships. Note:

- **JS has no module system.** Each entry point is a hand-maintained file list in `bundles`
  in `build.mjs`. Adding a file to `src/js/helper/`, `src/js/settings/`, etc. is picked up by
  the `listJs(dir)` calls, but a new file anywhere else must be added to the relevant bundle
  manually, in the right order.
- External tools (`sass`, `terser`, `eslint`, `html-minifier-terser`, `zip`) run through `run()`,
  which aborts the build when one of them fails.
- Load order matters: `lib/jsu.js` → `opts.js` → helpers → page script.
- **SCSS**: `sass src/scss:dist/css` compiles the whole tree, so every non-partial `.scss`
  (including `themes/<theme>/*.scss`) becomes a stylesheet the extension can load by name.
  Partials (`_name.scss`, mostly under `src/scss/include/**`) are pulled in with `@use`.
- `src/js/lib/jsu.js` and `src/js/lib/colorpicker.js` are **vendored** (overwritten from GitHub
  on release) — never edit them.
- ESLint (`--fix`, on `src/js`, `demo`, `webstore`, `build.mjs` and `eslint.config.mjs`; `src/js/lib/` is ignored) runs only on
  `--mode=release` and aborts the release on errors (warnings pass). 4-space indent, double quotes, semicolons,
  `prefer-const`, `no-var`, and `dot-notation` with `allowKeywords: false` (so `obj["default"]`,
  not `obj.default`).

## Layout

| Path | What |
| --- | --- |
| `src/js/opts.js` | Global constants. Exposes `$.opts`, plus the aliases `$.cl` (CSS class names) and `$.attr` (data-attribute names), `$.api` (`chrome`/`browser`), `$.browserName`, `$.isDev`. |
| `src/js/helper/*.js` | Shared helpers (`i18n`, `model`, `stylesheet`, `checkbox`, `template`, `utility`, …). |
| `src/js/background/`, `background.js` | Service worker. `model.call("<action>")` from a page routes here. |
| `src/js/extension.js` + `helper/` | Content script: the sidebar itself. |
| `src/js/settings/` + `settings.js` | Settings page (`html/settings.html`). `settings/importExport.js` is also bundled into the content script (feedback form prefill). |
| `src/js/translations/` + `translations.js` | Translation page (`html/translations.html`). Uses the `settings` stylesheet and `settings/dialog.js`; the layer (language → category) lives in the URL hash. |
| `src/js/onboarding.js` | Setup page (`html/intro.html`) opened after the installation. Uses the `settings` stylesheet (`include/settings/_intro.scss`); the steps are sections toggled via `body[data-step]`. |
| `src/js/newtab/`, `sidepanel.js` | Other pages. |
| `src/_locales/<lang>/messages.json` | Translations; `en` is the default locale. |
| `src/scss/{dark,highContrast,rtl,themes}/` | Variant stylesheets mirroring the base structure. |

## Conventions

Every file is an IIFE receiving jsu as `$`:

```js
($ => {
    "use strict";

    $.SomeHelper = function (s) {      // `s`/`ext`/`n` = the owning page object
        this.init = async () => { … };

        const privateThing = () => { … };
    };

})(jsu);
```

- Helpers are constructor functions hung off `$` and instantiated into `this.helper.<name>`
  in the page's `initHelpers()`.
- Public API = `this.foo = …`; everything else is a `const` arrow function in the closure.
- Never hardcode class names or data attributes — use `$.cl.*` / `$.attr.*` from `opts.js`,
  adding entries there when needed.
- User-visible strings go through `s.helper.i18n.get("<key>")` with the key added to
  `src/_locales/en/messages.json`. Other locales are maintained through the translation site.
- `i18n.parseHtml(context)` is repeatable: elements with a matching variable keep their
  `data-i18n` attribute instead of losing it, so calling it again after `i18n.init()` applies a
  newly selected language instantly (see `parseLangVars()` in `settings.js`). Elements without a
  matching variable are still `remove()`d (and a warning is logged) exactly as before. Elements
  built at runtime should therefore keep their `data-i18n` attribute (set the text via `get()`
  *and* the attribute when they are created after `parseHtml()` ran). Anything that post-processes
  translated markup (e.g. `initVisibilityRules()`) has to run again after each parse.
- Elements marked with `data-i18nOptional` (`$.attr.i18nOptional`) are removed silently when their variable is
  missing — the form helper uses this for the generated `p.desc` of every field and for the label of fields without
  `data-i18n`, so the console only warns about variables that are really missing.
- `title` and `alt` are translated via `data-i18nTitle` / `data-i18nAlt` (`$.attr.i18nTitle` / `$.attr.i18nAlt`);
  unlike `data-i18n`, a missing variable only logs a warning and keeps the element.
- `parseHtml()` replaces the innerHTML, so text that sits next to child elements needs its own
  `<span data-i18n>`, and links produced by `[a]…[/a]` are recreated on every parse — bind their listeners
  on a stable parent (see `p.share-info-link` in `initOverviewLinks()`).

## SCSS conventions

- **No logical properties** (`margin-inline-*`, `padding-inline-*`, `inset-inline-*`, `margin-inline`, `padding-block`,
  `border-inline-*`, `text-align: start`, …). Use the physical ones: `padding-top` / `-right` / `-bottom` / `-left`
  (same for `margin`, `left`/`right`, `border-left`, …) or the shorthand with 4 values (`padding: 15px 20px 15px 30px`).
- RTL overrides live in `src/scss/rtl/include/settings/_<partial>.scss` (and `rtl/_settings.scss` for `settings.scss`),
  scoped with `html[dir='rtl']` and loaded at the end of the matching partial via `meta.load-css()`. When adding
  direction-dependent rules (left/right, paddings/margins on one side, `mask-position: left …`, arrows), add the
  mirrored override there. Only override the horizontal sides (`margin-left`/`-right`) when other rules adjust the
  vertical ones, since the override has equal or higher specificity. Icons are only mirrored (`scaleX(-1)`) when they
  are directional.
- Settings class names are kebab-case (`bullet-list`, `radio-wrapper`, `$.cl.settings.*`). The camelCase ones outside
  `$.cl.settings` (e.g. `initLoading`) are shared with other pages and stay as they are.
- The settings stylesheet (`src/scss/settings.scss`, also used by the translation page) is split into partials under
  `src/scss/include/settings/`, named after the JS helper of the same area where there is one: `layout` (main, wrapper,
  `div.cols`/`div.col`, aside-wrapper, note), `conditional` (visibility via `body[data-mode|theme|usertype|surface]`),
  `overview`, `mode`, `triggerArea`, `extensionIcon`, `display` (theme, surface, presets, visibility rules), `preview`,
  `newtab`, plus `header`, `button`, `form`, `dialog`, `expert`, `premium`, `tipsTricks`, `translations`, `colorpicker`.
  Shared mixins (`card`, `browser-mockup`) live in `include/settings/_helpers.scss`.
- `.hidden` (`$.cl.hidden`) is a global `display: none !important` in `settings.scss` — don't add per-element
  `&.hidden` rules.

## jsu gotchas

jsu looks like jQuery but is not. The traps that actually cause bugs:

1. **Insertion methods clone the node and delete the original.** `appendTo`, `prependTo`,
   `insertAfter`, `insertBefore` all go through `_moveElementTo`, which clones (copying data and
   event listeners), inserts the clone, then `remove()`s the node you had. So you **must** use
   the return value — the variable you started with now points at a detached node:

   ```js
   const btn = $("<a></a>").on("click", handler);
   btn.appendTo(label);          // WRONG: btn is now detached, addClass() does nothing
   const btn2 = btn.appendTo(label);   // right
   ```

2. **`trigger()` events do not bubble.** It dispatches a bare `CustomEvent`, so event delegation
   (`$(document).on("change", …)`) will never see a programmatic `trigger("change")`. Bind
   listeners directly on the element. Pass data as `trigger("change", {detail: "userAction"})`.
3. **`remove()` also wipes the node's `data()` and event handlers** (they live in WeakMaps keyed
   by node).
4. **`.length()` is a method**, not a property.
5. **`forEach()` is synchronous and hands you raw DOM nodes** — wrap with `$(elm)` to chain, and
   note that an `async` callback is *not* awaited, so an `await`ing loop body finishes long after
   the `forEach` returns. `src/js/settings/form.js#initFormElements` relies on this: the field
   elements are registered in `this.elements` synchronously, before the first `await`, which is
   why they are available right after `await form.init()` even though the rest of each field's
   setup is still pending.
6. `$.delay(ms)` (promise-wrapped `setTimeout`), `$.xhr(url, opts)`, `$.deepMerge(a, b)` are the
   static helpers used throughout.

## Settings page structure

`settings.js` only orchestrates: `run()` initialises the helpers in order, and it owns the unsaved-changes
tracking, saving, and language switching. Shared page API for helpers: `s.openLink(href)`, `s.setConditionalClass()`, `s.showMessage()`,
`s.reload()`, `s.isInitializing()`. Each area of the page has its own helper in `src/js/settings/`
(`display` = mode, visibility, theme, size presets, surface; `triggerArea`, `extensionIcon`, `newtab`, `links`, `tabs`, …):

- `init()` binds the events. `applyInitialState()` (where present) triggers the field handlers once so the page
  matches the stored config. `run()` calls these in a fixed order because the mode can change the open action.
- `config.get()` returns the config as it would be saved (stored values + form + derived values), and `config.save()`
  stores it. The sidebar preview (`preview.js`) and every derived value read from `config.get()`.
- `form.setValue(type, name, value)` sets a field and triggers `change`. `iconPreview.create(selector, getOptions)`
  builds a canvas icon preview that merges overlapping renders into one follow-up run.
- `s.setConditionalClass(elm, cl, condition)` replaces add/remove-class `if`/`else` blocks.

## Settings form fields

`src/html/settings.html` declares fields as `<div class="formElement" data-type="…"
data-name="…" data-config="…" data-i18n="…">`. `$.SettingsFormHelper` (`src/js/settings/form.js`)
replaces each one at runtime with `<label>`, the real input, and a `<p class="desc">`, and
registers it in `this.elements[<type>][<name>]`.

- `data-config` is a `model` path (`b/…` behaviour, `a/…` appearance) and drives both the initial
  value and `getFormData()`.
- Every `initField.*` inserts its elements with `insertAfter(opts.label)`, so the DOM order ends
  up `label` → field elements → `a.revert` → `p.desc`. Anything that has to sit *after* the whole
  field group can exploit this by being inserted right after the label up front — that is how the
  restore button gets placed without each field type having to know about it. A field that wants
  something *below* the button anchors on `opts.restoreButton` instead (the range field does this
  for its "infinity" sub-checkbox).
- The generated `<label>` and `<p class="desc">` carry `data-i18n`, and `i18n.parseHtml()` later in
  `run()` **overwrites their innerHTML** — or *removes* them entirely when the key is empty or
  unknown. So never append anything into them, and don't rely on them existing.
- Watch the sibling selectors in `scss/include/settings/_form.scss` (`input[type='range'] + span`,
  `input.color + span`, `div.sub div.checkbox + label`) — inserting a node between a field and its
  companion element silently breaks the styling, and widening them to `~` over-matches into the
  next field in the same `div.col`.
- Per-field restore buttons (`a.revert`) compare the current field state against the snapshot
  taken by `form.updateInitialStates()` — called once the page has settled at the end of `run()`,
  and again after `save()`.
