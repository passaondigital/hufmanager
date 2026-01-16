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
          horse_id: string
          id: string
          is_confirmed_by_client: boolean | null
          is_internally_paid: boolean | null
          is_series_appointment: boolean | null
          location: string | null
          notes: string | null
          price: number | null
          provider_id: string | null
          recurring_group_id: string | null
          series_current: number | null
          series_total: number | null
          service_type: string | null
          signature_url: string | null
          signed_at: string | null
          signed_by_name: string | null
          status: string | null
          time: string | null
          updated_at: string
        }
        Insert: {
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
          horse_id: string
          id?: string
          is_confirmed_by_client?: boolean | null
          is_internally_paid?: boolean | null
          is_series_appointment?: boolean | null
          location?: string | null
          notes?: string | null
          price?: number | null
          provider_id?: string | null
          recurring_group_id?: string | null
          series_current?: number | null
          series_total?: number | null
          service_type?: string | null
          signature_url?: string | null
          signed_at?: string | null
          signed_by_name?: string | null
          status?: string | null
          time?: string | null
          updated_at?: string
        }
        Update: {
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
          horse_id?: string
          id?: string
          is_confirmed_by_client?: boolean | null
          is_internally_paid?: boolean | null
          is_series_appointment?: boolean | null
          location?: string | null
          notes?: string | null
          price?: number | null
          provider_id?: string | null
          recurring_group_id?: string | null
          series_current?: number | null
          series_total?: number | null
          service_type?: string | null
          signature_url?: string | null
          signed_at?: string | null
          signed_by_name?: string | null
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
          {
            foreignKeyName: "appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
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
          custom_domain: string | null
          email: string | null
          gallery_images: Json | null
          hero_headline: string | null
          iban: string | null
          id: string
          impressum_text: string | null
          logo_url: string | null
          owner_name: string | null
          paypal_link: string | null
          phone: string | null
          primary_color: string | null
          reminder_custom_text: string | null
          reminder_intervals: Json | null
          reviews_layout: string | null
          section_order: Json | null
          stripe_public_key: string | null
          subdomain: string | null
          tax_number: string | null
          terms_text: string | null
          travel_cost_flat: number | null
          travel_cost_per_km: number | null
          updated_at: string
          user_id: string | null
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
          custom_domain?: string | null
          email?: string | null
          gallery_images?: Json | null
          hero_headline?: string | null
          iban?: string | null
          id?: string
          impressum_text?: string | null
          logo_url?: string | null
          owner_name?: string | null
          paypal_link?: string | null
          phone?: string | null
          primary_color?: string | null
          reminder_custom_text?: string | null
          reminder_intervals?: Json | null
          reviews_layout?: string | null
          section_order?: Json | null
          stripe_public_key?: string | null
          subdomain?: string | null
          tax_number?: string | null
          terms_text?: string | null
          travel_cost_flat?: number | null
          travel_cost_per_km?: number | null
          updated_at?: string
          user_id?: string | null
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
          custom_domain?: string | null
          email?: string | null
          gallery_images?: Json | null
          hero_headline?: string | null
          iban?: string | null
          id?: string
          impressum_text?: string | null
          logo_url?: string | null
          owner_name?: string | null
          paypal_link?: string | null
          phone?: string | null
          primary_color?: string | null
          reminder_custom_text?: string | null
          reminder_intervals?: Json | null
          reviews_layout?: string | null
          section_order?: Json | null
          stripe_public_key?: string | null
          subdomain?: string | null
          tax_number?: string | null
          terms_text?: string | null
          travel_cost_flat?: number | null
          travel_cost_per_km?: number | null
          updated_at?: string
          user_id?: string | null
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
          notes: string | null
          phone: string | null
          profile_id: string | null
          provider_id: string
          readable_id: string | null
          source: string | null
          updated_at: string
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
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          provider_id: string
          readable_id?: string | null
          source?: string | null
          updated_at?: string
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
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          provider_id?: string
          readable_id?: string | null
          source?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
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
          birth_year: number | null
          breed: string | null
          color: string | null
          contacts: Json | null
          created_at: string
          deleted_at: string | null
          discipline: string | null
          eqid: string | null
          equine_type: string | null
          feeding_notes: string | null
          gender: string | null
          health_status: string | null
          height: string | null
          hoof_measurements: Json | null
          hoof_protection: string | null
          hoof_type: string | null
          housing: string | null
          id: string
          last_anamnesis_date: string | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          medical_history: string | null
          name: string
          nickname: string | null
          owner_id: string
          photo_url: string | null
          readable_id: string | null
          shoeing_interval: number | null
          special_notes: string | null
          updated_at: string
          usage: string | null
        }
        Insert: {
          anamnesis_interval_months?: number | null
          birth_year?: number | null
          breed?: string | null
          color?: string | null
          contacts?: Json | null
          created_at?: string
          deleted_at?: string | null
          discipline?: string | null
          eqid?: string | null
          equine_type?: string | null
          feeding_notes?: string | null
          gender?: string | null
          health_status?: string | null
          height?: string | null
          hoof_measurements?: Json | null
          hoof_protection?: string | null
          hoof_type?: string | null
          housing?: string | null
          id?: string
          last_anamnesis_date?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          medical_history?: string | null
          name: string
          nickname?: string | null
          owner_id: string
          photo_url?: string | null
          readable_id?: string | null
          shoeing_interval?: number | null
          special_notes?: string | null
          updated_at?: string
          usage?: string | null
        }
        Update: {
          anamnesis_interval_months?: number | null
          birth_year?: number | null
          breed?: string | null
          color?: string | null
          contacts?: Json | null
          created_at?: string
          deleted_at?: string | null
          discipline?: string | null
          eqid?: string | null
          equine_type?: string | null
          feeding_notes?: string | null
          gender?: string | null
          health_status?: string | null
          height?: string | null
          hoof_measurements?: Json | null
          hoof_protection?: string | null
          hoof_type?: string | null
          housing?: string | null
          id?: string
          last_anamnesis_date?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          medical_history?: string | null
          name?: string
          nickname?: string | null
          owner_id?: string
          photo_url?: string | null
          readable_id?: string | null
          shoeing_interval?: number | null
          special_notes?: string | null
          updated_at?: string
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
        ]
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
          payment_method: string | null
          pdf_url: string | null
          provider_id: string | null
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
          payment_method?: string | null
          pdf_url?: string | null
          provider_id?: string | null
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
          payment_method?: string | null
          pdf_url?: string | null
          provider_id?: string | null
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
      profiles: {
        Row: {
          access_valid_until: string | null
          avatar_url: string | null
          business_hours: Json | null
          city: string | null
          copecart_subscription_id: string | null
          created_at: string
          created_by_provider_id: string | null
          deleted_at: string | null
          email: string | null
          emergency_contacts: Json | null
          feature_flags: Json | null
          full_name: string | null
          has_logged_in: boolean | null
          ical_token: string | null
          id: string
          invited_at: string | null
          is_manually_managed: boolean | null
          is_suspended: boolean | null
          onboarding_completed: boolean | null
          phone: string | null
          plan_override: string | null
          readable_id: string | null
          role: string | null
          stable_city: string | null
          stable_latitude: number | null
          stable_longitude: number | null
          stable_street: string | null
          stable_zip: string | null
          subscription_plan: string | null
          subscription_status: string | null
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          access_valid_until?: string | null
          avatar_url?: string | null
          business_hours?: Json | null
          city?: string | null
          copecart_subscription_id?: string | null
          created_at?: string
          created_by_provider_id?: string | null
          deleted_at?: string | null
          email?: string | null
          emergency_contacts?: Json | null
          feature_flags?: Json | null
          full_name?: string | null
          has_logged_in?: boolean | null
          ical_token?: string | null
          id: string
          invited_at?: string | null
          is_manually_managed?: boolean | null
          is_suspended?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          plan_override?: string | null
          readable_id?: string | null
          role?: string | null
          stable_city?: string | null
          stable_latitude?: number | null
          stable_longitude?: number | null
          stable_street?: string | null
          stable_zip?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          access_valid_until?: string | null
          avatar_url?: string | null
          business_hours?: Json | null
          city?: string | null
          copecart_subscription_id?: string | null
          created_at?: string
          created_by_provider_id?: string | null
          deleted_at?: string | null
          email?: string | null
          emergency_contacts?: Json | null
          feature_flags?: Json | null
          full_name?: string | null
          has_logged_in?: boolean | null
          ical_token?: string | null
          id?: string
          invited_at?: string | null
          is_manually_managed?: boolean | null
          is_suspended?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          plan_override?: string | null
          readable_id?: string | null
          role?: string | null
          stable_city?: string | null
          stable_latitude?: number | null
          stable_longitude?: number | null
          stable_street?: string | null
          stable_zip?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          zip_code?: string | null
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
          name: string
          provider_id: string | null
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
          name: string
          provider_id?: string | null
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
          name?: string
          provider_id?: string | null
          updated_at?: string
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
      delete_client_cascade: {
        Args: { _client_id: string }
        Returns: undefined
      }
      delete_horse_safe: { Args: { _horse_id: string }; Returns: undefined }
      generate_random_id: { Args: { prefix: string }; Returns: string }
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
      get_public_review_provider: {
        Args: { provider_id_input: string }
        Returns: Json
      }
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
        Args: { reaction_type: string; review_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_master_admin: { Args: never; Returns: boolean }
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
      billing_type: "standard" | "flat_rate" | "series"
      contact_category: "client" | "partner" | "supplier" | "lead"
      equine_type: "horse" | "pony" | "donkey" | "mule" | "zebra"
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
      billing_type: ["standard", "flat_rate", "series"],
      contact_category: ["client", "partner", "supplier", "lead"],
      equine_type: ["horse", "pony", "donkey", "mule", "zebra"],
    },
  },
} as const
