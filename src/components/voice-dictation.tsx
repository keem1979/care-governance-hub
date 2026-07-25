"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { insertDictation } from "@/lib/voice-dictation";

type DictationTarget = HTMLInputElement | HTMLTextAreaElement;

type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: RecognitionResult;
  };
};

type RecognitionErrorEvent = {
  error: string;
};

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
};

type RecognitionConstructor = new () => Recognition;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

const SUPPORTED_INPUT_TYPES = new Set(["text", "search", "email", "tel", "url"]);

function isDictationTarget(element: EventTarget | null): element is DictationTarget {
  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }
  return (
    element instanceof HTMLInputElement &&
    SUPPORTED_INPUT_TYPES.has(element.type) &&
    !element.disabled &&
    !element.readOnly
  );
}

function setNativeValue(target: DictationTarget, value: string) {
  const prototype =
    target instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(target, value);
  target.dispatchEvent(new Event("input", { bubbles: true }));
}

function messageForError(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Microphone permission was blocked. Allow microphone access and try again.";
  }
  if (error === "audio-capture") return "No working microphone was found.";
  if (error === "no-speech") return "No speech was heard. Try again.";
  return "Voice typing is unavailable right now. You can continue typing normally.";
}

export function VoiceDictation() {
  const [target, setTarget] = useState<DictationTarget | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const recognitionRef = useRef<Recognition | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const supported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);

  useEffect(() => {
    function handleFocus(event: FocusEvent) {
      if (isDictationTarget(event.target)) {
        setTarget(event.target);
        setMessage("");
      } else if (event.target !== buttonRef.current) {
        setTarget(null);
      }
    }

    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, []);

  useEffect(() => {
    if (!target) return;
    const activeTarget = target;

    function updatePosition() {
      const rect = activeTarget.getBoundingClientRect();
      const width = 118;
      setPosition({
        left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
        top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 48)),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [target]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    [],
  );

  function stopDictation() {
    recognitionRef.current?.stop();
  }

  function startDictation() {
    if (!target || !target.isConnected) return;
    const RecognitionApi =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!RecognitionApi) {
      setMessage("Voice typing is not supported by this browser.");
      return;
    }

    const recognition = new RecognitionApi();
    recognition.continuous = false;
    recognition.interimResults = false;
    const pageLanguage = document.documentElement.lang;
    recognition.lang = pageLanguage === "en" ? "en-GB" : pageLanguage || "en-GB";
    recognitionRef.current = recognition;
    setMessage("Listening… Speak clearly, then pause.");
    setListening(true);

    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) {
          transcript += event.results[index][0].transcript;
        }
      }
      if (!transcript.trim() || !target.isConnected) return;

      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? start;
      const insertion = insertDictation(target.value, start, end, transcript);
      setNativeValue(target, insertion.value);
      target.focus();
      target.setSelectionRange(insertion.caret, insertion.caret);
      setMessage("Voice typing added.");
    };

    recognition.onerror = (event) => {
      setMessage(messageForError(event.error));
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setMessage("Voice typing could not start. Try again.");
    }
  }

  if (!supported || !target) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`fixed z-[70] inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-white shadow-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
          listening
            ? "bg-red-700 hover:bg-red-800"
            : "bg-brand hover:bg-brand-dark"
        }`}
        style={position}
        onPointerDown={(event) => event.preventDefault()}
        onClick={listening ? stopDictation : startDictation}
        aria-label={listening ? "Stop voice typing" : "Start voice typing"}
        aria-pressed={listening}
        title="Voice typing. Audio is handled by your browser and is not stored by this app."
      >
        {listening ? (
          <Square aria-hidden="true" size={15} fill="currentColor" />
        ) : (
          <Mic aria-hidden="true" size={17} />
        )}
        {listening ? "Stop" : "Voice type"}
      </button>
      <p
        className="fixed bottom-3 left-1/2 z-[70] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full bg-slate-950 px-4 py-2 text-center text-xs text-white shadow-lg empty:hidden"
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    </>
  );
}
