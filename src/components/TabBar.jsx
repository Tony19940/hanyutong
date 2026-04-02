import React from 'react';
import { useAppShell } from '../i18n/index.js';

const tabs = [
  { id: 'home', icon: 'fas fa-book-open', labelKey: 'tabs.home' },
  { id: 'quiz', icon: 'fas fa-clipboard-check', labelKey: 'tabs.quiz' },
  { id: 'practice', icon: 'fas fa-comment-dots', labelKey: 'tabs.practice' },
  { id: 'profile', icon: 'fas fa-user', labelKey: 'tabs.profile' },
];

export default function TabBar({ activeTab, onTabChange }) {
  const { t } = useAppShell();
  const activeIndex = tabs.findIndex(t => t.id === activeTab);
  const tabWidth = 100 / tabs.length;
  const offset = tabWidth / 2;

  return (
    <div className="tabbar">
      <div
        className="tab-indicator"
        style={{
          left: `calc(${activeIndex * tabWidth}% + ${offset}% - 18px)`,
        }}
      ></div>

      {tabs.map((tab) => (
        <div
          className="tab"
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
        >
          <div className={`tab-ic ${activeTab === tab.id ? 'active' : ''}`}>
            <i className={tab.icon}></i>
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
          width: 36px; height: 4px;
          background: linear-gradient(90deg, var(--brand-gold), var(--brand-teal));
          border-radius: 999px;
          transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px var(--tab-active-shadow);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
