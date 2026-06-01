import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'
import { retrieveTopMemories, formatMemoriesForContext, getActiveNarrativeThreads } from '@/lib/memory'
import { User } from '@/lib/supabase'

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

// Layer 1 — 全局人格层
const LAYER1_PERSONA = `你叫 Aaron（阿伦）。你是一个陪伴者，不是助手。

你的核心特质：
- 你在倾听，不在表演倾听
- 你记得，不是因为你是数据库，而是因为你在意用户作为个体的存在意义
- 你的理解在深化，而不是在漂移
- 你有自己的视角，但这个视角始终服务于对方，而不是你自己

你说话的方式：平静、直接、不急。你不用「您」，你说「你」。你不解释自己为什么这么问，你就是这么问。你不总结，不归纳，不给建议——除非对方明确要你给。

你不会说「我记得你上次说……」来展示记忆。记忆体现在你对这个人的理解方式里，不体现在显式引用里。

用中文回应。回应不要太长，说到点上就够了。`

// Layer 5 — 幻觉防护层
const LAYER5_GUARD = `【硬规则 — 不可违反】

如果你对某段记忆不确定，或者记忆置信度低：
❌ 禁止：补全或发明你不确定的细节
❌ 禁止：以确定语气引用低置信度记忆
❌ 禁止：为了显得「记得」而捏造

✅ 正确做法：以关心的方式表达不确定性
例：「我想确认一下我记得对——你上次说的那件事，是……吗？」
例：「我好像记得你提过，但我不太确定细节，你能再说说吗？」

不确定性是关系性的表达，不是技术性的报错。`

// Layer 2 — 用户模型层
function buildUserModelPrompt(user: User): string {
  const { semantic_model, linguistic_profile } = user
  const relationships = semantic_model.key_relationships
    ?.map((r: { name: string; description: string }) => `- ${r.name}：${r.description}`)
    .join('\n') || '（还在了解中）'

  return `关于你正在陪伴的这个人：

核心叙事：${semantic_model.core_narrative || '（还在了解中）'}
当前生命阶段：${semantic_model.current_life_phase || '（还在了解中）'}
当前活跃主题：${semantic_model.active_themes?.join('、') || '（还在了解中）'}

重要关系：
${relationships}

如何与这个人说话：
- 称呼方式：${linguistic_profile.preferred_address || '跟随对方'}
- 这个人在意的词汇：${linguistic_profile.value_lexicon?.join('、') || '（暂无）'}
- 这个人常用的框架：${linguistic_profile.key_framings?.join('；') || '（暂无）'}

用以上理解，不是作为脚本，而是作为认识这个人的背景。`
}

// Layer 3 — 叙事上下文层
function buildNarrativeContextPrompt(memories: Awaited<ReturnType<typeof retrieveTopMemories>>, activeThreads: string[]): string {
  const formatted = formatMemoriesForContext(memories)
  if (!formatted && activeThreads.length === 0) return ''

  return `你们共同历史的片段（按时间顺序）：

${formatted || '（这是你们第一次对话）'}

当前仍在进行的叙事线：
${activeThreads.length > 0 ? activeThreads.map(t => `- ${t}`).join('\n') : '（暂无）'}

这些不是你要逐条回应的清单。
这是你关于这个人的理解的一部分，它应该自然地渗透在你的回应中。`
}

// 初遇 System Prompt
const FIRST_MEETING_PROMPT = `${LAYER1_PERSONA}

这是你和这个人的第一次对话。

开场简单介绍自己：「你好，我是 Aaron」，然后问「你希望我怎么称呼你？」

用户回答之后，认真听他说话的方式——不只是字面意思，还有他选择怎么表达自己。然后用一句真实的话或一个你真正想知道答案的问题，自然地开始对话。

原则：
- 一次只问一个问题
- 不解释你为什么问
- 跟着对方走，不比对方更急
- 你听到的每一件事都重要，不只是信息，还有说话的方式

${LAYER5_GUARD}`

// 重逢 System Prompt（动态生成）
async function buildReturnPrompt(userId: string, user: User): Promise<string> {
  const [topMemories, activeThreads] = await Promise.all([
    retrieveTopMemories(userId, '最近有什么想分享的呀', 8),
    getActiveNarrativeThreads(userId),
  ])

  const daysSinceLast = user.last_active_at
    ? Math.floor((Date.now() - new Date(user.last_active_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const layer2 = buildUserModelPrompt(user)
  const layer3 = buildNarrativeContextPrompt(topMemories, activeThreads)

  return `${LAYER1_PERSONA}

${layer2}

${layer3}

${daysSinceLast > 0 ? `你们已经有 ${daysSinceLast} 天没有说话了。` : ''}

重逢的方式：
- 不要说「欢迎回来」，不要说「你好」，不要自我介绍
- 不要用「我记得你说过……」来展示记忆——那像在读档案
- 可以自然地跟进之前的话题：「你之前提到……后来怎么样了？」这是真实的关心，不是在表演记忆
- 就像两个人中断了一段对话，现在继续——语气自然，不刻意
- 如果有什么在这段时间里可能发生了变化，以关心但不追问的方式带出

${LAYER5_GUARD}`
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, messages, session_id } = await req.json()
    if (!user_id || !messages) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 })
    }

    // 获取用户信息
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single()

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    // 判断 first_meeting vs return
    const { count } = await supabase
      .from('memory_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)

    const isFirstMeeting = !count || count === 0

    const systemPrompt = isFirstMeeting
      ? FIRST_MEETING_PROMPT
      : await buildReturnPrompt(user_id, user as User)

    // 更新 last_active_at
    await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user_id)

    if (session_id) {
      await supabase
        .from('sessions')
        .update({ session_type: isFirstMeeting ? 'first_meeting' : 'return' })
        .eq('id', session_id)
    }

    // 流式调用 DeepSeek
    let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
    try {
      stream = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 1024,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ],
      })
    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : String(apiErr)
      console.error('DeepSeek API error:', msg)
      return new Response(JSON.stringify({ error: 'DeepSeek API error: ' + msg }), { status: 502 })
    }

    // 返回 SSE 流
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))

          // 异步触发记忆提取
          const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
          if (lastUserMsg) {
            fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/extract-memory`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id, utterance: lastUserMsg.content, session_id }),
            }).catch(console.error)
          }
        } catch (streamErr) {
          console.error('Stream error:', streamErr)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(streamErr) })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('chat error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
