import React from 'react';
import { useAppShell } from '../i18n/index.js';

const tabs = [
  { id: 'home', icon: 'fas fa-book-open', labelKey: 'tabs.home' },
  { id: 'quiz', icon: 'fas fa-clipboard-check', labelKey: 'tabs.quiz' },
  { id: 'practice', icon: 'fas fa-comment-dots', labelKey: 'tabs.practice' },
  { id: 'profile', icon: 'fas fa-user', labelKey: 'tabs.profile' },
];

const indicatorPositions = {
  home: 'calc(12.5% - 18px)',
  quiz: 'calc(37.5% - 18px)',
  practice: 'calc(62.5% - 18px)',
  profile: 'calc(87.5% - 18px)',
};

export default function TabBar({ activeTab, onTabChange, lockedTabs = [] }) {
  const { t } = useAppShell();
  const lockedSet = new Set(lockedTabs);

  return (
    <div className="tabbar">
      <div
        className="tab-indicator"
        style={{
          left: indicatorPositions[activeTab] || indicatorPositions.home,
        }}
      ></div>

      {tabs.map((tab) => (
        <div className="tab" key={tab.id} onClick={() => onTabChange(tab.id)}>
          <div className={`tab-ic ${activeTab === tab.id ? 'active' : ''}`}>
            <i className={tab.icon}></i>
            {lockedSet.has(tab.id) ? <span className="tab-lock"><i className="fas fa-lock"></i></span> : null}
          </div>
          <div className={`tab-lbl ${activeTab === tab.id ? 'active' : ''}`}>
            {t(tab.labelKey)}
          </div>
        </div>
      ))}

      <style>{`
        .tab-indicator {
          position: absolute;
          top: 6px;
          width: 36px;
          height: 4px;
          background: linear-gradient(90deg, var(--brand-gold), var(--brand-teal));
          border-radius: 999px;
          transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px var(--tab-active-shadow);
          pointer-events: none;
        }
        .tab-lock {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-gold);
          color: #143f37;
          font-size: 7px;
        }
      `}</style>
    </div>
  );
}
