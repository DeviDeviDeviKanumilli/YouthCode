// Monorepo-aware Metro config: watch the repo root so workspace packages
// (@sproutgo/shared) resolve, and let Metro find hoisted node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Force a SINGLE copy of React (and the renderer) into the bundle. Because
// nodeModulesPaths also includes the repo root, Metro could otherwise resolve a
// hoisted react at the root (pulled in for the API workspace's Next.js) ALONGSIDE
// the app's own copy — two React instances share no hook dispatcher, which crashes
// at launch with "Cannot read property 'useRef' of null". A resolveRequest hook
// rewrites every `react`/`react-native` import to the app's own node_modules,
// regardless of which package issued it, so exactly one instance is bundled.
// Only `react` is duplicated here (a copy is hoisted to the repo root for the
// Next.js API workspace; another lives in the app). `react-native` exists in
// exactly one place, so it's left to default resolution — forcing its subpaths
// through Node's resolver would break React Native's `.ios.js` platform variants.
const projectModules = path.resolve(projectRoot, "node_modules");
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Match `react` and its subpaths (`react/jsx-runtime`, `react/jsx-dev-runtime`)
  // — a mismatched jsx-runtime breaks the same way a mismatched react core does.
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    return {
      type: "sourceFile",
      filePath: require.resolve(path.join(projectModules, moduleName)),
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
