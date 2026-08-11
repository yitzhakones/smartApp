// =============================================================================
// types/database.ts — TypeScript types for the live Supabase schema.
//
// Hand-authored to match supabase/migrations/001_initial.sql exactly (the
// Supabase CLI can't gen types here without `supabase login` / a direct DB
// connection string). Shape follows the CLI's generated `Database` interface so
// it drops into `createClient<Database>()` unchanged; if the CLI is later wired
// up, regenerate and diff against this file.
//
// One deliberate departure from raw CLI output: columns guarded by a Postgres
// CHECK ... IN (...) constraint are typed here as string-literal unions (see the
// domain types below) instead of bare `string`. The constraints are part of the
// migration, so these unions *do* match it — and they make the whole app
// (placement service, grading, cron jobs) type-safe against the allowed values.
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// -----------------------------------------------------------------------------
// Domain unions — mirror the CHECK (... IN (...)) constraints in the migration.
// -----------------------------------------------------------------------------
export type Category =
  | 'math'
  | 'science'
  | 'israeli_history'
  | 'general_knowledge'
export type DifficultyTier = 'easy' | 'medium' | 'hard'
export type Gender = 'male' | 'female'
export type Locale = 'he' | 'en'
export type AccessMode = 'pin' | 'no_code'
export type SubmissionStatus =
  | 'unanswered'
  | 'grading'
  | 'correct'
  | 'incorrect'
export type GradedBy = 'claude_api' | 'parent_override'
export type LedgerType =
  | 'star'
  | 'weekly_bonus'
  | 'parent_reward'
  | 'withdrawal'
export type RewardKind = 'money' | 'privilege'
export type PaymentMethod = 'cash' | 'bit' | 'bank_transfer' | 'other'
export type NotificationChannel = 'in_app' | 'email' | 'whatsapp'
export type NotificationTrigger =
  | 'correct_answer'
  | 'star_milestone'
  | 'weekly_bonus'
export type PeriodType = 'week' | 'month' | 'year'

