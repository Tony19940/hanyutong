import React from 'react';
import AudioControl from './AudioControl.jsx';

const REVIEW_OPTIONS = [
  { value: 2, label: '困难', tone: 'danger' },
  { value: 4, label: '一般', tone: 'neutral' },
  { value: 5, label: '简单', tone: 'success' },
];

export default function CardBack({
  examples,
  speakingTarget,
  onPlayExample,
  onReview,
  showReviewActions,
  audioError,
}) {
  return (
    <div className="word-face word-back">
      <div className="word-back-copy">
        <div className="word-face-topline">
          <span>Examples</span>
          <strong>例句与掌握度</strong>
        </div>
        <div className="word-example-stack">
          {examples.map((example, index) => (
            <div key={example.id} className="word-example-card">
              <div className="word-example-index">{String(index + 1).padStart(2, '0')}</div>
              <div className="word-example-copy">
                <div className="word-example-cn">{example.chinese}</div>
                {example.pinyin ? <div className="word-example-py">{example.pinyin}</div> : null}
                <div className="word-example-km">{example.khmer}</div>
              </div>
              <AudioControl
                active={speakingTarget === example.id}
                error={audioError === example.id}
                label="播放"
                onClick={() => onPlayExample(example)}
              />
            </div>
          ))}
        </div>
      </div>

      {showReviewActions ? (
        <div className="review-score-row">
          {REVIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`review-score-btn ${option.tone}`}
              onClick={() => onReview(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="review-hint">翻面主要用于确认例句和音频，左右滑仍然保持“学会 / 收藏”语义。</div>
      )}
    </div>
  );
}
