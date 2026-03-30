import React from 'react';

const tabs = [
  { id: 'home', icon: 'fas fa-book-open', label: '学习' },
  { id: 'quiz', icon: 'fas fa-clipboard-check', label: '测验' },
  { id: 'practice', icon: 'fas fa-comment-dots', label: '对话' },
  { id: 'profile', icon: 'fas fa-user', label: '我的' },
];

export default function TabBar({ activeTab, onTabChange }) {
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
            {tab.label}
          </div>
        </div>
      ))}

      <style>{`
        .tab-indicator {
          position: absolute;
          top: 6px;
          width: 36px; height: 4px;
          background: linear-gradient(90deg, #f4da92, #d0a44d);
          border-radius: 999px;
          transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(244,218,146,0.45);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
