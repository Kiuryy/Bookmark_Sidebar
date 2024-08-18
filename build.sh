#!/bin/bash

supported_chrome_versions=10
supported_firefox_versions=1

#
# ARGUMENTS
#
mode=""
targets=()

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --mode=*) mode="${1#*=}";;
        --target=*) IFS=',' read -r -a targets <<< "${1#*=}";;
        *) echo "Unknown parameter: $1" >&2; exit 1;;
    esac
    shift
done


#
# PREPARE
#
mkdir -p dist
rm -rf dist/*


#
# TRANSLATION
#
cp -a src/_locales dist


#
# IMAGES
#
cp -a src/img dist


#
# SCSS
#
if [ "$mode" = "release" ]; then
  sass src/scss:dist/css --style compressed
else
  sass src/scss:dist/css
fi


#
# HTML
#
if [ "$mode" = "release" ]; then
  html-minifier-terser --input-dir src/html --output-dir dist/html --collapse-whitespace --remove-comments --minify-js true
else
  cp -a src/html dist
fi


#
# JS
#
mkdir -p dist/js

if [ "$mode" = "release" ]; then

  eslint --fix "src/js/**/*.js"
  wget https://raw.githubusercontent.com/Kiuryy/jsu.js/master/src/js/jsu.js -O src/js/lib/jsu.js
  wget https://raw.githubusercontent.com/Kiuryy/colorpicker.js/master/src/js/colorpicker.js -O src/js/lib/colorpicker.js
  terser_options=(--compress --mangle "reserved=['jsu','chrome']")

else

  terser_background_options=(--source-map "url='background.js.map'")
  terser_extension_options=(--source-map "url='extension.js.map'")
  terser_newtab_options=(--source-map "url='newtab.js.map'")
  terser_newtab_preflight_options=(--source-map "url='newtab-preflight.js.map'")
  terser_onboarding_options=(--source-map "url='onboarding.js.map'")
  terser_sidepanel_options=(--source-map "url='sidepanel.js.map'")
  terser_settings_options=(--source-map "url='settings.js.map'")

fi


helper_js=(src/js/helper/*.js)
background_js=(src/js/background/*.js)
newtab_js=(src/js/newtab/*.js)
settings_js=(src/js/settings/*.js)

# background
terser src/js/background-prepare.js src/js/lib/jsu.js src/js/opts.js "${background_js[@]}" src/js/background.js "${terser_background_options[@]:-${terser_options[@]}}" --output dist/js/background.js

# extension
terser src/js/webcomponents-bundle.js src/js/lib/jsu.js src/js/opts.js "${helper_js[@]}" src/js/extension.js "${terser_extension_options[@]:-${terser_options[@]}}" --output dist/js/extension.js

# sidepanel
terser src/js/lib/jsu.js src/js/opts.js src/js/sidepanel.js "${terser_sidepanel_options[@]:-${terser_options[@]}}" --output dist/js/sidepanel.js

# onboarding
terser src/js/lib/jsu.js src/js/opts.js src/js/helper/i18n.js src/js/helper/font.js src/js/helper/stylesheet.js src/js/helper/template.js src/js/helper/utility.js src/js/helper/model.js src/js/onboarding.js "${terser_onboarding_options[@]:-${terser_options[@]}}" --output dist/js/onboarding.js

# settings
terser src/js/lib/jsu.js src/js/lib/colorpicker.js src/js/opts.js src/js/helper/i18n.js src/js/helper/font.js src/js/helper/stylesheet.js src/js/helper/template.js src/js/helper/utility.js src/js/helper/model.js src/js/helper/checkbox.js "${settings_js[@]}" src/js/settings.js "${terser_settings_options[@]:-${terser_options[@]}}" --output dist/js/settings.js

# newtab
terser src/js/newtab-preflight.js "${terser_newtab_preflight_options[@]:-${terser_options[@]}}" --output dist/js/newtab-preflight.js
terser src/js/lib/jsu.js src/js/opts.js src/js/helper/i18n.js src/js/helper/font.js src/js/helper/stylesheet.js src/js/helper/template.js src/js/helper/utility.js src/js/helper/model.js src/js/helper/checkbox.js src/js/helper/entry.js "${newtab_js[@]}" src/js/newtab.js "${terser_newtab_options[@]:-${terser_options[@]}}" --output dist/js/newtab.js


#
# MANIFEST
#
for target in "${targets[@]}"; do
  manifest_json=$(cat "src/manifest.$target.json")

  extension_version=$(npm pkg get version)
  manifest_json=$(echo "$manifest_json" | jq ".version = $extension_version")

  if [ "$mode" = "release" ]; then
    manifest_json=$(echo "$manifest_json" | sed 's/icon\/dev\//icon\//g')
  fi

  if [ "$target" = "chrome" ]; then

    content=$(wget -qO- "https://versionhistory.googleapis.com/v1/chrome/platforms/win64/channels/stable/versions")
    latest_chrome_version=$(echo "$content" | jq -r '.versions[0].version' | cut -d '.' -f 1)
    min_chrome_version=$((latest_chrome_version - supported_chrome_versions))
    manifest_json=$(echo "$manifest_json" | jq ".minimum_chrome_version = \"$min_chrome_version\"")

    if [ "$mode" = "build" ]; then
      manifest_json=$(echo "$manifest_json" | jq ".version_name = \"Dev\"")
    fi

  elif [ "$target" = "firefox" ]; then

    content=$(wget -qO- "https://product-details.mozilla.org/1.0/firefox_versions.json")
    latest_firefox_version=$(echo "$content" | jq -r '.LATEST_FIREFOX_VERSION' | cut -d '.' -f 1)
    min_firefox_version=$((latest_firefox_version - supported_firefox_versions))
    manifest_json=$(echo "$manifest_json" | jq ".browser_specific_settings.gecko.strict_min_version = \"$min_firefox_version.0\"")

  fi

  echo "$manifest_json" > "dist/manifest.$target.json"

  if [ "$mode" = "build" ]; then
    mv "dist/manifest.$target.json" dist/manifest.json
  fi

done


#
# ZIP
#
if [ "$mode" = "release" ]; then
  rm -f ./*.zip

  # source code
  zip source-code.zip * -x "*.zip" -x "*/"
  zip -r source-code.zip src

  # extension code
  cd dist || exit

  for target in "${targets[@]}"; do

    find . -mindepth 1 -maxdepth 1 -type d -print | zip -r "../extension.$target.zip" -@
    cp -a "manifest.$target.json" manifest.json
    zip "../extension.$target.zip" manifest.json
    rm -f manifest.json

  done

fi