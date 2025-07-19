"use client";

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email to confirm signup!')
    }
    setLoading(false)
  }

  const handleSignIn = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Logged in successfully!')
      // Redirect to home page after successful login
      setTimeout(() => {
        router.push('/')
      }, 1000)
    }
    setLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSignUp) {
      handleSignUp()
    } else {
      handleSignIn()
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#111827', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '400px', 
        padding: 'clamp(24px, 5vw, 48px) clamp(16px, 4vw, 24px)',
        margin: '0 auto'
      }}>
        {/* Logo and Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: 'clamp(60px, 15vw, 80px)', 
            height: 'clamp(60px, 15vw, 80px)', 
            background: 'linear-gradient(135deg, #F4900C, #e67e00)', 
            borderRadius: 'clamp(15px, 4vw, 20px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: 'clamp(30px, 8vw, 40px)', 
            margin: '0 auto clamp(16px, 4vw, 24px)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)' 
          }}>
            🏈
          </div>
          <h1 style={{ 
            fontSize: 'clamp(24px, 6vw, 32px)', 
            fontWeight: 'bold', 
            color: '#f9fafb', 
            marginBottom: 'clamp(6px, 2vw, 8px)',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            Fantasy Hub
          </h1>
          <p style={{ 
            fontSize: 'clamp(14px, 3.5vw, 16px)', 
            color: '#9ca3af',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* Auth Form */}
        <div style={{ 
          backgroundColor: '#1f2937', 
          borderRadius: 'clamp(8px, 2vw, 12px)', 
          padding: 'clamp(20px, 5vw, 32px)', 
          border: '1px solid #374151',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                color: '#d1d5db', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '8px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #374151',
                  backgroundColor: '#111827',
                  color: '#f9fafb',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#F4900C';
                  e.target.style.outline = 'none';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#374151';
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                color: '#d1d5db', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '8px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #374151',
                  backgroundColor: '#111827',
                  color: '#f9fafb',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#F4900C';
                  e.target.style.outline = 'none';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#374151';
                }}
              />
            </div>

            {/* Message Display */}
            {message && (
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                backgroundColor: message.includes('successfully') || message.includes('Check your email') 
                  ? '#065f46' 
                  : '#991b1b',
                color: message.includes('successfully') || message.includes('Check your email') 
                  ? '#d1fae5' 
                  : '#fecaca',
                fontSize: '14px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '8px',
                background: loading 
                  ? '#6b7280' 
                  : 'linear-gradient(135deg, #F4900C, #e67e00)',
                color: 'white',
                border: 'none',
                fontSize: '16px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                marginBottom: '20px'
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
                }
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    border: '2px solid transparent', 
                    borderTop: '2px solid white', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                  }}></div>
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>

            {/* Toggle Mode */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ 
                color: '#9ca3af', 
                fontSize: '14px',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setMessage('')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#F4900C',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginLeft: '4px',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}