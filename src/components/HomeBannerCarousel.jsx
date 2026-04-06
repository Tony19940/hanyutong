import React, { useEffect, useMemo, useState } from 'react';

export default function HomeBannerCarousel({ banners = [], onBannerClick }) {
  const [index, setIndex] = useState(0);
  const activeBanner = useMemo(() => banners[index] || null, [banners, index]);

  useEffect(() => {
    setIndex(0);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % banners.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (!activeBanner) {
    return null;
  }

  return (
    <section className="home-banner-shell animate-float-up stagger-4">
      <button
        type="button"
        className="home-banner-card"
        onClick={() => onBannerClick?.(activeBanner)}
      >
        <img src={activeBanner.image?.url} alt={activeBanner.title || 'banner'} />
      </button>
      {banners.length > 1 ? (
        <div className="home-banner-dots">
          {banners.map((banner, bannerIndex) => (
            <button
              key={banner.id}
              type="button"
              className={`home-banner-dot ${bannerIndex === index ? 'active' : ''}`}
              onClick={() => setIndex(bannerIndex)}
              aria-label={`banner-${bannerIndex + 1}`}
            />
          ))}
        </div>
      ) : null}

      <style>{`
        .home-banner-shell {
          margin-top: 10px;
          flex-shrink: 0;
        }
        .home-banner-card {
          width: 100%;
          height: 108px;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid var(--home-card-border);
          background: var(--settings-surface);
          box-shadow: var(--panel-shadow);
        }
        .home-banner-card img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }
        .home-banner-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
        }
        .home-banner-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          border: none;
          background: rgba(255,255,255,0.18);
        }
        .home-banner-dot.active {
          width: 18px;
          background: var(--accent-gold);
        }
      `}</style>
    </section>
  );
}
