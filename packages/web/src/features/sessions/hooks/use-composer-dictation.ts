import {useRef, useState} from "react";
import type {BrowserDictationSession} from "@/features/sessions/lib/composer/browser-dictation";
import {browserDictationSupported, startBrowserDictation} from "@/features/sessions/lib/composer/browser-dictation";
import {useMountEffect} from "@/lib/use-mount-effect";

interface UseComposerDictationOptions {
  readonly onError: (message: string) => void;
  readonly onText: (text: string) => void;
}

interface ComposerDictationController {
  readonly listening: boolean;
  readonly supported: boolean;
  readonly toggle: () => void;
}

/** Owns one browser speech-recognition session for the lifetime of a composer. */
export function useComposerDictation(options: UseComposerDictationOptions): ComposerDictationController {
  const {onError, onText} = options;
  const [listening, setListening] = useState(false);
  const sessionRef = useRef<BrowserDictationSession | null>(null);
  const supported = browserDictationSupported();

  useMountEffect(() => () => sessionRef.current?.cancel());

  const toggle = (): void => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
      return;
    }

    const session = startBrowserDictation({
      onError: (message) => {
        sessionRef.current = null;
        onError(message);
      },
      onListeningChange: (active) => {
        setListening(active);
        if (!active) sessionRef.current = null;
      },
      onText,
    });
    sessionRef.current = session;
    if (!session) onError("Dictation is not available in this browser.");
  };

  return {listening, supported, toggle};
}
