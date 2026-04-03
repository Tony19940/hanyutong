import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api.js';
import { playErrorFeedback, playSuccessFeedback, vibratePattern } from '../utils/feedback.js';
import { createQuestRounds } from '../utils/quest.js';
import { getPrimaryExample } from '../utils/vocabulary.js';
import { usePronunciation } from '../hooks/usePronunciation.js';

const QUEST_SIZE = 5;
const QUEST_POOL_SIZE = 18;
const MAX_HEARTS = 3;

/* Sapphire Heart component */
function SapphireHeart({ active }) {
  return (
    <div className={`sapphire-heart ${active ? 'active' : 'empty'}`}>
      <svg width="28" height="26" viewBox="0 0 28 26" fill="none">
        <defs>
          <linearGradient id="sapphireGrad" x1="14" y1="0" x2="14" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={active ? 'var(--brand-teal)' : 'rgba(255,255,255,0.16)'} />
            <stop offset="40%" stopColor={active ? 'var(--button-primary-start)' : 'rgba(255,255,255,0.12)'} />
            <stop offset="100%" stopColor={active ? 'var(--brand-green)' : 'rgba(255,255,255,0.08)'} />
          </linearGradient>
          <linearGradient id="sapphireShine" x1="8" y1="2" x2="20" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <path
          d="M14 24.35l-1.45-1.32C5.4 16.36 2 13.28 2 9.5 2 6.42 4.42 4 7.5 4c1.74 0 3.41.81 4.5 2.09C13.09 4.81 14.76 4 16.5 4 19.58 4 22 6.42 22 9.5c0 3.78-3.4 6.86-10.55 13.54L14 24.35z"
          fill="url(#sapphireGrad)"
          stroke={active ? 'rgba(225,191,83,0.75)' : 'rgba(225,191,83,0.18)'}
          strokeWidth="1.5"
          transform="translate(2, 0)"
        />
        {active && (
          <path
            d="M10 8c1.2-1.6 3-2.2 4.5-1.8"
            stroke="url(#sapphireShine)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            transform="translate(2, 0)"
          />
        )}
      </svg>
    </div>
  );
}

