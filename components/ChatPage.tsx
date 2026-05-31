'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
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

  useEffect(() => {
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
        streamAIGreeting(data.user_id, data.session_id, [])
      }
    }
    init()
  }, [streamAIGreeting])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('coherence_theme', next ? 'dark' : 'light')
  }

  const readStream = useCallback(async (body: ReadableStream) => {
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
  }, [])

  const streamAIGreeting = useCallback(async (uid: string, sid: string, history: Message[]) => {
    setLoading(true)
    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: uid, session_id: sid,
          messages: history.length > 0 ? history : [{ role: 'user', content: '（开始对话）' }],
        }),
      })
      if (res.body) await readStream(res.body)
    } finally {
      setLoading(false)
    }
  }, [readStream])

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
  const surface = dark ? '#1a1a1a' : '#f4f4f4'
  const border = dark ? '#2a2a2a' : '#e0e0e0'
  const textPrimary = dark ? '#f0ece4' : '#111111'
  const textSecondary = dark ? '#888880' : '#666666'
  const textMuted = dark ? '#404040' : '#bbbbbb'
  const userBubble = dark ? '#1e1e1e' : '#f0f0f0'
  const userText = dark ? '#c8c4bc' : '#333333'
  const accent = dark ? '#6b6b6b' : '#999999'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: ${bg}; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        ::-webkit-scrollbar { width: 0; }
        textarea::placeholder { color: ${textMuted}; }
        textarea { caret-color: ${textSecondary}; }
      `}</style>

      <div style={{
        minHeight: '100dvh',
        background: bg,
        color: textPrimary,
        fontFamily: '"FangSong","仿宋","STFangSong","Times New Roman",Georgia,serif',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 820,
        margin: '0 auto',
        position: 'relative',
      }}>

        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: bg,
          borderBottom: `1px solid ${border}`,
          padding: '14px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <span style={{ fontSize: 16, letterSpacing: '0.1em', color: textPrimary }}>Coherence</span>
            <span style={{ fontSize: 11, color: textMuted, marginLeft: 10, letterSpacing: '0.05em' }}>
              连贯性，而非准确性
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={toggleTheme} style={{
              background: 'none', border: `1px solid ${border}`,
              color: textSecondary, borderRadius: 20,
              padding: '4px 12px', fontSize: 11, cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.05em',
            }}>
              {dark ? '☀' : '☾'}
            </button>
            <Link href="/profile" style={{
              background: 'none', border: `1px solid ${border}`,
              color: textSecondary, borderRadius: 20,
              padding: '4px 12px', fontSize: 11, cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.05em',
              textDecoration: 'none', display: 'inline-block',
            }}>
              我的
            </Link>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          paddingBottom: 120,
        }}>
          {!initialized && (
            <div style={{
              textAlign: 'center', color: textMuted,
              fontSize: 20, marginTop: '40vh', letterSpacing: '0.4em',
              animation: 'blink 1.8s ease-in-out infinite',
            }}>· · ·</div>
          )}

          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1
            const isStreaming = loading && isLast && msg.role === 'assistant'

            return (
              <div key={i} style={{ animation: 'fadeIn 0.25s ease' }}>
                {msg.role === 'user' ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      maxWidth: '78%',
                      background: userBubble,
                      color: userText,
                      borderRadius: '18px 18px 4px 18px',
                      padding: '11px 16px',
                      fontSize: 15,
                      lineHeight: 1.75,
                      letterSpacing: '0.03em',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: accent, marginTop: 10, flexShrink: 0,
                    }} />
                    <div style={{
                      flex: 1,
                      fontSize: 15,
                      lineHeight: 1.85,
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

        {/* Input — fixed at bottom */}
        <div style={{
          position: 'fixed', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '100%', maxWidth: 820,
          background: bg,
          borderTop: `1px solid ${border}`,
          padding: '12px 16px 20px',
        }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: surface,
            borderRadius: 20,
            padding: '8px 8px 8px 16px',
            border: `1px solid ${border}`,
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
                color: textPrimary, fontSize: 15, lineHeight: 1.6,
                letterSpacing: '0.03em', resize: 'none', outline: 'none',
                fontFamily: 'inherit', overflow: 'hidden',
                opacity: (!initialized || loading) ? 0.4 : 1,
                transition: 'opacity 0.2s',
                padding: '2px 0',
                maxHeight: 140,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !initialized}
              style={{
                background: input.trim() && !loading ? textPrimary : 'transparent',
                border: `1px solid ${input.trim() && !loading ? textPrimary : border}`,
                color: input.trim() && !loading ? bg : textMuted,
                borderRadius: 16,
                width: 34, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                fontSize: 14, flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
