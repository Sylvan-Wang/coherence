'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type SessionItem = {
  id: string
  started_at: string
  session_type: string | null
  session_summary: string | null
  emotional_arc: string | null
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function Sidebar({ dark, toggleTheme, userId }: { dark: boolean; toggleTheme: () => void; userId: string | null }) {
  const pathname = usePathname()
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const border = dark ? '#1e1e1e' : '#ebebeb'

  useEffect(() => {
    if (!userId) return
    fetch(`/api/sessions?user_id=${userId}`)
      .then(r => r.json())
      .then(d => setSessions(d.sessions ?? []))
      .catch(() => {})
  }, [userId])
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
      width: 240, flexShrink: 0,
      background: bg,
      borderRight: `1px solid ${border}`,
      display: 'flex', flexDirection: 'column',
      padding: '20px 14px',
      height: '100vh',
      position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '4px 10px 20px', borderBottom: `1px solid ${border}`, marginBottom: 12 }}>
        <div style={{
          fontFamily: '"Bebas Neue", Impact, sans-serif',
          fontSize: 32, letterSpacing: '0.06em',
          color: textActive, lineHeight: 1,
        }}>
          COHERENCE
        </div>
        <div style={{ fontSize: 10, color: textMuted, marginTop: 5, letterSpacing: '0.12em', fontFamily: 'system-ui, sans-serif' }}>
          连贯性，而非准确性
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflow: 'hidden' }}>
        {navItem('/', '对话', '○')}

        {/* Session 时间轴 */}
        {sessions.length > 0 && (
          <div style={{ marginTop: 8, overflow: 'hidden' }}>
            <div style={{ fontSize: 10, color: dark ? '#2a2a2a' : '#ccc', letterSpacing: '0.1em', padding: '0 12px 6px' }}>
              历史
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 280 }}>
              {sessions.map((s, i) => (
                <div key={s.id} style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  marginBottom: 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: dark ? '#333' : '#ccc', letterSpacing: '0.04em' }}>
                      {i === 0 ? '本次' : formatDate(s.started_at)}
                    </span>
                    {s.session_type === 'first_meeting' && (
                      <span style={{ fontSize: 9, color: dark ? '#2a2a2a' : '#ddd', letterSpacing: '0.06em' }}>初遇</span>
                    )}
                  </div>
                  {s.session_summary && (
                    <div style={{
                      fontSize: 11, color: dark ? '#2e2e2e' : '#bbb',
                      marginTop: 2, lineHeight: 1.5,
                      letterSpacing: '0.03em',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    } as React.CSSProperties}>
                      {s.session_summary}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={toggleTheme} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '8px 12px', borderRadius: 8,
          background: 'none', border: 'none',
          color: textMuted, fontSize: 13,
          letterSpacing: '0.04em', cursor: 'pointer',
          fontFamily: 'inherit', transition: 'all 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hoverBg}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{dark ? '○' : '●'}</span>
          <span>{dark ? '日间' : '夜间'}</span>
        </button>
      </div>

      {/* Bottom — OUR MEMORIES */}
      <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12 }}>
        <Link href="/profile" style={{
          display: 'flex', alignItems: 'center',
          padding: '8px 10px', borderRadius: 8,
          textDecoration: 'none',
          color: pathname === '/profile' ? textActive : textMuted,
          background: pathname === '/profile' ? (dark ? '#1a1a1a' : '#ebebeb') : 'transparent',
          transition: 'all 0.15s',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 10, letterSpacing: '0.18em',
        }}
        onMouseEnter={e => { if (pathname !== '/profile') (e.currentTarget as HTMLElement).style.background = hoverBg }}
        onMouseLeave={e => { if (pathname !== '/profile') (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          OUR MEMORIES
        </Link>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('coherence_theme') !== 'light'
  })
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('coherence_theme', next ? 'dark' : 'light')
  }

  useEffect(() => {
    const readStreamInline = async (body: ReadableStream) => {
      const reader = body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') return
          try {
            const { text } = JSON.parse(data)
            if (text) setMessages(prev => {
              const u = [...prev]
              u[u.length - 1] = { ...u[u.length - 1], content: u[u.length - 1].content + text }
              return u
            })
          } catch {}
        }
      }
    }

    const init = async () => {
      const storedUserId = localStorage.getItem('coherence_user_id')
      const validId = storedUserId && storedUserId !== 'undefined' && storedUserId !== 'null'
        ? storedUserId : null
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: validId }),
      })
      const data = await res.json()
      if (data.user_id) {
        localStorage.setItem('coherence_user_id', data.user_id)
        setUserId(data.user_id)
        setSessionId(data.session_id)
        setInitialized(true)
        setLoading(true)
        setMessages([{ role: 'assistant', content: '' }])
        try {
          const chatRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: data.user_id,
              session_id: data.session_id,
              messages: [{ role: 'user', content: '（开始对话）' }],
            }),
          })
          if (chatRes.body) await readStreamInline(chatRes.body)
        } finally {
          setLoading(false)
        }
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const readStream = async (body: ReadableStream) => {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') return
        try {
          const { text } = JSON.parse(data)
          if (text) setMessages(prev => {
            const u = [...prev]
            u[u.length - 1] = { ...u[u.length - 1], content: u[u.length - 1].content + text }
            return u
          })
        } catch {}
      }
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading || !userId || !sessionId) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, session_id: sessionId, messages: newMessages }),
      })
      if (res.body) await readStream(res.body)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  const bg = dark ? '#111111' : '#ffffff'
  const border = dark ? '#1e1e1e' : '#ebebeb'
  const textPrimary = dark ? '#e8e3d9' : '#111111'
  const textSecondary = dark ? '#888' : '#666'
  const textMuted = dark ? '#333' : '#ccc'
  const userBubble = dark ? '#181818' : '#f4f4f4'
  const userText = dark ? '#b8b3ab' : '#333'
  const accent = dark ? '#555' : '#aaa'
  const inputBg = dark ? '#161616' : '#f7f7f7'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: ${bg}; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${dark ? '#222' : '#ddd'}; border-radius: 2px; }
        textarea::placeholder { color: ${textMuted}; }
      `}</style>

      <div style={{
        display: 'flex', height: '100dvh',
        background: bg,
        fontFamily: '"FangSong","仿宋","STFangSong","Times New Roman",Georgia,serif',
        color: textPrimary,
      }}>

        {/* Sidebar */}
        <Sidebar dark={dark} toggleTheme={toggleTheme} userId={userId} />

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Chat area */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '48px 0 160px',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', padding: '0 32px' }}>

              {!initialized && (
                <div style={{
                  textAlign: 'center', color: textMuted,
                  fontSize: 20, marginTop: '40vh',
                  letterSpacing: '0.4em',
                  animation: 'blink 2s ease-in-out infinite',
                }}>· · ·</div>
              )}

              {messages.map((msg, i) => {
                const isLast = i === messages.length - 1
                const isStreaming = loading && isLast && msg.role === 'assistant'

                return (
                  <div key={i} style={{
                    marginBottom: 28,
                    animation: 'fadeIn 0.2s ease',
                  }}>
                    {msg.role === 'user' ? (
                      <div style={{
                        display: 'flex', justifyContent: 'flex-end',
                      }}>
                        <div style={{
                          maxWidth: '72%',
                          background: userBubble,
                          color: userText,
                          borderRadius: '16px 16px 4px 16px',
                          padding: '10px 16px',
                          fontSize: 14,
                          lineHeight: 1.8,
                          letterSpacing: '0.04em',
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: accent, marginTop: 9, flexShrink: 0,
                        }} />
                        <div style={{
                          flex: 1,
                          fontSize: 15, lineHeight: 1.9,
                          letterSpacing: '0.04em',
                          color: textPrimary,
                          whiteSpace: 'pre-wrap',
                        }}>
                          {msg.content === '' && isStreaming ? (
                            <span style={{
                              display: 'inline-block', width: 2, height: 16,
                              background: accent, verticalAlign: 'middle',
                              animation: 'blink 1s step-end infinite',
                            }} />
                          ) : (
                            <>
                              {msg.content}
                              {isStreaming && (
                                <span style={{
                                  display: 'inline-block', width: 2, height: 13,
                                  background: accent, verticalAlign: 'middle', marginLeft: 2,
                                  animation: 'blink 1s step-end infinite',
                                }} />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 240,
            right: 0,
            padding: '16px 32px 28px',
            background: bg,
            borderTop: `1px solid ${border}`,
          }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-end',
                background: inputBg,
                border: `1px solid ${border}`,
                borderRadius: 14,
                padding: '10px 10px 10px 16px',
              }}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="说点什么…"
                  value={input}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  disabled={loading || !initialized}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    color: textPrimary, fontSize: 14, lineHeight: 1.7,
                    letterSpacing: '0.04em', resize: 'none', outline: 'none',
                    fontFamily: 'inherit', overflow: 'hidden',
                    opacity: (!initialized || loading) ? 0.4 : 1,
                    transition: 'opacity 0.2s',
                    padding: '2px 0', maxHeight: 140,
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim() || !initialized}
                  style={{
                    width: 32, height: 32, flexShrink: 0,
                    background: input.trim() && !loading ? textPrimary : 'transparent',
                    border: `1px solid ${input.trim() && !loading ? textPrimary : border}`,
                    color: input.trim() && !loading ? bg : textMuted,
                    borderRadius: 8, fontSize: 14,
                    cursor: input.trim() && !loading ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                >↑</button>
              </div>
              <div style={{
                fontSize: 10, color: dark ? '#222' : '#ddd',
                marginTop: 8, textAlign: 'center', letterSpacing: '0.08em',
              }}>
                Enter 发送 · Shift+Enter 换行
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
