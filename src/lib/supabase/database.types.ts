// Auto-generated Supabase types — regenerate with: supabase gen types typescript --local > src/lib/supabase/database.types.ts
// This file represents the shape used by the Supabase client for type-safe queries.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          plan: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      user_profiles: {
        Row: {
          id: string
          organization_id: string
          email: string
          full_name: string
          avatar_url: string | null
          role: string
          is_active: boolean
          last_seen_at: string | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      clients: {
        Row: {
          id: string
          organization_id: string
          name: string
          industry: string | null
          website: string | null
          logo_url: string | null
          monthly_budget: number | null
          currency: string
          timezone: string
          account_manager_id: string | null
          tags: string[]
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      platform_connections: {
        Row: {
          id: string
          client_id: string
          organization_id: string
          platform: string
          status: string
          account_id: string | null
          account_name: string | null
          access_token_encrypted: string | null
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          scopes: string[]
          metadata: Json
          last_sync_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['platform_connections']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['platform_connections']['Insert']>
      }
      campaigns: {
        Row: {
          id: string
          client_id: string
          organization_id: string
          platform_connection_id: string
          platform: string
          platform_campaign_id: string
          name: string
          status: string
          objective: string | null
          start_date: string | null
          end_date: string | null
          daily_budget: number | null
          total_budget: number | null
          currency: string
          target_locations: string[]
          target_languages: string[]
          platform_metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>
      }
      campaign_metrics: {
        Row: {
          id: string
          campaign_id: string
          date: string
          impressions: number
          clicks: number
          spend: number
          conversions: number
          conversion_value: number
          ctr: number
          cpc: number
          cpm: number
          roas: number | null
          quality_score: number | null
          platform_data: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['campaign_metrics']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['campaign_metrics']['Insert']>
      }
      daily_performance: {
        Row: {
          id: string
          campaign_id: string
          client_id: string
          date: string
          impressions: number
          clicks: number
          spend: number
          conversions: number
          conversion_value: number
          ctr: number
          cpc: number
          cpm: number
          roas: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['daily_performance']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['daily_performance']['Insert']>
      }
      budget_tracking: {
        Row: {
          id: string
          campaign_id: string
          client_id: string
          period_start: string
          period_end: string
          budgeted_amount: number
          spent_amount: number
          projected_spend: number
          pacing_rate: number
          currency: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['budget_tracking']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['budget_tracking']['Insert']>
      }
      health_scores: {
        Row: {
          id: string
          campaign_id: string
          score: number
          components: Json
          trend: string
          calculated_at: string
        }
        Insert: Omit<Database['public']['Tables']['health_scores']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['health_scores']['Insert']>
      }
      alerts: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          campaign_id: string | null
          severity: string
          status: string
          type: string
          title: string
          message: string
          metadata: Json
          acknowledged_by: string | null
          acknowledged_at: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>
      }
      ai_insights: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          campaign_id: string | null
          type: string
          title: string
          summary: string
          details: string
          data_points: Json
          confidence: number
          is_read: boolean
          generated_at: string
          expires_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ai_insights']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['ai_insights']['Insert']>
      }
      ai_recommendations: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          campaign_id: string | null
          priority: string
          title: string
          description: string
          expected_impact: string
          implementation_steps: string[]
          estimated_lift: number | null
          is_dismissed: boolean
          is_implemented: boolean
          implemented_at: string | null
          generated_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ai_recommendations']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['ai_recommendations']['Insert']>
      }
      tasks: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          campaign_id: string | null
          created_by: string
          assigned_to: string | null
          title: string
          description: string | null
          status: string
          priority: string
          due_date: string | null
          completed_at: string | null
          tags: string[]
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
      }
      reports: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          created_by: string
          title: string
          description: string | null
          status: string
          type: string
          date_range_start: string
          date_range_end: string
          platforms: string[]
          campaign_ids: string[]
          config: Json
          file_url: string | null
          generated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['reports']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['reports']['Insert']>
      }
      sync_job_logs: {
        Row: {
          id: string
          organization_id: string
          platform_connection_id: string
          job_type: string
          status: string
          started_at: string
          completed_at: string | null
          records_synced: number
          records_failed: number
          error_summary: string | null
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sync_job_logs']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['sync_job_logs']['Insert']>
      }
      api_errors: {
        Row: {
          id: string
          organization_id: string
          platform_connection_id: string | null
          endpoint: string
          error_code: string | null
          error_message: string
          request_payload: Json | null
          response_body: Json | null
          retry_count: number
          resolved: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['api_errors']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['api_errors']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: {
      current_org_id: { Args: Record<string, never>; Returns: string }
      current_user_role: { Args: Record<string, never>; Returns: string }
    }
    Enums: Record<string, never>
  }
}
