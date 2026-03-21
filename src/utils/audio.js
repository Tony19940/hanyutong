export function isLikelyMobileDevice() {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
}

export function shouldAutoplayPronunciation() {
  return !isLikelyMobileDevice();
}
