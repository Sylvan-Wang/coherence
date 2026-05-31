import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type MemoryEntry = {
  id: string
  user_id: string
  content: string
  embedding?: number[]
  raw_utterance?: string
  memory_type: 'episodic' | 'semantic' | 'procedural'
  created_at: string
  event_time?: string
  temporal_tag: 'past' | 'present' | 'ongoing' | 'aspirational' | 'resolved'
  salience_weight: number
  confidence_score: number
  decay_rate: number
  relational_context: {
    entities_involved: string[]
    emotional_register: string | null
    disclosure_depth: string | null
    session_id: string | null
  }
  superseded_by?: string
  version: number
  narrative_tags?: string[]
  last_accessed_at?: string
  access_count: number
}

export type User = {
  id: string
  created_at: string
  last_active_at?: string
  linguistic_profile: {
    preferred_address: string | null
    key_framings: string[]
    value_lexicon: string[]
    tone_register: {
      formality: number
      directness: number
      emotional_openness: number
    }
    recurring_metaphors: string[]
    signature_version: number
  }
  semantic_model: {
    core_narrative: string | null
    current_life_phase: string | null
    key_relationships: Array<{ name: string; description: string }>
    active_themes: string[]
    model_confidence: number
    last_updated: string | null
  }
}
