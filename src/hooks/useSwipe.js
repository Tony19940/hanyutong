import { useRef, useCallback } from 'react';

const SWIPE_THRESHOLD = 80;
const ROTATION_FACTOR = 0.06;

export function useSwipe({ onSwipeLeft, onSwipeRight, enabled = true }) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const elementRef = useRef(null);

  const getOverlayState = useCallback((dx) => {
    if (dx < -30) return 'left';
    if (dx > 30) return 'right';
    return null;
  }, []);

  const updateVisuals = useCallback((dx) => {
    const el = elementRef.current;
    if (!el) return;

    el.style.transform = `translateX(${dx}px) rotate(${dx * ROTATION_FACTOR}deg)`;
    el.style.transition = 'none';

    // Dispatch custom event for overlay state
    const direction = getOverlayState(dx);
    el.dispatchEvent(new CustomEvent('swipemove', { detail: { dx, direction } }));
  }, [getOverlayState]);

  const handleStart = useCallback((clientX) => {
    if (!enabled) return;
    isDragging.current = true;
    startX.current = clientX;
    currentX.current = clientX;

    const el = elementRef.current;
    if (el) el.style.transition = 'none';
  }, [enabled]);

  const handleMove = useCallback((clientX) => {
    if (!isDragging.current) return;
    currentX.current = clientX;
    const dx = clientX - startX.current;
    updateVisuals(dx);
  }, [updateVisuals]);

  const handleEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const dx = currentX.current - startX.current;
    const el = elementRef.current;

    if (el) {
      el.style.transition = 'transform 0.35s cubic-bezier(.25,.8,.25,1)';
    }

    if (dx < -SWIPE_THRESHOLD && onSwipeLeft) {
      // Animate off-screen left
      if (el) {
        el.style.transform = 'translateX(-120%) rotate(-12deg)';
        el.style.opacity = '0';
      }
      setTimeout(() => {
        onSwipeLeft();
        if (el) {
          el.style.transition = 'none';
          el.style.transform = '';
          el.style.opacity = '';
        }
      }, 300);
    } else if (dx > SWIPE_THRESHOLD && onSwipeRight) {
      // Animate off-screen right
      if (el) {
        el.style.transform = 'translateX(120%) rotate(12deg)';
        el.style.opacity = '0';
      }
      setTimeout(() => {
        onSwipeRight();
        if (el) {
          el.style.transition = 'none';
          el.style.transform = '';
          el.style.opacity = '';
        }
      }, 300);
    } else {
      // Snap back
      if (el) el.style.transform = '';
      if (el) el.dispatchEvent(new CustomEvent('swipemove', { detail: { dx: 0, direction: null } }));
    }
  }, [onSwipeLeft, onSwipeRight]);

  const bindEvents = useCallback((node) => {
    if (!node) return;
    elementRef.current = node;

    // Touch events
    node.addEventListener('touchstart', (e) => handleStart(e.touches[0].clientX), { passive: true });
    node.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientX), { passive: true });
    node.addEventListener('touchend', handleEnd);

    // Mouse events
    node.addEventListener('mousedown', (e) => handleStart(e.clientX));
    node.addEventListener('mousemove', (e) => handleMove(e.clientX));
    node.addEventListener('mouseup', handleEnd);
    node.addEventListener('mouseleave', () => {
      if (isDragging.current) handleEnd();
    });
  }, [handleStart, handleMove, handleEnd]);

  return { bindEvents, elementRef };
}
