import React, { useState, useEffect, useCallback } from 'react';
import WordCard from './WordCard.jsx';
import { api } from '../utils/api.js';
import { useTTS } from '../hooks/useTTS.js';

export default function CollectionPage({ user, vocabulary }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const { speak } = useTTS();

  const loadCollection = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getCollection(user.id);
      setBookmarks(data.bookmarks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const getWord = (wordId) => {
    return vocabulary.find(w => w.id === wordId);
  };

  const handleSelectWord = (wordId) => {
    const word = getWord(wordId);
    if (word) setSelectedWord(word);
  };

  const handleSwipeLeft = async () => {
    // Remove from collection (mark as learned)
    if (selectedWord) {
      try {
        await api.recordAction(user.id, selectedWord.id, 'learned');
      } catch (e) { console.error(e); }
      setSelectedWord(null);
      loadCollection();
    }
  };

  const handleSwipeRight = async () => {
    // Keep in collection
    setSelectedWord(null);
  };

  const handleBack = () => {
    setSelectedWord(null);
  };

  // Detail view
  if (selectedWord) {
    return (
      <div className="coll-detail page-enter">
        <div className="detail-back">
          <div className="back-btn" onClick={handleBack}>
            <i className="fas fa-arrow-left"></i>
          </div>
          <div className="back-title">បញ្ជីរៀន</div>
          <div className="bk-badge">
            <i className="fas fa-bookmark"></i>
          </div>
        </div>

        <WordCard
          word={selectedWord}
          index={0}
          total={bookmarks.length}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          mode="collection"
        />

        <div className="swipe-hint">
          <div className="hint-pill">
            <i className="fas fa-hand-point-up"></i>
            <span>ស្វាយឆ្វេង / ស្ដាំ ដើម្បីបន្ត</span>
          </div>
        </div>

        <style>{`
          .coll-detail {
            flex: 1; display: flex; flex-direction: column;
            position: relative; z-index: 10;
          }
          .detail-back {
            padding: 0 22px 14px;
            display: flex; align-items: center; gap: 10px;
          }
          .back-btn {
            width: 38px; height: 38px;
            background: rgba(255,255,255,0.06); border-radius: 13px;
            display: flex; align-items: center; justify-content: center;
            font-size: 13px; color: rgba(255,255,255,0.65);
            cursor: pointer;
            transition: background var(--transition-fast), transform var(--transition-fast);
            border: 1px solid rgba(255,255,255,0.08);
          }
          .back-btn:active { 
            background: rgba(255,255,255,0.12); 
            transform: scale(0.92);
          }
          .back-title {
            font-size: 15px; font-weight: 600; color: #fff;
            font-family: 'Noto Sans Khmer', sans-serif;
          }
          .bk-badge {
            margin-left: auto;
            width: 38px; height: 38px;
            background: rgba(251,191,36,0.12); border-radius: 13px;
            display: flex; align-items: center; justify-content: center;
            font-size: 14px; color: #fbbf24;
            border: 1px solid rgba(251,191,36,0.2);
          }
          .swipe-hint {
            padding: 12px 18px 0; text-align: center;
            position: relative; z-index: 10;
            animation: fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
          }
          .hint-pill {
            display: inline-flex; align-items: center; gap: 6px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 20px; padding: 7px 16px;
            animation: breathe 3s ease-in-out infinite;
          }
          .hint-pill i { color: rgba(255,255,255,0.25); font-size: 12px; }
          .hint-pill span {
            font-size: 11px; color: rgba(255,255,255,0.3);
            font-family: 'Noto Sans Khmer', sans-serif;
          }
        `}</style>
      </div>
    );
  }

  // List view
  return (
    <div className="coll-page page-enter">
      <div className="coll-hd">
        <div className="pg-title">បញ្ជីរៀន</div>
        <div className="pg-sub">បានរក្សាទុក {bookmarks.length} ពាក្យ</div>
      </div>

      {loading ? (
        <div className="coll-loading">
          <div className="coll-loading-spinner"></div>
          <div className="coll-loading-text">កំពុងផ្ទុក...</div>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="coll-empty animate-float-up">
          <div className="coll-empty-emoji">📚</div>
          <div className="coll-empty-title">មិនទាន់មានពាក្យក្នុងបញ្ជី</div>
          <div className="coll-empty-sub">收藏夹为空</div>
          <div className="coll-empty-hint">
            <i className="fas fa-arrow-right"></i>
            <span>ស្វាយស្ដាំលើកាតពាក្យដើម្បីរក្សាទុក</span>
          </div>
        </div>
      ) : (
        <div className="coll-list">
          {bookmarks.map((bm, idx) => {
            const word = getWord(bm.word_id);
            if (!word) return null;
            return (
              <div 
                className="ci animate-float-up" 
                key={bm.word_id} 
                onClick={() => handleSelectWord(bm.word_id)}
                style={{ animationDelay: `${Math.min(idx * 0.05, 0.4)}s` }}
              >
                <div className="ci-emoji">{word.emoji || '📝'}</div>
                <div className="ci-txt">
                  <div className="ci-cn">{word.chinese}</div>
                  <div className="ci-py">{word.pinyin}</div>
                  <div className="ci-km">{word.khmer}</div>
                </div>
                <div className="ci-meta">
                  <div className="ci-play" onClick={(e) => { e.stopPropagation(); speak(word.chinese); }}>
                    <i className="fas fa-play"></i>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .coll-page {
          flex: 1; display: flex; flex-direction: column;
          position: relative; z-index: 10;
          overflow-y: auto; padding-bottom: 90px;
        }
        .coll-page::-webkit-scrollbar { display: none; }
        .coll-hd { padding: 4px 22px 18px; }
        .pg-title {
          font-size: 24px; font-weight: 700; color: #fff;
          margin-bottom: 4px; font-family: 'Noto Sans Khmer', sans-serif;
        }
        .pg-sub {
          font-size: 12px; color: var(--text-muted);
          font-family: 'Noto Sans Khmer', sans-serif;
        }

        /* Loading state */
        .coll-loading {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 14px;
        }
        .coll-loading-spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(255,255,255,0.06);
          border-top-color: #a78bfa; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .coll-loading-text {
          font-size: 12px; color: var(--text-muted);
          font-family: 'Noto Sans Khmer', sans-serif;
        }

        /* Empty state */
        .coll-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 8px;
          padding: 40px 22px;
        }
        .coll-empty-emoji { font-size: 56px; margin-bottom: 6px; }
        .coll-empty-title {
          font-size: 16px; color: var(--text-sub);
          font-family: 'Noto Sans Khmer', sans-serif; font-weight: 500;
        }
        .coll-empty-sub {
          font-size: 11px; color: var(--text-muted);
          font-family: 'Noto Sans SC', sans-serif;
        }
        .coll-empty-hint {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 14px; padding: 8px 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          font-size: 11px; color: var(--text-muted);
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .coll-empty-hint i { color: #fbbf24; font-size: 10px; }

        /* List */
        .coll-list {
          padding: 0 22px;
          display: flex; flex-direction: column; gap: 9px;
        }
        .ci {
          display: flex; align-items: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 13px 14px; gap: 12px;
          cursor: pointer; position: relative; overflow: hidden;
          transition: background var(--transition-fast), border-color var(--transition-fast), transform 0.15s ease;
        }
        .ci:active { 
          background: rgba(255,255,255,0.10); 
          transform: scale(0.98);
        }
        .ci::before {
          content: ''; position: absolute;
          left: 0; top: 0; bottom: 0; width: 3px;
          background: linear-gradient(180deg, #7c3aed, #2563eb);
          border-radius: 2px 0 0 2px;
          opacity: 0.7;
        }
        .ci-emoji {
          font-size: 36px;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
          flex-shrink: 0;
          transition: transform var(--transition-spring);
        }
        .ci:active .ci-emoji { transform: scale(0.9); }
        .ci-txt { flex: 1; }
        .ci-cn {
          font-size: 17px; font-weight: 600; color: #fff;
          font-family: 'Noto Serif SC', serif;
          letter-spacing: 2px; margin-bottom: 2px;
        }
        .ci-py { font-size: 11px; color: #a78bfa; margin-bottom: 2px; }
        .ci-km {
          font-size: 12px; color: var(--text-sub);
          font-family: 'Noto Sans Khmer', sans-serif;
        }
        .ci-meta {
          display: flex; flex-direction: column;
          align-items: flex-end; gap: 5px;
        }
        .ci-play {
          width: 32px; height: 32px;
          background: rgba(124,58,237,0.14); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; color: #a78bfa;
          transition: background var(--transition-fast), transform var(--transition-fast);
          border: 1px solid rgba(124,58,237,0.2);
        }
        .ci-play:active { 
          background: rgba(124,58,237,0.3); 
          transform: scale(0.88);
        }
      `}</style>
    </div>
  );
}
