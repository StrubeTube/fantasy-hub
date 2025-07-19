'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Set target date to Thursday, September 4th, 2025 at 8:20 PM ET (2025 NFL season start)
    const targetDate = new Date('2025-09-04T20:20:00-04:00').getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Hero Section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 'clamp(16px, 4vw, 24px)',
        textAlign: 'center'
      }}>
        {/* Main Icon */}
        <div style={{ 
          width: '80px', 
          height: '80px', 
          background: 'linear-gradient(135deg, #F4900C, #e67e00)', 
          borderRadius: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: '40px', 
          margin: '0 auto 16px',
          boxShadow: '0 20px 40px rgba(244, 144, 12, 0.3)',
          animation: 'pulse 2s infinite'
        }}>
          🏈
        </div>

        {/* Main Title */}
        <h1 style={{ 
          fontSize: 'clamp(2rem, 4vw, 3rem)', 
          fontWeight: '900', 
          color: '#f8fafc', 
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #f8fafc, #cbd5e1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Fantasy Hub
        </h1>

        {/* Subtitle */}
        <p style={{ 
          fontSize: 'clamp(1rem, 2vw, 1.2rem)', 
          color: '#94a3b8', 
          marginBottom: '24px',
          maxWidth: '500px',
          lineHeight: '1.4'
        }}>
          Your ultimate fantasy football draft preparation tool
        </p>

        {/* CTA Button - Moved to top */}
        <Link href="/rankings" style={{
          display: 'inline-block',
          padding: '16px 32px',
          background: 'linear-gradient(135deg, #F4900C, #e67e00)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '12px',
          fontSize: 'clamp(1rem, 2vw, 1.1rem)',
          fontWeight: '700',
          transition: 'all 0.3s ease',
          boxShadow: '0 8px 32px rgba(244, 144, 12, 0.4)',
          border: 'none',
          cursor: 'pointer',
          transform: 'translateY(0)',
          animation: 'bounce 2s infinite',
          marginBottom: '32px'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(244, 144, 12, 0.6)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(244, 144, 12, 0.4)';
        }}>
          🚀 Start Preparing for Your Draft with Tiered Rankings
        </Link>

        {/* Countdown Section */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          borderRadius: '16px',
          padding: '20px 32px',
          marginBottom: '24px',
          border: '2px solid rgba(244, 144, 12, 0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ 
            fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', 
            color: '#f1f5f9', 
            marginBottom: '16px',
            fontWeight: '600'
          }}>
            🏆 NFL Season Countdown
          </h2>
          
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {Object.entries(timeLeft).map(([unit, value]) => (
              <div key={unit} style={{
                textAlign: 'center',
                minWidth: '60px'
              }}>
                <div style={{
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  fontWeight: '800',
                  color: '#F4900C',
                  lineHeight: '1'
                }}>
                  {value.toString().padStart(2, '0')}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  fontWeight: '500',
                  letterSpacing: '0.1em'
                }}>
                  {unit}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Overview */}
        <div style={{
          maxWidth: 'min(800px, 95vw)',
          marginBottom: '24px'
        }}>
          <h2 style={{ 
            fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', 
            color: '#f1f5f9', 
            marginBottom: '16px',
            fontWeight: '700'
          }}>
            🎯 What Makes Fantasy Hub Special
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'clamp(12px, 3vw, 16px)',
            marginBottom: '20px'
          }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(244, 144, 12, 0.2)'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📊</div>
              <h3 style={{ color: '#f1f5f9', fontSize: '1rem', marginBottom: '6px', fontWeight: '600' }}>
                Tiered Rankings
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4' }}>
                Organize players into custom tiers with drag-and-drop functionality.
              </p>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(244, 144, 12, 0.2)'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🎨</div>
              <h3 style={{ color: '#f1f5f9', fontSize: '1rem', marginBottom: '6px', fontWeight: '600' }}>
                Visual Insights
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4' }}>
                Color-coded gauges for age and depth, plus ADP comparison circles.
              </p>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(244, 144, 12, 0.2)'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⚡</div>
              <h3 style={{ color: '#f1f5f9', fontSize: '1rem', marginBottom: '6px', fontWeight: '600' }}>
                Smart Sorting
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4' }}>
                Sort by ADP, 2024 performance, or your custom rankings.
              </p>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(244, 144, 12, 0.2)'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💾</div>
              <h3 style={{ color: '#f1f5f9', fontSize: '1rem', marginBottom: '6px', fontWeight: '600' }}>
                Cloud Sync
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4' }}>
                Your rankings are automatically saved to the cloud.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p style={{ 
          color: '#64748b', 
          fontSize: '0.8rem', 
          marginTop: '16px',
          textAlign: 'center'
        }}>
          Built for fantasy football enthusiasts who want to dominate their drafts
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
