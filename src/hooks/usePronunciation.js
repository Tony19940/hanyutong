import { useCallback, useRef } from 'react';
import { useTTS } from './useTTS.js';

export function usePronunciation() {
  const audioRef = useRef(null);
  const cleanupRef = useRef(null);
  const { speak, stop: stopTts } = useTTS();

  const stop = useCallback((onStateChange) => {
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
    if (typeof onStateChange === 'function') {
      onStateChange({
        kind: 'stopped',
        currentTime: 0,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    }
  }, [stopTts]);

  const play = useCallback(async ({ text, audioSrc, lang = 'zh-CN', onStateChange }) => {
    stop(onStateChange);

    if (audioSrc) {
      try {
        const audio = new Audio(audioSrc);
        audio.preload = 'auto';
        audioRef.current = audio;
        let rafId = null;
        const emitProgress = () => {
          if (typeof onStateChange === 'function') {
            onStateChange({
              kind: 'playing',
              currentTime: audio.currentTime || 0,
              duration: Number.isFinite(audio.duration) ? audio.duration : 0,
            });
          }
          if (!audio.paused && !audio.ended) {
            rafId = window.requestAnimationFrame(emitProgress);
          }
        };
        await audio.play();
        if (typeof onStateChange === 'function') {
          onStateChange({
            kind: 'playing',
            currentTime: 0,
            duration: Number.isFinite(audio.duration) ? audio.duration : 0,
          });
        }
        rafId = window.requestAnimationFrame(emitProgress);
        await new Promise((resolve) => {
          const finalize = () => {
            audio.removeEventListener('ended', handleDone);
            audio.removeEventListener('error', handleDone);
            if (rafId) window.cancelAnimationFrame(rafId);
            if (cleanupRef.current === finalize) cleanupRef.current = null;
            if (audioRef.current === audio) audioRef.current = null;
            if (typeof onStateChange === 'function') {
              onStateChange({
                kind: 'ended',
                currentTime: Number.isFinite(audio.duration) ? audio.duration : 0,
                duration: Number.isFinite(audio.duration) ? audio.duration : 0,
              });
            }
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
