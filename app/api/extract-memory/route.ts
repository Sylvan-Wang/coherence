import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/memory'

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

const EXTRACTION_SYSTEM = `你是一个记忆提取系统。从用户的话语中提取结构化信息。
输出严格的 JSON，不含任何其他文字。

输出格式：
{
  "entities": [
    {
      "type": "person|place|event|concept|goal|fear",
      "canonical_name": "...",
      "aliases": [],
      "attributes": {},
      "relationship_to_user": "（仅 person 类型）",
      "emotional_valence": -1到1之间的数字,
      "salience": 0到1之间的数字
    }
  ],
  "memory_candidates": [
    {
      "content": "提炼后的记忆内容，第三人称描述用户",
      "memory_type": "episodic|semantic|procedural",
      "temporal_tag": "past|present|ongoing|aspirational|resolved",
      "event_time_hint": "如果能推断出时间填写相对描述",
      "salience_weight": 0到1,
      "confidence_score": 0到1,
      "narrative_tags": ["叙事线标签"],
      "relational_context": {
        "entities_involved": ["实体名称"],
        "emotional_register": "平静|兴奋|悲伤|愤怒|焦虑|释然",
        "disclosure_depth": "surface|moderate|deep"
      }
    }
  ],
  "linguistic_signals": {
    "address_preferences": [],
    "notable_framings": [],
    "value_words": [],
    "tone_indicators": {}
  }
}

salience_weight: 0.9+核心身份/深度袒露, 0.7-0.9重要关系/持续困境, 0.5-0.7日常分享, 0.3-0.5随口提及, <0.3不存储
confidence_score: 0.9+直接陈述, 0.7-0.9合理推断, 0.5-0.7间接暗示, <0.5不确定`

export async function POST(req: NextRequest) {
  try {
    const { user_id, utterance, session_id } = await req.json()
    if (!user_id || !utterance) {
      return NextResponse.json({ error: 'Missing user_id or utterance' }, { status: 400 })
    }

    // 调用 Claude 提取
    let extracted: {
      entities: Array<{
        type: string
        canonical_name: string
        aliases: string[]
        attributes: Record<string, unknown>
        relationship_to_user?: string
        emotional_valence: number
        salience: number
      }>
      memory_candidates: Array<{
        content: string
        memory_type: string
        temporal_tag: string
        event_time_hint?: string
        salience_weight: number
        confidence_score: number
        narrative_tags: string[]
        relational_context: {
          entities_involved: string[]
          emotional_register: string | null
          disclosure_depth: string | null
        }
      }>
      linguistic_signals: {
        address_preferences: string[]
        notable_framings: string[]
        value_words: string[]
        tone_indicators: Record<string, unknown>
      }
    } | null = null

    try {
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: EXTRACTION_SYSTEM },
          { role: 'user', content: utterance },
        ],
      })
      const text = response.choices[0]?.message?.content ?? ''
      // 解析 JSON，容错处理
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0])
      }
    } catch (parseErr) {
      console.error('Extraction parse error:', parseErr)
      // 降级：用最简单的记忆候选
      extracted = {
        entities: [],
        memory_candidates: [{
          content: `用户说："${utterance.slice(0, 200)}"`,
          memory_type: 'episodic',
          temporal_tag: 'present',
          salience_weight: 0.4,
          confidence_score: 0.7,
          narrative_tags: [],
          relational_context: { entities_involved: [], emotional_register: null, disclosure_depth: 'surface' }
        }],
        linguistic_signals: { address_preferences: [], notable_framings: [], value_words: [], tone_indicators: {} }
      }
    }

    if (!extracted) {
      return NextResponse.json({ ok: true, stored: 0 })
    }

    // 存储 entities
    for (const entity of extracted.entities) {
      if (entity.salience < 0.3) continue
      // Upsert：如果同名实体已存在则更新
      const { data: existing } = await supabase
        .from('entities')
        .select('id, mention_count')
        .eq('user_id', user_id)
        .eq('canonical_name', entity.canonical_name)
        .single()

      if (existing) {
        await supabase
          .from('entities')
          .update({
            mention_count: existing.mention_count + 1,
            last_updated_at: new Date().toISOString(),
            emotional_valence: entity.emotional_valence,
            salience: entity.salience,
            attributes: entity.attributes,
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('entities').insert({
          user_id,
          entity_type: entity.type,
          canonical_name: entity.canonical_name,
          aliases: entity.aliases ?? [],
          attributes: entity.attributes ?? {},
          relationship_to_user: entity.relationship_to_user,
          emotional_valence: entity.emotional_valence,
          salience: entity.salience,
        })
      }
    }

    // 存储 memory_candidates
    let stored = 0
    for (const candidate of extracted.memory_candidates) {
      if (candidate.salience_weight < 0.3) continue
      if (candidate.confidence_score < 0.5) continue

      let embedding: number[] | null = null
      try {
        embedding = await generateEmbedding(candidate.content)
      } catch (embErr) {
        console.error('Embedding error:', embErr)
      }

      await supabase.from('memory_entries').insert({
        user_id,
        content: candidate.content,
        embedding,
        raw_utterance: utterance,
        memory_type: candidate.memory_type,
        temporal_tag: candidate.temporal_tag,
        salience_weight: candidate.salience_weight,
        confidence_score: candidate.confidence_score,
        narrative_tags: candidate.narrative_tags ?? [],
        relational_context: {
          ...candidate.relational_context,
          session_id: session_id ?? null,
        },
      })
      stored++
    }

    // 更新语言签名（渐进合并）
    if (extracted.linguistic_signals.value_words.length > 0 || extracted.linguistic_signals.notable_framings.length > 0) {
      const { data: user } = await supabase.from('users').select('linguistic_profile').eq('id', user_id).single()
      if (user) {
        const profile = user.linguistic_profile
        const newValueLexicon = Array.from(new Set([
          ...profile.value_lexicon,
          ...extracted.linguistic_signals.value_words,
        ])).slice(0, 30)
        const newFramings = Array.from(new Set([
          ...profile.key_framings,
          ...extracted.linguistic_signals.notable_framings,
        ])).slice(0, 20)
        await supabase.from('users').update({
          linguistic_profile: {
            ...profile,
            value_lexicon: newValueLexicon,
            key_framings: newFramings,
            signature_version: (profile.signature_version ?? 0) + 1,
          },
          last_active_at: new Date().toISOString(),
        }).eq('id', user_id)
      }
    }

    return NextResponse.json({ ok: true, stored, extracted })
  } catch (err) {
    console.error('extract-memory error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
