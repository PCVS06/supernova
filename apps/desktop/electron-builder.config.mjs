import {readFileSync} from "node:fs";

const {version} = JSON.parse(readFileSync(new URL("package.json", import.meta.url), "utf8"));

// Nightly builds keep the stable app identity but present as a separate app:
// distinct product name, user data directory, and update channel.
const nightly = version.includes("-nightly.");
const azureSigningConfigured = Boolean(process.env.AZURE_TRUSTED_SIGNING_ENDPOINT);

/** @type {import("electron-builder").Configuration} */
const config = {
  appId: "dev.supernova.app",
  productName: nightly ? "Radian (Nightly)" : "Radian",
  directories: {
    buildResources: "resources",
  },
  files: ["out/**", "package.json"],
  extraResources: [
    {from: "resources/icons", to: "icons"},
    {from: "../server/dist", to: "server", filter: ["cli.js", "tools/**"]},
    // electron-builder never copies a source's top-level node_modules, so the externalised runtime ships from its own entry.
    {from: "../server/dist/node_modules", to: "server/node_modules"},
    {from: "../../packages/web/dist", to: "web"},
  ],
  win: {
    executableName: "radian",
    icon: "icons/icon.ico",
    ...(azureSigningConfigured && {
      azureSignOptions: {
        endpoint: process.env.AZURE_TRUSTED_SIGNING_ENDPOINT,
        codeSigningAccountName: process.env.AZURE_TRUSTED_SIGNING_ACCOUNT_NAME,
        certificateProfileName: process.env.AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE_NAME,
      },
      publisherName: process.env.AZURE_TRUSTED_SIGNING_PUBLISHER_NAME,
    }),
  },
  nsis: {
    artifactName: "radian-${version}-${arch}-setup.${ext}",
    shortcutName: "${productName}",
    uninstallDisplayName: "${productName}",
    createDesktopShortcut: "always",
  },
  mac: {
    icon: "icons/icon.icns",
    artifactName: "radian-${version}-${arch}-mac.${ext}",
    entitlements: "resources/entitlements.mac.plist",
    entitlementsInherit: "resources/entitlements.mac.plist",
    extendInfo: {
      NSCameraUsageDescription: "Application requests access to the device's camera.",
      NSMicrophoneUsageDescription: "Application requests access to the device's microphone.",
      NSDocumentsFolderUsageDescription: "Application requests access to the user's Documents folder.",
      NSDownloadsFolderUsageDescription: "Application requests access to the user's Downloads folder.",
    },
    notarize: Boolean(process.env.APPLE_API_KEY),
  },
  dmg: {
    icon: "icons/icon.icns",
    artifactName: "radian-${version}-${arch}.${ext}",
  },
  linux: {
    executableName: "radian",
    icon: "icons",
    target: ["AppImage", "snap", "deb"],
    maintainer: "electronjs.org",
    category: "Utility",
  },
  appImage: {
    artifactName: "radian-${version}-${arch}.${ext}",
  },
  snap: {
    artifactName: "radian-${version}-${arch}.${ext}",
  },
  deb: {
    artifactName: "radian-${version}-${arch}.${ext}",
  },
  npmRebuild: false,
  publish: {
    provider: "github",
    owner: "PCVS06",
    repo: "supernova",
    releaseType: nightly ? "prerelease" : "release",
    ...(nightly && {channel: "nightly"}),
  },
};

export default config;