export type Database = {
  public: {
    Tables: {
      parents: {
        Row: {
          id: string
          email: string
          whatsapp_number: string | null
          locale: Locale
          consent_accepted_at: string | null
          notification_prefs: Json
          created_at: string | null
        }
        Insert: {
          id: string
          email: string
          whatsapp_number?: string | null
          locale?: Locale
          consent_accepted_at?: string | null
          notification_prefs?: Json
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          whatsapp_number?: string | null
          locale?: Locale
          consent_accepted_at?: string | null
          notification_prefs?: Json
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'parents_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      children: {
        Row: {
          id: string
          parent_id: string
          display_name: string
          gender: Gender
          locale: Locale
          age_group: string | null
          region: string | null
          access_mode: AccessMode
          access_token: string
          access_pin: string | null
          enabled_categories: Category[]
          category_levels: Json
          shekel_per_star: number
          weekly_improvement_bonus: number
          created_at: string | null
        }
        Insert: {
          id?: string
          parent_id: string
          display_name: string
          gender: Gender
          locale?: Locale
          age_group?: string | null
          region?: string | null
          access_mode?: AccessMode
          access_token?: string
          access_pin?: string | null
          enabled_categories?: Category[]
          category_levels?: Json
          shekel_per_star?: number
          weekly_improvement_bonus?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          parent_id?: string
          display_name?: string
          gender?: Gender
          locale?: Locale
          age_group?: string | null
          region?: string | null
          access_mode?: AccessMode
          access_token?: string
          access_pin?: string | null
          enabled_categories?: Category[]
          category_levels?: Json
          shekel_per_star?: number
          weekly_improvement_bonus?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'children_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'parents'
            referencedColumns: ['id']
          },
        ]
      }
      questions: {
        Row: {
          id: string
          category: Category
          difficulty_tier: DifficultyTier
          text_he: string
          text_en: string
          answer_key_he: string
          answer_key_en: string
        }
        Insert: {
          id?: string
          category: Category
          difficulty_tier: DifficultyTier
          text_he: string
          text_en: string
          answer_key_he: string
          answer_key_en: string
        }
        Update: {
          id?: string
          category?: Category
          difficulty_tier?: DifficultyTier
          text_he?: string
          text_en?: string
          answer_key_he?: string
          answer_key_en?: string
        }
        Relationships: []
      }
      daily_sets: {
        Row: {
          id: string
          child_id: string
          date: string
          question_ids: string[]
        }
        Insert: {
          id?: string
          child_id: string
          date: string
          question_ids: string[]
        }
        Update: {
          id?: string
          child_id?: string
          date?: string
          question_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: 'daily_sets_child_id_fkey'
            columns: ['child_id']
            isOneToOne: false
            referencedRelation: 'children'
            referencedColumns: ['id']
          },
        ]
      }
      submissions: {
        Row: {
          id: string
          daily_set_id: string
          question_id: string
          child_id: string
          answer_text: string | null
          status: SubmissionStatus
          submitted_at: string | null
          graded_at: string | null
          graded_by: GradedBy | null
          ai_feedback_text: string | null
          parent_override_at: string | null
          parent_override_note: string | null
        }
        Insert: {
          id?: string
          daily_set_id: string
          question_id: string
          child_id: string
          answer_text?: string | null
          status?: SubmissionStatus
          submitted_at?: string | null
          graded_at?: string | null
          graded_by?: GradedBy | null
          ai_feedback_text?: string | null
          parent_override_at?: string | null
          parent_override_note?: string | null
        }
        Update: {
          id?: string
          daily_set_id?: string
          question_id?: string
          child_id?: string
          answer_text?: string | null
          status?: SubmissionStatus
          submitted_at?: string | null
          graded_at?: string | null
          graded_by?: GradedBy | null
          ai_feedback_text?: string | null
          parent_override_at?: string | null
          parent_override_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'submissions_daily_set_id_fkey'
            columns: ['daily_set_id']
            isOneToOne: false
            referencedRelation: 'daily_sets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'submissions_question_id_fkey'
            columns: ['question_id']
            isOneToOne: false
            referencedRelation: 'questions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'submissions_child_id_fkey'
            columns: ['child_id']
            isOneToOne: false
            referencedRelation: 'children'
            referencedColumns: ['id']
          },
        ]
      }
      child_stats: {
        Row: {
          child_id: string
          total_stars: number
          total_money_owed_nis: number
          streak: number
          last_played_date: string | null
          reward_milestone_pending: boolean
        }
        Insert: {
          child_id: string
          total_stars?: number
          total_money_owed_nis?: number
          streak?: number
          last_played_date?: string | null
          reward_milestone_pending?: boolean
        }
        Update: {
          child_id?: string
          total_stars?: number
          total_money_owed_nis?: number
          streak?: number
          last_played_date?: string | null
          reward_milestone_pending?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'child_stats_child_id_fkey'
            columns: ['child_id']
            isOneToOne: true
            referencedRelation: 'children'
            referencedColumns: ['id']
          },
        ]
      }
      weekly_rollups: {
        Row: {
          id: string
          child_id: string
          week_start_date: string
          stars_this_week: number
          stars_last_week: number
          improved: boolean
          bonus_awarded: boolean
        }
        Insert: {
          id?: string
          child_id: string
          week_start_date: string
          stars_this_week?: number
          stars_last_week?: number
          improved?: boolean
          bonus_awarded?: boolean
        }
        Update: {
          id?: string
          child_id?: string
          week_start_date?: string
          stars_this_week?: number
          stars_last_week?: number
          improved?: boolean
          bonus_awarded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'weekly_rollups_child_id_fkey'
            columns: ['child_id']
            isOneToOne: false
            referencedRelation: 'children'
            referencedColumns: ['id']
          },
        ]
      }
      reward_ledger: {
        Row: {
          id: string
          child_id: string
          type: LedgerType
          reward_kind: RewardKind
          amount_nis: number | null
          label: string | null
          note: string | null
          created_at: string | null
          payment_method: PaymentMethod | null
        }
        Insert: {
          id?: string
          child_id: string
          type: LedgerType
          reward_kind?: RewardKind
          amount_nis?: number | null
          label?: string | null
          note?: string | null
          created_at?: string | null
          payment_method?: PaymentMethod | null
        }
        Update: {
          id?: string
          child_id?: string
          type?: LedgerType
          reward_kind?: RewardKind
          amount_nis?: number | null
          label?: string | null
          note?: string | null
          created_at?: string | null
          payment_method?: PaymentMethod | null
        }
        Relationships: [
          {
            foreignKeyName: 'reward_ledger_child_id_fkey'
            columns: ['child_id']
            isOneToOne: false
            referencedRelation: 'children'
            referencedColumns: ['id']
          },
        ]
      }
      reward_presets: {
        Row: {
          id: string
          parent_id: string
          kind: RewardKind
          label: string
          amount_nis: number | null
        }
        Insert: {
          id?: string
          parent_id: string
          kind: RewardKind
          label: string
          amount_nis?: number | null
        }
        Update: {
          id?: string
          parent_id?: string
          kind?: RewardKind
          label?: string
          amount_nis?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'reward_presets_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'parents'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          child_id: string
          channel: NotificationChannel
          trigger_type: NotificationTrigger
          sent_at: string | null
          status: string
        }
        Insert: {
          id?: string
          child_id: string
          channel: NotificationChannel
          trigger_type: NotificationTrigger
          sent_at?: string | null
          status?: string
        }
        Update: {
          id?: string
          child_id?: string
          channel?: NotificationChannel
          trigger_type?: NotificationTrigger
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_child_id_fkey'
            columns: ['child_id']
            isOneToOne: false
            referencedRelation: 'children'
            referencedColumns: ['id']
          },
        ]
      }
      peer_cohort_stats: {
        Row: {
          age_group: string
          category: Category
          week_start_date: string
          avg_correct_rate: number | null
          percentile_buckets: Json | null
        }
        Insert: {
          age_group: string
          category: Category
          week_start_date: string
          avg_correct_rate?: number | null
          percentile_buckets?: Json | null
        }
        Update: {
          age_group?: string
          category?: Category
          week_start_date?: string
          avg_correct_rate?: number | null
          percentile_buckets?: Json | null
        }
        Relationships: []
      }
      analytics_fact_performance: {
        Row: {
          period_start: string
          period_type: PeriodType
          age_group: string
          gender: Gender
          category: Category
          difficulty_tier: DifficultyTier
          region: string | null
          child_count: number
          avg_accuracy_rate: number | null
          avg_stars_per_child: number | null
          avg_improvement_rate: number | null
        }
        Insert: {
          period_start: string
          period_type: PeriodType
          age_group: string
          gender: Gender
          category: Category
          difficulty_tier: DifficultyTier
          region?: string | null
          child_count: number
          avg_accuracy_rate?: number | null
          avg_stars_per_child?: number | null
          avg_improvement_rate?: number | null
        }
        Update: {
          period_start?: string
          period_type?: PeriodType
          age_group?: string
          gender?: Gender
          category?: Category
          difficulty_tier?: DifficultyTier
          region?: string | null
          child_count?: number
          avg_accuracy_rate?: number | null
          avg_stars_per_child?: number | null
          avg_improvement_rate?: number | null
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      is_my_child: {
        Args: { cid: string }
        Returns: boolean
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

// -----------------------------------------------------------------------------
// Convenience row/insert/update helpers (mirror the Supabase CLI helper types).
// -----------------------------------------------------------------------------
type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']
