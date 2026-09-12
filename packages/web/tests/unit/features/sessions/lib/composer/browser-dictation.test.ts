import {afterEach, describe, expect, it, vi} from "vitest";
import {startBrowserDictation} from "@/features/sessions/lib/composer/browser-dictation";

class FakeRecognition {
  static current: FakeRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = "";
  onend: (() => void) | null = null;
  onerror: ((event: {error: string}) => void) | null = null;
  onresult: ((event: {resultIndex: number; results: ArrayLike<{isFinal: boolean; 0: {transcript: string}}>}) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();

  constructor() {
    FakeRecognition.current = this;
  }
}

describe("browser dictation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("starts recognition and emits only finalized speech", () => {
    vi.stubGlobal("window", {SpeechRecognition: FakeRecognition});
    vi.stubGlobal("navigator", {language: "de-DE"});
    const onText = vi.fn();
    const onListeningChange = vi.fn();

    const session = startBrowserDictation({onError: vi.fn(), onListeningChange, onText});
    const recognition = FakeRecognition.current!;
    recognition.onresult?.({
      resultIndex: 0,
      results: [
        {0: {transcript: "interim"}, isFinal: false},
        {0: {transcript: "fertiger Text"}, isFinal: true},
      ],
    });

    expect(session).not.toBeNull();
    expect(recognition.start).toHaveBeenCalledOnce();
    expect(recognition.lang).toBe("de-DE");
    expect(onListeningChange).toHaveBeenCalledWith(true);
    expect(onText).toHaveBeenCalledExactlyOnceWith("fertiger Text");
  });

  it("stops on demand and reports recognition errors", () => {
    vi.stubGlobal("window", {webkitSpeechRecognition: FakeRecognition});
    vi.stubGlobal("navigator", {language: "en-US"});
    const onError = vi.fn();
    const onListeningChange = vi.fn();

    const session = startBrowserDictation({onError, onListeningChange, onText: vi.fn()})!;
    FakeRecognition.current!.onerror?.({error: "not-allowed"});
    session.stop();

    expect(onError).toHaveBeenCalledWith("Microphone access was denied.");
    expect(onListeningChange).toHaveBeenLastCalledWith(false);
    expect(FakeRecognition.current!.stop).toHaveBeenCalledOnce();
  });
});
