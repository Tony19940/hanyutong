let audioContext = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  return audioContext;
}

function playToneSequence(steps) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  steps.forEach((step) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = step.type || 'sine';
    oscillator.frequency.setValueAtTime(step.frequency, now + step.at);
    gain.gain.setValueAtTime(0.0001, now + step.at);
    gain.gain.exponentialRampToValueAtTime(step.gain ?? 0.08, now + step.at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + step.at + step.duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now + step.at);
    oscillator.stop(now + step.at + step.duration + 0.02);
  });
}

export function playSuccessFeedback() {
  playToneSequence([
    { at: 0, duration: 0.08, frequency: 740, type: 'triangle', gain: 0.055 },
    { at: 0.07, duration: 0.09, frequency: 988, type: 'triangle', gain: 0.07 },
    { at: 0.14, duration: 0.12, frequency: 1318, type: 'triangle', gain: 0.08 },
    { at: 0.18, duration: 0.18, frequency: 1760, type: 'sine', gain: 0.04 },
  ]);
}

export function playErrorFeedback() {
  playToneSequence([
    { at: 0, duration: 0.1, frequency: 420, type: 'square', gain: 0.045 },
    { at: 0.08, duration: 0.1, frequency: 280, type: 'square', gain: 0.05 },
    { at: 0.16, duration: 0.16, frequency: 180, type: 'sawtooth', gain: 0.042 },
  ]);
}

export function vibratePattern(pattern) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  return navigator.vibrate(pattern);
}
