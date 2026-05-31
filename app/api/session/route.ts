import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 创建或获取用户，返回 user_id + session_id
export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()

    // 过滤掉字符串 "undefined" / "null"
    let userId = (user_id && user_id !== 'undefined' && user_id !== 'null') ? user_id : null

    // 如果没有 user_id，创建新用户
    if (!userId) {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({})
        .select('id')
        .single()
      if (error) throw error
      userId = newUser.id
    }

    // 创建新 session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({ user_id: userId, session_type: 'casual' })
      .select('id')
      .single()
    if (sessionError) throw sessionError

    return NextResponse.json({ user_id: userId, session_id: session.id })
  } catch (err) {
    console.error('session error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
