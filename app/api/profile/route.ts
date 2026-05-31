import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  const [{ data: user }, { data: memories }] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase.from('memory_entries').select('memory_type').eq('user_id', userId),
  ])

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const stats = {
    total: memories?.length ?? 0,
    episodic: memories?.filter(m => m.memory_type === 'episodic').length ?? 0,
    semantic: memories?.filter(m => m.memory_type === 'semantic').length ?? 0,
    procedural: memories?.filter(m => m.memory_type === 'procedural').length ?? 0,
  }

  return NextResponse.json({ user, stats })
}
