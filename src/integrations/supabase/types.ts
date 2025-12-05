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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academy_videos: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          sort_order: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      appointment_reminders: {
        Row: {
          appointment_id: string
          channel: string
          id: string
          reminder_type: string
          sent_at: string
        }
        Insert: {
          appointment_id: string
          channel?: string
          id?: string
          reminder_type: string
          sent_at?: string
        }
        Update: {
          appointment_id?: string
          channel?: string
          id?: string
          reminder_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string
          date: string
          duration: number | null
          horse_id: string
          id: string
          is_confirmed_by_client: boolean | null
          location: string | null
          notes: string | null
          price: number | null
          provider_id: string | null
          service_type: string | null
          status: string | null
          time: string | null
          updated_at: string
        }
        Insert: {
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          date: string
          duration?: number | null
          horse_id: string
          id?: string
          is_confirmed_by_client?: boolean | null
          location?: string | null
          notes?: string | null
          price?: number | null
          provider_id?: string | null
          service_type?: string | null
          status?: string | null
          time?: string | null
          updated_at?: string
        }
        Update: {
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          date?: string
          duration?: number | null
          horse_id?: string
          id?: string
          is_confirmed_by_client?: boolean | null
          location?: string | null
          notes?: string | null
          price?: number | null
          provider_id?: string | null
          service_type?: string | null
          status?: string | null
          time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          about_text: string | null
          accept_new_customers: boolean | null
          address: string | null
          business_name: string | null
          copecart_vendor_id: string | null
          created_at: string
          custom_domain: string | null
          email: string | null
          hero_headline: string | null
          id: string
          logo_url: string | null
          owner_name: string | null
          paypal_link: string | null
          phone: string | null
          primary_color: string | null
          reminder_custom_text: string | null
          reminder_intervals: Json | null
          stripe_public_key: string | null
          subdomain: string | null
          tax_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          about_text?: string | null
          accept_new_customers?: boolean | null
          address?: string | null
          business_name?: string | null
          copecart_vendor_id?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string | null
          hero_headline?: string | null
          id?: string
          logo_url?: string | null
          owner_name?: string | null
          paypal_link?: string | null
          phone?: string | null
          primary_color?: string | null
          reminder_custom_text?: string | null
          reminder_intervals?: Json | null
          stripe_public_key?: string | null
          subdomain?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          about_text?: string | null
          accept_new_customers?: boolean | null
          address?: string | null
          business_name?: string | null
          copecart_vendor_id?: string | null
          created_at?: string
          custom_domain?: string | null
          email?: string | null
          hero_headline?: string | null
          id?: string
          logo_url?: string | null
          owner_name?: string | null
          paypal_link?: string | null
          phone?: string | null
          primary_color?: string | null
          reminder_custom_text?: string | null
          reminder_intervals?: Json | null
          stripe_public_key?: string | null
          subdomain?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_message_at: string | null
          provider_id: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          provider_id: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          provider_id?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          created_at: string
          customer_name: string
          id: string
          is_featured: boolean | null
          provider_id: string | null
          rating: number
          source: string | null
          text: string | null
        }
        Insert: {
          created_at?: string
          customer_name: string
          id?: string
          is_featured?: boolean | null
          provider_id?: string | null
          rating: number
          source?: string | null
          text?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string
          id?: string
          is_featured?: boolean | null
          provider_id?: string | null
          rating?: number
          source?: string | null
          text?: string | null
        }
        Relationships: []
      }
      hoof_photos: {
        Row: {
          appointment_id: string | null
          created_at: string
          hoof_position: string | null
          horse_id: string
          id: string
          notes: string | null
          photo_url: string
          taken_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          hoof_position?: string | null
          horse_id: string
          id?: string
          notes?: string | null
          photo_url: string
          taken_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          hoof_position?: string | null
          horse_id?: string
          id?: string
          notes?: string | null
          photo_url?: string
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hoof_photos_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_photos_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_documents: {
        Row: {
          category: string | null
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          horse_id: string
          id: string
          notes: string | null
          uploaded_by: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          horse_id: string
          id?: string
          notes?: string | null
          uploaded_by: string
        }
        Update: {
          category?: string | null
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          horse_id?: string
          id?: string
          notes?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      horses: {
        Row: {
          birth_year: number | null
          breed: string | null
          color: string | null
          contacts: Json | null
          created_at: string
          discipline: string | null
          display_id: string | null
          eqid: string | null
          feeding_notes: string | null
          gender: string | null
          health_status: string | null
          height: string | null
          hoof_measurements: Json | null
          hoof_protection: string | null
          hoof_type: string | null
          housing: string | null
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          medical_history: string | null
          name: string
          nickname: string | null
          owner_id: string
          photo_url: string | null
          shoeing_interval: number | null
          special_notes: string | null
          updated_at: string
          usage: string | null
        }
        Insert: {
          birth_year?: number | null
          breed?: string | null
          color?: string | null
          contacts?: Json | null
          created_at?: string
          discipline?: string | null
          display_id?: string | null
          eqid?: string | null
          feeding_notes?: string | null
          gender?: string | null
          health_status?: string | null
          height?: string | null
          hoof_measurements?: Json | null
          hoof_protection?: string | null
          hoof_type?: string | null
          housing?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          medical_history?: string | null
          name: string
          nickname?: string | null
          owner_id: string
          photo_url?: string | null
          shoeing_interval?: number | null
          special_notes?: string | null
          updated_at?: string
          usage?: string | null
        }
        Update: {
          birth_year?: number | null
          breed?: string | null
          color?: string | null
          contacts?: Json | null
          created_at?: string
          discipline?: string | null
          display_id?: string | null
          eqid?: string | null
          feeding_notes?: string | null
          gender?: string | null
          health_status?: string | null
          height?: string | null
          hoof_measurements?: Json | null
          hoof_protection?: string | null
          hoof_type?: string | null
          housing?: string | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          medical_history?: string | null
          name?: string
          nickname?: string | null
          owner_id?: string
          photo_url?: string | null
          shoeing_interval?: number | null
          special_notes?: string | null
          updated_at?: string
          usage?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          due_date: string | null
          horse_id: string | null
          id: string
          invoice_number: string | null
          issue_date: string
          notes: string | null
          pdf_url: string | null
          status: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          due_date?: string | null
          horse_id?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          pdf_url?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          due_date?: string | null
          horse_id?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          pdf_url?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          created_at: string
          description: string | null
          features: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          price: number | null
          price_type: string | null
          provider_id: string | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price?: number | null
          price_type?: string | null
          provider_id?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price?: number | null
          price_type?: string | null
          provider_id?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_hours: Json | null
          created_at: string
          created_by_provider_id: string | null
          display_id: string | null
          email: string | null
          full_name: string | null
          has_logged_in: boolean | null
          id: string
          invited_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_hours?: Json | null
          created_at?: string
          created_by_provider_id?: string | null
          display_id?: string | null
          email?: string | null
          full_name?: string | null
          has_logged_in?: boolean | null
          id: string
          invited_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_hours?: Json | null
          created_at?: string
          created_by_provider_id?: string | null
          display_id?: string | null
          email?: string | null
          full_name?: string | null
          has_logged_in?: boolean | null
          id?: string
          invited_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          base_price: number
          category: string
          created_at: string
          description: string | null
          duration: number | null
          id: string
          is_active: boolean | null
          name: string
          provider_id: string | null
          updated_at: string
        }
        Insert: {
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          provider_id?: string | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          provider_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "provider" | "client"
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
      app_role: ["provider", "client"],
    },
  },
} as const
