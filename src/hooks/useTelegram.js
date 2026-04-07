import { useMemo } from 'react';
import * as telegramUtils from '../utils/telegram.js';

function readCapabilities(webApp) {
  return {
    available: Boolean(webApp),
    backButton: Boolean(webApp?.BackButton),
    mainButton: Boolean(webApp?.MainButton),
    haptics: Boolean(webApp?.HapticFeedback),
    colorScheme: webApp?.colorScheme || 'dark',
    version: webApp?.version || '',
  };
}

function triggerHaptic(webApp, type = 'impact', style = 'light') {
  if (!webApp?.HapticFeedback) return;
  try {
    if (type === 'selection') {
      webApp.HapticFeedback.selectionChanged();
      return;
    }
    if (type === 'notification') {
      webApp.HapticFeedback.notificationOccurred(style);
      return;
    }
    webApp.HapticFeedback.impactOccurred(style);
  } catch {}
}

export function useTelegram() {
  const webApp = telegramUtils.getTelegramWebApp?.() || null;
  const user = telegramUtils.getTelegramUser?.() || null;

  return useMemo(() => ({
    webApp,
    user,
    caps: readCapabilities(webApp),
    init: () => telegramUtils.initTelegramApp?.(),
    expand: () => webApp?.expand?.(),
    setHeaderColor: (color) => webApp?.setHeaderColor?.(color),
    setBackgroundColor: (color) => webApp?.setBackgroundColor?.(color),
    showBackButton: (visible = true) => {
      if (!webApp?.BackButton) return;
      if (visible) webApp.BackButton.show();
      else webApp.BackButton.hide();
    },
    setBackButtonHandler: (handler) => {
      if (!webApp?.BackButton) return () => {};
      webApp.BackButton.offClick?.(handler);
      webApp.BackButton.onClick?.(handler);
      return () => webApp.BackButton.offClick?.(handler);
    },
    setMainButton: ({ text, visible = true, color, onClick } = {}) => {
      if (!webApp?.MainButton) return () => {};
      if (text) webApp.MainButton.setText(text);
      if (color) webApp.MainButton.color = color;
      if (visible) webApp.MainButton.show();
      else webApp.MainButton.hide();
      if (onClick) {
        webApp.MainButton.offClick?.(onClick);
        webApp.MainButton.onClick?.(onClick);
        return () => webApp.MainButton.offClick?.(onClick);
      }
      return () => {};
    },
    haptic: (type, style) => triggerHaptic(webApp, type, style),
    openLink: (url) => {
      if (!url) return;
      if (webApp?.openLink) {
        webApp.openLink(url);
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    },
  }), [user, webApp]);
}
