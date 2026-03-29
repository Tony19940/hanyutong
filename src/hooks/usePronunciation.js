import { useCallback, useRef } from 'react';
import { useTTS } from './useTTS.js';

export function usePronunciation() {
  const audioRef = useRef(null);
  const cleanupRef = useRef(null);
  const { speak, stop: stopTts } = useTTS();

  const stop = useCallback(() => {
    stopTts();

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audioRef.current = null;
  }, [stopTts]);

  const play = useCallback(async ({ text, audioSrc, lang = 'zh-CN' }) => {
    stop();

    if (audioSrc) {
      try {
        const audio = new Audio(audioSrc);
        audio.preload = 'auto';
        audioRef.current = audio;
        await audio.play();
        await new Promise((resolve) => {
          const finalize = () => {
            audio.removeEventListener('ended', handleDone);
            audio.removeEventListener('error', handleDone);
            if (cleanupRef.current === finalize) cleanupRef.current = null;
            if (audioRef.current === audio) audioRef.current = null;
            resolve();
          };
          const handleDone = () => finalize();
          cleanupRef.current = finalize;
          audio.addEventListener('ended', handleDone, { once: true });
          audio.addEventListener('error', handleDone, { once: true });
        });
        return { mode: 'audio' };
      } catch (error) {
        console.warn('Audio playback failed, falling back to TTS:', error);
      }
    }

    if (text) {
      const spoken = speak(text, lang);
      return { mode: spoken ? 'tts' : 'none' };
    }

    return { mode: 'none' };
  }, [speak, stop]);

  return { play, stop };
}
