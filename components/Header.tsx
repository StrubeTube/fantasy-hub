import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/rankings', label: 'Rankings' },
  // Add more links as needed
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const session = useSession();
  const supabase = useSupabaseClient();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  return (
    <>
      <header style={{ 
        width: '100%', 
        background: 'linear-gradient(to right, #111827, #1f2937)', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)', 
        borderBottom: '1px solid #374151',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <nav style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}>
          <div style={{ 
            display: 'flex', 
            width: '100%', 
            maxWidth: '1280px', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: isMobile ? '12px 16px' : '16px 24px' 
          }}>
            {/* Logo and Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                             <div style={{ 
                 width: '40px', 
                 height: '40px', 
                 background: 'linear-gradient(135deg, #F4900C, #e67e00)', 
                 borderRadius: '12px', 
                 display: 'flex', 
                 alignItems: 'center', 
                 justifyContent: 'center', 
                 fontSize: '20px', 
                 fontWeight: 'bold', 
                 color: 'white', 
                 boxShadow: '0 4px 6px rgba(0,0,0,0.3)' 
               }}>
                🏈
              </div>
              <Link href="/" style={{ 
                fontSize: isMobile ? '20px' : '24px', 
                fontWeight: 'bold', 
                color: '#f9fafb', 
                textDecoration: 'none',
                letterSpacing: '-0.025em',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}>
                Fantasy Hub
              </Link>
            </div>

            {/* Desktop Nav */}
            <div style={{ display: 'none', alignItems: 'center', gap: '8px' }} className="md:flex">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    fontWeight: '500',
                    fontSize: '14px',
                    textDecoration: 'none',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    ...(pathname === link.href 
                      ? { 
                          background: 'linear-gradient(135deg, #F4900C, #e67e00)', 
                          color: 'white', 
                          boxShadow: '0 4px 6px rgba(0,0,0,0.3)' 
                        }
                      : { 
                          color: '#d1d5db', 
                          cursor: 'pointer',
                          ':hover': { 
                            backgroundColor: '#374151', 
                            color: '#f9fafb' 
                          } 
                        }
                    )
                  }}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* User Section */}
              {session ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #F4900C, #e67e00)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontWeight: 'bold',
                    fontSize: '14px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    {session.user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      border: '1px solid #374151',
                      color: '#d1d5db',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseOver={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = '#374151';
                      (e.target as HTMLElement).style.color = '#f9fafb';
                    }}
                    onMouseOut={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = '#d1d5db';
                    }}
                    title="Logout"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H9m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
              ) : (
                <Link href="/auth" style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #F4900C, #e67e00)',
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#d1d5db',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              className="md:hidden"
              onClick={() => setMenuOpen(v => !v)}
              onMouseOver={(e) => (e.target as HTMLElement).style.backgroundColor = '#374151'}
              onMouseOut={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
              aria-label="Open navigation menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '24px', height: '24px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </nav>
        
        {/* Mobile Nav Drawer */}
        {menuOpen && (
          <div style={{
            background: '#1f2937',
            borderTop: '1px solid #374151',
            padding: '16px 24px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }} className="md:hidden">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    fontWeight: '500',
                    fontSize: '14px',
                    textDecoration: 'none',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    ...(pathname === link.href 
                      ? { 
                          background: 'linear-gradient(135deg, #F4900C, #e67e00)', 
                          color: 'white', 
                          boxShadow: '0 4px 6px rgba(0,0,0,0.3)' 
                        }
                      : { 
                          color: '#d1d5db', 
                          cursor: 'pointer',
                          ':hover': { 
                            backgroundColor: '#374151', 
                            color: '#f9fafb' 
                          } 
                        }
                    )
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Mobile User Section */}
              {session ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', padding: '12px 16px', borderTop: '1px solid #374151' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #F4900C, #e67e00)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontWeight: 'bold',
                    fontSize: '14px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    {session.user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span style={{ color: '#d1d5db', fontSize: '14px', fontWeight: '500' }}>
                    {session.user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      border: '1px solid #374151',
                      color: '#d1d5db',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginLeft: 'auto'
                    }}
                    onMouseOver={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = '#374151';
                      (e.target as HTMLElement).style.color = '#f9fafb';
                    }}
                    onMouseOut={(e) => {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = '#d1d5db';
                    }}
                    title="Logout"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '18px', height: '18px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H9m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
              ) : (
                <Link href="/auth" style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #F4900C, #e67e00)',
                  color: 'white',
                  textDecoration: 'none',
                  fontWeight: '500',
                  fontSize: '14px',
                  textAlign: 'center',
                  marginTop: '12px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                }}>
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
      {/* Spacer for header */}
      <div style={{ height: '16px' }} className="md:h-5" />
    </>
  );
} 