import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api.js';
import { playErrorFeedback, playSuccessFeedback, vibratePattern } from '../utils/feedback.js';
import { createQuestRounds } from '../utils/quest.js';
import { getPrimaryExample } from '../utils/vocabulary.js';
import { usePronunciation } from '../hooks/usePronunciation.js';

const QUEST_SIZE = 5;
const QUEST_POOL_SIZE = 18;
const MAX_HEARTS = 3;

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
      const data = await api.getNextWords(QUEST_POOL_SIZE);
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
      setGameState('empty');
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

  if (loading) return <div className="page-enter" style={{ padding: 24, color: '#fff' }}>加载测验...</div>;
  if (gameState === 'empty') return <div className="page-enter" style={{ padding: 24, color: '#fff' }}>今天没有新题。</div>;

  if (gameState === 'completed' || gameState === 'failed') {
    const failed = gameState === 'failed';
    return (
      <div className="page-enter" style={{ padding: 20, color: '#fff' }}>
        <div style={{ borderRadius: 28, padding: 24, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 13, opacity: 0.68 }}>{failed ? '本关结束' : '本关完成'}</div>
          <div style={{ marginTop: 12, fontSize: 46, fontWeight: 800 }}>{score}</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, fontSize: 28 }}>
            {Array.from({ length: 3 }, (_, index) => <span key={index} style={{ color: index < starCount ? '#ffd67d' : 'rgba(255,255,255,0.18)' }}>★</span>)}
          </div>
          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div style={{ borderRadius: 18, padding: 14, background: 'rgba(255,255,255,0.05)' }}><strong>{learnedInQuest}</strong><div>掌握</div></div>
            <div style={{ borderRadius: 18, padding: 14, background: 'rgba(255,255,255,0.05)' }}><strong>{bookmarkedIds.length}</strong><div>收藏</div></div>
            <div style={{ borderRadius: 18, padding: 14, background: 'rgba(255,255,255,0.05)' }}><strong>{hearts}</strong><div>体力</div></div>
          </div>
          <button type="button" onClick={loadQuest} style={{ marginTop: 18, width: '100%', minHeight: 50, borderRadius: 18, border: '2px solid rgba(245,216,143,0.54)', background: 'linear-gradient(180deg, #355dcb, #2749a8)', color: '#fff', fontWeight: 700 }}>再来一关</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ padding: '12px 18px 104px', color: '#fff', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,216,143,0.72)' }}>测验 · {user.name}</div>
          <div style={{ marginTop: 8, fontSize: 30, lineHeight: 1.04, fontWeight: 800, color: '#f7efcf' }}>5 词一关</div>
          <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(245,241,225,0.82)' }}>看题，选对答案。</div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '6px 2px', borderRadius: 999 }}>
          {Array.from({ length: MAX_HEARTS }, (_, index) => (
            <span
              key={index}
              style={{
                width: 28,
                height: 28,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                fontSize: 18,
                color: index < hearts ? '#f9f2d6' : 'rgba(255,255,255,0.2)',
                background: index < hearts
                  ? 'radial-gradient(circle at 35% 30%, #6ce0ff 0%, #3b75f0 42%, #2f3bb4 72%, #1a266f 100%)'
                  : 'rgba(18,40,108,0.42)',
                border: index < hearts ? '1.5px solid rgba(245,216,143,0.7)' : '1px solid rgba(245,216,143,0.18)',
                boxShadow: index < hearts ? '0 8px 18px rgba(28,62,156,0.24)' : 'none',
              }}
            >
              ♥
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16, position: 'relative', borderRadius: 26, padding: 16, background: 'linear-gradient(180deg, rgba(18,43,125,0.96), rgba(20,47,135,0.9))', border: '1.5px solid rgba(245,216,143,0.64)', overflow: 'hidden', boxShadow: '0 20px 36px rgba(9,21,70,0.22)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 16% 14%, rgba(245,216,143,0.12), transparent 22%)' }}></div>
        <div style={{ position: 'absolute', right: 18, bottom: 16, width: 138, height: 58, opacity: 0.28, pointerEvents: 'none' }}>
          <svg viewBox="0 0 138 58" width="138" height="58" aria-hidden="true">
            <path d="M2 56h132" fill="none" stroke="rgba(245,216,143,0.22)" strokeWidth="2"/>
            <path d="M8 54l14-26 10 12 14-22 10 14 12-18 10 18 10-12 18 34" fill="none" stroke="rgba(245,216,143,0.36)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', right: -6, top: -2, width: 132, height: 62, opacity: 0.9, pointerEvents: 'none' }}>
          <svg viewBox="0 0 112 54" width="112" height="54" aria-hidden="true">
            <path d="M6 44c24-2 35-20 53-20 17 0 20 12 47 10" fill="none" stroke="rgba(245,216,143,0.82)" strokeWidth="3" strokeLinecap="round"/>
            <path d="M18 37c11-1 16-10 26-10 9 0 13 7 23 6" fill="none" stroke="rgba(245,216,143,0.46)" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(245,216,143,0.88)' }}>总进度</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ color: '#f7e3a5', fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{globalProgress}%</div>
            <div style={{ color: 'rgba(247,236,207,0.84)', fontSize: 15, fontWeight: 700 }}>({stats.learned}/{stats.total})</div>
          </div>
        </div>
        <div style={{ position: 'relative', height: 12, borderRadius: 999, background: 'rgba(226,222,208,0.28)', overflow: 'hidden', border: '1px solid rgba(245,216,143,0.18)' }}>
          <div style={{ position: 'absolute', left: 2, top: 2, bottom: 2, width: globalProgress ? `max(calc(${Math.min(globalProgress, 100)}% - 4px), 28px)` : 0, borderRadius: 999, background: 'linear-gradient(90deg, #f5d88f 0%, #d8a645 52%, #9b6e25 100%)', boxShadow: '0 0 16px rgba(245,216,143,0.18)' }}></div>
        </div>
      </div>

      <div style={{ borderRadius: 28, padding: 20, background: 'linear-gradient(180deg, rgba(18,43,125,0.98), rgba(17,39,112,0.92))', border: '2px solid rgba(245,216,143,0.64)', boxShadow: '0 24px 46px rgba(7,19,68,0.26)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,216,143,0.76)' }}>{currentRound.promptLabel}</div>
            <div style={{ marginTop: 8, fontSize: 28, lineHeight: 1.25, fontWeight: 800, color: '#f7efcf' }}>{currentRound.promptValue}</div>
            <div style={{ marginTop: 6, fontSize: 14, color: 'rgba(245,241,225,0.82)' }}>{currentRound.promptSubValue}</div>
          </div>
          <button type="button" onClick={handlePlayPrompt} style={{ width: 54, height: 54, borderRadius: 18, border: '1px solid rgba(245,216,143,0.4)', background: 'rgba(245,216,143,0.12)', color: '#fff5d7' }}>
            <i className="fas fa-volume-up"></i>
          </button>
        </div>

        <div style={{ marginTop: 16, display: 'inline-flex', gap: 10, borderRadius: 999, padding: '10px 14px', background: 'rgba(245,216,143,0.08)', border: '1px solid rgba(245,216,143,0.18)', color: '#f7edcf' }}>
          <span>第 {currentRoundIndex + 1} 题</span>
          <span>{bookmarkedIds.includes(currentWord?.id) ? '已收藏' : '可收藏'}</span>
        </div>

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(245,232,192,0.74)' }}>
          <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(245,216,143,0.1)', overflow: 'hidden' }}>
            <div style={{ width: `${questProgress}%`, height: '100%', background: 'linear-gradient(90deg, #f4d98f 0%, #cfa54d 100%)' }}></div>
          </div>
          <span>{currentRoundIndex}/{rounds.length}</span>
        </div>

        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          {currentRound.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleOptionSelect(option.id)}
              disabled={Boolean(answerState)}
              style={{
                minHeight: 112,
                borderRadius: 22,
                border: '1.5px solid rgba(245,216,143,0.54)',
                background: renderOptionState(option.id) === 'correct'
                  ? 'linear-gradient(180deg, rgba(245,216,143,0.22), rgba(204,167,86,0.14))'
                  : renderOptionState(option.id) === 'wrong'
                    ? 'linear-gradient(180deg, rgba(255,132,132,0.16), rgba(146,45,45,0.08))'
                    : 'linear-gradient(180deg, rgba(245,216,143,0.07), rgba(255,255,255,0.02))',
                color: '#fff8e3',
                textAlign: 'left',
                padding: '16px 14px',
                boxShadow: 'inset 0 -8px 0 rgba(212,168,74,0.12)',
                position: 'relative',
              }}
            >
              <span style={{ position: 'absolute', inset: 7, border: '1px solid rgba(245,216,143,0.18)', borderRadius: 18, pointerEvents: 'none' }}></span>
              <span style={{ position: 'absolute', left: 10, top: 10, width: 16, height: 16, borderLeft: '1.5px solid rgba(245,216,143,0.28)', borderTop: '1.5px solid rgba(245,216,143,0.28)', borderTopLeftRadius: 8 }}></span>
              <span style={{ position: 'absolute', right: 10, bottom: 10, width: 16, height: 16, borderRight: '1.5px solid rgba(245,216,143,0.28)', borderBottom: '1.5px solid rgba(245,216,143,0.28)', borderBottomRightRadius: 8 }}></span>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{option.primary}</div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(245,241,225,0.76)' }}>{option.secondary}</div>
            </button>
          ))}
        </div>

        {answerState && (
          <div style={{ marginTop: 18, borderRadius: 22, padding: 16, background: answerState === 'correct' ? 'linear-gradient(180deg, rgba(245,216,143,0.16), rgba(212,168,74,0.08))' : 'rgba(255,117,117,0.12)', border: '1px solid rgba(245,216,143,0.18)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff5d7' }}>{answerState === 'correct' ? '答对了' : '再看一眼'}</div>
            <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7, color: '#f7edcf' }}>{answerState === 'correct' ? `${currentWord.chinese} · ${currentWord.khmer}` : `正确答案：${currentWord.chinese} · ${currentWord.khmer}`}</div>
            {currentExample && (
              <button
                type="button"
                onClick={handlePlayAnswerExample}
                style={{
                  marginTop: 12,
                  width: '100%',
                  padding: '14px 44px 14px 14px',
                  borderRadius: 16,
                  background: 'rgba(245,216,143,0.08)',
                  border: '1px solid rgba(245,216,143,0.18)',
                  color: '#fff8e3',
                  textAlign: 'left',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: 14, lineHeight: 1.7, fontWeight: 700 }}>{currentExample.chinese}</div>
                <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.7, color: 'rgba(245,241,225,0.76)' }}>{currentExample.khmer}</div>
                <i className="fas fa-volume-up" style={{ position: 'absolute', right: 14, top: 16, color: 'rgba(245,216,143,0.88)' }}></i>
              </button>
            )}
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button type="button" onClick={handleBookmark} style={{ minHeight: 48, borderRadius: 18, border: '1px solid rgba(245,216,143,0.18)', background: 'rgba(245,216,143,0.08)', color: 'rgba(245,241,225,0.92)' }}>{answerState === 'correct' ? '已掌握' : bookmarkedIds.includes(currentWord.id) ? '已收藏' : '加入收藏'}</button>
              <button type="button" onClick={answerState === 'correct' ? moveToNextRound : handleReplayPrompt} style={{ minHeight: 48, borderRadius: 18, border: '2px solid rgba(245,216,143,0.54)', background: 'linear-gradient(180deg, #355dcb, #2749a8)', color: '#fff', fontWeight: 700 }}>{answerState === 'correct' ? '下一题' : '再试一次'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
