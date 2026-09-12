import {expect, test} from "bun:test";
import type {DesktopUpdateState} from "@supernova/contracts/desktop/api";
import type {UpdaterEvent} from "@/updates/state";
import {INITIAL_UPDATE_STATE, isAdhocSignature, isSignatureValidationFailure, reduceUpdateState, releasesUrlFrom} from "@/updates/state";

const checkingState: DesktopUpdateState = {installBlocked: null, status: "checking", version: null, downloadPercent: null, message: null};
const availableState: DesktopUpdateState = {installBlocked: null, status: "available", version: "0.1.0", downloadPercent: null, message: null};
const downloadingState: DesktopUpdateState = {installBlocked: null, status: "downloading", version: "0.1.0", downloadPercent: 40, message: null};
const downloadedState: DesktopUpdateState = {installBlocked: null, status: "downloaded", version: "0.1.0", downloadPercent: null, message: null};
const errorState: DesktopUpdateState = {installBlocked: null, status: "error", version: "0.1.0", downloadPercent: null, message: "network unreachable"};

interface ReducerCase {
  readonly name: string;
  readonly state: DesktopUpdateState;
  readonly event: UpdaterEvent;
  readonly want: DesktopUpdateState;
}

const cases: ReadonlyArray<ReducerCase> = [
  {name: "idle starts checking", state: INITIAL_UPDATE_STATE, event: {type: "checking"}, want: checkingState},
  {name: "an available update surfaces its version", state: checkingState, event: {type: "available", version: "0.1.0"}, want: availableState},
  {name: "no update returns to idle", state: availableState, event: {type: "not-available"}, want: INITIAL_UPDATE_STATE},
  {name: "download progress tracks the offered version", state: availableState, event: {type: "download-progress", percent: 40}, want: downloadingState},
  {name: "download completion keeps the downloaded version", state: downloadingState, event: {type: "downloaded", version: "0.1.0"}, want: downloadedState},
  {name: "a check never demotes an in-flight download", state: downloadingState, event: {type: "checking"}, want: downloadingState},
  {name: "an offered update never demotes an in-flight download", state: downloadingState, event: {type: "available", version: "0.2.0"}, want: downloadingState},
  {name: "a missing update never demotes an in-flight download", state: downloadingState, event: {type: "not-available"}, want: downloadingState},
  {name: "re-offering a downloaded update keeps it installable", state: downloadedState, event: {type: "available", version: "0.1.0"}, want: downloadedState},
  {name: "a missing update keeps a downloaded update installable", state: downloadedState, event: {type: "not-available"}, want: downloadedState},
  {name: "a newer version replaces a downloaded update", state: downloadedState, event: {type: "available", version: "0.2.0"}, want: {...availableState, version: "0.2.0"}},
  {name: "errors keep the offered version so the download can be retried", state: downloadingState, event: {type: "error", message: "network unreachable"}, want: errorState},
  {name: "re-checking after an error clears the message", state: errorState, event: {type: "checking"}, want: {...errorState, status: "checking", message: null}},
];

for (const {name, state, event, want} of cases) {
  test(name, () => {
    expect(reduceUpdateState(state, event)).toEqual(want);
  });
}

const block = {reason: "This copy is not code-signed.", downloadUrl: "https://github.com/example/app/releases"};
const blockedCases: ReadonlyArray<ReducerCase> = [
  {
    name: "a blocked install is recorded without changing the update status",
    state: availableState,
    event: {type: "install-blocked", ...block},
    want: {...availableState, installBlocked: block},
  },
  {
    name: "an offered update keeps the block",
    state: {...INITIAL_UPDATE_STATE, installBlocked: block},
    event: {type: "available", version: "0.2.0"},
    want: {...availableState, version: "0.2.0", installBlocked: block},
  },
  {
    name: "a missing update keeps the block",
    state: {...availableState, installBlocked: block},
    event: {type: "not-available"},
    want: {...INITIAL_UPDATE_STATE, installBlocked: block},
  },
  {
    name: "an error keeps the block",
    state: {...availableState, installBlocked: block},
    event: {type: "error", message: "boom"},
    want: {...errorState, message: "boom", installBlocked: block},
  },
];

for (const {name, state, event, want} of blockedCases) {
  test(name, () => {
    expect(reduceUpdateState(state, event)).toEqual(want);
  });
}

test("recognises Squirrel's signature validation failure", () => {
  expect(isSignatureValidationFailure("Code signature at URL file:///x/Supernova.app/ did not pass validation: Die angegebenen Code-Anforderungen wurden nicht erfüllt.")).toBe(
    true
  );
  expect(isSignatureValidationFailure("net::ERR_INTERNET_DISCONNECTED")).toBe(false);
});

test("recognises an ad-hoc signed bundle from codesign output", () => {
  expect(isAdhocSignature("Identifier=dev.supernova.app\nCodeDirectory v=20400 size=426 flags=0x2(adhoc)\nSignature=adhoc\nTeamIdentifier=not set\n")).toBe(true);
  expect(isAdhocSignature("Identifier=dev.supernova.app\nAuthority=Developer ID Application: Example (ABCDE12345)\nTeamIdentifier=ABCDE12345\n")).toBe(false);
});

test("reads the releases page from the bundled feed description", () => {
  expect(releasesUrlFrom("provider: github\nowner: example\nrepo: app\nupdaterCacheDirName: app-updater\n")).toBe("https://github.com/example/app/releases");
  expect(releasesUrlFrom("provider: generic\nurl: https://updates.example.com\n")).toBe("https://github.com/mattiacerutti/supernova/releases");
  expect(releasesUrlFrom("")).toBe("https://github.com/mattiacerutti/supernova/releases");
});
