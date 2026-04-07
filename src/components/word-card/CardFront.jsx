import React from 'react';
import AudioControl from './AudioControl.jsx';

export default function CardFront({
  word,
  speakingTarget,
  onPlayWord,
  onPlayExample,
  example,
  reviewDue,
  audioError,
}) {
  return (
    <div className="word-face word-front">
      <div className="word-stage">
        <div className="word-face-topline">
          <span>{reviewDue ? 'Review due' : 'New word'}</span>
          <strong>{reviewDue ? '复习模式' : '获取新词'}</strong>
        </div>
        <div className="word-info word-head">
          <div className="wrd-cn">{word.chinese}</div>
          <div className="wrd-py">{word.pinyin}</div>
          <div className="wrd-km">{word.khmer}</div>
        </div>
        <div className="word-face-audio-row">
          <AudioControl
            active={speakingTarget === 'word'}
            error={audioError === 'word'}
            label="单词发音"
            onClick={onPlayWord}
          />
          <AudioControl
            active={speakingTarget === 'example'}
            error={audioError === 'example'}
            label="例句试听"
            onClick={onPlayExample}
            icon="fa-wave-square"
          />
        </div>
      </div>

      <div className="word-preview-card">
        <div className="word-preview-chip">Tap to flip</div>
        <div className="word-preview-cn">{example?.chinese || word.example_cn || '翻面后看例句与复习按钮'}</div>
        <div className="word-preview-km">{example?.khmer || word.example_km || '查看例句、高棉释义与掌握程度'}</div>
      </div>
    </div>
  );
}
