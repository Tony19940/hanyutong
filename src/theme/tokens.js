export const themeTokens = {
  dark: {
    name: 'dark',
  },
  light: {
    name: 'light',
  },
};

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
}

