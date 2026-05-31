# Coherence — 连贯性记忆 AI 陪伴

## 快速启动

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
编辑 `.env.local`，填入你的 API keys：
```
NEXT_PUBLIC_SUPABASE_URL=https://ccjlkdydmywechfppwmh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（已预填）
ANTHROPIC_API_KEY=sk-ant-...（填你的）
OPENAI_API_KEY=sk-...（填你的，用于 embedding）
```

### 3. 启动开发服务器
```bash
npm run dev
```

打开 http://localhost:3000

## 验收检查

1. 打开页面，AI 自动发出开场白
2. 说几句话
3. 打开 Supabase Dashboard → Table Editor → memory_entries，看到记录写入
4. 关掉页面，重新打开（`user_id` 存在 localStorage，会自动重连）
5. AI 的重逢方式与初次不同

## 项目结构

```
app/
  page.tsx              — 聊天前端
  api/
    health/route.ts     — Supabase 连接验证
    session/route.ts    — 创建用户和 session
    chat/route.ts       — 五层 prompt + 流式对话
    extract-memory/route.ts — 记忆提取 pipeline
lib/
  supabase.ts           — Supabase 客户端 + 类型
  memory.ts             — RAG 检索 + embedding + 格式化
```
