import React from 'react';

export default function QuickActions({
  mode,
  flipped,
  onFlip,
  onLeftAction,
  onRightAction,
  sequenceActive,
  onToggleSequence,
}) {
  const leftLabel = mode === 'collection' ? '移出收藏' : '学会';
  const rightLabel = mode === 'collection' ? '保留' : '收藏';

  return (
    <div className="word-quick-actions">
      <button type="button" className="word-quick ghost" onClick={onLeftAction}>
        <i className="fas fa-arrow-left"></i>
        <span>{leftLabel}</span>
      </button>
      <button type="button" className="word-quick center" onClick={onFlip}>
        <i className={`fas ${flipped ? 'fa-clone' : 'fa-repeat'}`}></i>
        <span>{flipped ? '看正面' : '翻面'}</span>
      </button>
      <button type="button" className="word-quick ghost" onClick={onRightAction}>
        <i className="fas fa-bookmark"></i>
        <span>{rightLabel}</span>
      </button>
      <button type="button" className={`word-quick slim ${sequenceActive ? 'active' : ''}`} onClick={onToggleSequence}>
        <i className={`fas ${sequenceActive ? 'fa-pause' : 'fa-play'}`}></i>
        <span>{sequenceActive ? '暂停连播' : '恢复连播'}</span>
      </button>
    </div>
  );
}
