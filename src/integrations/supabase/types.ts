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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_credentials: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_duration_ms: number | null
          attachment_url: string | null
          content: string
          created_at: string
          id: string
          message_type: string
          room_id: string
          sender_name: string
          user_id: string
        }
        Insert: {
          attachment_duration_ms?: number | null
          attachment_url?: string | null
          content: string
          created_at?: string
          id?: string
          message_type?: string
          room_id: string
          sender_name: string
          user_id: string
        }
        Update: {
          attachment_duration_ms?: number | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          room_id?: string
          sender_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          is_private: boolean
          name: string
          password_hash: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          id?: string
          is_private?: boolean
          name?: string
          password_hash?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          is_private?: boolean
          name?: string
          password_hash?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          language: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          language?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learned_words: {
        Row: {
          count: number
          created_at: string
          id: string
          updated_at: string
          word: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          updated_at?: string
          word: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          updated_at?: string
          word?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          role: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
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
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          subject: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          subject?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          subject?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      past_papers: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      private_knowledge: {
        Row: {
          content: string
          created_at: string
          filename: string | null
          id: string
          kind: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          filename?: string | null
          id?: string
          kind?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          filename?: string | null
          id?: string
          kind?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          preferred_language: string | null
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          preferred_language?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      room_members: {
        Row: {
          display_name: string
          id: string
          is_typing: boolean
          joined_at: string
          last_seen: string
          muted_until: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          display_name: string
          id?: string
          is_typing?: boolean
          joined_at?: string
          last_seen?: string
          muted_until?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          display_name?: string
          id?: string
          is_typing?: boolean
          joined_at?: string
          last_seen?: string
          muted_until?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      vicen_images: {
        Row: {
          category: string | null
          country: string | null
          created_at: string
          description: string | null
          file_size: number | null
          height: number | null
          id: string
          is_active: boolean
          language: string | null
          mime_type: string | null
          popularity_score: number | null
          quality_score: number | null
          relevance_boost: number | null
          sub_category: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          url: string
          width: number | null
        }
        Insert: {
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          is_active?: boolean
          language?: string | null
          mime_type?: string | null
          popularity_score?: number | null
          quality_score?: number | null
          relevance_boost?: number | null
          sub_category?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          url: string
          width?: number | null
        }
        Update: {
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          is_active?: boolean
          language?: string | null
          mime_type?: string | null
          popularity_score?: number | null
          quality_score?: number | null
          relevance_boost?: number | null
          sub_category?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      vicen_knowledge: {
        Row: {
          added_by: string | null
          categories: string[] | null
          context_summary: string | null
          created_at: string
          entities: string[] | null
          extracted_facts: string[] | null
          id: string
          is_active: boolean
          is_locked: boolean
          is_visible: boolean
          raw_content: string
          relationships: string[] | null
          topic: string | null
          updated_at: string
          useful_for: string[] | null
        }
        Insert: {
          added_by?: string | null
          categories?: string[] | null
          context_summary?: string | null
          created_at?: string
          entities?: string[] | null
          extracted_facts?: string[] | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          is_visible?: boolean
          raw_content: string
          relationships?: string[] | null
          topic?: string | null
          updated_at?: string
          useful_for?: string[] | null
        }
        Update: {
          added_by?: string | null
          categories?: string[] | null
          context_summary?: string | null
          created_at?: string
          entities?: string[] | null
          extracted_facts?: string[] | null
          id?: string
          is_active?: boolean
          is_locked?: boolean
          is_visible?: boolean
          raw_content?: string
          relationships?: string[] | null
          topic?: string | null
          updated_at?: string
          useful_for?: string[] | null
        }
        Relationships: []
      }
      vicen_logs: {
        Row: {
          action: string
          admin_name: string
          id: string
          session_id: string | null
          target: string | null
          timestamp: string
          topic: string | null
        }
        Insert: {
          action: string
          admin_name: string
          id?: string
          session_id?: string | null
          target?: string | null
          timestamp?: string
          topic?: string | null
        }
        Update: {
          action?: string
          admin_name?: string
          id?: string
          session_id?: string | null
          target?: string | null
          timestamp?: string
          topic?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_room_with_code: {
        Args: {
          _display_name: string
          _is_private: boolean
          _name: string
          _password: string
        }
        Returns: {
          code: string
          id: string
        }[]
      }
      is_room_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_muted: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      join_room_with_code: {
        Args: { _code: string; _display_name: string; _password: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
