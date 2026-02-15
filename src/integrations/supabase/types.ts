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
      akb_canon: {
        Row: {
          created_at: string
          id: string
          key: string
          telauthorium_id: string
          user_id: string
          value_json: Json
          version_number: number
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          telauthorium_id: string
          user_id: string
          value_json: Json
          version_number: number
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          telauthorium_id?: string
          user_id?: string
          value_json?: Json
          version_number?: number
          workspace_id?: string | null
        }
        Relationships: []
      }
      akb_conflicts: {
        Row: {
          a_ref: Json
          b_ref: Json
          conflict_type: string
          created_at: string
          domain: string
          id: string
          notes: string | null
          status: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          a_ref: Json
          b_ref: Json
          conflict_type: string
          created_at?: string
          domain: string
          id?: string
          notes?: string | null
          status?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          a_ref?: Json
          b_ref?: Json
          conflict_type?: string
          created_at?: string
          domain?: string
          id?: string
          notes?: string | null
          status?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      akb_domains: {
        Row: {
          completed_at: string | null
          created_at: string
          domain_key: string
          id: string
          locked: boolean
          locked_at: string | null
          min_met: boolean
          progress_json: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          domain_key: string
          id?: string
          locked?: boolean
          locked_at?: string | null
          min_met?: boolean
          progress_json?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          domain_key?: string
          id?: string
          locked?: boolean
          locked_at?: string | null
          min_met?: boolean
          progress_json?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      akb_drafts: {
        Row: {
          body_md: string
          created_at: string
          domain: string
          id: string
          proposed_by: string
          sources: Json
          status: string
          tags: string[]
          title: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          body_md: string
          created_at?: string
          domain: string
          id?: string
          proposed_by: string
          sources?: Json
          status?: string
          tags?: string[]
          title: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          body_md?: string
          created_at?: string
          domain?: string
          id?: string
          proposed_by?: string
          sources?: Json
          status?: string
          tags?: string[]
          title?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      akb_entries: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          source_conversation_id: string | null
          source_type: Database["public"]["Enums"]["akb_source_type"]
          telauthorium_id: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          source_conversation_id?: string | null
          source_type?: Database["public"]["Enums"]["akb_source_type"]
          telauthorium_id: string
          title: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          source_conversation_id?: string | null
          source_type?: Database["public"]["Enums"]["akb_source_type"]
          telauthorium_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "akb_entries_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      akb_extractions: {
        Row: {
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          error: string | null
          extracted_json: Json | null
          id: string
          model: string | null
          status: string
          upload_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          error?: string | null
          extracted_json?: Json | null
          id?: string
          model?: string | null
          status?: string
          upload_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          error?: string | null
          extracted_json?: Json | null
          id?: string
          model?: string | null
          status?: string
          upload_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "akb_extractions_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "akb_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      akb_law: {
        Row: {
          authority: Json
          body_md: string
          created_at: string
          domain: string
          id: string
          sources: Json
          tags: string[]
          telauthorium_id: string
          title: string
          user_id: string
          version_number: number
          workspace_id: string | null
        }
        Insert: {
          authority: Json
          body_md: string
          created_at?: string
          domain: string
          id?: string
          sources: Json
          tags?: string[]
          telauthorium_id: string
          title: string
          user_id: string
          version_number: number
          workspace_id?: string | null
        }
        Update: {
          authority?: Json
          body_md?: string
          created_at?: string
          domain?: string
          id?: string
          sources?: Json
          tags?: string[]
          telauthorium_id?: string
          title?: string
          user_id?: string
          version_number?: number
          workspace_id?: string | null
        }
        Relationships: []
      }
      akb_project_context: {
        Row: {
          domain_key: string
          field_key: string
          id: string
          project_id: string
          status: string | null
          updated_at: string | null
          user_id: string
          value: string | null
        }
        Insert: {
          domain_key: string
          field_key: string
          id?: string
          project_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          value?: string | null
        }
        Update: {
          domain_key?: string
          field_key?: string
          id?: string
          project_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "akb_project_context_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "akb_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      akb_projects: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      akb_proof_gates: {
        Row: {
          evidence_json: Json
          gate_name: string
          id: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          evidence_json?: Json
          gate_name: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          evidence_json?: Json
          gate_name?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      akb_uploads: {
        Row: {
          created_at: string
          filename: string | null
          id: string
          kind: string
          mime_type: string | null
          sha256: string | null
          size_bytes: number | null
          source_label: string | null
          source_ref_id: string | null
          source_type: string | null
          storage_path: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          filename?: string | null
          id?: string
          kind: string
          mime_type?: string | null
          sha256?: string | null
          size_bytes?: number | null
          source_label?: string | null
          source_ref_id?: string | null
          source_type?: string | null
          storage_path?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          filename?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          sha256?: string | null
          size_bytes?: number | null
          source_label?: string | null
          source_ref_id?: string | null
          source_type?: string | null
          storage_path?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      akb_url_pages: {
        Row: {
          created_at: string
          id: string
          source_id: string
          text_content: string
          title: string | null
          url: string
          user_id: string
          word_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          source_id: string
          text_content: string
          title?: string | null
          url: string
          user_id: string
          word_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          source_id?: string
          text_content?: string
          title?: string | null
          url?: string
          user_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "akb_url_pages_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "akb_url_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      akb_url_sources: {
        Row: {
          bytes: number | null
          content_hash: string | null
          content_type: string | null
          created_at: string
          error: string | null
          fetched_at: string | null
          http_status: number | null
          id: string
          meta: Json
          normalized_url: string
          parsed_at: string | null
          status: string
          url: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          bytes?: number | null
          content_hash?: string | null
          content_type?: string | null
          created_at?: string
          error?: string | null
          fetched_at?: string | null
          http_status?: number | null
          id?: string
          meta?: Json
          normalized_url: string
          parsed_at?: string | null
          status?: string
          url: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          bytes?: number | null
          content_hash?: string | null
          content_type?: string | null
          created_at?: string
          error?: string | null
          fetched_at?: string | null
          http_status?: number | null
          id?: string
          meta?: Json
          normalized_url?: string
          parsed_at?: string | null
          status?: string
          url?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      akb_user_canonical: {
        Row: {
          communication_style: string | null
          deal_breakers: string[] | null
          decision_philosophy: string | null
          id: string
          pricing_posture: string | null
          risk_profile: string | null
          strategic_intent: string | null
          tone_profile: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          communication_style?: string | null
          deal_breakers?: string[] | null
          decision_philosophy?: string | null
          id?: string
          pricing_posture?: string | null
          risk_profile?: string | null
          strategic_intent?: string | null
          tone_profile?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          communication_style?: string | null
          deal_breakers?: string[] | null
          decision_philosophy?: string | null
          id?: string
          pricing_posture?: string | null
          risk_profile?: string | null
          strategic_intent?: string | null
          tone_profile?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      artifact_versions: {
        Row: {
          actor: string
          ai_decision_id: string | null
          artifact_id: string
          content_md: string
          created_at: string
          id: string
          telauthorium_id: string
          user_id: string
          version_number: number
        }
        Insert: {
          actor?: string
          ai_decision_id?: string | null
          artifact_id: string
          content_md: string
          created_at?: string
          id?: string
          telauthorium_id: string
          user_id: string
          version_number: number
        }
        Update: {
          actor?: string
          ai_decision_id?: string | null
          artifact_id?: string
          content_md?: string
          created_at?: string
          id?: string
          telauthorium_id?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "artifact_versions_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          project_id: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          status?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      garvis_module_detections: {
        Row: {
          confidence: number
          created_at: string
          id: string
          module_key: string
          signal_json: Json
          source_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          id?: string
          module_key: string
          signal_json?: Json
          source_id?: string | null
          source_type: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          module_key?: string
          signal_json?: Json
          source_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      garvis_module_scaffolds: {
        Row: {
          context: Json
          created_at: string
          id: string
          module_key: string
          next_steps: Json
          status: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          module_key: string
          next_steps?: Json
          status?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          module_key?: string
          next_steps?: Json
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      garvis_modules: {
        Row: {
          activation_threshold: number
          created_at: string
          description: string
          display_name: string
          id: string
          module_key: string
        }
        Insert: {
          activation_threshold?: number
          created_at?: string
          description: string
          display_name: string
          id?: string
          module_key: string
        }
        Update: {
          activation_threshold?: number
          created_at?: string
          description?: string
          display_name?: string
          id?: string
          module_key?: string
        }
        Relationships: []
      }
      garvis_user_modules: {
        Row: {
          activated_at: string | null
          activated_by: string
          activation_score: number | null
          confidence: number | null
          created_at: string
          id: string
          module_key: string
          status: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string
          activation_score?: number | null
          confidence?: number | null
          created_at?: string
          id?: string
          module_key: string
          status?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string
          activation_score?: number | null
          confidence?: number | null
          created_at?: string
          id?: string
          module_key?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      garvis_user_onboarding: {
        Row: {
          chosen_at: string | null
          completed_at: string | null
          created_at: string
          entry_level: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chosen_at?: string | null
          completed_at?: string | null
          created_at?: string
          entry_level?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chosen_at?: string | null
          completed_at?: string | null
          created_at?: string
          entry_level?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          extracted_json: Json
          id: string
          payment_last4: string | null
          project_tag: string | null
          receipt_date: string | null
          reimbursable: boolean
          source_hash: string | null
          source_mime: string | null
          source_path: string | null
          tax_amount: number | null
          telauthorium_id: string
          total_amount: number | null
          user_id: string
          vendor: string | null
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          extracted_json?: Json
          id?: string
          payment_last4?: string | null
          project_tag?: string | null
          receipt_date?: string | null
          reimbursable?: boolean
          source_hash?: string | null
          source_mime?: string | null
          source_path?: string | null
          tax_amount?: number | null
          telauthorium_id: string
          total_amount?: number | null
          user_id: string
          vendor?: string | null
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          extracted_json?: Json
          id?: string
          payment_last4?: string | null
          project_tag?: string | null
          receipt_date?: string | null
          reimbursable?: boolean
          source_hash?: string | null
          source_mime?: string | null
          source_path?: string | null
          tax_amount?: number | null
          telauthorium_id?: string
          total_amount?: number | null
          user_id?: string
          vendor?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      telauthorium_ledger: {
        Row: {
          action: string
          actor: string
          context: string | null
          created_at: string
          id: string
          telauthorium_id: string
          user_id: string
        }
        Insert: {
          action: string
          actor?: string
          context?: string | null
          created_at?: string
          id?: string
          telauthorium_id: string
          user_id: string
        }
        Update: {
          action?: string
          actor?: string
          context?: string | null
          created_at?: string
          id?: string
          telauthorium_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profile_versions: {
        Row: {
          config_json: Json
          created_at: string
          id: string
          telauthorium_id: string
          user_id: string
          user_profile_id: string
          version_number: number
        }
        Insert: {
          config_json: Json
          created_at?: string
          id?: string
          telauthorium_id: string
          user_id: string
          user_profile_id: string
          version_number: number
        }
        Update: {
          config_json?: Json
          created_at?: string
          id?: string
          telauthorium_id?: string
          user_id?: string
          user_profile_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_profile_versions_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_receipts_report: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          payment_last4: string | null
          project_tag: string | null
          receipt_date: string | null
          reimbursable: boolean | null
          source_path: string | null
          tax_amount: number | null
          telauthorium_id: string | null
          total_amount: number | null
          vendor: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          payment_last4?: string | null
          project_tag?: string | null
          receipt_date?: string | null
          reimbursable?: boolean | null
          source_path?: string | null
          tax_amount?: number | null
          telauthorium_id?: string | null
          total_amount?: number | null
          vendor?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          payment_last4?: string | null
          project_tag?: string | null
          receipt_date?: string | null
          reimbursable?: boolean | null
          source_path?: string | null
          tax_amount?: number | null
          telauthorium_id?: string | null
          total_amount?: number | null
          vendor?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      akb_lock_domain: { Args: { p_domain_key: string }; Returns: undefined }
      gen_telauthorium_id: { Args: never; Returns: string }
      is_conversation_owner: { Args: { conv_id: string }; Returns: boolean }
      sha256_hex: { Args: { t: string }; Returns: string }
    }
    Enums: {
      akb_source_type: "human" | "decision_object"
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
      akb_source_type: ["human", "decision_object"],
    },
  },
} as const
