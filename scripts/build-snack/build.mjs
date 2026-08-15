import { Snack } from 'snack-sdk';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Snack's newest supported SDK as of writing. Bump this (and the dependency
// versions below, from https://unpkg.com/expo@<version>/bundledNativeModules.json)
// once Snack supports a newer SDK.
const SNACK_SDK_VERSION = '54.0.0';

const EXCLUDE_EXACT = new Set([
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'app.json',
  '.gitignore',
  '.env.example',
  'LICENSE',
]);

const trackedFiles = execSync('git ls-files', { cwd: PROJECT_ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !f.startsWith('supabase/')) // server-side only; not part of the client bundle
  .filter((f) => !f.startsWith('scripts/')) // this tool itself
  .filter((f) => !EXCLUDE_EXACT.has(f));

// Snack-only source patches. None of these affect the real app — they exist
// because Snack pins an older SDK than this project targets, and that older
// SDK's bundled expo-router (6.0.0) predates two things our code relies on.
// Both are confirmed via the actual npm package's build/exports.d.ts, not
// guessed:
//   curl -s https://unpkg.com/expo-router@6.0.0/build/exports.d.ts
//   curl -s https://unpkg.com/expo-router@6.0.0/build/index.d.ts
const PATCHES = [
  {
    // snackager fails to resolve the `/auto` subpath export of
    // react-native-url-polyfill even though it's a plain file in the package
    // (no `exports` map involved) — a Snack bundler quirk. Inline the same
    // effect instead.
    file: 'lib/supabase.ts',
    from: "import 'react-native-url-polyfill/auto';",
    to: "import { setupURLPolyfill } from 'react-native-url-polyfill';\nsetupURLPolyfill();",
  },
  {
    // expo-router@6.0.0 doesn't export ThemeProvider/DarkTheme/DefaultTheme
    // at all (added in a later expo-router version). Drop the nav-theme
    // wrapper for the Snack copy; every screen's own colors still come from
    // useTheme(), so only native header/tab chrome theming is affected.
    file: 'app/_layout.tsx',
    from: "import { Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';",
    to: "import { Stack } from 'expo-router';",
  },
  {
    file: 'app/_layout.tsx',
    from: '  return (\n    <NavigationThemeProvider value={navTheme}>\n      <RootNavigator />\n      <StatusBar style={scheme === \'dark\' ? \'light\' : \'dark\'} />\n    </NavigationThemeProvider>\n  );',
    to: '  return (\n    <>\n      <RootNavigator />\n      <StatusBar style={scheme === \'dark\' ? \'light\' : \'dark\'} />\n    </>\n  );',
  },
];

const files = {};
for (const relPath of trackedFiles) {
  const abs = path.join(PROJECT_ROOT, relPath);
  if (relPath.endsWith('.png')) {
    files[relPath] = { type: 'ASSET', contents: new Blob([readFileSync(abs)]) };
    continue;
  }
  let contents = readFileSync(abs, 'utf8');
  for (const patch of PATCHES) {
    if (patch.file === relPath) {
      if (!contents.includes(patch.from)) {
        throw new Error(`Patch target not found in ${relPath} — source file has changed, update PATCHES in this script.`);
      }
      contents = contents.replace(patch.from, patch.to);
    }
  }
  files[relPath] = { type: 'CODE', contents };
}

console.log(`Collected ${Object.keys(files).length} files`);

const dependencies = {
  '@supabase/supabase-js': { version: '2.109.0' },
  '@react-native-async-storage/async-storage': { version: '2.2.0' },
  'i18next': { version: '26.3.6' },
  'react-i18next': { version: '17.0.11' },
  'react-native-url-polyfill': { version: '4.0.0' },
  // Exact SDK 54 bundled versions — see comment on SNACK_SDK_VERSION above.
  '@expo/vector-icons': { version: '15.0.2' },
  'expo-constants': { version: '18.0.7' },
  'expo-font': { version: '14.0.12' },
  'expo-linking': { version: '8.0.7' },
  'expo-localization': { version: '17.0.6' },
  'expo-router': { version: '6.0.0' },
  'expo-secure-store': { version: '15.0.6' },
  'expo-status-bar': { version: '3.0.7' },
  'react-native-screens': { version: '4.16.0' },
  'react-native-safe-area-context': { version: '5.6.0' },
  'react-native-svg': { version: '15.12.1' },
};

const snack = new Snack({
  name: 'CryptoMarketViewer',
  description: 'Crypto market viewer — Expo Router + Supabase',
  sdkVersion: SNACK_SDK_VERSION,
  files,
  dependencies,
});

console.log('Waiting for dependency resolution / asset uploads...');
const state = await snack.getStateAsync();

if (Object.keys(state.missingDependencies ?? {}).length > 0) {
  console.log('Missing dependencies (informational — i18next/react-i18next optionally peer on a "typescript" version Snack cannot resolve; harmless):');
  console.log(JSON.stringify(state.missingDependencies, null, 2));
}
for (const [depName, dep] of Object.entries(state.dependencies)) {
  if (dep.error) console.log(`DEPENDENCY ERROR [${depName}]:`, dep.error);
}
for (const [filePath, file] of Object.entries(state.files)) {
  if (file.type === 'ASSET' && !/^https?:\/\//.test(String(file.contents))) {
    console.log(`ASSET NOT UPLOADED [${filePath}]:`, file.contents);
  }
}

console.log('Saving snack...');
const result = await snack.saveAsync({ ignoreUser: true });
console.log(`Saved: https://snack.expo.dev/${result.hashId}`);
