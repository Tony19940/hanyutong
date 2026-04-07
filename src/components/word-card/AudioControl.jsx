import React from 'react';

export default function AudioControl({ active, error, label, onClick, icon = 'fa-volume-up' }) {
  return (
    <button
      type="button"
      className={`word-audio-btn ${active ? 'active' : ''} ${error ? 'error' : ''}`}
      onClick={onClick}
    >
      <i className={`fas ${error ? 'fa-rotate-right' : icon}`}></i>
      <span>{error ? '重试' : label}</span>
    </button>
  );
}
