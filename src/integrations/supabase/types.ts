export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cached_jobs: {
        Row: {
          apply_url: string | null
          benefits_text_raw: string | null
          bonus_mentioned: string | null
          car_lease: string | null
          certifications: string[] | null
          city: string | null
          cloud_platforms: string[] | null
          commute_distance_km: number | null
          commute_mode: string | null
          commute_time_min: number | null
          commute_time_text: string | null
          company_description_raw: string | null
          company_linkedin_url: string | null
          company_name: string
          company_name_normalized: string | null
          company_size: string | null
          company_type: string | null
          company_website: string | null
          contract_type: string | null
          country: string | null
          data_stack: string[] | null
          date_posted: string | null
          date_scraped: string | null
          degree_fields: string[] | null
          department: string | null
          education_level: string | null
          employment_type: string | null
          equity_mentioned: string | null
          extra_holidays: string | null
          fetched_at: string
          gym_wellbeing: string | null
          hard_skills: string[] | null
          health_insurance: string | null
          home_office_budget: string | null
          hours_per_week_max: number | null
          hours_per_week_min: number | null
          ind_registered_sponsor: boolean | null
          industry: string | null
          job_description_language: string | null
          job_description_raw: string | null
          job_id: string
          job_status: string | null
          job_title: string
          job_title_normalized: string | null
          job_url: string | null
          language_level: string | null
          learning_budget: string | null
          learning_budget_amount: string | null
          ml_ds_methods: string[] | null
          nice_to_have_skills: string[] | null
          parental_leave: string | null
          pension: string | null
          postal_code: string | null
          region_province: string | null
          relocation_support_mentioned: string | null
          remote_region: string | null
          required_languages: string[] | null
          requirements_raw: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          salary_text_raw: string | null
          seniority_level: string | null
          soft_skills: string[] | null
          software_tools: string[] | null
          source: string
          source_job_id: string | null
          transport_allowance: string | null
          visa_sponsorship_mentioned: string | null
          work_address_raw: string | null
          work_lat: number | null
          work_lng: number | null
          work_mode: string | null
          years_experience_min: number | null
        }
        Insert: {
          apply_url?: string | null
          benefits_text_raw?: string | null
          bonus_mentioned?: string | null
          car_lease?: string | null
          certifications?: string[] | null
          city?: string | null
          cloud_platforms?: string[] | null
          commute_distance_km?: number | null
          commute_mode?: string | null
          commute_time_min?: number | null
          commute_time_text?: string | null
          company_description_raw?: string | null
          company_linkedin_url?: string | null
          company_name: string
          company_name_normalized?: string | null
          company_size?: string | null
          company_type?: string | null
          company_website?: string | null
          contract_type?: string | null
          country?: string | null
          data_stack?: string[] | null
          date_posted?: string | null
          date_scraped?: string | null
          degree_fields?: string[] | null
          department?: string | null
          education_level?: string | null
          employment_type?: string | null
          equity_mentioned?: string | null
          extra_holidays?: string | null
          fetched_at?: string
          gym_wellbeing?: string | null
          hard_skills?: string[] | null
          health_insurance?: string | null
          home_office_budget?: string | null
          hours_per_week_max?: number | null
          hours_per_week_min?: number | null
          ind_registered_sponsor?: boolean | null
          industry?: string | null
          job_description_language?: string | null
          job_description_raw?: string | null
          job_id: string
          job_status?: string | null
          job_title: string
          job_title_normalized?: string | null
          job_url?: string | null
          language_level?: string | null
          learning_budget?: string | null
          learning_budget_amount?: string | null
          ml_ds_methods?: string[] | null
          nice_to_have_skills?: string[] | null
          parental_leave?: string | null
          pension?: string | null
          postal_code?: string | null
          region_province?: string | null
          relocation_support_mentioned?: string | null
          remote_region?: string | null
          required_languages?: string[] | null
          requirements_raw?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          salary_text_raw?: string | null
          seniority_level?: string | null
          soft_skills?: string[] | null
          software_tools?: string[] | null
          source: string
          source_job_id?: string | null
          transport_allowance?: string | null
          visa_sponsorship_mentioned?: string | null
          work_address_raw?: string | null
          work_lat?: number | null
          work_lng?: number | null
          work_mode?: string | null
          years_experience_min?: number | null
        }
        Update: {
          apply_url?: string | null
          benefits_text_raw?: string | null
          bonus_mentioned?: string | null
          car_lease?: string | null
          certifications?: string[] | null
          city?: string | null
          cloud_platforms?: string[] | null
          commute_distance_km?: number | null
          commute_mode?: string | null
          commute_time_min?: number | null
          commute_time_text?: string | null
          company_description_raw?: string | null
          company_linkedin_url?: string | null
          company_name?: string
          company_name_normalized?: string | null
          company_size?: string | null
          company_type?: string | null
          company_website?: string | null
          contract_type?: string | null
          country?: string | null
          data_stack?: string[] | null
          date_posted?: string | null
          date_scraped?: string | null
          degree_fields?: string[] | null
          department?: string | null
          education_level?: string | null
          employment_type?: string | null
          equity_mentioned?: string | null
          extra_holidays?: string | null
          fetched_at?: string
          gym_wellbeing?: string | null
          hard_skills?: string[] | null
          health_insurance?: string | null
          home_office_budget?: string | null
          hours_per_week_max?: number | null
          hours_per_week_min?: number | null
          ind_registered_sponsor?: boolean | null
          industry?: string | null
          job_description_language?: string | null
          job_description_raw?: string | null
          job_id?: string
          job_status?: string | null
          job_title?: string
          job_title_normalized?: string | null
          job_url?: string | null
          language_level?: string | null
          learning_budget?: string | null
          learning_budget_amount?: string | null
          ml_ds_methods?: string[] | null
          nice_to_have_skills?: string[] | null
          parental_leave?: string | null
          pension?: string | null
          postal_code?: string | null
          region_province?: string | null
          relocation_support_mentioned?: string | null
          remote_region?: string | null
          required_languages?: string[] | null
          requirements_raw?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          salary_text_raw?: string | null
          seniority_level?: string | null
          soft_skills?: string[] | null
          software_tools?: string[] | null
          source?: string
          source_job_id?: string | null
          transport_allowance?: string | null
          visa_sponsorship_mentioned?: string | null
          work_address_raw?: string | null
          work_lat?: number | null
          work_lng?: number | null
          work_mode?: string | null
          years_experience_min?: number | null
        }
        Relationships: []
      }
      candidate_profiles: {
        Row: {
          created_at: string
          education_level: string | null
          file_name: string | null
          hard_skills: string[] | null
          id: string
          languages: string[] | null
          raw_text: string | null
          seniority: string | null
          software_tools: string[] | null
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          education_level?: string | null
          file_name?: string | null
          hard_skills?: string[] | null
          id?: string
          languages?: string[] | null
          raw_text?: string | null
          seniority?: string | null
          software_tools?: string[] | null
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          education_level?: string | null
          file_name?: string | null
          hard_skills?: string[] | null
          id?: string
          languages?: string[] | null
          raw_text?: string | null
          seniority?: string | null
          software_tools?: string[] | null
          years_experience?: number | null
        }
        Relationships: []
      }
      cv_profiles: {
        Row: {
          candidate_profile_hash: string | null
          candidate_profile_json: Json | null
          file_name: string | null
          id: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          candidate_profile_hash?: string | null
          candidate_profile_json?: Json | null
          file_name?: string | null
          id?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          candidate_profile_hash?: string | null
          candidate_profile_json?: Json | null
          file_name?: string | null
          id?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ind_sponsors: {
        Row: {
          company_name: string
          company_name_normalized: string
          created_at: string
          id: string
        }
        Insert: {
          company_name: string
          company_name_normalized: string
          created_at?: string
          id?: string
        }
        Update: {
          company_name?: string
          company_name_normalized?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_login_at: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          plan_status: Database["public"]["Enums"]["plan_status"]
          stripe_customer_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_login_at?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          plan_status?: Database["public"]["Enums"]["plan_status"]
          stripe_customer_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_login_at?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          plan_status?: Database["public"]["Enums"]["plan_status"]
          stripe_customer_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string
          filters_json: Json
          id: string
          last_run_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters_json: Json
          id?: string
          last_run_at?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters_json?: Json
          id?: string
          last_run_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          event_count: number
          event_type: Database["public"]["Enums"]["usage_event_type"]
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_count?: number
          event_type: Database["public"]["Enums"]["usage_event_type"]
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_count?: number
          event_type?: Database["public"]["Enums"]["usage_event_type"]
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          default_city: string | null
          default_commute_mode: string | null
          default_commute_origin: string | null
          default_country: string | null
          default_language_preferences: string[] | null
          default_radius_km: number | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_city?: string | null
          default_commute_mode?: string | null
          default_commute_origin?: string | null
          default_country?: string | null
          default_language_preferences?: string[] | null
          default_radius_km?: number | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_city?: string | null
          default_commute_mode?: string | null
          default_commute_origin?: string | null
          default_country?: string | null
          default_language_preferences?: string[] | null
          default_radius_km?: number | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      plan_status: "active" | "canceled" | "past_due"
      usage_event_type:
        | "search"
        | "export"
        | "cv_upload"
        | "commute_calc"
        | "ai_rewrite"
      user_plan: "free" | "pro" | "premium"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      plan_status: ["active", "canceled", "past_due"],
      usage_event_type: [
        "search",
        "export",
        "cv_upload",
        "commute_calc",
        "ai_rewrite",
      ],
      user_plan: ["free", "pro", "premium"],
    },
  },
} as const
