const path = require("path");

// expo-router's `require.context(process.env.EXPO_ROUTER_APP_ROOT)` is rewritten by
// babel-preset-expo into a static context — but only if EXPO_ROUTER_APP_ROOT is present in
// the env of the process running Babel. In this monorepo the Xcode "Bundle React Native"
// phase doesn't inherit it, so the bundle fails with "Invalid call ... EXPO_ROUTER_APP_ROOT".
// Setting it here (babel.config.js runs inside the Metro/Babel process) guarantees it's
// defined for every build path — dev server, Xcode Debug, and Xcode Release.
process.env.EXPO_ROUTER_APP_ROOT =
  process.env.EXPO_ROUTER_APP_ROOT || path.resolve(__dirname, "app");

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [],
  };
};
