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
      access_grants: {
        Row: {
          can_create_appointments: boolean | null
          can_view_basic: boolean | null
          can_view_medical: boolean | null
          client_id: string
          granted_at: string
          id: string
          is_active: boolean | null
          provider_id: string
          request_message: string | null
          requested_at: string | null
          requested_by: string | null
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          can_create_appointments?: boolean | null
          can_view_basic?: boolean | null
          can_view_medical?: boolean | null
          client_id: string
          granted_at?: string
          id?: string
          is_active?: boolean | null
          provider_id: string
          request_message?: string | null
          requested_at?: string | null
          requested_by?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          can_create_appointments?: boolean | null
          can_view_basic?: boolean | null
          can_view_medical?: boolean | null
          client_id?: string
          granted_at?: string
          id?: string
          is_active?: boolean | null
          provider_id?: string
          request_message?: string | null
          requested_at?: string | null
          requested_by?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_activity_log: {
        Row: {
          action_type: string
          admin_email: string | null
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_name: string | null
          target_type: string | null
        }
        Insert: {
          action_type: string
          admin_email?: string | null
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Update: {
          action_type?: string
          admin_email?: string | null
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_name?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          priority: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          priority?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
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
      appointment_groups: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          estimated_duration_minutes: number | null
          id: string
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          notes: string | null
          organization_id: string | null
          stable_address: string | null
          stable_name: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          estimated_duration_minutes?: number | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          notes?: string | null
          organization_id?: string | null
          stable_address?: string | null
          stable_name?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          estimated_duration_minutes?: number | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          notes?: string | null
          organization_id?: string | null
          stable_address?: string | null
          stable_name?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_horses: {
        Row: {
          appointment_id: string
          created_at: string
          horse_id: string
          id: string
          notes: string | null
          price: number | null
          service_type: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          horse_id: string
          id?: string
          notes?: string | null
          price?: number | null
          service_type?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          horse_id?: string
          id?: string
          notes?: string | null
          price?: number | null
          service_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_horses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_horses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "safe_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_horses_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_horses_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "safe_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          added_during_tour: boolean | null
          assigned_to_user_id: string | null
          client_id: string | null
          completed_at: string | null
          completion_notes: string | null
          completion_pdf_url: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string
          date: string
          duration: number | null
          gait_analysis_done: boolean | null
          gait_analysis_ok: boolean | null
          gait_video_url: string | null
          group_id: string | null
          horse_id: string
          id: string
          is_confirmed_by_client: boolean | null
          is_emergency: boolean | null
          is_internally_paid: boolean | null
          is_multi_horse: boolean | null
          is_series_appointment: boolean | null
          location: string | null
          notes: string | null
          organization_id: string | null
          price: number | null
          provider_id: string | null
          recurring_group_id: string | null
          series_current: number | null
          series_total: number | null
          service_type: string | null
          signature_url: string | null
          signed_at: string | null
          signed_by_name: string | null
          stable_group_id: string | null
          status: string | null
          time: string | null
          tour_order: number | null
          updated_at: string
        }
        Insert: {
          added_during_tour?: boolean | null
          assigned_to_user_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_pdf_url?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          date: string
          duration?: number | null
          gait_analysis_done?: boolean | null
          gait_analysis_ok?: boolean | null
          gait_video_url?: string | null
          group_id?: string | null
          horse_id: string
          id?: string
          is_confirmed_by_client?: boolean | null
          is_emergency?: boolean | null
          is_internally_paid?: boolean | null
          is_multi_horse?: boolean | null
          is_series_appointment?: boolean | null
          location?: string | null
          notes?: string | null
          organization_id?: string | null
          price?: number | null
          provider_id?: string | null
          recurring_group_id?: string | null
          series_current?: number | null
          series_total?: number | null
          service_type?: string | null
          signature_url?: string | null
          signed_at?: string | null
          signed_by_name?: string | null
          stable_group_id?: string | null
          status?: string | null
          time?: string | null
          tour_order?: number | null
          updated_at?: string
        }
        Update: {
          added_during_tour?: boolean | null
          assigned_to_user_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_pdf_url?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          date?: string
          duration?: number | null
          gait_analysis_done?: boolean | null
          gait_analysis_ok?: boolean | null
          gait_video_url?: string | null
          group_id?: string | null
          horse_id?: string
          id?: string
          is_confirmed_by_client?: boolean | null
          is_emergency?: boolean | null
          is_internally_paid?: boolean | null
          is_multi_horse?: boolean | null
          is_series_appointment?: boolean | null
          location?: string | null
          notes?: string | null
          organization_id?: string | null
          price?: number | null
          provider_id?: string | null
          recurring_group_id?: string | null
          series_current?: number | null
          series_total?: number | null
          service_type?: string | null
          signature_url?: string | null
          signed_at?: string | null
          signed_by_name?: string | null
          stable_group_id?: string | null
          status?: string | null
          time?: string | null
          tour_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "appointment_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_stable_group_id_fkey"
            columns: ["stable_group_id"]
            isOneToOne: false
            referencedRelation: "appointment_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_name: string | null
          category: string | null
          content: string
          content_type: string | null
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          scheduled_at: string | null
          slug: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author_name?: string | null
          category?: string | null
          content: string
          content_type?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slug: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author_name?: string | null
          category?: string | null
          content?: string
          content_type?: string | null
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      broadcast_logs: {
        Row: {
          channel: string
          created_at: string
          id: string
          message_content: string
          organization_id: string | null
          recipient_ids: string[] | null
          recipients_count: number
          sent_at: string | null
          sent_by: string
          status: string
          subject: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          message_content: string
          organization_id?: string | null
          recipient_ids?: string[] | null
          recipients_count?: number
          sent_at?: string | null
          sent_by: string
          status?: string
          subject?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          message_content?: string
          organization_id?: string | null
          recipient_ids?: string[] | null
          recipients_count?: number
          sent_at?: string | null
          sent_by?: string
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          about_text: string | null
          accept_new_customers: boolean | null
          address: string | null
          bank_name: string | null
          bic: string | null
          business_name: string | null
          client_intake_status: string | null
          copecart_customer_portal_url: string | null
          copecart_vendor_id: string | null
          created_at: string
          currency: string | null
          custom_domain: string | null
          default_vat_rate: number | null
          email: string | null
          gallery_images: Json | null
          hero_headline: string | null
          iban: string | null
          id: string
          impressum_text: string | null
          imprint: string | null
          logo_url: string | null
          owner_name: string | null
          paypal_link: string | null
          phone: string | null
          primary_color: string | null
          privacy: string | null
          reminder_custom_text: string | null
          reminder_intervals: Json | null
          reviews_layout: string | null
          section_order: Json | null
          stripe_public_key: string | null
          subdomain: string | null
          swiss_rounding: boolean | null
          tax_country: string | null
          tax_number: string | null
          terms: string | null
          terms_text: string | null
          travel_cost_flat: number | null
          travel_cost_per_km: number | null
          updated_at: string
          user_id: string | null
          vat_id: string | null
        }
        Insert: {
          about_text?: string | null
          accept_new_customers?: boolean | null
          address?: string | null
          bank_name?: string | null
          bic?: string | null
          business_name?: string | null
          client_intake_status?: string | null
          copecart_customer_portal_url?: string | null
          copecart_vendor_id?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          default_vat_rate?: number | null
          email?: string | null
          gallery_images?: Json | null
          hero_headline?: string | null
          iban?: string | null
          id?: string
          impressum_text?: string | null
          imprint?: string | null
          logo_url?: string | null
          owner_name?: string | null
          paypal_link?: string | null
          phone?: string | null
          primary_color?: string | null
          privacy?: string | null
          reminder_custom_text?: string | null
          reminder_intervals?: Json | null
          reviews_layout?: string | null
          section_order?: Json | null
          stripe_public_key?: string | null
          subdomain?: string | null
          swiss_rounding?: boolean | null
          tax_country?: string | null
          tax_number?: string | null
          terms?: string | null
          terms_text?: string | null
          travel_cost_flat?: number | null
          travel_cost_per_km?: number | null
          updated_at?: string
          user_id?: string | null
          vat_id?: string | null
        }
        Update: {
          about_text?: string | null
          accept_new_customers?: boolean | null
          address?: string | null
          bank_name?: string | null
          bic?: string | null
          business_name?: string | null
          client_intake_status?: string | null
          copecart_customer_portal_url?: string | null
          copecart_vendor_id?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          default_vat_rate?: number | null
          email?: string | null
          gallery_images?: Json | null
          hero_headline?: string | null
          iban?: string | null
          id?: string
          impressum_text?: string | null
          imprint?: string | null
          logo_url?: string | null
          owner_name?: string | null
          paypal_link?: string | null
          phone?: string | null
          primary_color?: string | null
          privacy?: string | null
          reminder_custom_text?: string | null
          reminder_intervals?: Json | null
          reviews_layout?: string | null
          section_order?: Json | null
          stripe_public_key?: string | null
          subdomain?: string | null
          swiss_rounding?: boolean | null
          tax_country?: string | null
          tax_number?: string | null
          terms?: string | null
          terms_text?: string | null
          travel_cost_flat?: number | null
          travel_cost_per_km?: number | null
          updated_at?: string
          user_id?: string | null
          vat_id?: string | null
        }
        Relationships: []
      }
      client_consents: {
        Row: {
          client_id: string
          consent_type: string
          created_at: string
          id: string
          ip_address: string | null
          provider_id: string
          user_agent: string | null
          version: string | null
        }
        Insert: {
          client_id: string
          consent_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          provider_id: string
          user_agent?: string | null
          version?: string | null
        }
        Update: {
          client_id?: string
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          provider_id?: string
          user_agent?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_consents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_consents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          category: Database["public"]["Enums"]["contact_category"]
          city: string | null
          company_name: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          is_business: boolean | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          profile_id: string | null
          provider_id: string
          readable_id: string | null
          source: string | null
          street: string | null
          updated_at: string
          vat_id: string | null
          zip_code: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["contact_category"]
          city?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_business?: boolean | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          profile_id?: string | null
          provider_id: string
          readable_id?: string | null
          source?: string | null
          street?: string | null
          updated_at?: string
          vat_id?: string | null
          zip_code?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["contact_category"]
          city?: string | null
          company_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_business?: boolean | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          profile_id?: string | null
          provider_id?: string
          readable_id?: string | null
          source?: string | null
          street?: string | null
          updated_at?: string
          vat_id?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tours: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          notes: string | null
          optimized_order: Json | null
          provider_id: string
          start_time: string | null
          status: string | null
          total_distance_km: number | null
          tour_active_since: string | null
          tour_date: string
          tour_ended_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          optimized_order?: Json | null
          provider_id: string
          start_time?: string | null
          status?: string | null
          total_distance_km?: number | null
          tour_active_since?: string | null
          tour_date: string
          tour_ended_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          optimized_order?: Json | null
          provider_id?: string
          start_time?: string | null
          status?: string | null
          total_distance_km?: number | null
          tour_active_since?: string | null
          tour_date?: string
          tour_ended_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          is_recurring: boolean
          organization_id: string | null
          receipt_url: string | null
          recurring_interval: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean
          organization_id?: string | null
          receipt_url?: string | null
          recurring_interval?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          is_recurring?: boolean
          organization_id?: string | null
          receipt_url?: string | null
          recurring_interval?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reports: {
        Row: {
          admin_notes: string | null
          browser_info: string | null
          created_at: string
          description: string
          id: string
          page_url: string
          resolved_at: string | null
          resolved_by: string | null
          screenshot_url: string | null
          status: string
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          admin_notes?: string | null
          browser_info?: string | null
          created_at?: string
          description: string
          id?: string
          page_url: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          status?: string
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          admin_notes?: string | null
          browser_info?: string | null
          created_at?: string
          description?: string
          id?: string
          page_url?: string
          resolved_at?: string | null
          resolved_by?: string | null
          screenshot_url?: string | null
          status?: string
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
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
      global_feature_defaults: {
        Row: {
          created_at: string | null
          default_status: Database["public"]["Enums"]["feature_status"]
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_status?: Database["public"]["Enums"]["feature_status"]
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_status?: Database["public"]["Enums"]["feature_status"]
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      global_products: {
        Row: {
          brand: string
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          shop_url: string | null
          updated_at: string
        }
        Insert: {
          brand: string
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          shop_url?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          shop_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      help_articles: {
        Row: {
          call_to_action: string | null
          category: string
          content: string
          created_at: string
          hook: string | null
          id: string
          is_featured: boolean | null
          role_access: Database["public"]["Enums"]["help_article_role_access"]
          solution_steps: string[] | null
          sort_order: number | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          call_to_action?: string | null
          category: string
          content: string
          created_at?: string
          hook?: string | null
          id?: string
          is_featured?: boolean | null
          role_access?: Database["public"]["Enums"]["help_article_role_access"]
          solution_steps?: string[] | null
          sort_order?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          call_to_action?: string | null
          category?: string
          content?: string
          created_at?: string
          hook?: string | null
          id?: string
          is_featured?: boolean | null
          role_access?: Database["public"]["Enums"]["help_article_role_access"]
          solution_steps?: string[] | null
          sort_order?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      hoof_analyses: {
        Row: {
          appointment_id: string | null
          belly_swing: string | null
          created_at: string
          croup_movement: string | null
          footfall_left: string | null
          footfall_right: string | null
          hoof_data_hl: Json | null
          hoof_data_hr: Json | null
          hoof_data_vl: Json | null
          hoof_data_vr: Json | null
          horse_id: string
          id: string
          notes: string | null
          provider_id: string
          recommendations: string[] | null
          stance_front: string | null
          stance_rear: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          belly_swing?: string | null
          created_at?: string
          croup_movement?: string | null
          footfall_left?: string | null
          footfall_right?: string | null
          hoof_data_hl?: Json | null
          hoof_data_hr?: Json | null
          hoof_data_vl?: Json | null
          hoof_data_vr?: Json | null
          horse_id: string
          id?: string
          notes?: string | null
          provider_id: string
          recommendations?: string[] | null
          stance_front?: string | null
          stance_rear?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          belly_swing?: string | null
          created_at?: string
          croup_movement?: string | null
          footfall_left?: string | null
          footfall_right?: string | null
          hoof_data_hl?: Json | null
          hoof_data_hr?: Json | null
          hoof_data_vl?: Json | null
          hoof_data_vr?: Json | null
          horse_id?: string
          id?: string
          notes?: string | null
          provider_id?: string
          recommendations?: string[] | null
          stance_front?: string | null
          stance_rear?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoof_analyses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_analyses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "safe_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_analyses_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_analyses_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      hoof_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          horse_id: string
          id: string
          images: string[] | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          horse_id: string
          id?: string
          images?: string[] | null
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          horse_id?: string
          id?: string
          images?: string[] | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoof_entries_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_entries_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      hoof_history: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          entry_date: string
          entry_type: string
          horse_id: string
          id: string
          photo_after_url: string | null
          photo_before_url: string | null
          updated_at: string
          voice_note_url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          entry_date?: string
          entry_type: string
          horse_id: string
          id?: string
          photo_after_url?: string | null
          photo_before_url?: string | null
          updated_at?: string
          voice_note_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          entry_date?: string
          entry_type?: string
          horse_id?: string
          id?: string
          photo_after_url?: string | null
          photo_before_url?: string | null
          updated_at?: string
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hoof_history_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_history_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "hoof_photos_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "safe_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_photos_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_photos_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
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
          {
            foreignKeyName: "horse_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      horses: {
        Row: {
          anamnesis_interval_months: number | null
          birth_date: string | null
          birth_year: number | null
          breed: string | null
          chip_number: string | null
          color: string | null
          contacts: Json | null
          created_at: string
          deleted_at: string | null
          discipline: string | null
          documents_urls: string[] | null
          eqid: string | null
          equine_type: string | null
          feeding_notes: string | null
          gender: string | null
          health_issues_general: string | null
          health_status: string | null
          height: string | null
          height_cm: number | null
          holding_type: string | null
          hoof_data: Json | null
          hoof_details: Json | null
          hoof_measurements: Json | null
          hoof_protection: string | null
          hoof_type: string | null
          housing: string | null
          id: string
          is_new_horse: boolean | null
          last_anamnesis_date: string | null
          last_appointment_date: string | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          medical_history: string | null
          name: string
          next_appointment_due: string | null
          nickname: string | null
          official_name: string | null
          organization_id: string | null
          owner_id: string
          photo_url: string | null
          readable_id: string | null
          recall_interval_weeks: number | null
          shoeing_interval: number | null
          shoeing_status: string | null
          special_notes: string | null
          stable_address_gps: Json | null
          updated_at: string
          usage: string | null
          usage_type: Database["public"]["Enums"]["usage_type"] | null
        }
        Insert: {
          anamnesis_interval_months?: number | null
          birth_date?: string | null
          birth_year?: number | null
          breed?: string | null
          chip_number?: string | null
          color?: string | null
          contacts?: Json | null
          created_at?: string
          deleted_at?: string | null
          discipline?: string | null
          documents_urls?: string[] | null
          eqid?: string | null
          equine_type?: string | null
          feeding_notes?: string | null
          gender?: string | null
          health_issues_general?: string | null
          health_status?: string | null
          height?: string | null
          height_cm?: number | null
          holding_type?: string | null
          hoof_data?: Json | null
          hoof_details?: Json | null
          hoof_measurements?: Json | null
          hoof_protection?: string | null
          hoof_type?: string | null
          housing?: string | null
          id?: string
          is_new_horse?: boolean | null
          last_anamnesis_date?: string | null
          last_appointment_date?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          medical_history?: string | null
          name: string
          next_appointment_due?: string | null
          nickname?: string | null
          official_name?: string | null
          organization_id?: string | null
          owner_id: string
          photo_url?: string | null
          readable_id?: string | null
          recall_interval_weeks?: number | null
          shoeing_interval?: number | null
          shoeing_status?: string | null
          special_notes?: string | null
          stable_address_gps?: Json | null
          updated_at?: string
          usage?: string | null
          usage_type?: Database["public"]["Enums"]["usage_type"] | null
        }
        Update: {
          anamnesis_interval_months?: number | null
          birth_date?: string | null
          birth_year?: number | null
          breed?: string | null
          chip_number?: string | null
          color?: string | null
          contacts?: Json | null
          created_at?: string
          deleted_at?: string | null
          discipline?: string | null
          documents_urls?: string[] | null
          eqid?: string | null
          equine_type?: string | null
          feeding_notes?: string | null
          gender?: string | null
          health_issues_general?: string | null
          health_status?: string | null
          height?: string | null
          height_cm?: number | null
          holding_type?: string | null
          hoof_data?: Json | null
          hoof_details?: Json | null
          hoof_measurements?: Json | null
          hoof_protection?: string | null
          hoof_type?: string | null
          housing?: string | null
          id?: string
          is_new_horse?: boolean | null
          last_anamnesis_date?: string | null
          last_appointment_date?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          medical_history?: string | null
          name?: string
          next_appointment_due?: string | null
          nickname?: string | null
          official_name?: string | null
          organization_id?: string | null
          owner_id?: string
          photo_url?: string | null
          readable_id?: string | null
          recall_interval_weeks?: number | null
          shoeing_interval?: number | null
          shoeing_status?: string | null
          special_notes?: string | null
          stable_address_gps?: Json | null
          updated_at?: string
          usage?: string | null
          usage_type?: Database["public"]["Enums"]["usage_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "horses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          current_stock: number
          global_product_id: string | null
          id: string
          image_url: string | null
          min_stock: number | null
          notes: string | null
          organization_id: string | null
          price_purchase: number | null
          price_sell: number | null
          product_name: string
          tax_rate: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          current_stock?: number
          global_product_id?: string | null
          id?: string
          image_url?: string | null
          min_stock?: number | null
          notes?: string | null
          organization_id?: string | null
          price_purchase?: number | null
          price_sell?: number | null
          product_name: string
          tax_rate?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          current_stock?: number
          global_product_id?: string | null
          id?: string
          image_url?: string | null
          min_stock?: number | null
          notes?: string | null
          organization_id?: string | null
          price_purchase?: number | null
          price_sell?: number | null
          product_name?: string
          tax_rate?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_global_product_id_fkey"
            columns: ["global_product_id"]
            isOneToOne: false
            referencedRelation: "global_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_appointments: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          invoice_id: string
          line_amount: number | null
          line_description: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          invoice_id: string
          line_amount?: number | null
          line_description?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          line_amount?: number | null
          line_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_appointments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_appointments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "safe_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_appointments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string | null
          id: string
          inventory_item_id: string | null
          invoice_id: string | null
          quantity: number | null
          title: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          invoice_id?: string | null
          quantity?: number | null
          title: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          invoice_id?: string | null
          quantity?: number | null
          title?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_number_counters: {
        Row: {
          created_at: string
          id: string
          last_number: number
          provider_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_number?: number
          provider_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          last_number?: number
          provider_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string
          created_at: string
          credit_note_for: string | null
          customer_type: string | null
          due_date: string | null
          horse_id: string | null
          id: string
          invoice_number: string | null
          issue_date: string
          notes: string | null
          organization_id: string | null
          paid_at: string | null
          payment_external_id: string | null
          payment_link: string | null
          payment_method: string | null
          payment_status: string | null
          pdf_url: string | null
          provider_id: string | null
          signature_url: string | null
          status: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id: string
          created_at?: string
          credit_note_for?: string | null
          customer_type?: string | null
          due_date?: string | null
          horse_id?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          organization_id?: string | null
          paid_at?: string | null
          payment_external_id?: string | null
          payment_link?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          provider_id?: string | null
          signature_url?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string
          created_at?: string
          credit_note_for?: string | null
          customer_type?: string | null
          due_date?: string | null
          horse_id?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string
          notes?: string | null
          organization_id?: string | null
          paid_at?: string | null
          payment_external_id?: string | null
          payment_link?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          provider_id?: string | null
          signature_url?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_credit_note_for_fkey"
            columns: ["credit_note_for"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          lead_type: string
          message: string | null
          name: string | null
          phone: string | null
          postal_code: string | null
          provider_id: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          lead_type?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          postal_code?: string | null
          provider_id: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          lead_type?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          postal_code?: string | null
          provider_id?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_agreements: {
        Row: {
          accepted_at: string | null
          agreement_type: string
          created_at: string
          document_url: string | null
          id: string
          provider_id: string
          updated_at: string
          version: string | null
        }
        Insert: {
          accepted_at?: string | null
          agreement_type: string
          created_at?: string
          document_url?: string | null
          id?: string
          provider_id: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          accepted_at?: string | null
          agreement_type?: string
          created_at?: string
          document_url?: string | null
          id?: string
          provider_id?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      magic_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          provider_id: string
          slug: string
          uses_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          provider_id: string
          slug: string
          uses_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          provider_id?: string
          slug?: string
          uses_count?: number | null
        }
        Relationships: []
      }
      master_admins: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          appointment_id: string | null
          captured_at: string
          category: string | null
          created_at: string
          file_type: string
          file_url: string
          horse_id: string
          id: string
          notes: string | null
          title: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          appointment_id?: string | null
          captured_at?: string
          category?: string | null
          created_at?: string
          file_type: string
          file_url: string
          horse_id: string
          id?: string
          notes?: string | null
          title?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          appointment_id?: string | null
          captured_at?: string
          category?: string | null
          created_at?: string
          file_type?: string
          file_url?: string
          horse_id?: string
          id?: string
          notes?: string | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "safe_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
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
          image_url: string | null
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
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
          link: string | null
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offer_materials: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          offer_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          offer_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          offer_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_materials_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_materials_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          auto_deduct: boolean | null
          billing_type: string | null
          created_at: string
          description: string | null
          display_mode: string | null
          duration_minutes: number | null
          external_link: string | null
          features: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          media_url: string | null
          offer_type: string | null
          price: number | null
          price_type: string | null
          provider_id: string | null
          recommended_tags: string[] | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          auto_deduct?: boolean | null
          billing_type?: string | null
          created_at?: string
          description?: string | null
          display_mode?: string | null
          duration_minutes?: number | null
          external_link?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          media_url?: string | null
          offer_type?: string | null
          price?: number | null
          price_type?: string | null
          provider_id?: string | null
          recommended_tags?: string[] | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          auto_deduct?: boolean | null
          billing_type?: string | null
          created_at?: string
          description?: string | null
          display_mode?: string | null
          duration_minutes?: number | null
          external_link?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          media_url?: string | null
          offer_type?: string | null
          price?: number | null
          price_type?: string | null
          provider_id?: string | null
          recommended_tags?: string[] | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_products: {
        Row: {
          copecart_checkout_url: string | null
          copecart_product_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          service_id: string | null
          user_id: string | null
        }
        Insert: {
          copecart_checkout_url?: string | null
          copecart_product_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          service_id?: string | null
          user_id?: string | null
        }
        Update: {
          copecart_checkout_url?: string | null
          copecart_product_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          service_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_products_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recipe_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string | null
          quantity: number
          recipe_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          quantity?: number
          recipe_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          quantity?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recipe_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "product_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recipes: {
        Row: {
          component_product_id: string | null
          created_at: string | null
          description: string | null
          id: string
          main_product_id: string | null
          name: string | null
          parent_product_id: string | null
          provider_id: string | null
          quantity: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          component_product_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          main_product_id?: string | null
          name?: string | null
          parent_product_id?: string | null
          provider_id?: string | null
          quantity?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          component_product_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          main_product_id?: string | null
          name?: string | null
          parent_product_id?: string | null
          provider_id?: string | null
          quantity?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_component_product_id_fkey"
            columns: ["component_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_main_product_id_fkey"
            columns: ["main_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_valid_until: string | null
          address: string | null
          avatar_url: string | null
          bank_name: string | null
          bic: string | null
          business_hours: Json | null
          business_name: string | null
          cancellation_policy: string | null
          city: string | null
          client_status: string | null
          client_type: Database["public"]["Enums"]["client_type"] | null
          company_name: string | null
          copecart_subscription_id: string | null
          country: string | null
          created_at: string
          created_by_provider_id: string | null
          currency: string | null
          deleted_at: string | null
          digital_signature_url: string | null
          email: string | null
          emergency_contacts: Json | null
          feature_flags: Json | null
          feature_statuses: Json | null
          first_name: string | null
          full_name: string | null
          geo_lat: number | null
          geo_lng: number | null
          has_logged_in: boolean | null
          house_number: string | null
          iban: string | null
          ical_token: string | null
          id: string
          image_url: string | null
          invited_at: string | null
          invoice_footer: string | null
          invoice_notes_default: string | null
          is_manually_managed: boolean | null
          is_suspended: boolean | null
          last_name: string | null
          latitude: number | null
          lifecycle_status:
            | Database["public"]["Enums"]["lifecycle_status"]
            | null
          location_name: string | null
          logo_url: string | null
          longitude: number | null
          mobile: string | null
          onboarding_completed: boolean | null
          order_authorization: boolean | null
          org_role: Database["public"]["Enums"]["organization_role"] | null
          organization_id: string | null
          owner_name: string | null
          payment_rating: string | null
          permissions_granted: Json | null
          phone: string | null
          phone_landline: string | null
          phone_mobile: string | null
          plan_override: string | null
          readable_id: string | null
          reliability_score: number | null
          reminder_1h: boolean | null
          reminder_6h: boolean | null
          reminder_evening: boolean | null
          reminder_text: string | null
          role: string | null
          stable_city: string | null
          stable_latitude: number | null
          stable_longitude: number | null
          stable_street: string | null
          stable_zip: string | null
          state: string | null
          street: string | null
          subscription_plan: string | null
          subscription_status: string | null
          suspended_at: string | null
          suspended_reason: string | null
          tax_id: string | null
          tax_number: string | null
          updated_at: string
          vat_number: string | null
          vehicle_consumption_per_100km: number | null
          vehicle_name: string | null
          vehicle_plate: string | null
          website: string | null
          working_conditions: string | null
          zip_code: string | null
        }
        Insert: {
          access_valid_until?: string | null
          address?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          bic?: string | null
          business_hours?: Json | null
          business_name?: string | null
          cancellation_policy?: string | null
          city?: string | null
          client_status?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company_name?: string | null
          copecart_subscription_id?: string | null
          country?: string | null
          created_at?: string
          created_by_provider_id?: string | null
          currency?: string | null
          deleted_at?: string | null
          digital_signature_url?: string | null
          email?: string | null
          emergency_contacts?: Json | null
          feature_flags?: Json | null
          feature_statuses?: Json | null
          first_name?: string | null
          full_name?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          has_logged_in?: boolean | null
          house_number?: string | null
          iban?: string | null
          ical_token?: string | null
          id: string
          image_url?: string | null
          invited_at?: string | null
          invoice_footer?: string | null
          invoice_notes_default?: string | null
          is_manually_managed?: boolean | null
          is_suspended?: boolean | null
          last_name?: string | null
          latitude?: number | null
          lifecycle_status?:
            | Database["public"]["Enums"]["lifecycle_status"]
            | null
          location_name?: string | null
          logo_url?: string | null
          longitude?: number | null
          mobile?: string | null
          onboarding_completed?: boolean | null
          order_authorization?: boolean | null
          org_role?: Database["public"]["Enums"]["organization_role"] | null
          organization_id?: string | null
          owner_name?: string | null
          payment_rating?: string | null
          permissions_granted?: Json | null
          phone?: string | null
          phone_landline?: string | null
          phone_mobile?: string | null
          plan_override?: string | null
          readable_id?: string | null
          reliability_score?: number | null
          reminder_1h?: boolean | null
          reminder_6h?: boolean | null
          reminder_evening?: boolean | null
          reminder_text?: string | null
          role?: string | null
          stable_city?: string | null
          stable_latitude?: number | null
          stable_longitude?: number | null
          stable_street?: string | null
          stable_zip?: string | null
          state?: string | null
          street?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          tax_id?: string | null
          tax_number?: string | null
          updated_at?: string
          vat_number?: string | null
          vehicle_consumption_per_100km?: number | null
          vehicle_name?: string | null
          vehicle_plate?: string | null
          website?: string | null
          working_conditions?: string | null
          zip_code?: string | null
        }
        Update: {
          access_valid_until?: string | null
          address?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          bic?: string | null
          business_hours?: Json | null
          business_name?: string | null
          cancellation_policy?: string | null
          city?: string | null
          client_status?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company_name?: string | null
          copecart_subscription_id?: string | null
          country?: string | null
          created_at?: string
          created_by_provider_id?: string | null
          currency?: string | null
          deleted_at?: string | null
          digital_signature_url?: string | null
          email?: string | null
          emergency_contacts?: Json | null
          feature_flags?: Json | null
          feature_statuses?: Json | null
          first_name?: string | null
          full_name?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          has_logged_in?: boolean | null
          house_number?: string | null
          iban?: string | null
          ical_token?: string | null
          id?: string
          image_url?: string | null
          invited_at?: string | null
          invoice_footer?: string | null
          invoice_notes_default?: string | null
          is_manually_managed?: boolean | null
          is_suspended?: boolean | null
          last_name?: string | null
          latitude?: number | null
          lifecycle_status?:
            | Database["public"]["Enums"]["lifecycle_status"]
            | null
          location_name?: string | null
          logo_url?: string | null
          longitude?: number | null
          mobile?: string | null
          onboarding_completed?: boolean | null
          order_authorization?: boolean | null
          org_role?: Database["public"]["Enums"]["organization_role"] | null
          organization_id?: string | null
          owner_name?: string | null
          payment_rating?: string | null
          permissions_granted?: Json | null
          phone?: string | null
          phone_landline?: string | null
          phone_mobile?: string | null
          plan_override?: string | null
          readable_id?: string | null
          reliability_score?: number | null
          reminder_1h?: boolean | null
          reminder_6h?: boolean | null
          reminder_evening?: boolean | null
          reminder_text?: string | null
          role?: string | null
          stable_city?: string | null
          stable_latitude?: number | null
          stable_longitude?: number | null
          stable_street?: string | null
          stable_zip?: string | null
          state?: string | null
          street?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          tax_id?: string | null
          tax_number?: string | null
          updated_at?: string
          vat_number?: string | null
          vehicle_consumption_per_100km?: number | null
          vehicle_name?: string | null
          vehicle_plate?: string | null
          website?: string | null
          working_conditions?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_documents: {
        Row: {
          appointment_id: string | null
          created_at: string
          description: string | null
          document_type: string
          expense_id: string | null
          file_name: string | null
          file_size: number | null
          file_url: string
          folder: string | null
          horse_id: string | null
          id: string
          mime_type: string | null
          provider_id: string
          tags: string[] | null
          title: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          description?: string | null
          document_type: string
          expense_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url: string
          folder?: string | null
          horse_id?: string | null
          id?: string
          mime_type?: string | null
          provider_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          description?: string | null
          document_type?: string
          expense_id?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          folder?: string | null
          horse_id?: string | null
          id?: string
          mime_type?: string | null
          provider_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_documents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_documents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "safe_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_documents_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "provider_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_payment_settings: {
        Row: {
          copecart_vendor_id: string | null
          copecart_webhook_secret: string | null
          created_at: string | null
          default_payment_method: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          copecart_vendor_id?: string | null
          copecart_webhook_secret?: string | null
          created_at?: string | null
          default_payment_method?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          copecart_vendor_id?: string | null
          copecart_webhook_secret?: string | null
          created_at?: string | null
          default_payment_method?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      provider_portal_credentials: {
        Row: {
          copecart_customer_portal_url: string | null
          created_at: string
          provider_id: string
          updated_at: string
        }
        Insert: {
          copecart_customer_portal_url?: string | null
          created_at?: string
          provider_id: string
          updated_at?: string
        }
        Update: {
          copecart_customer_portal_url?: string | null
          created_at?: string
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_portal_credentials_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_portal_credentials_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_vehicles: {
        Row: {
          average_consumption: number | null
          brand: string | null
          color: string | null
          created_at: string
          current_odometer: number | null
          fuel_type: string | null
          id: string
          insurance_company: string | null
          insurance_expiry: string | null
          insurance_policy_number: string | null
          is_primary: boolean | null
          license_plate: string | null
          model: string | null
          price_per_km: number | null
          provider_id: string
          tax_yearly: number | null
          travel_cost_flat: number | null
          updated_at: string
          year: number | null
        }
        Insert: {
          average_consumption?: number | null
          brand?: string | null
          color?: string | null
          created_at?: string
          current_odometer?: number | null
          fuel_type?: string | null
          id?: string
          insurance_company?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          is_primary?: boolean | null
          license_plate?: string | null
          model?: string | null
          price_per_km?: number | null
          provider_id: string
          tax_yearly?: number | null
          travel_cost_flat?: number | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          average_consumption?: number | null
          brand?: string | null
          color?: string | null
          created_at?: string
          current_odometer?: number | null
          fuel_type?: string | null
          id?: string
          insurance_company?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          is_primary?: boolean | null
          license_plate?: string | null
          model?: string | null
          price_per_km?: number | null
          provider_id?: string
          tax_yearly?: number | null
          travel_cost_flat?: number | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          id: string
          inventory_item_id: string | null
          order_id: string | null
          quantity: number | null
          unit_price: number | null
        }
        Insert: {
          id?: string
          inventory_item_id?: string | null
          order_id?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Update: {
          id?: string
          inventory_item_id?: string | null
          order_id?: string | null
          quantity?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          id: string
          order_date: string | null
          provider_id: string
          status: string | null
          supplier_id: string | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_date?: string | null
          provider_id: string
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_date?: string | null
          provider_id?: string
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          client_id: string | null
          converted_to_invoice_id: string | null
          created_at: string
          description: string | null
          horse_id: string | null
          id: string
          items: Json | null
          provider_id: string
          quote_number: string | null
          responded_at: string | null
          sent_at: string | null
          status: string
          title: string
          total_amount: number
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          client_id?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          description?: string | null
          horse_id?: string | null
          id?: string
          items?: Json | null
          provider_id: string
          quote_number?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          title: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          client_id?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          description?: string | null
          horse_id?: string | null
          id?: string
          items?: Json | null
          provider_id?: string
          quote_number?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_events: {
        Row: {
          amount: number | null
          client_email: string | null
          copecart_order_id: string | null
          id: string
          product_name: string | null
          provider_id: string | null
          purchased_at: string | null
          raw_data: Json | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          client_email?: string | null
          copecart_order_id?: string | null
          id?: string
          product_name?: string | null
          provider_id?: string | null
          purchased_at?: string | null
          raw_data?: Json | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          client_email?: string | null
          copecart_order_id?: string | null
          id?: string
          product_name?: string | null
          provider_id?: string | null
          purchased_at?: string | null
          raw_data?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_reactions: {
        Row: {
          created_at: string | null
          fingerprint: string
          id: string
          reaction_type: string
          review_id: string
        }
        Insert: {
          created_at?: string | null
          fingerprint: string
          id?: string
          reaction_type: string
          review_id: string
        }
        Update: {
          created_at?: string | null
          fingerprint?: string
          id?: string
          reaction_type?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reactions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_approved: boolean | null
          is_visible: boolean | null
          proof_image_url: string | null
          provider_id: string
          rating: number
          reactions: Json | null
          reviewer_email: string | null
          reviewer_name: string
          source: string | null
          text: string | null
          token: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_visible?: boolean | null
          proof_image_url?: string | null
          provider_id: string
          rating: number
          reactions?: Json | null
          reviewer_email?: string | null
          reviewer_name: string
          source?: string | null
          text?: string | null
          token?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_visible?: boolean | null
          proof_image_url?: string | null
          provider_id?: string
          rating?: number
          reactions?: Json | null
          reviewer_email?: string | null
          reviewer_name?: string
          source?: string | null
          text?: string | null
          token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          base_price: number
          billing_type: Database["public"]["Enums"]["billing_type"]
          booking_action: string
          category: string
          created_at: string
          description: string | null
          duration: number | null
          id: string
          is_active: boolean | null
          is_group_service: boolean | null
          name: string
          position: number | null
          provider_id: string | null
          rank: number | null
          service_category: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          base_price?: number
          billing_type?: Database["public"]["Enums"]["billing_type"]
          booking_action?: string
          category?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          is_group_service?: boolean | null
          name: string
          position?: number | null
          provider_id?: string | null
          rank?: number | null
          service_category?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          billing_type?: Database["public"]["Enums"]["billing_type"]
          booking_action?: string
          category?: string
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          is_group_service?: boolean | null
          name?: string
          position?: number | null
          provider_id?: string | null
          rank?: number | null
          service_category?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      storage_usage: {
        Row: {
          bucket_name: string
          created_at: string
          entity_id: string
          entity_type: string
          file_path: string
          file_size_bytes: number
          id: string
          uploaded_by: string | null
        }
        Insert: {
          bucket_name: string
          created_at?: string
          entity_id: string
          entity_type: string
          file_path: string
          file_size_bytes?: number
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          bucket_name?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_path?: string
          file_size_bytes?: number
          id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      subscription_links: {
        Row: {
          copecart_url: string
          created_at: string
          horse_count: number
          id: string
          interval: string
          provider_id: string
        }
        Insert: {
          copecart_url: string
          created_at?: string
          horse_count: number
          id?: string
          interval: string
          provider_id: string
        }
        Update: {
          copecart_url?: string
          created_at?: string
          horse_count?: number
          id?: string
          interval?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_links_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_links_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_settings: {
        Row: {
          copecart_base_url: string | null
          created_at: string
          discount_percentage: number | null
          id: string
          price_4_weeks_zone1: number | null
          price_4_weeks_zone2: number | null
          price_6_weeks_zone1: number | null
          price_6_weeks_zone2: number | null
          price_8_weeks_zone1: number | null
          price_8_weeks_zone2: number | null
          provider_id: string
          updated_at: string
        }
        Insert: {
          copecart_base_url?: string | null
          created_at?: string
          discount_percentage?: number | null
          id?: string
          price_4_weeks_zone1?: number | null
          price_4_weeks_zone2?: number | null
          price_6_weeks_zone1?: number | null
          price_6_weeks_zone2?: number | null
          price_8_weeks_zone1?: number | null
          price_8_weeks_zone2?: number | null
          provider_id: string
          updated_at?: string
        }
        Update: {
          copecart_base_url?: string | null
          created_at?: string
          discount_percentage?: number | null
          id?: string
          price_4_weeks_zone1?: number | null
          price_4_weeks_zone2?: number | null
          price_6_weeks_zone1?: number | null
          price_6_weeks_zone2?: number | null
          price_8_weeks_zone1?: number | null
          price_8_weeks_zone2?: number | null
          provider_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          created_at: string | null
          customer_number: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          provider_id: string
          website: string | null
        }
        Insert: {
          created_at?: string | null
          customer_number?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          provider_id: string
          website?: string | null
        }
        Update: {
          created_at?: string | null
          customer_number?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          provider_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          is_forced: boolean
          key: string
          message: string | null
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          is_forced?: boolean
          key: string
          message?: string | null
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          is_forced?: boolean
          key?: string
          message?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      tour_breadcrumbs: {
        Row: {
          accuracy: number | null
          created_at: string
          id: string
          latitude: number
          longitude: number
          provider_id: string
          timestamp: string
          tour_date: string
          tour_id: string | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          provider_id: string
          timestamp?: string
          tour_date: string
          tour_id?: string | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          provider_id?: string
          timestamp?: string
          tour_date?: string
          tour_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_breadcrumbs_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "daily_tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_emergency_status: {
        Row: {
          created_at: string | null
          emergency_appointment_id: string | null
          ended_at: string | null
          estimated_delay_minutes: number | null
          id: string
          notifications_sent: boolean | null
          provider_id: string
          reason: string | null
          started_at: string | null
          tour_id: string
        }
        Insert: {
          created_at?: string | null
          emergency_appointment_id?: string | null
          ended_at?: string | null
          estimated_delay_minutes?: number | null
          id?: string
          notifications_sent?: boolean | null
          provider_id: string
          reason?: string | null
          started_at?: string | null
          tour_id: string
        }
        Update: {
          created_at?: string | null
          emergency_appointment_id?: string | null
          ended_at?: string | null
          estimated_delay_minutes?: number | null
          id?: string
          notifications_sent?: boolean | null
          provider_id?: string
          reason?: string | null
          started_at?: string | null
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_emergency_status_emergency_appointment_id_fkey"
            columns: ["emergency_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_emergency_status_emergency_appointment_id_fkey"
            columns: ["emergency_appointment_id"]
            isOneToOne: false
            referencedRelation: "safe_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_emergency_status_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "daily_tours"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          agreement_type: string
          agreement_version: string
          id: string
          ip_address: string | null
          signed_at: string | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          agreement_type: string
          agreement_version: string
          id?: string
          ip_address?: string | null
          signed_at?: string | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          agreement_type?: string
          agreement_version?: string
          id?: string
          ip_address?: string | null
          signed_at?: string | null
          storage_path?: string | null
          user_id?: string
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
      vehicle_logs: {
        Row: {
          appointment_ids: string[] | null
          created_at: string
          distance_km: number | null
          end_km: number | null
          end_location: string | null
          end_time: string | null
          fuel_cost: number | null
          id: string
          log_date: string
          other_costs: number | null
          provider_id: string
          route_description: string | null
          start_km: number | null
          start_location: string | null
          start_time: string | null
          toll_cost: number | null
          updated_at: string
        }
        Insert: {
          appointment_ids?: string[] | null
          created_at?: string
          distance_km?: number | null
          end_km?: number | null
          end_location?: string | null
          end_time?: string | null
          fuel_cost?: number | null
          id?: string
          log_date?: string
          other_costs?: number | null
          provider_id: string
          route_description?: string | null
          start_km?: number | null
          start_location?: string | null
          start_time?: string | null
          toll_cost?: number | null
          updated_at?: string
        }
        Update: {
          appointment_ids?: string[] | null
          created_at?: string
          distance_km?: number | null
          end_km?: number | null
          end_location?: string | null
          end_time?: string | null
          fuel_cost?: number | null
          id?: string
          log_date?: string
          other_costs?: number | null
          provider_id?: string
          route_description?: string | null
          start_km?: number | null
          start_location?: string | null
          start_time?: string | null
          toll_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_mileage_logs: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          log_date: string
          odometer_end: number | null
          odometer_start: number
          photo_end_url: string | null
          photo_start_url: string | null
          provider_id: string
          purpose: string | null
          route_description: string | null
          status: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          log_date?: string
          odometer_end?: number | null
          odometer_start: number
          photo_end_url?: string | null
          photo_start_url?: string | null
          provider_id: string
          purpose?: string | null
          route_description?: string | null
          status?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          log_date?: string
          odometer_end?: number | null
          odometer_start?: number
          photo_end_url?: string | null
          photo_start_url?: string | null
          provider_id?: string
          purpose?: string | null
          route_description?: string | null
          status?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_mileage_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_mileage_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "safe_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_mileage_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "provider_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_sessions: {
        Row: {
          appointment_id: string | null
          break_duration_minutes: number | null
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          horse_id: string | null
          id: string
          mileage_log_id: string | null
          notes: string | null
          provider_id: string
          started_at: string
          status: string
        }
        Insert: {
          appointment_id?: string | null
          break_duration_minutes?: number | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          horse_id?: string | null
          id?: string
          mileage_log_id?: string | null
          notes?: string | null
          provider_id: string
          started_at: string
          status?: string
        }
        Update: {
          appointment_id?: string | null
          break_duration_minutes?: number | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          horse_id?: string | null
          id?: string
          mileage_log_id?: string | null
          notes?: string | null
          provider_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "safe_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_mileage_log_id_fkey"
            columns: ["mileage_log_id"]
            isOneToOne: false
            referencedRelation: "vehicle_mileage_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      safe_appointments: {
        Row: {
          completed_at: string | null
          completion_notes: string | null
          completion_pdf_url: string | null
          confirmation_token: string | null
          created_at: string | null
          date: string | null
          duration: number | null
          gait_analysis_done: boolean | null
          gait_analysis_ok: boolean | null
          horse_id: string | null
          id: string | null
          is_confirmed_by_client: boolean | null
          is_series_appointment: boolean | null
          location: string | null
          notes: string | null
          price: number | null
          provider_id: string | null
          series_current: number | null
          series_total: number | null
          service_type: string | null
          signature_url: string | null
          status: string | null
          time: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_notes?: string | null
          completion_pdf_url?: never
          confirmation_token?: never
          created_at?: string | null
          date?: string | null
          duration?: number | null
          gait_analysis_done?: boolean | null
          gait_analysis_ok?: boolean | null
          horse_id?: string | null
          id?: string | null
          is_confirmed_by_client?: boolean | null
          is_series_appointment?: boolean | null
          location?: never
          notes?: string | null
          price?: number | null
          provider_id?: string | null
          series_current?: number | null
          series_total?: number | null
          service_type?: string | null
          signature_url?: never
          status?: string | null
          time?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_notes?: string | null
          completion_pdf_url?: never
          confirmation_token?: never
          created_at?: string | null
          date?: string | null
          duration?: number | null
          gait_analysis_done?: boolean | null
          gait_analysis_ok?: boolean | null
          horse_id?: string | null
          id?: string | null
          is_confirmed_by_client?: boolean | null
          is_series_appointment?: boolean | null
          location?: never
          notes?: string | null
          price?: number | null
          provider_id?: string | null
          series_current?: number | null
          series_total?: number | null
          service_type?: string | null
          signature_url?: never
          status?: string | null
          time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_business_settings: {
        Row: {
          about_text: string | null
          accept_new_customers: boolean | null
          address: string | null
          business_name: string | null
          client_intake_status: string | null
          email: string | null
          gallery_images: Json | null
          hero_headline: string | null
          id: string | null
          impressum_text: string | null
          logo_url: string | null
          owner_name: string | null
          phone: string | null
          primary_color: string | null
          reviews_layout: string | null
          section_order: Json | null
          subdomain: string | null
          terms_text: string | null
          user_id: string | null
        }
        Insert: {
          about_text?: string | null
          accept_new_customers?: boolean | null
          address?: string | null
          business_name?: string | null
          client_intake_status?: string | null
          email?: string | null
          gallery_images?: Json | null
          hero_headline?: string | null
          id?: string | null
          impressum_text?: string | null
          logo_url?: string | null
          owner_name?: string | null
          phone?: string | null
          primary_color?: string | null
          reviews_layout?: string | null
          section_order?: Json | null
          subdomain?: string | null
          terms_text?: string | null
          user_id?: string | null
        }
        Update: {
          about_text?: string | null
          accept_new_customers?: boolean | null
          address?: string | null
          business_name?: string | null
          client_intake_status?: string | null
          email?: string | null
          gallery_images?: Json | null
          hero_headline?: string | null
          id?: string | null
          impressum_text?: string | null
          logo_url?: string | null
          owner_name?: string | null
          phone?: string | null
          primary_color?: string | null
          reviews_layout?: string | null
          section_order?: Json | null
          subdomain?: string | null
          terms_text?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      safe_horses: {
        Row: {
          anamnesis_interval_months: number | null
          birth_year: number | null
          breed: string | null
          color: string | null
          contacts: Json | null
          created_at: string | null
          discipline: string | null
          eqid: string | null
          equine_type: string | null
          feeding_notes: string | null
          gender: string | null
          height: string | null
          hoof_measurements: Json | null
          housing: string | null
          id: string | null
          last_anamnesis_date: string | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          name: string | null
          nickname: string | null
          owner_id: string | null
          photo_url: string | null
          readable_id: string | null
          shoeing_interval: number | null
          updated_at: string | null
          usage: string | null
        }
        Insert: {
          anamnesis_interval_months?: number | null
          birth_year?: number | null
          breed?: string | null
          color?: string | null
          contacts?: Json | null
          created_at?: string | null
          discipline?: string | null
          eqid?: string | null
          equine_type?: string | null
          feeding_notes?: string | null
          gender?: string | null
          height?: string | null
          hoof_measurements?: Json | null
          housing?: string | null
          id?: string | null
          last_anamnesis_date?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          name?: string | null
          nickname?: string | null
          owner_id?: string | null
          photo_url?: string | null
          readable_id?: string | null
          shoeing_interval?: number | null
          updated_at?: string | null
          usage?: string | null
        }
        Update: {
          anamnesis_interval_months?: number | null
          birth_year?: number | null
          breed?: string | null
          color?: string | null
          contacts?: Json | null
          created_at?: string | null
          discipline?: string | null
          eqid?: string | null
          equine_type?: string | null
          feeding_notes?: string | null
          gender?: string | null
          height?: string | null
          hoof_measurements?: Json | null
          housing?: string | null
          id?: string | null
          last_anamnesis_date?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          name?: string | null
          nickname?: string | null
          owner_id?: string | null
          photo_url?: string | null
          readable_id?: string | null
          shoeing_interval?: number | null
          updated_at?: string | null
          usage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_provider_profiles: {
        Row: {
          avatar_url: string | null
          business_hours: Json | null
          email: string | null
          full_name: string | null
          id: string | null
          readable_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_hours?: Json | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          readable_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_hours?: Json | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          readable_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_submit_review: {
        Args: { p_provider_id: string; p_token?: string }
        Returns: boolean
      }
      check_storage_quota: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_file_size_bytes: number
        }
        Returns: Json
      }
      delete_client_cascade: {
        Args: { _client_id: string }
        Returns: undefined
      }
      delete_horse_safe: { Args: { _horse_id: string }; Returns: undefined }
      generate_invoice_number: {
        Args: { p_provider_id: string }
        Returns: string
      }
      generate_random_id: { Args: { prefix: string }; Returns: string }
      get_active_emergency_for_provider: {
        Args: { p_provider_id: string }
        Returns: {
          estimated_delay_minutes: number
          id: string
          reason: string
          started_at: string
          tour_date: string
        }[]
      }
      get_horse_medical_data: {
        Args: { p_horse_id: string }
        Returns: {
          health_status: string
          hoof_protection: string
          hoof_type: string
          medical_history: string
          special_notes: string
        }[]
      }
      get_or_assign_provider_for_client: { Args: never; Returns: string }
      get_provider_business_settings: {
        Args: { p_provider_id: string }
        Returns: {
          about_text: string
          accept_new_customers: boolean
          address: string
          business_name: string
          email: string
          hero_headline: string
          logo_url: string
          owner_name: string
          phone: string
          primary_color: string
          subdomain: string
        }[]
      }
      get_public_business_landing: {
        Args: { subdomain_input: string }
        Returns: Json
      }
      get_public_offers: {
        Args: { provider_id_input: string }
        Returns: {
          billing_type: string
          description: string
          display_mode: string
          external_link: string
          features: Json
          id: string
          image_url: string
          media_url: string
          offer_type: string
          price: number
          price_type: string
          title: string
        }[]
      }
      get_public_review_provider: {
        Args: { provider_id_input: string }
        Returns: Json
      }
      get_public_reviews: {
        Args: { provider_id_input: string }
        Returns: {
          category: string
          created_at: string
          id: string
          proof_image_url: string
          rating: number
          reactions: Json
          reviewer_name: string
          source: string
          text: string
        }[]
      }
      get_public_services: {
        Args: { provider_id_input: string }
        Returns: {
          base_price: number
          booking_action: string
          description: string
          duration: number
          id: string
          name: string
        }[]
      }
      get_storage_usage: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: number
      }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
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
      increment_magic_link_uses: {
        Args: { link_id: string }
        Returns: undefined
      }
      increment_review_reaction: {
        Args: {
          p_fingerprint?: string
          p_reaction_type: string
          p_review_id: string
        }
        Returns: Json
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_master_admin: { Args: never; Returns: boolean }
      is_org_admin: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      provider_can_manage_client_horses: {
        Args: { _client_id: string; _provider_id: string }
        Returns: boolean
      }
      search_horse_by_readable_id: {
        Args: { search_id: string }
        Returns: Json
      }
      search_profile_by_readable_id: {
        Args: { search_id: string }
        Returns: Json
      }
      validate_magic_link: { Args: { slug_input: string }; Returns: Json }
    }
    Enums: {
      app_role: "provider" | "client" | "admin"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "canceled_by_client"
        | "canceled_by_provider"
        | "no_show"
      billing_type: "standard" | "flat_rate" | "series"
      client_type: "private" | "commercial"
      contact_category: "client" | "partner" | "supplier" | "lead"
      equine_type: "horse" | "pony" | "donkey" | "mule" | "zebra"
      feature_status: "disabled" | "beta" | "early_access" | "public"
      help_article_role_access: "all" | "pid_only" | "kid_only"
      holding_type: "box" | "open_stable" | "mixed" | "pasture"
      lifecycle_status: "new" | "active" | "archive"
      organization_role: "admin" | "employee"
      payment_rating: "A" | "B" | "C" | "D"
      usage_type:
        | "leisure"
        | "sport"
        | "western"
        | "dressage"
        | "jumping"
        | "breeding"
        | "therapy"
        | "school"
        | "retirement"
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
      app_role: ["provider", "client", "admin"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "canceled_by_client",
        "canceled_by_provider",
        "no_show",
      ],
      billing_type: ["standard", "flat_rate", "series"],
      client_type: ["private", "commercial"],
      contact_category: ["client", "partner", "supplier", "lead"],
      equine_type: ["horse", "pony", "donkey", "mule", "zebra"],
      feature_status: ["disabled", "beta", "early_access", "public"],
      help_article_role_access: ["all", "pid_only", "kid_only"],
      holding_type: ["box", "open_stable", "mixed", "pasture"],
      lifecycle_status: ["new", "active", "archive"],
      organization_role: ["admin", "employee"],
      payment_rating: ["A", "B", "C", "D"],
      usage_type: [
        "leisure",
        "sport",
        "western",
        "dressage",
        "jumping",
        "breeding",
        "therapy",
        "school",
        "retirement",
      ],
    },
  },
} as const
