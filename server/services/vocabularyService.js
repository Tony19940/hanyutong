import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

let cachedVocabulary = null;

function vocabularyPath() {
  const importedPath = path.join(config.rootDir, 'data', 'vocabulary.imported.json');
  if (fs.existsSync(importedPath)) {
    return importedPath;
  }

  return path.join(config.rootDir, 'data', 'vocabulary.json');
}

function validateVocabulary(vocabulary) {
  if (!Array.isArray(vocabulary)) {
    throw new Error('Vocabulary data must be an array');
  }

  for (const word of vocabulary) {
    if (
      typeof word !== 'object' ||
      word === null ||
      typeof word.id !== 'number' ||
      typeof word.chinese !== 'string'
    ) {
      throw new Error('Vocabulary entries must include numeric id and chinese text');
    }
  }
}

function loadVocabulary() {
  const filePath = vocabularyPath();
  if (!fs.existsSync(filePath)) {
    throw new Error(`Vocabulary file is missing at ${filePath}`);
  }

  const vocabulary = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  validateVocabulary(vocabulary);
  cachedVocabulary = vocabulary;
  return cachedVocabulary;
}

export function getVocabulary() {
  if (!cachedVocabulary) {
    return loadVocabulary();
  }
  return cachedVocabulary;
}

export function getVocabularyCount() {
  return getVocabulary().length;
}
