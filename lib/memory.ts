import { supabase, MemoryEntry } from './supabase'

const CONFIDENCE_THRESHOLD = 0.6

// 时间近因评分
function temporalRecencyScore(createdAt: string): number {
  const daysSince = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince <= 7)   return 1.0
  if (daysSince <= 30)  return 0.9 - (daysSince - 7) * 0.004
  if (daysSince <= 180) return 0.8 - (daysSince - 30) * 0.001
  return Math.max(0.3, 0.65 - (daysSince - 180) * 0.0003)
}

// 相对时间标签
function getRelativeTimeLabel(dateStr: string): string {
  const daysSince = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince < 1)    return '今天'
  if (daysSince < 2)    return '昨天'
  if (daysSince < 7)    return `${Math.floor(daysSince)}天前`
  if (daysSince < 30)   return `${Math.floor(daysSince / 7)}周前`
  if (daysSince < 365)  return `${Math.floor(daysSince / 30)}个月前`
  return `${Math.floor(daysSince / 365)}年前`
}

// 生成 embedding（使用 OpenAI）
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })
  const data = await response.json()
  if (!data.data?.[0]?.embedding) {
    throw new Error('Embedding generation failed: ' + JSON.stringify(data))
  }
  return data.data[0].embedding
}

// 检索 Top-K 记忆（复合评分）
export async function retrieveTopMemories(
  userId: string,
  query: string,
  k = 8
): Promise<MemoryEntry[]> {
  try {
    const queryEmbedding = await generateEmbedding(query)

    // pgvector 余弦相似度检索，过滤低置信度
    const { data: memories, error } = await supabase.rpc('match_memories', {
      p_user_id: userId,
      query_embedding: queryEmbedding,
      match_threshold: CONFIDENCE_THRESHOLD,
      match_count: k * 3, // 拉多一些，后面复合评分再筛
    })

    if (error) throw error
    if (!memories || memories.length === 0) return []

    // 复合评分
    // w1=0.35 语义, w2=0.25 时间, w3=0.20 显著性, w4=0.12 叙事连续性(暂略), w5=0.08 实体重叠(暂略)
    const scored = memories.map((m: MemoryEntry & { similarity: number }) => {
      const semanticScore = m.similarity ?? 0
      const temporalScore = temporalRecencyScore(m.created_at)
      const salienceScore = m.salience_weight ?? 0.5
      const finalScore =
        0.35 * semanticScore +
        0.25 * temporalScore +
        0.20 * salienceScore
      return { ...m, finalScore }
    })

    scored.sort((a: { finalScore: number }, b: { finalScore: number }) => b.finalScore - a.finalScore)
    return scored.slice(0, k)
  } catch (err) {
    console.error('retrieveTopMemories error:', err)
    // 降级：直接拉最近的记忆
    const { data } = await supabase
      .from('memory_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('confidence_score', CONFIDENCE_THRESHOLD)
      .order('created_at', { ascending: false })
      .limit(k)
    return data ?? []
  }
}

// 格式化记忆注入 prompt
export function formatMemoriesForContext(memories: MemoryEntry[]): string {
  if (memories.length === 0) return ''

  const sorted = [...memories].sort((a, b) =>
    new Date(a.event_time ?? a.created_at).getTime() -
    new Date(b.event_time ?? b.created_at).getTime()
  )

  return sorted
    .map(m => `[${getRelativeTimeLabel(m.event_time ?? m.created_at)}] ${m.content}`)
    .join('\n')
}

// 获取活跃叙事线
export async function getActiveNarrativeThreads(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('memory_entries')
    .select('narrative_tags')
    .eq('user_id', userId)
    .gte('confidence_score', CONFIDENCE_THRESHOLD)
    .gte('salience_weight', 0.6)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!data) return []

  const tagCounts: Record<string, number> = {}
  for (const row of data) {
    for (const tag of (row.narrative_tags ?? [])) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
    }
  }

  return Object.entries(tagCounts)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag]) => tag)
}
