import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const { data, error } = await supabase.from('users').select('count').limit(1)

  return NextResponse.json({
    supabase_url: url ?? 'MISSING',
    key_prefix: key ? key.slice(0, 20) + '...' : 'MISSING',
    db_ok: !error,
    db_error: error?.message ?? null,
  })
}
