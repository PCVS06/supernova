interface SpeechRecognitionResultLike {
  readonly 0: {readonly transcript: string};
  readonly isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: {readonly error: string}) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionWindow extends Window {
  readonly SpeechRecognition?: SpeechRecognitionConstructor;
  readonly webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface BrowserDictationOptions {
  readonly onError: (message: string) => void;
  readonly onListeningChange: (listening: boolean) => void;
  readonly onText: (text: string) => void;
}

export interface BrowserDictationSession {
  readonly cancel: () => void;
  readonly stop: () => void;
}

function recognitionErrorMessage(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") return "Microphone access was denied.";
  if (error === "audio-capture") return "No working microphone was found.";
  if (error === "no-speech") return "No speech was detected. Try again when you are ready.";
  return "Dictation stopped before speech could be recognized.";
}

function speechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

/** Reports whether the current browser exposes its speech-recognition service. */
export function browserDictationSupported(): boolean {
  return speechRecognitionConstructor() !== undefined;
}

/** Starts one browser-owned dictation session and emits only finalized transcript text. */
export function startBrowserDictation(options: BrowserDictationOptions): BrowserDictationSession | null {
  const {onError, onListeningChange, onText} = options;
  const Recognition = speechRecognitionConstructor();
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = typeof navigator === "undefined" ? "en-US" : navigator.language;
  recognition.onresult = (event) => {
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result?.[0]?.transcript.trim();
      if (result?.isFinal && transcript) onText(transcript);
    }
  };
  recognition.onerror = (event) => {
    onListeningChange(false);
    onError(recognitionErrorMessage(event.error));
  };
  recognition.onend = () => onListeningChange(false);

  try {
    recognition.start();
    onListeningChange(true);
  } catch {
    onListeningChange(false);
    onError("Dictation could not be started.");
    return null;
  }

  return {
    cancel: () => {
      recognition.abort();
      onListeningChange(false);
    },
    stop: () => {
      recognition.stop();
      onListeningChange(false);
    },
  };
}
