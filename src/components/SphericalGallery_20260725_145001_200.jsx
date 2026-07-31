import { useState, useEffect, useCallback, useRef } from 'react';
import './SphericalGallery.css';

/**
 * SphericalGallery — 3D 环形旋转木马
 *
 * 交互：
 * - 卡片沿圆柱面排列，中间卡片最大，两侧逐级缩小后退
 * - 默认自动轮播，hover 时暂停
 * - 左右箭头导航，点击旋转到上一张/下一张
 * - 默认全部黑白（grayscale），hover 恢复彩色 + 前凸
 * - 中心卡片带 glow 光晕
 * - 移动端降级为横向滑动轮播
 */
export default function SphericalGallery({ items = [], lang = 'zh' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const N = items.length || 1;
  const isZh = lang === 'zh';
  const visibleRadius = 3; // 同时显示 ±3 = 7 张

  // ---- 自动轮播 ----
  useEffect(() => {
    if (isPaused || N <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % N);
    }, 3500);
    return () => clearInterval(timer);
  }, [isPaused, N]);

  // ---- 导航 ----
  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % N);
  }, [N]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + N) % N);
  }, [N]);

  // ---- 计算某张卡与当前焦点的最短角度偏移 ----
  const getOffset = (idx) => {
    const raw = idx - currentIndex;
    if (raw > N / 2) return raw - N;
    if (raw < -N / 2) return raw + N;
    return raw;
  };

  // ---- 缩放阶梯 ----
  const getScale = (dist) => {
    const abs = Math.abs(dist);
    if (abs === 0) return 1;
    if (abs === 1) return 0.85;
    if (abs === 2) return 0.7;
    if (abs === 3) return 0.55;
    return 0.4;
  };

  if (N === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        {isZh ? '暂无作品' : 'No works yet'}
      </div>
    );
  }

  const angleStep = 360 / N;

  return (
    <div className="sg-section">
      {/* ============ Mobile: 横向滑动轮播 ============ */}
      <div className="sg-mobile">
        <div className="sg-mobile-track">
          {items.map((item) => (
            <div key={item.id} className="sg-mobile-card">
              {item.image ? (
                <img
                  src={item.image}
                  alt={isZh ? item.title : item.titleEn}
                  className="sg-mobile-media"
                  draggable={false}
                />
              ) : (
                <div
                  className="sg-mobile-placeholder"
                  style={{
                    background: `linear-gradient(145deg, ${item.colors[0]}, ${item.colors[1]})`,
                  }}
                >
                  <span className="text-white font-semibold text-lg">
                    {isZh ? item.title : item.titleEn}
                  </span>
                </div>
              )}
              <div className="sg-mobile-label">
                #{String(item.id).padStart(2, '0')}&ensp;{isZh ? item.title : item.titleEn}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============ Desktop: 3D 环形旋转木马 ============ */}
      <div
        className="sg-desktop"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* 背景标题 */}
        <h2 className="sg-title" aria-label="WORKS">
          {'WORKS'.split('').map((letter, i) => (
            <span key={i} className="sg-letter">{letter}</span>
          ))}
        </h2>

        {/* 3D 舞台 */}
        <div className="sg-stage">
          <div className="sg-ring">
            {items.map((item, i) => {
              const offset = getOffset(i);
              const absOff = Math.abs(offset);
              const isCenter = offset === 0;
              const isVisible = absOff <= visibleRadius;
              const angle = offset * angleStep;
              const scale = getScale(offset);

              return (
                <div
                  key={item.id}
                  className={`sg-card-3d${isCenter ? ' is-center' : ''}${!isVisible ? ' is-hidden' : ''}`}
                  style={{
                    '--angle': `${angle}deg`,
                    '--scale': scale,
                  }}
                >
                  <div className="sg-card-face">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={isZh ? item.title : item.titleEn}
                        className="sg-card-media"
                        draggable={false}
                      />
                    ) : (
                      <div
                        className="sg-card-placeholder"
                        style={{
                          background: `linear-gradient(145deg, ${item.colors[0]}, ${item.colors[1]})`,
                        }}
                      >
                        <span className="sg-card-title">
                          {isZh ? item.title : item.titleEn}
                        </span>
                        <span className="sg-card-number">
                          #{String(item.id).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 左箭头 */}
        <button
          className="sg-arrow sg-arrow-left"
          onClick={goPrev}
          aria-label={isZh ? '上一张' : 'Previous'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* 右箭头 */}
        <button
          className="sg-arrow sg-arrow-right"
          onClick={goNext}
          aria-label={isZh ? '下一张' : 'Next'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>

        {/* 底部指示点 */}
        <div className="sg-dots">
          {items.map((_, i) => (
            <button
              key={i}
              className={`sg-dot${i === currentIndex ? ' is-active' : ''}`}
              onClick={() => setCurrentIndex(i)}
              aria-label={`${isZh ? '第' : ''}${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
