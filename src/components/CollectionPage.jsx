import React, { useState, useEffect, useCallback } from 'react';
import WordCard from './WordCard.jsx';
import { api } from '../utils/api.js';
import { usePronunciation } from '../hooks/usePronunciation.js';

export default function CollectionPage({ vocabulary, onBack }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [loading, setLoading] = useState(true);
  const { play } = usePronunciation();

  const loadCollection = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getCollection();
      setBookmarks(data.bookmarks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const getWord = (wordId) => vocabulary.find((w) => w.id === wordId);

  const handleSelectWord = (wordId) => {
    const word = getWord(wordId);
    if (word) setSelectedWord(word);
  };

  const handleSwipeLeft = async () => {
    if (selectedWord) {
      try {
        await api.recordAction(selectedWord.id, 'learned');
      } catch (e) {
        console.error(e);
      }
      setSelectedWord(null);
      loadCollection();
    }
  };

  const handleSwipeRight = async () => {
    setSelectedWord(null);
  };

  if (selectedWord) {
    return (
      <div className="coll-detail page-enter">
        <div className="detail-back">
          <button type="button" className="back-btn" onClick={() => setSelectedWord(null)}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="back-title">收藏词库</div>
        </div>

        <WordCard
          word={selectedWord}
          index={0}
          total={bookmarks.length}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          mode="collection"
          autoplaySequence
        />

        <div className="swipe-hint">
          <div className="hint-pill">左滑移出收藏，右滑保留。</div>
        </div>

        <style>{`
          .coll-detail { flex: 1; display: flex; flex-direction: column; position: relative; z-index: 10; }
          .detail-back { padding: 4px 22px 14px; display: flex; align-items: center; gap: 10px; }
          .back-btn {
            width: 38px; height: 38px; border-radius: 13px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.72);
          }
          .back-title { font-size: 15px; font-weight: 700; color: #fff; }
          .swipe-hint { padding: 12px 18px 0; text-align: center; }
          .hint-pill {
            display: inline-flex; align-items: center; gap: 6px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 20px; padding: 8px 16px;
            font-size: 11px; color: rgba(255,255,255,0.52);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="coll-page page-enter">
      <div className="coll-hd">
        <div className="coll-top">
          {onBack ? (
            <button type="button" className="page-back-btn" onClick={onBack}>
              <i className="fas fa-arrow-left"></i>
            </button>
          ) : <div />}
          <div className="coll-title-wrap">
            <div className="pg-title">收藏词库</div>
            <div className="pg-sub">右滑保存的词会出现在这里。</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="coll-loading">
          <div className="coll-loading-spinner"></div>
          <div className="coll-loading-text">加载收藏...</div>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="coll-empty animate-float-up">
          <div className="coll-empty-emoji">☆</div>
          <div className="coll-empty-title">还没有收藏</div>
          <div className="coll-empty-sub">从学习页右滑单词即可加入。</div>
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
                <div className="ci-txt">
                  <div className="ci-cn">{word.chinese}</div>
                  <div className="ci-py">{word.pinyin}</div>
                  <div className="ci-km">{word.khmer}</div>
                </div>
                <div className="ci-meta">
                  <div
                    className="ci-play"
                    onClick={(e) => {
                      e.stopPropagation();
                      play({ text: word.chinese, audioSrc: word.audio_word });
                    }}
                  >
                    <i className="fas fa-play"></i>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .coll-page { flex: 1; display: flex; flex-direction: column; position: relative; z-index: 10; overflow-y: auto; padding-bottom: 90px; }
        .coll-page::-webkit-scrollbar { display: none; }
        .coll-hd { padding: 6px 22px 18px; }
        .coll-top { display: flex; align-items: center; gap: 12px; }
        .page-back-btn {
          width: 38px; height: 38px; border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.72);
          flex-shrink: 0;
        }
        .pg-title { font-size: 26px; font-weight: 800; color: #fff; font-family: 'Manrope', 'Noto Sans SC', sans-serif; }
        .pg-sub { margin-top: 4px; font-size: 12px; color: rgba(228,234,255,0.58); }
        .coll-loading { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
        .coll-loading-spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.06); border-top-color: #a78bfa; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .coll-loading-text { font-size: 12px; color: rgba(228,234,255,0.5); }
        .coll-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 40px 22px; }
        .coll-empty-emoji { font-size: 48px; color: rgba(255,255,255,0.5); }
        .coll-empty-title { font-size: 18px; color: #fff; font-weight: 700; }
        .coll-empty-sub { font-size: 12px; color: rgba(228,234,255,0.56); }
        .coll-list { padding: 0 22px; display: flex; flex-direction: column; gap: 10px; }
        .ci {
          display: flex; align-items: center; gap: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 14px;
          cursor: pointer;
        }
        .ci-txt { flex: 1; }
        .ci-cn { font-size: 18px; font-weight: 700; color: #fff; font-family: 'Manrope', 'Noto Sans SC', sans-serif; }
        .ci-py { margin-top: 3px; font-size: 12px; color: rgba(170,189,255,0.82); }
        .ci-km { margin-top: 3px; font-size: 12px; color: rgba(228,234,255,0.56); }
        .ci-play {
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07);
          display: flex; align-items: center; justify-content: center; color: #fff;
        }
      `}</style>
    </div>
  );
}
