import { useCallback, useRef } from 'react';

export function useTTS() {
  const speakingRef = useRef(false);

  const speak = useCallback((text, lang = 'zh-CN') => {
    if (!window.speechSynthesis || !text) return false;
    if (speakingRef.current) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.85;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find((voice) => voice.lang.startsWith('zh'));
    if (zhVoice) utterance.voice = zhVoice;

    speakingRef.current = true;
    utterance.onend = () => { speakingRef.current = false; };
    utterance.onerror = () => { speakingRef.current = false; };

    window.speechSynthesis.speak(utterance);
    return true;
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      speakingRef.current = false;
    }
  }, []);

  return { speak, stop };
}
