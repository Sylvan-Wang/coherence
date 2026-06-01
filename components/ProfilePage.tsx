'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function Sidebar({ dark, toggleTheme }: { dark: boolean; toggleTheme: () => void }) {
  const pathname = usePathname()
  const border = dark ? '#1e1e1e' : '#ebebeb'
  const bg = dark ? '#0d0d0d' : '#fafafa'
  const textMuted = dark ? '#404040' : '#bbb'
  const textActive = dark ? '#e8e3d9' : '#111'
  const hoverBg = dark ? '#161616' : '#f0f0f0'

  const navItem = (href: string, label: string, icon: string) => {
    const isActive = pathname === href
    return (
      <Link href={href} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 8,
        textDecoration: 'none',
        color: isActive ? textActive : textMuted,
        background: isActive ? (dark ? '#1a1a1a' : '#ebebeb') : 'transparent',
        fontSize: 13, letterSpacing: '0.04em',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = hoverBg }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{icon}</span>
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: bg,
      borderRight: `1px solid ${border}`,
      display: 'flex', flexDirection: 'column',
      padding: '20px 12px',
      height: '100vh',
      position: 'sticky', top: 0,
    }}>
      <div style={{ padding: '4px 12px 20px', borderBottom: `1px solid ${border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 14, letterSpacing: '0.12em', color: textActive, fontWeight: 400 }}>Coherence</div>
        <div style={{ fontSize: 10, color: textMuted, marginTop: 3, letterSpacing: '0.06em' }}>连贯性，而非准确性</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {navItem('/', '对话', '○')}
        <button onClick={toggleTheme} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '8px 12px', borderRadius: 8,
          background: 'none', border: 'none',
          color: textMuted, fontSize: 13, letterSpacing: '0.04em',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hoverBg}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{dark ? '○' : '●'}</span>
          <span>{dark ? '日间' : '夜间'}</span>
        </button>
      </div>
      <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12 }}>
        {navItem('/profile', '我的', '◇')}
      </div>
    </div>
  )
}

type UserProfile = {
  id: string
  created_at: string
  last_active_at: string
  linguistic_profile: {
    preferred_address: string | null
    key_framings: string[]
    value_lexicon: string[]
    tone_register: { formality: number; directness: number; emotional_openness: number }
    signature_version: number
  }
  semantic_model: {
    core_narrative: string | null
    current_life_phase: string | null
    key_relationships: Array<{ name: string; description: string }>
    active_themes: string[]
    model_confidence: number
  }
}

type MemoryStats = {
  total: number
  episodic: number
  semantic: number
  procedural: number
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('coherence_theme') !== 'light'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem('coherence_user_id')
    if (!userId || userId === 'undefined') { setLoading(false); return }

    fetch(`/api/profile?user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        setProfile(data.user)
        setStats(data.stats)
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('coherence_theme', next ? 'dark' : 'light')
  }

  const bg = dark ? '#111111' : '#ffffff'
  const border = dark ? '#2a2a2a' : '#e0e0e0'
  const textPrimary = dark ? '#f0ece4' : '#111111'
  const textSecondary = dark ? '#888880' : '#666666'
  const textMuted = dark ? '#404040' : '#bbbbbb'
  const surface = dark ? '#181818' : '#f7f7f7'
  const accent = dark ? '#6b6b6b' : '#999999'

  const daysSince = (dateStr: string) => {
    if (!dateStr) return 0
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: ${bg}; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${dark ? '#222' : '#ddd'}; border-radius: 2px; }
      `}</style>

      <div style={{
        display: 'flex', height: '100dvh',
        background: bg, color: textPrimary,
        fontFamily: '"FangSong","仿宋","STFangSong","Times New Roman",Georgia,serif',
      }}>
        <Sidebar dark={dark} toggleTheme={toggleTheme} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '48px 48px 64px' }}>
          <div style={{ maxWidth: 600, animation: 'fadeIn 0.3s ease' }}>

          {loading && (
            <div style={{ textAlign: 'center', color: textMuted, marginTop: '40vh', letterSpacing: '0.3em' }}>
              · · ·
            </div>
          )}

          {!loading && !profile && (
            <div style={{ textAlign: 'center', color: textSecondary, marginTop: '30vh' }}>
              <div style={{ fontSize: 15, letterSpacing: '0.05em' }}>还没有对话记录</div>
              <Link href="/" style={{
                display: 'inline-block', marginTop: 20,
                color: textMuted, fontSize: 12, letterSpacing: '0.08em',
                textDecoration: 'none',
                borderBottom: `1px solid ${border}`,
                paddingBottom: 2,
              }}>
                开始第一次对话 →
              </Link>
            </div>
          )}

          {!loading && profile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* 账户概览 */}
              <div style={{
                background: surface,
                borderRadius: 16,
                padding: '20px',
                border: `1px solid ${border}`,
              }}>
                <div style={{ fontSize: 11, color: textMuted, letterSpacing: '0.1em', marginBottom: 14 }}>
                  账户
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Row label="对话开始于" value={new Date(profile.created_at).toLocaleDateString('zh-CN')} textSecondary={textSecondary} textMuted={textMuted} />
                  <Row label="最近活跃" value={profile.last_active_at ? `${daysSince(profile.last_active_at)} 天前` : '今天'} textSecondary={textSecondary} textMuted={textMuted} />
                  <Row label="用户 ID" value={profile.id.slice(0, 8) + '…'} textSecondary={textSecondary} textMuted={textMuted} />
                </div>
              </div>

              {/* 记忆统计 */}
              {stats && (
                <div style={{
                  background: surface,
                  borderRadius: 16,
                  padding: '20px',
                  border: `1px solid ${border}`,
                }}>
                  <div style={{ fontSize: 11, color: textMuted, letterSpacing: '0.1em', marginBottom: 14 }}>
                    记忆积累
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[
                      { label: '总计', value: stats.total },
                      { label: '事件', value: stats.episodic },
                      { label: '理解', value: stats.semantic },
                      { label: '偏好', value: stats.procedural },
                    ].map(item => (
                      <div key={item.label} style={{
                        flex: 1, textAlign: 'center',
                        padding: '12px 8px',
                        background: dark ? '#111' : '#fff',
                        borderRadius: 12,
                        border: `1px solid ${border}`,
                      }}>
                        <div style={{ fontSize: 22, color: textPrimary, letterSpacing: '-0.02em' }}>
                          {item.value}
                        </div>
                        <div style={{ fontSize: 11, color: textMuted, marginTop: 4, letterSpacing: '0.05em' }}>
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI 对你的理解 */}
              <div style={{
                background: surface,
                borderRadius: 16,
                padding: '20px',
                border: `1px solid ${border}`,
              }}>
                <div style={{ fontSize: 11, color: textMuted, letterSpacing: '0.1em', marginBottom: 16 }}>
                  它眼中的你
                </div>

                {profile.semantic_model.core_narrative ? (
                  <p style={{
                    fontSize: 15, lineHeight: 1.85, color: textSecondary,
                    letterSpacing: '0.04em', marginBottom: 16,
                    fontStyle: 'italic',
                  }}>
                    「{profile.semantic_model.core_narrative}」
                  </p>
                ) : (
                  <p style={{ fontSize: 13, color: textMuted, letterSpacing: '0.05em', marginBottom: 16 }}>
                    还在了解你…
                  </p>
                )}

                {profile.semantic_model.current_life_phase && (
                  <Row label="当前阶段" value={profile.semantic_model.current_life_phase} textSecondary={textSecondary} textMuted={textMuted} />
                )}

                {profile.semantic_model.active_themes?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: textMuted, letterSpacing: '0.08em', marginBottom: 8 }}>
                      活跃主题
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {profile.semantic_model.active_themes.map((theme, i) => (
                        <span key={i} style={{
                          fontSize: 12, color: textSecondary,
                          border: `1px solid ${border}`,
                          borderRadius: 20,
                          padding: '3px 10px',
                          letterSpacing: '0.05em',
                        }}>
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 语言签名 */}
              {(profile.linguistic_profile.value_lexicon?.length > 0 || profile.linguistic_profile.key_framings?.length > 0) && (
                <div style={{
                  background: surface,
                  borderRadius: 16,
                  padding: '20px',
                  border: `1px solid ${border}`,
                }}>
                  <div style={{ fontSize: 11, color: textMuted, letterSpacing: '0.1em', marginBottom: 16 }}>
                    你的语言
                  </div>

                  {profile.linguistic_profile.value_lexicon?.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: textMuted, letterSpacing: '0.08em', marginBottom: 8 }}>
                        在意的词
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {profile.linguistic_profile.value_lexicon.slice(0, 10).map((word, i) => (
                          <span key={i} style={{
                            fontSize: 13, color: accent,
                            letterSpacing: '0.05em',
                          }}>
                            {word}{i < Math.min(9, profile.linguistic_profile.value_lexicon.length - 1) ? ' ·' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.linguistic_profile.preferred_address && (
                    <Row label="称呼" value={profile.linguistic_profile.preferred_address} textSecondary={textSecondary} textMuted={textMuted} />
                  )}
                </div>
              )}

              {/* 清除记忆 */}
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <button
                  onClick={() => {
                    if (confirm('清除所有记忆？这无法撤销。')) {
                      localStorage.removeItem('coherence_user_id')
                      window.location.href = '/'
                    }
                  }}
                  style={{
                    background: 'none', border: 'none',
                    color: textMuted, fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit',
                    letterSpacing: '0.08em',
                    borderBottom: `1px solid ${border}`,
                    paddingBottom: 2,
                  }}
                >
                  清除记忆，重新开始
                </button>
              </div>

            </div>
          )}
          </div>
        </div>
      </div>
    </>
  )
}

function Row({ label, value, textSecondary, textMuted }: {
  label: string; value: string;
  textSecondary: string; textMuted: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 12, color: textMuted, letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, color: textSecondary, letterSpacing: '0.03em' }}>{value}</span>
    </div>
  )
}