/* Golden crown/pagoda decoration */
function GoldenCrown() {
  return (
    <div className="golden-crown" aria-hidden="true">
      <svg width="100" height="56" viewBox="0 0 100 56" fill="none">
        <defs>
          <linearGradient id="crownGold" x1="50" y1="0" x2="50" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--brand-gold)" />
            <stop offset="50%" stopColor="#c69a2f" />
            <stop offset="100%" stopColor="#6f5220" />
          </linearGradient>
        </defs>
        {/* Pagoda spires */}
        <path d="M50 2l6 16h10l4 12h8l6 16H16l6-16h8l4-12h10L50 2z" fill="url(#crownGold)" opacity="0.35" />
        {/* Small side spires */}
        <path d="M20 46l3-10h4l3-8 3 8h4l3 10" fill="none" stroke="rgba(245,216,143,0.3)" strokeWidth="1" />
        <path d="M66 46l3-10h4l3-8 3 8h4l3 10" fill="none" stroke="rgba(245,216,143,0.3)" strokeWidth="1" />
        {/* Base line */}
        <path d="M10 50h80" stroke="rgba(245,216,143,0.4)" strokeWidth="1.5" />
        {/* Decorative curve */}
        <path d="M15 48c20-3 30-14 35-14s15 11 35 14" fill="none" stroke="rgba(245,216,143,0.5)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function LegacyQuizPage({ user }) {
  const [questWords, setQuestWords] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [stats, setStats] = useState({ total: 0, learned: 0, remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [learnedInQuest, setLearnedInQuest] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [answerState, setAnswerState] = useState(null);
  const [gameState, setGameState] = useState('playing');
  const { play } = usePronunciation();

  const loadQuest = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getNextWords(QUEST_POOL_SIZE, 'quiz');
      const nextQuestWords = data.words.slice(0, QUEST_SIZE);
      setQuestWords(nextQuestWords);
      setRounds(createQuestRounds(nextQuestWords, data.words));
      setCurrentRoundIndex(0);
      setStats({ total: data.total, learned: data.learned, remaining: data.remaining });
      setHearts(MAX_HEARTS);
      setScore(0);
      setCombo(0);
      setLearnedInQuest(0);
      setBookmarkedIds([]);
      setSelectedOptionId(null);
      setAnswerState(null);
      setGameState(nextQuestWords.length ? 'playing' : 'empty');
    } catch (err) {
      console.error('Failed to load quest:', err);
      // Preview fallback
      if (window.location.hash === '#preview') {
        const mockWords = [
          { id: 1, chinese: '胖', pinyin: 'pàng', khmer: 'ជាត់ / ជាត់ទ្រលុកទ្រលន់', example_cn: '宝宝胖胖的。', example_km: 'កូនក្មេងជាត់ទ្រលុកទ្រលន់។' },
          { id: 2, chinese: '瘦', pinyin: 'shòu', khmer: 'ស្គម', example_cn: '他很瘦。', example_km: 'គាត់ស្គមណាស់។' },
          { id: 3, chinese: '帮', pinyin: 'bāng', khmer: 'ជួយ', example_cn: '请帮我。', example_km: 'សូមជួយខ្ញុំ។' },
          { id: 4, chinese: '明白', pinyin: 'míngbai', khmer: 'យល់', example_cn: '我明白了。', example_km: 'ខ្ញុំយល់ហើយ។' },
          { id: 5, chinese: '高兴', pinyin: 'gāoxìng', khmer: 'រីករាយ', example_cn: '很高兴认识你。', example_km: 'រីករាយដែលបានស្គាល់អ្នក។' },
        ];
        const mockRounds = mockWords.map((word) => ({
          word,
          type: 'khmer_to_chinese',
          promptLabel: '看高棉语，选中文',
          promptValue: word.khmer,
          promptSubValue: word.pinyin,
          correctOptionId: word.id,
          options: [
            { id: 1, primary: '帮', secondary: 'bāng' },
            { id: 4, primary: '明白', secondary: 'míngbai' },
            { id: 2, primary: '瘦', secondary: 'shòu' },
            { id: word.id, primary: word.chinese, secondary: word.pinyin },
          ].sort(() => Math.random() - 0.5),
        }));
        setQuestWords(mockWords);
        setRounds(mockRounds);
        setCurrentRoundIndex(0);
        setStats({ total: 900, learned: 69, remaining: 831 });
        setHearts(MAX_HEARTS);
        setScore(0);
        setCombo(0);
        setLearnedInQuest(0);
        setBookmarkedIds([]);
        setSelectedOptionId(null);
        setAnswerState(null);
        setGameState('playing');
      } else {
        setGameState('empty');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuest();
  }, [loadQuest]);

  const currentRound = rounds[currentRoundIndex];
  const currentWord = currentRound?.word ?? null;
  const currentExample = getPrimaryExample(currentWord);
  const questProgress = rounds.length ? Math.round((currentRoundIndex / rounds.length) * 100) : 0;
  const globalProgress = stats.total > 0 ? Math.round((stats.learned / stats.total) * 100) : 0;
  const starCount = useMemo(() => {
    if (hearts === 3) return 3;
    if (hearts === 2) return 2;
    if (hearts === 1) return 1;
    return 0;
  }, [hearts]);

  useEffect(() => {
    if (!currentRound) return;
    if (currentRound.type !== 'listen_to_meaning') return;
    const timer = setTimeout(() => {
      play({ text: currentWord?.chinese, audioSrc: currentWord?.audio_word });
    }, 260);
    return () => clearTimeout(timer);
  }, [currentRound, currentWord?.audio_word, currentWord?.chinese, play]);

  useEffect(() => {
    if (!answerState || !currentExample?.chinese) return;
    const timer = setTimeout(() => {
      play({
        text: currentExample.chinese,
        audioSrc: currentExample.audio ?? currentWord?.audio_example,
      });
    }, 240);
    return () => clearTimeout(timer);
  }, [answerState, currentExample?.audio, currentExample?.chinese, currentWord?.audio_example, play]);

  const moveToNextRound = useCallback(() => {
    if (currentRoundIndex >= rounds.length - 1) {
      setGameState('completed');
      return;
    }
    setCurrentRoundIndex((value) => value + 1);
    setSelectedOptionId(null);
    setAnswerState(null);
  }, [currentRoundIndex, rounds.length]);

  const handleOptionSelect = async (optionId) => {
    if (!currentRound || answerState || gameState !== 'playing') return;
    setSelectedOptionId(optionId);
    const isCorrect = optionId === currentRound.correctOptionId;

    if (isCorrect) {
      setAnswerState('correct');
      playSuccessFeedback();
      vibratePattern([18, 26, 18]);
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setScore((value) => value + 120 + nextCombo * 15);
      try {
        const result = await api.recordAction(currentWord.id, 'learned');
        setLearnedInQuest((value) => value + 1);
        setStats((prev) => ({
          ...prev,
          learned: prev.learned + (result.countedAsLearned ? 1 : 0),
          remaining: Math.max(prev.remaining - (result.countedAsLearned ? 1 : 0), 0),
        }));
      } catch (error) {
        console.error(error);
      }
      return;
    }

    const nextHearts = hearts - 1;
    setAnswerState('wrong');
    playErrorFeedback();
    vibratePattern([48, 30, 72]);
    setCombo(0);
    setHearts(nextHearts);
    if (nextHearts <= 0) setGameState('failed');
  };

  const handleBookmark = async () => {
    if (!currentWord || answerState === 'correct') return;
    try {
      await api.recordAction(currentWord.id, 'bookmarked');
      setBookmarkedIds((value) => (value.includes(currentWord.id) ? value : [...value, currentWord.id]));
    } catch (error) {
      console.error(error);
    }
  };

  const handleReplayPrompt = () => {
    setSelectedOptionId(null);
    setAnswerState(null);
  };

  const handlePlayPrompt = async () => {
    if (!currentRound || !currentWord) return;
    const exampleAudio = currentExample?.audio ?? currentWord.audio_example;
    const promptText = currentRound.type === 'listen_to_meaning'
      ? currentWord.chinese
      : currentRound.type === 'example_to_word'
        ? currentExample?.chinese ?? currentWord.example_cn
        : currentWord.chinese;

    await play({
      text: promptText,
      audioSrc: currentRound.type === 'example_to_word' ? exampleAudio : currentWord.audio_word,
    });
  };

  const handlePlayAnswerExample = async () => {
    if (!currentExample?.chinese) return;
    await play({
      text: currentExample.chinese,
      audioSrc: currentExample.audio ?? currentWord?.audio_example,
    });
  };

  const renderOptionState = (optionId) => {
    if (!answerState) return '';
    if (optionId === currentRound.correctOptionId) return 'correct';
    if (optionId === selectedOptionId && answerState === 'wrong') return 'wrong';
    return '';
  };

  if (loading) return (
    <div className="quiz-page page-enter">
      <div className="temple-deco" aria-hidden="true"></div>
      <div className="quiz-loading">
        <div className="loading-shimmer" style={{ width: 120, height: 24, borderRadius: 12 }}></div>
        <div className="loading-shimmer" style={{ width: 200, height: 16, borderRadius: 8, marginTop: 12 }}></div>
      </div>
      <style>{quizStyles}</style>
    </div>
  );

  if (gameState === 'empty') return (
    <div className="quiz-page page-enter">
      <div className="temple-deco" aria-hidden="true"></div>
      <div className="quiz-empty">
        <div className="empty-celebration">📖</div>
        <div className="empty-title">今天没有新题</div>
        <div className="empty-sub">去学习新词后再来测验。</div>
      </div>
      <style>{quizStyles}</style>
    </div>
  );

  if (gameState === 'completed' || gameState === 'failed') {
    const failed = gameState === 'failed';
    return (
      <div className="quiz-page page-enter">
        <div className="temple-deco" aria-hidden="true"></div>
        <div className="quiz-result">
          <div className="result-card">
            <div className="result-label">{failed ? '本关结束' : '本关完成 🎉'}</div>
            <div className="result-score">{score}</div>
            <div className="result-stars">
              {Array.from({ length: 3 }, (_, i) => (
                <span key={i} className={`result-star ${i < starCount ? 'earned' : ''}`}>★</span>
              ))}
            </div>
            <div className="result-stats">
              <div className="rs-item"><strong>{learnedInQuest}</strong><span>掌握</span></div>
              <div className="rs-item"><strong>{bookmarkedIds.length}</strong><span>收藏</span></div>
              <div className="rs-item"><strong>{hearts}</strong><span>体力</span></div>
            </div>
            <button type="button" className="result-btn" onClick={loadQuest}>再来一关</button>
          </div>
        </div>
        <style>{quizStyles}</style>
      </div>
    );
  }

  return (
    <div className="quiz-page page-enter">
      <div className="temple-deco" aria-hidden="true"></div>
      <div className="quiz-dot-pattern" aria-hidden="true"></div>

      <div className={`quiz-layout ${answerState ? 'has-feedback' : ''}`}>
        {/* Header */}
        <div className="quiz-header">
          <div className="quiz-header-left">
            <div className="quiz-kicker">测验 · {user.name || 'USER'}</div>
            <div className="quiz-main-title">5 词一关</div>
            <div className="quiz-desc">看题，选对答案。</div>
          </div>
          <div className="quiz-hearts">
            {Array.from({ length: MAX_HEARTS }, (_, i) => (
              <SapphireHeart key={i} active={i < hearts} />
            ))}
          </div>
        </div>

        {/* Progress card */}
        <div className="quiz-progress-card">
          <GoldenCrown />
          <div className="qp-content">
            <div className="qp-label">总进度</div>
            <div className="qp-row">
              <div className="qp-percent">{globalProgress}%</div>
              <div className="qp-count">({stats.learned}/{stats.total})</div>
            </div>
          </div>
          <div className="qp-bar-wrap">
            <div className="qp-bar-fill" style={{ width: `${Math.min(globalProgress, 100)}%` }}></div>
          </div>
        </div>

        {/* Question card */}
        <div className="quiz-question-card">
          {/* Inner border decoration */}
          <div className="qq-inner-border" aria-hidden="true"></div>

          <div className="qq-header">
            <div className="qq-prompt-area">
              <div className="qq-prompt-label">{currentRound.promptLabel}</div>
              <div className="qq-prompt-value">{currentRound.promptValue}</div>
              <div className="qq-prompt-sub">{currentRound.promptSubValue}</div>
            </div>
            <button type="button" className="qq-play-btn" onClick={handlePlayPrompt}>
              <i className="fas fa-volume-up"></i>
            </button>
          </div>

          <div className="qq-meta-row">
            <div className="qq-badge">
              <span>第 {currentRoundIndex + 1} 题</span>
              <span className="qq-badge-sep">·</span>
              <span>{bookmarkedIds.includes(currentWord?.id) ? '已收藏' : '可收藏'}</span>
            </div>
          </div>

          {/* Quest progress */}
          <div className="qq-progress">
            <div className="qq-progress-bar">
              <div className="qq-progress-fill" style={{ width: `${questProgress}%` }}></div>
            </div>
            <span className="qq-progress-text">{currentRoundIndex}/{rounds.length}</span>
          </div>

          {/* Options grid */}
          <div className="qq-options">
            {currentRound.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleOptionSelect(option.id)}
                disabled={Boolean(answerState)}
                className={`qq-option ${renderOptionState(option.id)}`}
              >
                <div className="qq-option-inner">
                  {/* Corner decorations */}
                  <span className="qq-corner tl"></span>
                  <span className="qq-corner br"></span>
                  <div className="qq-option-cn">{option.primary}</div>
                  <div className="qq-option-py">{option.secondary}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {answerState && (
        <div className={`qq-feedback ${answerState}`}>
          <div className="qq-fb-title">{answerState === 'correct' ? '✓ 答对了' : '✗ 再看一眼'}</div>
          <div className="qq-fb-detail">
            {answerState === 'correct'
              ? `${currentWord.chinese} · ${currentWord.khmer}`
              : `正确答案：${currentWord.chinese} · ${currentWord.khmer}`}
          </div>
          <div className="qq-fb-actions">
            <button type="button" className="qq-fb-secondary" onClick={handleBookmark}>
              {answerState === 'correct' ? '已掌握' : bookmarkedIds.includes(currentWord.id) ? '已收藏' : '加入收藏'}
            </button>
            <button type="button" className="qq-fb-primary" onClick={answerState === 'correct' ? moveToNextRound : handleReplayPrompt}>
              {answerState === 'correct' ? '下一题' : '再试一次'}
            </button>
          </div>
        </div>
      )}

      <style>{quizStyles}</style>
    </div>
  );
}

const quizStyles = `
  .quiz-page {
    flex: 1;
    position: relative;
    z-index: 10;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .quiz-dot-pattern {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.22;
    background-image:
      radial-gradient(circle at 18px 18px, rgba(245,216,143,0.14) 0 1.2px, transparent 1.6px),
      radial-gradient(circle at 62px 62px, rgba(245,216,143,0.10) 0 1.2px, transparent 1.6px);
    background-size: 80px 80px;
    z-index: 0;
  }
  .quiz-loading, .quiz-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    position: relative;
    z-index: 1;
    padding: 24px;
    color: var(--text-primary);
  }
  .quiz-empty .empty-celebration {
    font-size: 48px;
    margin-bottom: 8px;
  }
  .quiz-empty .empty-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .quiz-empty .empty-sub {
    font-size: 14px;
    color: var(--text-secondary);
  }

  /* Result screen */
  .quiz-result {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    position: relative;
    z-index: 1;
  }
  .result-card {
    width: 100%;
    border-radius: 28px;
    padding: clamp(20px, 3vh, 30px) 24px;
    background: linear-gradient(180deg, var(--quiz-panel-bg-start), var(--quiz-panel-bg-end));
    border: 1.5px solid var(--quiz-panel-border);
    box-shadow: 0 24px 50px rgba(8,20,17,0.18);
    text-align: center;
    color: var(--text-primary);
  }
  .result-label { font-size: 14px; color: var(--text-secondary); }
  .result-score { margin-top: 12px; font-size: 52px; font-weight: 800; color: var(--accent-gold); }
  .result-stars { margin-top: 10px; display: flex; gap: 8px; justify-content: center; font-size: 28px; }
  .result-star { color: rgba(255,255,255,0.12); }
  .result-star.earned { color: var(--accent-gold); }
  .result-stats {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .rs-item {
    border-radius: 16px;
    padding: 12px 8px;
    background: var(--settings-surface);
    border: 1px solid var(--settings-border);
  }
  .rs-item strong { display: block; font-size: 22px; color: var(--accent-gold); }
  .rs-item span { font-size: 12px; color: var(--text-secondary); }
  .result-btn {
    margin-top: 18px;
    width: 100%;
    min-height: 50px;
    border-radius: 18px;
    border: none;
    background: var(--dialog-record-bg);
    color: var(--dialog-record-text);
    font-weight: 700;
    font-size: 15px;
  }

  /* Main quiz layout */
  .quiz-layout {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: clamp(8px, 1.2vh, 14px) 16px 8px;
    position: relative;
    z-index: 1;
    min-height: 0;
    overflow: hidden;
  }
  .quiz-layout.has-feedback {
    padding-bottom: 118px;
  }

  /* Header */
  .quiz-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: clamp(6px, 1vh, 12px);
    flex-shrink: 0;
  }
  .quiz-kicker {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent-gold);
  }
  .quiz-main-title {
    margin-top: 4px;
    font-size: clamp(24px, 4.5vw, 32px);
    line-height: 1.1;
    font-weight: 800;
    color: var(--text-primary);
  }
  .quiz-desc {
    margin-top: 4px;
    font-size: 13px;
    color: var(--text-secondary);
  }
  .quiz-hearts {
    display: flex;
    gap: 4px;
    padding-top: 4px;
    flex-shrink: 0;
  }
  .sapphire-heart {
    filter: drop-shadow(0 4px 8px rgba(30,58,138,0.3));
    transition: transform 0.2s ease, opacity 0.2s ease;
  }
  .sapphire-heart.empty { opacity: 0.4; }

  /* Progress card */
  .quiz-progress-card {
    position: relative;
    border-radius: clamp(18px, 3vw, 24px);
    padding: clamp(10px, 1.5vh, 16px) 16px;
    background: linear-gradient(180deg, var(--quiz-panel-bg-start), var(--quiz-panel-bg-end));
    border: 1.5px solid var(--quiz-panel-border);
    overflow: hidden;
    box-shadow: 0 16px 32px rgba(0,0,0,0.12);
    margin-bottom: clamp(6px, 1vh, 10px);
    flex-shrink: 0;
  }
  .golden-crown {
    position: absolute;
    right: -6px;
    top: -8px;
    opacity: 0.85;
    pointer-events: none;
    z-index: 0;
  }
  .qp-content { position: relative; z-index: 1; }
  .qp-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent-gold);
    letter-spacing: 0.06em;
  }
  .qp-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-top: 4px;
  }
  .qp-percent {
    font-size: clamp(32px, 6vw, 42px);
    font-weight: 800;
    color: var(--accent-gold);
    line-height: 1;
  }
  .qp-count {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-secondary);
  }
  .qp-bar-wrap {
    position: relative;
    height: 10px;
    border-radius: 999px;
    background: var(--surface);
    overflow: hidden;
    border: 1px solid var(--surface-border);
    margin-top: 8px;
    z-index: 1;
  }
  .qp-bar-fill {
    position: absolute;
    left: 2px; top: 2px; bottom: 2px;
    min-width: 8px;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--brand-gold) 0%, #d8a645 52%, var(--brand-teal) 100%);
    box-shadow: 0 0 12px rgba(225,191,83,0.18);
    transition: width 0.3s ease;
  }

  /* Question card */
  .quiz-question-card {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: clamp(18px, 3vw, 24px);
    padding: clamp(12px, 1.8vh, 18px) clamp(14px, 2.5vw, 18px);
    background: linear-gradient(180deg, var(--quiz-panel-bg-start), var(--quiz-panel-bg-end));
    border: 1.5px solid var(--quiz-panel-border);
    box-shadow: 0 20px 42px rgba(0,0,0,0.14);
    position: relative;
    overflow: hidden;
  }
  .qq-inner-border {
    position: absolute;
    inset: 6px;
    border: 1px solid rgba(225,191,83,0.14);
    border-radius: clamp(14px, 2.5vw, 20px);
    pointer-events: none;
    z-index: 0;
  }

  .qq-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }
  .qq-prompt-label {
    font-size: 11px;
    letter-spacing: 0.06em;
    color: var(--accent-gold);
  }
  .qq-prompt-value {
    margin-top: 4px;
    font-size: clamp(20px, 4vw, 28px);
    line-height: 1.3;
    font-weight: 800;
    color: var(--text-primary);
  }
  .qq-prompt-sub {
    margin-top: 3px;
    font-size: clamp(12px, 2vw, 14px);
    color: var(--text-secondary);
  }
  .qq-play-btn {
    width: 44px; height: 44px;
    border-radius: 16px;
    border: 1px solid var(--settings-border);
    background: var(--settings-surface);
    color: var(--home-title-color);
    font-size: 16px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .qq-meta-row {
    margin-top: clamp(6px, 1vh, 12px);
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }
  .qq-badge {
    display: inline-flex;
    gap: 6px;
    border-radius: 999px;
    padding: 6px 14px;
    background: var(--settings-surface);
    border: 1px solid var(--settings-border);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
  }
  .qq-badge-sep { opacity: 0.5; }

  /* Quest progress */
  .qq-progress {
    margin-top: clamp(6px, 1vh, 10px);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--text-secondary);
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }
  .qq-progress-bar {
    flex: 1;
    height: 6px;
    border-radius: 999px;
    background: var(--surface);
    overflow: hidden;
  }
  .qq-progress-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--brand-gold) 0%, var(--brand-teal) 100%);
    transition: width 0.3s ease;
  }

  /* Options grid */
  .qq-options {
    margin-top: clamp(8px, 1.2vh, 14px);
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: clamp(8px, 1.2vh, 12px);
    position: relative;
    z-index: 1;
    flex: 1;
    min-height: 0;
  }
  .qq-option {
    border-radius: clamp(16px, 2.5vw, 22px);
    border: 1.5px solid var(--quiz-answer-border);
    background: var(--quiz-answer-bg-idle);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: var(--text-primary);
    text-align: left;
    padding: 0;
    position: relative;
    overflow: hidden;
    transition: transform 0.15s ease, border-color 0.15s ease;
    min-height: 0;
  }
  .qq-option::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01));
    pointer-events: none;
    border-radius: inherit;
  }
  .qq-option:active:not(:disabled) {
    transform: scale(0.97);
  }
  .qq-option.correct {
    border-color: var(--brand-gold);
    background: var(--quiz-answer-bg);
  }
  .qq-option.wrong {
    border-color: rgba(214,103,103,0.52);
    background: linear-gradient(160deg,
      rgba(208,87,87,0.12) 0%,
      rgba(167,61,61,0.10) 100%);
  }
  .qq-option-inner {
    position: relative;
    padding: clamp(12px, 2vh, 18px) clamp(12px, 2vw, 16px);
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  /* Corner bracket decorations */
  .qq-corner {
    position: absolute;
    width: 14px; height: 14px;
    pointer-events: none;
  }
  .qq-corner.tl {
    top: 6px; left: 6px;
    border-left: 1.5px solid rgba(225,191,83,0.22);
    border-top: 1.5px solid rgba(225,191,83,0.22);
    border-top-left-radius: 6px;
  }
  .qq-corner.br {
    bottom: 6px; right: 6px;
    border-right: 1.5px solid rgba(225,191,83,0.22);
    border-bottom: 1.5px solid rgba(225,191,83,0.22);
    border-bottom-right-radius: 6px;
  }
  .qq-option-cn {
    font-size: clamp(20px, 4vw, 26px);
    font-weight: 700;
    line-height: 1.2;
  }
  .qq-option-py {
    margin-top: clamp(4px, 0.6vh, 8px);
    font-size: clamp(11px, 1.8vw, 13px);
    color: var(--text-secondary);
  }

  /* Answer feedback overlay */
  .qq-feedback {
    position: fixed;
    left: 50%;
    bottom: 76px;
    transform: translateX(-50%);
    width: min(448px, calc(100vw - 24px));
    z-index: 60;
    border-radius: 22px 22px 0 0;
    padding: 16px 18px;
    background: linear-gradient(180deg, var(--quiz-panel-bg-start), var(--quiz-panel-bg-end));
    border-top: 2px solid var(--quiz-panel-border);
    box-shadow: 0 -12px 32px rgba(0,0,0,0.18);
    animation: slideUp 0.3s ease;
  }
  .qq-feedback.correct { border-top-color: rgba(225,191,83,0.48); }
  .qq-feedback.wrong { border-top-color: rgba(214,103,103,0.46); }
  @keyframes slideUp {
    from { transform: translateX(-50%) translateY(100%); }
    to { transform: translateX(-50%) translateY(0); }
  }
  .qq-fb-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .qq-fb-detail {
    margin-top: 6px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-secondary);
  }
  .qq-fb-actions {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .qq-fb-secondary, .qq-fb-primary {
    min-height: 44px;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 700;
  }
  .qq-fb-secondary {
    border: 1px solid var(--settings-border);
    background: var(--settings-surface);
    color: var(--text-secondary);
  }
  .qq-fb-primary {
    border: none;
    background: var(--dialog-record-bg);
    color: var(--dialog-record-text);
  }
`;
