import React, { createContext, useContext, useMemo } from 'react';
import zhCN from './dictionaries/zh-CN.json';
import en from './dictionaries/en.json';
import km from './dictionaries/km.json';
import { getLanguageMeta, getNextLanguage, languageOptions } from './languageMeta.js';

const dictionaries = {
  'zh-CN': zhCN,
  en,
  km,
};

function getValue(target, path) {
  return path.split('.').reduce((result, key) => (result && result[key] !== undefined ? result[key] : undefined), target);
}

function formatMessage(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''));
}

function createTranslation(language) {
  const dictionary = dictionaries[language] || dictionaries['zh-CN'];
  return (key, params = {}) => {
    const value = getValue(dictionary, key) ?? getValue(dictionaries['zh-CN'], key) ?? key;
    return typeof value === 'string' ? formatMessage(value, params) : value;
  };
}

const AppShellContext = createContext(null);

export function AppShellProvider({ value, children }) {
  const translator = useMemo(() => createTranslation(value.language), [value.language]);
  const contextValue = useMemo(
    () => ({
      ...value,
      t: translator,
      languageMeta: getLanguageMeta(value.language),
      languageOptions,
      getNextLanguage: () => getNextLanguage(value.language),
    }),
    [translator, value]
  );
  return React.createElement(AppShellContext.Provider, { value: contextValue }, children);
}

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error('useAppShell must be used inside AppShellProvider');
  }
  return context;
}

export { createTranslation, dictionaries, getLanguageMeta, getNextLanguage, languageOptions };
