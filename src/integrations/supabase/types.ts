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
          auto_revoke_on_last_appointment: boolean | null
          can_create_appointments: boolean | null
          can_view_basic: boolean | null
          can_view_medical: boolean | null
          client_id: string
          granted_at: string
          id: string
          is_active: boolean | null
          partner_email: string | null
          partner_name: string | null
          provider_id: string
          request_message: string | null
          requested_at: string | null
          requested_by: string | null
          revoked_at: string | null
          status: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          auto_revoke_on_last_appointment?: boolean | null
          can_create_appointments?: boolean | null
          can_view_basic?: boolean | null
          can_view_medical?: boolean | null
          client_id: string
          granted_at?: string
          id?: string
          is_active?: boolean | null
          partner_email?: string | null
          partner_name?: string | null
          provider_id: string
          request_message?: string | null
          requested_at?: string | null
          requested_by?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          auto_revoke_on_last_appointment?: boolean | null
          can_create_appointments?: boolean | null
          can_view_basic?: boolean | null
          can_view_medical?: boolean | null
          client_id?: string
          granted_at?: string
          id?: string
          is_active?: boolean | null
          partner_email?: string | null
          partner_name?: string | null
          provider_id?: string
          request_message?: string | null
          requested_at?: string | null
          requested_by?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
          valid_until?: string | null
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
      admin_contracts: {
        Row: {
          admin_signature: string | null
          admin_signed_at: string | null
          auto_renew: boolean | null
          cancellation_effective_date: string | null
          cancellation_reason: string | null
          cancellation_requested_at: string | null
          content_html: string | null
          contract_number: string
          created_at: string | null
          custom_price: number | null
          id: string
          notes: string | null
          payment_method: string | null
          pdf_url: string | null
          period_end: string | null
          period_start: string
          plan: string
          plan_price_monthly: number | null
          plan_price_yearly: number | null
          provider_id: string | null
          provider_pid: string | null
          provider_signature: string | null
          provider_signed_at: string | null
          sent_at: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          variables_used: Json | null
        }
        Insert: {
          admin_signature?: string | null
          admin_signed_at?: string | null
          auto_renew?: boolean | null
          cancellation_effective_date?: string | null
          cancellation_reason?: string | null
          cancellation_requested_at?: string | null
          content_html?: string | null
          contract_number?: string
          created_at?: string | null
          custom_price?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start: string
          plan: string
          plan_price_monthly?: number | null
          plan_price_yearly?: number | null
          provider_id?: string | null
          provider_pid?: string | null
          provider_signature?: string | null
          provider_signed_at?: string | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          variables_used?: Json | null
        }
        Update: {
          admin_signature?: string | null
          admin_signed_at?: string | null
          auto_renew?: boolean | null
          cancellation_effective_date?: string | null
          cancellation_reason?: string | null
          cancellation_requested_at?: string | null
          content_html?: string | null
          contract_number?: string
          created_at?: string | null
          custom_price?: number | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string
          plan?: string
          plan_price_monthly?: number | null
          plan_price_yearly?: number | null
          provider_id?: string | null
          provider_pid?: string | null
          provider_signature?: string | null
          provider_signed_at?: string | null
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          variables_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_contracts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_contracts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_dunning_log: {
        Row: {
          created_at: string | null
          due_date: string
          fee: number | null
          id: string
          invoice_id: string
          level: number
          notes: string | null
          provider_id: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          due_date: string
          fee?: number | null
          id?: string
          invoice_id: string
          level: number
          notes?: string | null
          provider_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          due_date?: string
          fee?: number | null
          id?: string
          invoice_id?: string
          level?: number
          notes?: string | null
          provider_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_dunning_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "admin_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_dunning_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_dunning_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          expense_date: string
          id: string
          receipt_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expense_date?: string
          id?: string
          receipt_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expense_date?: string
          id?: string
          receipt_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_invoice_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          position: number
          quantity: number | null
          total: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          position?: number
          quantity?: number | null
          total: number
          unit?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number | null
          total?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "admin_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          discount: number | null
          due_date: string | null
          id: string
          invoice_number: string
          kleinunternehmer: boolean | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_source: string | null
          pdf_url: string | null
          period_end: string
          period_start: string
          plan: string
          provider_address: string | null
          provider_email: string
          provider_id: string | null
          provider_name: string
          provider_pid: string | null
          sent_at: string | null
          status: string | null
          subtotal: number
          total: number
          updated_at: string | null
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          discount?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          kleinunternehmer?: boolean | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_source?: string | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          plan: string
          provider_address?: string | null
          provider_email: string
          provider_id?: string | null
          provider_name: string
          provider_pid?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal: number
          total: number
          updated_at?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          discount?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          kleinunternehmer?: boolean | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_source?: string | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          plan?: string
          provider_address?: string | null
          provider_email?: string
          provider_id?: string | null
          provider_name?: string
          provider_pid?: string | null
          sent_at?: string | null
          status?: string | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_invoices_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_invoices_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      admin_provider_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          period_end: string | null
          period_start: string | null
          plan_name: string | null
          provider_id: string
          recorded_by: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          period_end?: string | null
          period_start?: string | null
          plan_name?: string | null
          provider_id: string
          recorded_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          period_end?: string | null
          period_start?: string | null
          plan_name?: string | null
          provider_id?: string
          recorded_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_revenue_log: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          event_type: string
          id: string
          plan_name: string | null
          provider_id: string | null
          raw_payload: Json | null
          transaction_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          event_type: string
          id?: string
          plan_name?: string | null
          provider_id?: string | null
          raw_payload?: Json | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          event_type?: string
          id?: string
          plan_name?: string | null
          provider_id?: string | null
          raw_payload?: Json | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_revenue_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_revenue_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      affiliate_conversions: {
        Row: {
          affiliate_id: string | null
          amount_cents: number | null
          confirmed_at: string | null
          conversion_type: string | null
          converted_provider_id: string | null
          created_at: string | null
          id: string
          paid_at: string | null
          plan_type: string | null
          referrer_code: string | null
          source_url: string | null
          status: string | null
        }
        Insert: {
          affiliate_id?: string | null
          amount_cents?: number | null
          confirmed_at?: string | null
          conversion_type?: string | null
          converted_provider_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          plan_type?: string | null
          referrer_code?: string | null
          source_url?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string | null
          amount_cents?: number | null
          confirmed_at?: string | null
          conversion_type?: string | null
          converted_provider_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          plan_type?: string | null
          referrer_code?: string | null
          source_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_converted_provider_id_fkey"
            columns: ["converted_provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_converted_provider_id_fkey"
            columns: ["converted_provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string | null
          amount_cents: number
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payout_method: string | null
          period_from: string | null
          period_to: string | null
          reference: string | null
          status: string | null
        }
        Insert: {
          affiliate_id?: string | null
          amount_cents: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payout_method?: string | null
          period_from?: string | null
          period_to?: string | null
          reference?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string | null
          amount_cents?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payout_method?: string | null
          period_from?: string | null
          period_to?: string | null
          reference?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_stats: {
        Row: {
          active_referrals: number
          created_at: string | null
          id: string
          last_updated: string | null
          monthly_commission: number
          provider_id: string
          referral_count: number
          total_commission: number
        }
        Insert: {
          active_referrals?: number
          created_at?: string | null
          id?: string
          last_updated?: string | null
          monthly_commission?: number
          provider_id: string
          referral_count?: number
          total_commission?: number
        }
        Update: {
          active_referrals?: number
          created_at?: string | null
          id?: string
          last_updated?: string | null
          monthly_commission?: number
          provider_id?: string
          referral_count?: number
          total_commission?: number
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          affiliate_type: string | null
          code: string
          commission_percent: number | null
          commission_rate_cents: number | null
          commission_type: string | null
          created_at: string | null
          email: string | null
          id: string
          minimum_payout_cents: number | null
          name: string
          notes: string | null
          payout_iban: string | null
          payout_method: string | null
          payout_paypal: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          affiliate_type?: string | null
          code: string
          commission_percent?: number | null
          commission_rate_cents?: number | null
          commission_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          minimum_payout_cents?: number | null
          name: string
          notes?: string | null
          payout_iban?: string | null
          payout_method?: string | null
          payout_paypal?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          affiliate_type?: string | null
          code?: string
          commission_percent?: number | null
          commission_rate_cents?: number | null
          commission_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          minimum_payout_cents?: number | null
          name?: string
          notes?: string | null
          payout_iban?: string | null
          payout_method?: string | null
          payout_paypal?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "appointments_partner_view"
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_horses_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
            referencedRelation: "appointments_partner_view"
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
          applied_price: number | null
          appointment_lat: number | null
          appointment_lng: number | null
          assigned_to_user_id: string | null
          base_price: number | null
          client_id: string | null
          completed_at: string | null
          completion_notes: string | null
          completion_pdf_url: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string
          data_shared_with_employees: boolean | null
          data_shared_with_partners: boolean | null
          date: string
          discount_amount: number | null
          discount_reason: string | null
          duration: number | null
          edid: string | null
          gait_analysis_done: boolean | null
          gait_analysis_ok: boolean | null
          gait_video_url: string | null
          group_id: string | null
          horse_id: string
          id: string
          is_confirmed_by_client: boolean | null
          is_emergency: boolean | null
          is_initial_assessment: boolean | null
          is_internally_paid: boolean | null
          is_multi_horse: boolean | null
          is_series_appointment: boolean | null
          location: string | null
          location_geocoded: boolean | null
          notes: string | null
          organization_id: string | null
          price: number | null
          price_group_applied: string | null
          provider_id: string
          recurring_group_id: string | null
          series_current: number | null
          series_total: number | null
          service_id: string | null
          service_type: string | null
          signature_url: string | null
          signed_at: string | null
          signed_by_name: string | null
          stable_group_id: string | null
          status: string
          surcharge_amount: number | null
          surcharge_reason: string | null
          time: string | null
          tour_order: number | null
          updated_at: string
        }
        Insert: {
          added_during_tour?: boolean | null
          applied_price?: number | null
          appointment_lat?: number | null
          appointment_lng?: number | null
          assigned_to_user_id?: string | null
          base_price?: number | null
          client_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_pdf_url?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          data_shared_with_employees?: boolean | null
          data_shared_with_partners?: boolean | null
          date: string
          discount_amount?: number | null
          discount_reason?: string | null
          duration?: number | null
          edid?: string | null
          gait_analysis_done?: boolean | null
          gait_analysis_ok?: boolean | null
          gait_video_url?: string | null
          group_id?: string | null
          horse_id: string
          id?: string
          is_confirmed_by_client?: boolean | null
          is_emergency?: boolean | null
          is_initial_assessment?: boolean | null
          is_internally_paid?: boolean | null
          is_multi_horse?: boolean | null
          is_series_appointment?: boolean | null
          location?: string | null
          location_geocoded?: boolean | null
          notes?: string | null
          organization_id?: string | null
          price?: number | null
          price_group_applied?: string | null
          provider_id: string
          recurring_group_id?: string | null
          series_current?: number | null
          series_total?: number | null
          service_id?: string | null
          service_type?: string | null
          signature_url?: string | null
          signed_at?: string | null
          signed_by_name?: string | null
          stable_group_id?: string | null
          status?: string
          surcharge_amount?: number | null
          surcharge_reason?: string | null
          time?: string | null
          tour_order?: number | null
          updated_at?: string
        }
        Update: {
          added_during_tour?: boolean | null
          applied_price?: number | null
          appointment_lat?: number | null
          appointment_lng?: number | null
          assigned_to_user_id?: string | null
          base_price?: number | null
          client_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          completion_pdf_url?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string
          data_shared_with_employees?: boolean | null
          data_shared_with_partners?: boolean | null
          date?: string
          discount_amount?: number | null
          discount_reason?: string | null
          duration?: number | null
          edid?: string | null
          gait_analysis_done?: boolean | null
          gait_analysis_ok?: boolean | null
          gait_video_url?: string | null
          group_id?: string | null
          horse_id?: string
          id?: string
          is_confirmed_by_client?: boolean | null
          is_emergency?: boolean | null
          is_initial_assessment?: boolean | null
          is_internally_paid?: boolean | null
          is_multi_horse?: boolean | null
          is_series_appointment?: boolean | null
          location?: string | null
          location_geocoded?: boolean | null
          notes?: string | null
          organization_id?: string | null
          price?: number | null
          price_group_applied?: string | null
          provider_id?: string
          recurring_group_id?: string | null
          series_current?: number | null
          series_total?: number | null
          service_id?: string | null
          service_type?: string | null
          signature_url?: string | null
          signed_at?: string | null
          signed_by_name?: string | null
          stable_group_id?: string | null
          status?: string
          surcharge_amount?: number | null
          surcharge_reason?: string | null
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
      autoflow_log: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          provider_id: string
          status: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          provider_id: string
          status?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          provider_id?: string
          status?: string
        }
        Relationships: []
      }
      autoflow_settings: {
        Row: {
          auto_feedback_enabled: boolean
          auto_invoice_enabled: boolean
          auto_invoice_trigger: string
          auto_reminder_enabled: boolean
          auto_schedule_enabled: boolean
          auto_schedule_mode: string
          autoflow_mode: string
          created_at: string
          default_service_id: string | null
          feedback_channel: string
          feedback_delay_hours: number
          group_by_plz: boolean
          id: string
          last_checkin_at: string | null
          monthly_checkin_enabled: boolean
          next_checkin_at: string | null
          preferred_slot_days: number
          provider_id: string
          reminder_hours_before: number
          updated_at: string
        }
        Insert: {
          auto_feedback_enabled?: boolean
          auto_invoice_enabled?: boolean
          auto_invoice_trigger?: string
          auto_reminder_enabled?: boolean
          auto_schedule_enabled?: boolean
          auto_schedule_mode?: string
          autoflow_mode?: string
          created_at?: string
          default_service_id?: string | null
          feedback_channel?: string
          feedback_delay_hours?: number
          group_by_plz?: boolean
          id?: string
          last_checkin_at?: string | null
          monthly_checkin_enabled?: boolean
          next_checkin_at?: string | null
          preferred_slot_days?: number
          provider_id: string
          reminder_hours_before?: number
          updated_at?: string
        }
        Update: {
          auto_feedback_enabled?: boolean
          auto_invoice_enabled?: boolean
          auto_invoice_trigger?: string
          auto_reminder_enabled?: boolean
          auto_schedule_enabled?: boolean
          auto_schedule_mode?: string
          autoflow_mode?: string
          created_at?: string
          default_service_id?: string | null
          feedback_channel?: string
          feedback_delay_hours?: number
          group_by_plz?: boolean
          id?: string
          last_checkin_at?: string | null
          monthly_checkin_enabled?: boolean
          next_checkin_at?: string | null
          preferred_slot_days?: number
          provider_id?: string
          reminder_hours_before?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "autoflow_settings_default_service_id_fkey"
            columns: ["default_service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
      booking_waitlist: {
        Row: {
          client_id: string
          created_at: string | null
          horse_id: string
          id: string
          notes: string | null
          preference: string | null
          preferred_week: string | null
          provider_id: string
          status: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          horse_id: string
          id?: string
          notes?: string | null
          preference?: string | null
          preferred_week?: string | null
          provider_id: string
          status?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          horse_id?: string
          id?: string
          notes?: string | null
          preference?: string | null
          preferred_week?: string | null
          provider_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_waitlist_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      botschafter_abrechnungen: {
        Row: {
          botschafter_id: string | null
          copecart_payout_id: string | null
          created_at: string | null
          id: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string | null
          total_amount_cents: number | null
          total_conversions: number | null
        }
        Insert: {
          botschafter_id?: string | null
          copecart_payout_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          total_amount_cents?: number | null
          total_conversions?: number | null
        }
        Update: {
          botschafter_id?: string | null
          copecart_payout_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          total_amount_cents?: number | null
          total_conversions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "botschafter_abrechnungen_botschafter_id_fkey"
            columns: ["botschafter_id"]
            isOneToOne: false
            referencedRelation: "pferdeakte_botschafter"
            referencedColumns: ["id"]
          },
        ]
      }
      botschafter_assets: {
        Row: {
          asset_type: string
          botschafter_id: string | null
          canvas_data: Json | null
          created_at: string | null
          id: string
          image_url: string | null
          is_favorite: boolean | null
          prompt_used: string | null
          title: string | null
        }
        Insert: {
          asset_type: string
          botschafter_id?: string | null
          canvas_data?: Json | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          prompt_used?: string | null
          title?: string | null
        }
        Update: {
          asset_type?: string
          botschafter_id?: string | null
          canvas_data?: Json | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          prompt_used?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "botschafter_assets_botschafter_id_fkey"
            columns: ["botschafter_id"]
            isOneToOne: false
            referencedRelation: "pferdeakte_botschafter"
            referencedColumns: ["id"]
          },
        ]
      }
      botschafter_campaigns: {
        Row: {
          botschafter_id: string
          campaign_name: string
          clicks: number | null
          created_at: string | null
          id: string
          registrations: number | null
          source_tag: string
        }
        Insert: {
          botschafter_id: string
          campaign_name: string
          clicks?: number | null
          created_at?: string | null
          id?: string
          registrations?: number | null
          source_tag: string
        }
        Update: {
          botschafter_id?: string
          campaign_name?: string
          clicks?: number | null
          created_at?: string | null
          id?: string
          registrations?: number | null
          source_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "botschafter_campaigns_botschafter_id_fkey"
            columns: ["botschafter_id"]
            isOneToOne: false
            referencedRelation: "pferdeakte_botschafter"
            referencedColumns: ["id"]
          },
        ]
      }
      botschafter_clicks: {
        Row: {
          botschafter_id: string | null
          created_at: string | null
          id: string
          ip_hash: string | null
          referral_code: string
          source: string | null
          user_agent: string | null
        }
        Insert: {
          botschafter_id?: string | null
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          referral_code: string
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          botschafter_id?: string | null
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          referral_code?: string
          source?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "botschafter_clicks_botschafter_id_fkey"
            columns: ["botschafter_id"]
            isOneToOne: false
            referencedRelation: "pferdeakte_botschafter"
            referencedColumns: ["id"]
          },
        ]
      }
      botschafter_conversions: {
        Row: {
          amount_cents: number | null
          botschafter_id: string | null
          commission_cents: number | null
          commission_rate: number | null
          copecart_order_id: string | null
          created_at: string | null
          id: string
          paid_at: string | null
          product_name: string | null
          referral_code: string
          status: string | null
        }
        Insert: {
          amount_cents?: number | null
          botschafter_id?: string | null
          commission_cents?: number | null
          commission_rate?: number | null
          copecart_order_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          product_name?: string | null
          referral_code: string
          status?: string | null
        }
        Update: {
          amount_cents?: number | null
          botschafter_id?: string | null
          commission_cents?: number | null
          commission_rate?: number | null
          copecart_order_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          product_name?: string | null
          referral_code?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "botschafter_conversions_botschafter_id_fkey"
            columns: ["botschafter_id"]
            isOneToOne: false
            referencedRelation: "pferdeakte_botschafter"
            referencedColumns: ["id"]
          },
        ]
      }
      botschafter_nachrichten: {
        Row: {
          botschafter_id: string | null
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          sender: string
        }
        Insert: {
          botschafter_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender: string
        }
        Update: {
          botschafter_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "botschafter_nachrichten_botschafter_id_fkey"
            columns: ["botschafter_id"]
            isOneToOne: false
            referencedRelation: "pferdeakte_botschafter"
            referencedColumns: ["id"]
          },
        ]
      }
      botschafter_updates: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          published_at: string | null
          target_type: string | null
          title: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          published_at?: string | null
          target_type?: string | null
          title: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          published_at?: string | null
          target_type?: string | null
          title?: string
        }
        Relationships: []
      }
      botschafter_updates_read: {
        Row: {
          botschafter_id: string
          read_at: string | null
          update_id: string
        }
        Insert: {
          botschafter_id: string
          read_at?: string | null
          update_id: string
        }
        Update: {
          botschafter_id?: string
          read_at?: string | null
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "botschafter_updates_read_botschafter_id_fkey"
            columns: ["botschafter_id"]
            isOneToOne: false
            referencedRelation: "pferdeakte_botschafter"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "botschafter_updates_read_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "botschafter_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      botschafter_werbemittel: {
        Row: {
          category: string
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          target_audience: string | null
          title: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          target_audience?: string | null
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          target_audience?: string | null
          title?: string
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
          berufsbezeichnung: string | null
          bic: string | null
          bilanzpflicht: boolean | null
          business_name: string | null
          client_intake_status: string | null
          communication_mode: string | null
          copecart_customer_portal_url: string | null
          copecart_vendor_id: string | null
          country: string | null
          created_at: string
          currency: string | null
          custom_domain: string | null
          datev_mandanten_nr: string | null
          default_vat_rate: number | null
          domain_connection_type: string | null
          email: string | null
          exit_intent_enabled: boolean | null
          facebook_pixel_id: string | null
          finanzamt: string | null
          gallery_images: Json | null
          google_analytics_id: string | null
          google_search_console_code: string | null
          handelsregister: string | null
          hero_headline: string | null
          hero_image_url: string | null
          horses_treated: number | null
          iban: string | null
          id: string
          impressum_text: string | null
          imprint: string | null
          instagram_posts: Json | null
          kammer: string | null
          ki_features_enabled: boolean
          kleine_unternehmer: boolean | null
          landing_template: string | null
          legal_form: string | null
          logo_url: string | null
          meta_description: string | null
          mwst_pflichtig: boolean | null
          owner_name: string | null
          paypal_link: string | null
          phone: string | null
          price_display_mode: string | null
          primary_color: string | null
          privacy: string | null
          profession_type: string | null
          qualifications: Json | null
          reminder_custom_text: string | null
          reminder_intervals: Json | null
          reviews_layout: string | null
          rksv_enabled: boolean | null
          section_order: Json | null
          service_area_km: number | null
          service_area_text: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_tiktok: string | null
          social_website: string | null
          steuerberater_email: string | null
          steuerberater_name: string | null
          stripe_public_key: string | null
          subdomain: string | null
          subdomain_active: boolean | null
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
          vehicle_consumption_per_100km: number | null
          vehicle_fuel_type: string | null
          vorsteuerabzug: boolean | null
          website_active_pages: Json | null
          website_navigation: Json | null
          whatsapp_enabled: boolean | null
          whatsapp_number: string | null
          years_experience: number | null
        }
        Insert: {
          about_text?: string | null
          accept_new_customers?: boolean | null
          address?: string | null
          bank_name?: string | null
          berufsbezeichnung?: string | null
          bic?: string | null
          bilanzpflicht?: boolean | null
          business_name?: string | null
          client_intake_status?: string | null
          communication_mode?: string | null
          copecart_customer_portal_url?: string | null
          copecart_vendor_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          datev_mandanten_nr?: string | null
          default_vat_rate?: number | null
          domain_connection_type?: string | null
          email?: string | null
          exit_intent_enabled?: boolean | null
          facebook_pixel_id?: string | null
          finanzamt?: string | null
          gallery_images?: Json | null
          google_analytics_id?: string | null
          google_search_console_code?: string | null
          handelsregister?: string | null
          hero_headline?: string | null
          hero_image_url?: string | null
          horses_treated?: number | null
          iban?: string | null
          id?: string
          impressum_text?: string | null
          imprint?: string | null
          instagram_posts?: Json | null
          kammer?: string | null
          ki_features_enabled?: boolean
          kleine_unternehmer?: boolean | null
          landing_template?: string | null
          legal_form?: string | null
          logo_url?: string | null
          meta_description?: string | null
          mwst_pflichtig?: boolean | null
          owner_name?: string | null
          paypal_link?: string | null
          phone?: string | null
          price_display_mode?: string | null
          primary_color?: string | null
          privacy?: string | null
          profession_type?: string | null
          qualifications?: Json | null
          reminder_custom_text?: string | null
          reminder_intervals?: Json | null
          reviews_layout?: string | null
          rksv_enabled?: boolean | null
          section_order?: Json | null
          service_area_km?: number | null
          service_area_text?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_website?: string | null
          steuerberater_email?: string | null
          steuerberater_name?: string | null
          stripe_public_key?: string | null
          subdomain?: string | null
          subdomain_active?: boolean | null
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
          vehicle_consumption_per_100km?: number | null
          vehicle_fuel_type?: string | null
          vorsteuerabzug?: boolean | null
          website_active_pages?: Json | null
          website_navigation?: Json | null
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
          years_experience?: number | null
        }
        Update: {
          about_text?: string | null
          accept_new_customers?: boolean | null
          address?: string | null
          bank_name?: string | null
          berufsbezeichnung?: string | null
          bic?: string | null
          bilanzpflicht?: boolean | null
          business_name?: string | null
          client_intake_status?: string | null
          communication_mode?: string | null
          copecart_customer_portal_url?: string | null
          copecart_vendor_id?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          datev_mandanten_nr?: string | null
          default_vat_rate?: number | null
          domain_connection_type?: string | null
          email?: string | null
          exit_intent_enabled?: boolean | null
          facebook_pixel_id?: string | null
          finanzamt?: string | null
          gallery_images?: Json | null
          google_analytics_id?: string | null
          google_search_console_code?: string | null
          handelsregister?: string | null
          hero_headline?: string | null
          hero_image_url?: string | null
          horses_treated?: number | null
          iban?: string | null
          id?: string
          impressum_text?: string | null
          imprint?: string | null
          instagram_posts?: Json | null
          kammer?: string | null
          ki_features_enabled?: boolean
          kleine_unternehmer?: boolean | null
          landing_template?: string | null
          legal_form?: string | null
          logo_url?: string | null
          meta_description?: string | null
          mwst_pflichtig?: boolean | null
          owner_name?: string | null
          paypal_link?: string | null
          phone?: string | null
          price_display_mode?: string | null
          primary_color?: string | null
          privacy?: string | null
          profession_type?: string | null
          qualifications?: Json | null
          reminder_custom_text?: string | null
          reminder_intervals?: Json | null
          reviews_layout?: string | null
          rksv_enabled?: boolean | null
          section_order?: Json | null
          service_area_km?: number | null
          service_area_text?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_website?: string | null
          steuerberater_email?: string | null
          steuerberater_name?: string | null
          stripe_public_key?: string | null
          subdomain?: string | null
          subdomain_active?: boolean | null
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
          vehicle_consumption_per_100km?: number | null
          vehicle_fuel_type?: string | null
          vorsteuerabzug?: boolean | null
          website_active_pages?: Json | null
          website_navigation?: Json | null
          whatsapp_enabled?: boolean | null
          whatsapp_number?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address: string | null
          contact_email: string | null
          created_at: string
          id: string
          name: string | null
          owner_id: string | null
          readable_id: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          name?: string | null
          owner_id?: string | null
          readable_id?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          name?: string | null
          owner_id?: string | null
          readable_id?: string | null
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
      client_locations: {
        Row: {
          address: string | null
          city: string | null
          client_id: string
          created_at: string | null
          id: string
          is_default: boolean | null
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          provider_id: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          provider_id?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          provider_id?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_locations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_referrals: {
        Row: {
          channel: string
          created_at: string
          id: string
          provider_id: string
          referrer_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          provider_id: string
          referrer_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          provider_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      client_subscriptions: {
        Row: {
          cancelled_at: string | null
          client_id: string
          horse_ids: string[]
          id: string
          next_appointment_due: string | null
          plan_id: string
          provider_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          cancelled_at?: string | null
          client_id: string
          horse_ids: string[]
          id?: string
          next_appointment_due?: string | null
          plan_id: string
          provider_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string
          horse_ids?: string[]
          id?: string
          next_appointment_due?: string | null
          plan_id?: string
          provider_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      config_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          snapshot_data: Json
          snapshot_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          snapshot_data: Json
          snapshot_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          snapshot_data?: Json
          snapshot_type?: string
        }
        Relationships: []
      }
      consent_log: {
        Row: {
          accepted_at: string
          consent_type: string
          created_at: string
          document_url: string | null
          id: string
          ip_address: string | null
          user_id: string
          version: string | null
        }
        Insert: {
          accepted_at?: string
          consent_type: string
          created_at?: string
          document_url?: string | null
          id?: string
          ip_address?: string | null
          user_id: string
          version?: string | null
        }
        Update: {
          accepted_at?: string
          consent_type?: string
          created_at?: string
          document_url?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string
          version?: string | null
        }
        Relationships: []
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
      contract_templates: {
        Row: {
          content_html: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          plan: string | null
          type: string
          updated_at: string | null
          variables: Json | null
          version: string
        }
        Insert: {
          content_html: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          plan?: string | null
          type: string
          updated_at?: string | null
          variables?: Json | null
          version?: string
        }
        Update: {
          content_html?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          plan?: string | null
          type?: string
          updated_at?: string | null
          variables?: Json | null
          version?: string
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
      cooperation_partners: {
        Row: {
          badge_color: string | null
          badge_text: string | null
          category: string
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_signed_at: string | null
          contract_url: string | null
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          notes: string | null
          priority: number | null
          revenue_share_percent: number | null
          status: string | null
          updated_at: string | null
          visibility: string | null
          website: string | null
        }
        Insert: {
          badge_color?: string | null
          badge_text?: string | null
          category: string
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_signed_at?: string | null
          contract_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          notes?: string | null
          priority?: number | null
          revenue_share_percent?: number | null
          status?: string | null
          updated_at?: string | null
          visibility?: string | null
          website?: string | null
        }
        Update: {
          badge_color?: string | null
          badge_text?: string | null
          category?: string
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_signed_at?: string | null
          contract_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          notes?: string | null
          priority?: number | null
          revenue_share_percent?: number | null
          status?: string | null
          updated_at?: string | null
          visibility?: string | null
          website?: string | null
        }
        Relationships: []
      }
      customer_domains: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          dns_records: Json | null
          dns_verified: boolean | null
          dns_verified_at: string | null
          domain_name: string
          expires_at: string | null
          hosting_plan: string | null
          id: string
          nameservers: Json | null
          owner_id: string
          owner_type: string
          price_paid_cents: number | null
          registered_at: string | null
          registrar_reference: string | null
          renewal_price_cents: number | null
          ssl_expires_at: string | null
          ssl_status: string | null
          status: string
          tld: string
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string | null
          dns_records?: Json | null
          dns_verified?: boolean | null
          dns_verified_at?: string | null
          domain_name: string
          expires_at?: string | null
          hosting_plan?: string | null
          id?: string
          nameservers?: Json | null
          owner_id: string
          owner_type?: string
          price_paid_cents?: number | null
          registered_at?: string | null
          registrar_reference?: string | null
          renewal_price_cents?: number | null
          ssl_expires_at?: string | null
          ssl_status?: string | null
          status?: string
          tld: string
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string | null
          dns_records?: Json | null
          dns_verified?: boolean | null
          dns_verified_at?: string | null
          domain_name?: string
          expires_at?: string | null
          hosting_plan?: string | null
          id?: string
          nameservers?: Json | null
          owner_id?: string
          owner_type?: string
          price_paid_cents?: number | null
          registered_at?: string | null
          registrar_reference?: string | null
          renewal_price_cents?: number | null
          ssl_expires_at?: string | null
          ssl_status?: string | null
          status?: string
          tld?: string
          updated_at?: string | null
        }
        Relationships: []
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
      dashboard_widgets: {
        Row: {
          created_at: string
          height: number
          id: string
          is_active: boolean
          position_x: number
          position_y: number
          settings: Json
          updated_at: string
          user_id: string
          widget_type: string
          width: number
        }
        Insert: {
          created_at?: string
          height?: number
          id?: string
          is_active?: boolean
          position_x?: number
          position_y?: number
          settings?: Json
          updated_at?: string
          user_id: string
          widget_type: string
          width?: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          is_active?: boolean
          position_x?: number
          position_y?: number
          settings?: Json
          updated_at?: string
          user_id?: string
          widget_type?: string
          width?: number
        }
        Relationships: []
      }
      data_retention_rules: {
        Row: {
          action: string
          category: string
          created_at: string
          description: string | null
          id: string
          retention_days: number
          target_date_column: string | null
          target_table: string | null
          updated_at: string
        }
        Insert: {
          action?: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          retention_days: number
          target_date_column?: string | null
          target_table?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          retention_days?: number
          target_date_column?: string | null
          target_table?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      demo_activity_logs: {
        Row: {
          action_name: string | null
          activity_type: string
          copecart_plan: string | null
          copecart_url: string | null
          created_at: string
          id: string
          metadata: Json | null
          page_path: string | null
          user_email: string
        }
        Insert: {
          action_name?: string | null
          activity_type: string
          copecart_plan?: string | null
          copecart_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          user_email: string
        }
        Update: {
          action_name?: string | null
          activity_type?: string
          copecart_plan?: string | null
          copecart_url?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          user_email?: string
        }
        Relationships: []
      }
      domain_orders: {
        Row: {
          amount_cents: number
          created_at: string | null
          domain_id: string | null
          domain_name: string
          id: string
          order_type: string
          owner_id: string
          payment_reference: string | null
          status: string
          tld: string
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          domain_id?: string | null
          domain_name: string
          id?: string
          order_type: string
          owner_id: string
          payment_reference?: string | null
          status?: string
          tld: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          domain_id?: string | null
          domain_name?: string
          id?: string
          order_type?: string
          owner_id?: string
          payment_reference?: string | null
          status?: string
          tld?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_orders_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "customer_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_products: {
        Row: {
          created_at: string | null
          display_name: string
          id: string
          is_available: boolean | null
          is_featured: boolean | null
          register_price_cents: number
          renewal_price_cents: number
          sort_order: number | null
          tld: string
          transfer_price_cents: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          id?: string
          is_available?: boolean | null
          is_featured?: boolean | null
          register_price_cents: number
          renewal_price_cents: number
          sort_order?: number | null
          tld: string
          transfer_price_cents?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          id?: string
          is_available?: boolean | null
          is_featured?: boolean | null
          register_price_cents?: number
          renewal_price_cents?: number
          sort_order?: number | null
          tld?: string
          transfer_price_cents?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      domain_waitlist: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          owner_id: string
          owner_type: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          owner_id: string
          owner_type?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          owner_id?: string
          owner_type?: string
        }
        Relationships: []
      }
      ecosystem_apps: {
        Row: {
          api_endpoint: string | null
          app_name: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          api_endpoint?: string | null
          app_name: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          api_endpoint?: string | null
          app_name?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      ecosystem_errors: {
        Row: {
          app_key: string
          created_at: string | null
          error_code: string | null
          error_context: Json | null
          error_message: string
          id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          sync_log_id: string | null
          user_id: string | null
        }
        Insert: {
          app_key: string
          created_at?: string | null
          error_code?: string | null
          error_context?: Json | null
          error_message: string
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          sync_log_id?: string | null
          user_id?: string | null
        }
        Update: {
          app_key?: string
          created_at?: string | null
          error_code?: string | null
          error_context?: Json | null
          error_message?: string
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          sync_log_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_errors_sync_log_id_fkey"
            columns: ["sync_log_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_sync_log"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_links: {
        Row: {
          app_id: string | null
          app_key: string | null
          connected_at: string | null
          created_at: string | null
          data_sharing_enabled: boolean | null
          external_id: string | null
          global_id: string
          id: string
          permissions: Json | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_id?: string | null
          app_key?: string | null
          connected_at?: string | null
          created_at?: string | null
          data_sharing_enabled?: boolean | null
          external_id?: string | null
          global_id: string
          id?: string
          permissions?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_id?: string | null
          app_key?: string | null
          connected_at?: string | null
          created_at?: string | null
          data_sharing_enabled?: boolean | null
          external_id?: string | null
          global_id?: string
          id?: string
          permissions?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_links_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_mappings: {
        Row: {
          app_key: string
          created_at: string | null
          entity_type: string
          external_id: string
          id: string
          last_synced_at: string | null
          local_id: string
          metadata: Json | null
          sync_hash: string | null
          user_id: string
        }
        Insert: {
          app_key: string
          created_at?: string | null
          entity_type: string
          external_id: string
          id?: string
          last_synced_at?: string | null
          local_id: string
          metadata?: Json | null
          sync_hash?: string | null
          user_id: string
        }
        Update: {
          app_key?: string
          created_at?: string | null
          entity_type?: string
          external_id?: string
          id?: string
          last_synced_at?: string | null
          local_id?: string
          metadata?: Json | null
          sync_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ecosystem_settings: {
        Row: {
          app_key: string
          auto_sync_enabled: boolean | null
          created_at: string | null
          enabled_entity_types: string[] | null
          id: string
          last_sync_at: string | null
          notification_on_error: boolean | null
          notification_on_sync: boolean | null
          settings_json: Json | null
          sync_direction: string | null
          sync_interval_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_key: string
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          enabled_entity_types?: string[] | null
          id?: string
          last_sync_at?: string | null
          notification_on_error?: boolean | null
          notification_on_sync?: boolean | null
          settings_json?: Json | null
          sync_direction?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_key?: string
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          enabled_entity_types?: string[] | null
          id?: string
          last_sync_at?: string | null
          notification_on_error?: boolean | null
          notification_on_sync?: boolean | null
          settings_json?: Json | null
          sync_direction?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ecosystem_sync_log: {
        Row: {
          app_key: string
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          request_payload: Json | null
          response_payload: Json | null
          retry_count: number | null
          status: string
          sync_type: string
          user_id: string
        }
        Insert: {
          app_key: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number | null
          status?: string
          sync_type?: string
          user_id: string
        }
        Update: {
          app_key?: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          retry_count?: number | null
          status?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: []
      }
      education_courses: {
        Row: {
          certificate_title: string | null
          certificate_validity_years: number | null
          course_type: string | null
          created_at: string | null
          description: string | null
          duration_days: number | null
          duration_hours: number | null
          id: string
          is_active: boolean | null
          location: string | null
          max_participants: number | null
          next_date: string | null
          price_cents: number | null
          school_id: string | null
          sort_order: number | null
          title: string
        }
        Insert: {
          certificate_title?: string | null
          certificate_validity_years?: number | null
          course_type?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_participants?: number | null
          next_date?: string | null
          price_cents?: number | null
          school_id?: string | null
          sort_order?: number | null
          title: string
        }
        Update: {
          certificate_title?: string | null
          certificate_validity_years?: number | null
          course_type?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_participants?: number | null
          next_date?: string | null
          price_cents?: number | null
          school_id?: string | null
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_courses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "education_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      education_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string | null
          grade: string | null
          id: string
          notes: string | null
          registered_at: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          grade?: string | null
          id?: string
          notes?: string | null
          registered_at?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          grade?: string | null
          id?: string
          notes?: string | null
          registered_at?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "education_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      education_schools: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          founded_year: number | null
          id: string
          logo_url: string | null
          owner_id: string | null
          region: string | null
          school_name: string
          slug: string | null
          social_instagram: string | null
          specialty: string[] | null
          status: string | null
          verified: boolean | null
          verified_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          owner_id?: string | null
          region?: string | null
          school_name: string
          slug?: string | null
          social_instagram?: string | null
          specialty?: string[] | null
          status?: string | null
          verified?: boolean | null
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          owner_id?: string | null
          region?: string | null
          school_name?: string
          slug?: string | null
          social_instagram?: string | null
          specialty?: string[] | null
          status?: string | null
          verified?: boolean | null
          verified_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "education_schools_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "education_schools_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_audit_log: {
        Row: {
          action_type: string
          actor_id: string
          actor_role: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          target_kid: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          actor_role: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_kid?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          actor_role?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_kid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_escalations: {
        Row: {
          client_readable_id: string
          created_at: string
          escalation_reason: string | null
          id: string
          provider_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          client_readable_id: string
          created_at?: string
          escalation_reason?: string | null
          id?: string
          provider_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          client_readable_id?: string
          created_at?: string
          escalation_reason?: string | null
          id?: string
          provider_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_escalations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_escalations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_escalations_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_escalations_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_otp: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          provider_id: string
          status: string
          used_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash: string
          provider_id: string
          status?: string
          used_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          provider_id?: string
          status?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_otp_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_otp_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_otp_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_otp_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_absence_requests: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          notes: string | null
          provider_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          notes?: string | null
          provider_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          provider_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_absence_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_absence_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_absence_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_absence_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_absence_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_assignments: {
        Row: {
          allowed_actions: Json | null
          appointment_id: string | null
          assigned_at: string
          assigned_by: string | null
          check_in_location_lat: number | null
          check_in_location_lng: number | null
          check_in_time: string | null
          check_out_location_lat: number | null
          check_out_location_lng: number | null
          check_out_time: string | null
          created_at: string
          employee_id: string
          id: string
          instructions: string | null
          provider_id: string
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allowed_actions?: Json | null
          appointment_id?: string | null
          assigned_at?: string
          assigned_by?: string | null
          check_in_location_lat?: number | null
          check_in_location_lng?: number | null
          check_in_time?: string | null
          check_out_location_lat?: number | null
          check_out_location_lng?: number | null
          check_out_time?: string | null
          created_at?: string
          employee_id: string
          id?: string
          instructions?: string | null
          provider_id: string
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allowed_actions?: Json | null
          appointment_id?: string | null
          assigned_at?: string
          assigned_by?: string | null
          check_in_location_lat?: number | null
          check_in_location_lng?: number | null
          check_in_time?: string | null
          check_out_location_lat?: number | null
          check_out_location_lng?: number | null
          check_out_time?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          instructions?: string | null
          provider_id?: string
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_assignments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assignments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_partner_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assignments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "safe_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assignments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assignments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assignments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_assignments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          employee_id: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          provider_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string
          employee_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          provider_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          employee_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          provider_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_audit_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_audit_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_audit_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_availability: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          end_time: string | null
          id: string
          notes: string | null
          provider_id: string
          requested_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          start_time: string | null
          status: string
          type: string
          updated_at: string
          weekdays: number[] | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          end_time?: string | null
          id?: string
          notes?: string | null
          provider_id: string
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          start_time?: string | null
          status?: string
          type: string
          updated_at?: string
          weekdays?: number[] | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          provider_id?: string
          requested_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          start_time?: string | null
          status?: string
          type?: string
          updated_at?: string
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_contracts: {
        Row: {
          avv_signed_at: string | null
          avv_version: string | null
          created_at: string
          employee_user_id: string
          id: string
        }
        Insert: {
          avv_signed_at?: string | null
          avv_version?: string | null
          created_at?: string
          employee_user_id: string
          id?: string
        }
        Update: {
          avv_signed_at?: string | null
          avv_version?: string | null
          created_at?: string
          employee_user_id?: string
          id?: string
        }
        Relationships: []
      }
      employee_conversations: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          last_message_at: string | null
          provider_id: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          last_message_at?: string | null
          provider_id: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          last_message_at?: string | null
          provider_id?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_conversations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documentation: {
        Row: {
          assignment_id: string
          created_at: string
          employee_id: string
          id: string
          materials_used: Json | null
          notes: string | null
          photo_urls: string[] | null
          provider_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          employee_id: string
          id?: string
          materials_used?: Json | null
          notes?: string | null
          photo_urls?: string[] | null
          provider_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          materials_used?: Json | null
          notes?: string | null
          photo_urls?: string[] | null
          provider_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documentation_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "employee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documentation_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documentation_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documentation_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_horse_access: {
        Row: {
          assigned_by: string | null
          can_add_notes: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          employee_id: string
          granted_by: string | null
          horse_id: string
          id: string
          provider_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          can_add_notes?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          employee_id: string
          granted_by?: string | null
          horse_id: string
          id?: string
          provider_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          can_add_notes?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          employee_id?: string
          granted_by?: string | null
          horse_id?: string
          id?: string
          provider_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_horse_access_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_horse_access_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_horse_access_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_horse_access_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_material_assignments: {
        Row: {
          assigned_at: string
          created_at: string
          employee_id: string
          id: string
          material_category: string | null
          material_name: string
          notes: string | null
          provider_id: string
          quantity_assigned: number
          quantity_used: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          employee_id: string
          id?: string
          material_category?: string | null
          material_name: string
          notes?: string | null
          provider_id: string
          quantity_assigned?: number
          quantity_used?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          employee_id?: string
          id?: string
          material_category?: string | null
          material_name?: string
          notes?: string | null
          provider_id?: string
          quantity_assigned?: number
          quantity_used?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_material_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_material_assignments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_material_assignments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_material_requests: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          material_assignment_id: string
          note: string | null
          provider_id: string
          requested_quantity: number
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          material_assignment_id: string
          note?: string | null
          provider_id: string
          requested_quantity?: number
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          material_assignment_id?: string
          note?: string | null
          provider_id?: string
          requested_quantity?: number
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_material_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_material_requests_material_assignment_id_fkey"
            columns: ["material_assignment_id"]
            isOneToOne: false
            referencedRelation: "employee_material_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_material_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_material_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_for_all: boolean | null
          id: string
          is_read: boolean | null
          read_at: string | null
          reply_to_content: string | null
          reply_to_id: string | null
          sender_id: string
          voice_duration_seconds: number | null
          voice_url: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_for_all?: boolean | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          sender_id: string
          voice_duration_seconds?: number | null
          voice_url?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_for_all?: boolean | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          sender_id?: string
          voice_duration_seconds?: number | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "employee_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "employee_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_notifications: {
        Row: {
          body: string | null
          created_at: string
          employee_id: string
          id: string
          link_to: string | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          employee_id: string
          id?: string
          link_to?: string | null
          read_at?: string | null
          title: string
          type?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          link_to?: string | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_notifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          can_apply_hoof_protection: boolean | null
          can_work_alone: boolean | null
          can_work_sensitive_clients: boolean | null
          contract_end_date: string | null
          contract_pdf_url: string | null
          contract_start_date: string | null
          country: string | null
          created_at: string
          custom_permissions: Json | null
          email: string
          employment_type: Database["public"]["Enums"]["employment_type"]
          full_name: string
          id: string
          invitation_accepted_at: string | null
          invitation_sent_at: string | null
          invitation_token: string | null
          notes: string | null
          onboarding_completed: Json | null
          organization_id: string | null
          phone: string | null
          provider_id: string
          role: Database["public"]["Enums"]["employee_role"]
          status: Database["public"]["Enums"]["employee_status"]
          timezone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          can_apply_hoof_protection?: boolean | null
          can_work_alone?: boolean | null
          can_work_sensitive_clients?: boolean | null
          contract_end_date?: string | null
          contract_pdf_url?: string | null
          contract_start_date?: string | null
          country?: string | null
          created_at?: string
          custom_permissions?: Json | null
          email: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name: string
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          notes?: string | null
          onboarding_completed?: Json | null
          organization_id?: string | null
          phone?: string | null
          provider_id: string
          role?: Database["public"]["Enums"]["employee_role"]
          status?: Database["public"]["Enums"]["employee_status"]
          timezone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          can_apply_hoof_protection?: boolean | null
          can_work_alone?: boolean | null
          can_work_sensitive_clients?: boolean | null
          contract_end_date?: string | null
          contract_pdf_url?: string | null
          contract_start_date?: string | null
          country?: string | null
          created_at?: string
          custom_permissions?: Json | null
          email?: string
          employment_type?: Database["public"]["Enums"]["employment_type"]
          full_name?: string
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          notes?: string | null
          onboarding_completed?: Json | null
          organization_id?: string | null
          phone?: string | null
          provider_id?: string
          role?: Database["public"]["Enums"]["employee_role"]
          status?: Database["public"]["Enums"]["employee_status"]
          timezone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_sync_queue: {
        Row: {
          action_type: string
          created_at: string
          employee_id: string
          id: string
          payload: Json
          synced_at: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          employee_id: string
          id?: string
          payload?: Json
          synced_at?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          employee_id?: string
          id?: string
          payload?: Json
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_sync_queue_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_team_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          provider_id: string
          read_by: string[] | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          provider_id: string
          read_by?: string[] | null
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          provider_id?: string
          read_by?: string[] | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_team_messages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_team_messages_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_time_records: {
        Row: {
          break_minutes: number
          break_type: string | null
          created_at: string
          date: string
          deleted_at: string | null
          employee_id: string
          end_time: string | null
          id: string
          notes: string | null
          provider_id: string
          start_time: string
        }
        Insert: {
          break_minutes?: number
          break_type?: string | null
          created_at?: string
          date: string
          deleted_at?: string | null
          employee_id: string
          end_time?: string | null
          id?: string
          notes?: string | null
          provider_id: string
          start_time: string
        }
        Update: {
          break_minutes?: number
          break_type?: string | null
          created_at?: string
          date?: string
          deleted_at?: string | null
          employee_id?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          provider_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_time_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equine_clinics: {
        Row: {
          address: string | null
          city: string
          clinic_type: string | null
          country: string | null
          created_at: string | null
          description: string | null
          email: string | null
          emergency_phone: string | null
          emergency_service: boolean | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          opening_hours: Json | null
          phone: string | null
          photo_url: string | null
          specializations: string[] | null
          state: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city: string
          clinic_type?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          emergency_phone?: string | null
          emergency_service?: boolean | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_hours?: Json | null
          phone?: string | null
          photo_url?: string | null
          specializations?: string[] | null
          state?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          clinic_type?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          emergency_phone?: string | null
          emergency_service?: boolean | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          photo_url?: string | null
          specializations?: string[] | null
          state?: string | null
          website?: string | null
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
      funnel_leads: {
        Row: {
          assigned_to: string | null
          company_name: string | null
          contact_history: Json | null
          contact_preference: string | null
          converted_at: string | null
          converted_provider_id: string | null
          created_at: string
          demo_booked_at: string | null
          demo_completed_at: string | null
          email: string | null
          full_name: string
          id: string
          message: string | null
          notes: string | null
          notification_sent_at: string | null
          phone: string | null
          postal_code: string | null
          preferred_slots: Json | null
          source: string | null
          status: string
          tags: string[] | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_name?: string | null
          contact_history?: Json | null
          contact_preference?: string | null
          converted_at?: string | null
          converted_provider_id?: string | null
          created_at?: string
          demo_booked_at?: string | null
          demo_completed_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          message?: string | null
          notes?: string | null
          notification_sent_at?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_slots?: Json | null
          source?: string | null
          status?: string
          tags?: string[] | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string | null
          contact_history?: Json | null
          contact_preference?: string | null
          converted_at?: string | null
          converted_provider_id?: string | null
          created_at?: string
          demo_booked_at?: string | null
          demo_completed_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          message?: string | null
          notes?: string | null
          notification_sent_at?: string | null
          phone?: string | null
          postal_code?: string | null
          preferred_slots?: Json | null
          source?: string | null
          status?: string
          tags?: string[] | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_leads_converted_provider_id_fkey"
            columns: ["converted_provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_leads_converted_provider_id_fkey"
            columns: ["converted_provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      glossary_entries: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string | null
          id: string
          is_published: boolean
          related_terms: string[] | null
          sort_order: number | null
          tags: string[] | null
          term: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string | null
          id?: string
          is_published?: boolean
          related_terms?: string[] | null
          sort_order?: number | null
          tags?: string[] | null
          term: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string | null
          id?: string
          is_published?: boolean
          related_terms?: string[] | null
          sort_order?: number | null
          tags?: string[] | null
          term?: string
          updated_at?: string
        }
        Relationships: []
      }
      got_positions: {
        Row: {
          category: string
          created_at: string | null
          description: string
          id: string
          is_equine_relevant: boolean | null
          notes: string | null
          position_number: string
          price_1x: number
          price_2x: number | null
          price_3x: number | null
          price_4x: number | null
          unit: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          id?: string
          is_equine_relevant?: boolean | null
          notes?: string | null
          position_number: string
          price_1x: number
          price_2x?: number | null
          price_3x?: number | null
          price_4x?: number | null
          unit?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          is_equine_relevant?: boolean | null
          notes?: string | null
          position_number?: string
          price_1x?: number
          price_2x?: number | null
          price_3x?: number | null
          price_4x?: number | null
          unit?: string | null
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
      hm_activity_log: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          staff_id: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          staff_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          staff_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hm_activity_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hm_activity_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hm_activity_log_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "hm_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      hm_connect_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          expires_at: string
          id: string
          invite_message: string | null
          invite_role: string
          invited_by: string
          invited_email: string
          invited_name: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invite_message?: string | null
          invite_role?: string
          invited_by: string
          invited_email: string
          invited_name?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          invite_message?: string | null
          invite_role?: string
          invited_by?: string
          invited_email?: string
          invited_name?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      hm_staff: {
        Row: {
          created_at: string | null
          department: string | null
          email: string
          full_name: string
          hired_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          permissions: Json | null
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email: string
          full_name: string
          hired_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          permissions?: Json | null
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string
          full_name?: string
          hired_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          permissions?: Json | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hm_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hm_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "appointments_partner_view"
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_analyses_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_entries_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_history_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
          file_path: string | null
          hoof_position: string | null
          horse_id: string
          id: string
          notes: string | null
          photo_url: string
          taken_at: string | null
          url: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          file_path?: string | null
          hoof_position?: string | null
          horse_id: string
          id?: string
          notes?: string | null
          photo_url: string
          taken_at?: string | null
          url?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          file_path?: string | null
          hoof_position?: string | null
          horse_id?: string
          id?: string
          notes?: string | null
          photo_url?: string
          taken_at?: string | null
          url?: string | null
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
            referencedRelation: "appointments_partner_view"
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoof_photos_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
      horse_audit_log: {
        Row: {
          action_detail: Json | null
          action_type: string
          actor_id: string | null
          actor_kid: string | null
          actor_name: string | null
          actor_role: string | null
          created_at: string | null
          horse_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action_detail?: Json | null
          action_type: string
          actor_id?: string | null
          actor_kid?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string | null
          horse_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action_detail?: Json | null
          action_type?: string
          actor_id?: string | null
          actor_kid?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string | null
          horse_id?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horse_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_audit_log_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_audit_log_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_audit_log_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_audit_log_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_care_team: {
        Row: {
          created_at: string | null
          horse_id: string
          id: string
          owner_id: string
          team_sharing_enabled: boolean | null
          team_sharing_enabled_at: string | null
        }
        Insert: {
          created_at?: string | null
          horse_id: string
          id?: string
          owner_id: string
          team_sharing_enabled?: boolean | null
          team_sharing_enabled_at?: string | null
        }
        Update: {
          created_at?: string | null
          horse_id?: string
          id?: string
          owner_id?: string
          team_sharing_enabled?: boolean | null
          team_sharing_enabled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horse_care_team_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: true
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_care_team_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: true
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_care_team_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: true
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_care_team_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: true
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_chat_channels: {
        Row: {
          created_at: string
          horse_id: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          horse_id: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          horse_id?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_chat_channels_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: true
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_chat_channels_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: true
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_chat_channels_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: true
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_chat_channels_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: true
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          file_url: string | null
          id: string
          is_read_by: Json | null
          message_type: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_read_by?: Json | null
          message_type?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_read_by?: Json | null
          message_type?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "horse_chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_deworming: {
        Row: {
          active_substance: string | null
          administered_by: string | null
          created_at: string | null
          created_by: string | null
          deworming_date: string
          dosage_ml: number | null
          fecal_egg_count: number | null
          horse_id: string
          id: string
          next_due_date: string | null
          notes: string | null
          product_name: string
          weight_at_time_kg: number | null
        }
        Insert: {
          active_substance?: string | null
          administered_by?: string | null
          created_at?: string | null
          created_by?: string | null
          deworming_date: string
          dosage_ml?: number | null
          fecal_egg_count?: number | null
          horse_id: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          product_name: string
          weight_at_time_kg?: number | null
        }
        Update: {
          active_substance?: string | null
          administered_by?: string | null
          created_at?: string | null
          created_by?: string | null
          deworming_date?: string
          dosage_ml?: number | null
          fecal_egg_count?: number | null
          horse_id?: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          product_name?: string
          weight_at_time_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "horse_deworming_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_deworming_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_deworming_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_deworming_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_deworming_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_deworming_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_diary_entries: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          horse_id: string
          id: string
          owner_id: string
          photo_url: string | null
          shared_with_provider: boolean
          text: string
        }
        Insert: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          horse_id: string
          id?: string
          owner_id: string
          photo_url?: string | null
          shared_with_provider?: boolean
          text: string
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          horse_id?: string
          id?: string
          owner_id?: string
          photo_url?: string | null
          shared_with_provider?: boolean
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_diary_entries_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_diary_entries_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_diary_entries_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_diary_entries_horse_id_fkey"
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
      horse_emergency_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          horse_id: string
          id: string
          is_active: boolean
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          horse_id: string
          id?: string
          is_active?: boolean
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          horse_id?: string
          id?: string
          is_active?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_emergency_tokens_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_emergency_tokens_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_emergency_tokens_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_emergency_tokens_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_health_logs: {
        Row: {
          ate_normally: boolean | null
          created_at: string | null
          date: string
          hoof_rating: number | null
          horse_id: string
          id: string
          notes: string | null
          owner_id: string
          shared_with_provider: boolean | null
          temperament: string | null
          weight: number | null
          wellbeing: number
        }
        Insert: {
          ate_normally?: boolean | null
          created_at?: string | null
          date?: string
          hoof_rating?: number | null
          horse_id: string
          id?: string
          notes?: string | null
          owner_id: string
          shared_with_provider?: boolean | null
          temperament?: string | null
          weight?: number | null
          wellbeing?: number
        }
        Update: {
          ate_normally?: boolean | null
          created_at?: string | null
          date?: string
          hoof_rating?: number | null
          horse_id?: string
          id?: string
          notes?: string | null
          owner_id?: string
          shared_with_provider?: boolean | null
          temperament?: string | null
          weight?: number | null
          wellbeing?: number
        }
        Relationships: [
          {
            foreignKeyName: "horse_health_logs_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_health_logs_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_health_logs_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_health_logs_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_health_logs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_health_logs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_intake_history: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          current_hoof_protection: string | null
          horse_id: string
          id: string
          known_conditions: string[] | null
          lameness_history: string | null
          ownership_duration: string | null
          previous_farrier: string | null
          provider_id: string
          trimming_interval: string | null
          xrays_available: boolean | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          current_hoof_protection?: string | null
          horse_id: string
          id?: string
          known_conditions?: string[] | null
          lameness_history?: string | null
          ownership_duration?: string | null
          previous_farrier?: string | null
          provider_id: string
          trimming_interval?: string | null
          xrays_available?: boolean | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          current_hoof_protection?: string | null
          horse_id?: string
          id?: string
          known_conditions?: string[] | null
          lameness_history?: string | null
          ownership_duration?: string | null
          previous_farrier?: string | null
          provider_id?: string
          trimming_interval?: string | null
          xrays_available?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "horse_intake_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_intake_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_partner_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_intake_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "safe_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_intake_history_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_intake_history_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_intake_history_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_intake_history_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_lab_results: {
        Row: {
          created_at: string | null
          document_url: string | null
          documented_by: string
          external_id: string | null
          horse_id: string
          id: string
          is_abnormal: boolean | null
          lab_name: string | null
          lab_type: string
          notes: string | null
          reference_range: string | null
          result_date: string
          result_value: string | null
          source_system: string | null
          test_name: string
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          document_url?: string | null
          documented_by: string
          external_id?: string | null
          horse_id: string
          id?: string
          is_abnormal?: boolean | null
          lab_name?: string | null
          lab_type: string
          notes?: string | null
          reference_range?: string | null
          result_date: string
          result_value?: string | null
          source_system?: string | null
          test_name: string
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          document_url?: string | null
          documented_by?: string
          external_id?: string | null
          horse_id?: string
          id?: string
          is_abnormal?: boolean | null
          lab_name?: string | null
          lab_type?: string
          notes?: string | null
          reference_range?: string | null
          result_date?: string
          result_value?: string | null
          source_system?: string | null
          test_name?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horse_lab_results_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_lab_results_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_lab_results_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_lab_results_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_medications: {
        Row: {
          active_ingredient: string | null
          created_at: string | null
          documented_by: string | null
          dosage: string | null
          end_date: string | null
          external_id: string | null
          frequency: string | null
          horse_id: string
          id: string
          is_active: boolean | null
          medication_name: string
          notes: string | null
          prescribed_by: string | null
          prescribing_vet: string | null
          reason: string | null
          route: string | null
          source: string | null
          source_system: string | null
          start_date: string | null
          updated_at: string | null
          withdrawal_period_days: number | null
        }
        Insert: {
          active_ingredient?: string | null
          created_at?: string | null
          documented_by?: string | null
          dosage?: string | null
          end_date?: string | null
          external_id?: string | null
          frequency?: string | null
          horse_id: string
          id?: string
          is_active?: boolean | null
          medication_name: string
          notes?: string | null
          prescribed_by?: string | null
          prescribing_vet?: string | null
          reason?: string | null
          route?: string | null
          source?: string | null
          source_system?: string | null
          start_date?: string | null
          updated_at?: string | null
          withdrawal_period_days?: number | null
        }
        Update: {
          active_ingredient?: string | null
          created_at?: string | null
          documented_by?: string | null
          dosage?: string | null
          end_date?: string | null
          external_id?: string | null
          frequency?: string | null
          horse_id?: string
          id?: string
          is_active?: boolean | null
          medication_name?: string
          notes?: string | null
          prescribed_by?: string | null
          prescribing_vet?: string | null
          reason?: string | null
          route?: string | null
          source?: string | null
          source_system?: string | null
          start_date?: string | null
          updated_at?: string | null
          withdrawal_period_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "horse_medications_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_medications_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_medications_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_medications_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_partner_access: {
        Row: {
          accepted_at: string | null
          access_note: string | null
          can_add_treatment_notes: boolean
          can_create_appointments: boolean
          can_upload_documents: boolean | null
          can_view_basic: boolean
          can_view_breeding: boolean | null
          can_view_chat: boolean | null
          can_view_deworming: boolean | null
          can_view_diary: boolean | null
          can_view_documents: boolean | null
          can_view_hoof_history: boolean
          can_view_insurance: boolean | null
          can_view_medical: boolean
          can_view_other_partners: boolean | null
          can_view_training: boolean | null
          can_view_vaccinations: boolean | null
          can_view_weight_bcs: boolean | null
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          horse_id: string
          id: string
          invite_token: string | null
          invited_at: string | null
          invited_by_client_id: string | null
          invited_by_provider_id: string | null
          is_active: boolean
          owner_approved: boolean | null
          owner_approved_at: string | null
          partner_email: string | null
          partner_name: string | null
          partner_profile_id: string | null
          partner_type: Database["public"]["Enums"]["partner_type"] | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: string
          updated_at: string | null
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          access_note?: string | null
          can_add_treatment_notes?: boolean
          can_create_appointments?: boolean
          can_upload_documents?: boolean | null
          can_view_basic?: boolean
          can_view_breeding?: boolean | null
          can_view_chat?: boolean | null
          can_view_deworming?: boolean | null
          can_view_diary?: boolean | null
          can_view_documents?: boolean | null
          can_view_hoof_history?: boolean
          can_view_insurance?: boolean | null
          can_view_medical?: boolean
          can_view_other_partners?: boolean | null
          can_view_training?: boolean | null
          can_view_vaccinations?: boolean | null
          can_view_weight_bcs?: boolean | null
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          horse_id: string
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          invited_by_client_id?: string | null
          invited_by_provider_id?: string | null
          is_active?: boolean
          owner_approved?: boolean | null
          owner_approved_at?: string | null
          partner_email?: string | null
          partner_name?: string | null
          partner_profile_id?: string | null
          partner_type?: Database["public"]["Enums"]["partner_type"] | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string | null
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          access_note?: string | null
          can_add_treatment_notes?: boolean
          can_create_appointments?: boolean
          can_upload_documents?: boolean | null
          can_view_basic?: boolean
          can_view_breeding?: boolean | null
          can_view_chat?: boolean | null
          can_view_deworming?: boolean | null
          can_view_diary?: boolean | null
          can_view_documents?: boolean | null
          can_view_hoof_history?: boolean
          can_view_insurance?: boolean | null
          can_view_medical?: boolean
          can_view_other_partners?: boolean | null
          can_view_training?: boolean | null
          can_view_vaccinations?: boolean | null
          can_view_weight_bcs?: boolean | null
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          horse_id?: string
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          invited_by_client_id?: string | null
          invited_by_provider_id?: string | null
          is_active?: boolean
          owner_approved?: boolean | null
          owner_approved_at?: string | null
          partner_email?: string | null
          partner_name?: string | null
          partner_profile_id?: string | null
          partner_type?: Database["public"]["Enums"]["partner_type"] | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horse_partner_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_invited_by_client_id_fkey"
            columns: ["invited_by_client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_invited_by_client_id_fkey"
            columns: ["invited_by_client_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_invited_by_provider_id_fkey"
            columns: ["invited_by_provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_invited_by_provider_id_fkey"
            columns: ["invited_by_provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_partner_profile_id_fkey"
            columns: ["partner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_partner_profile_id_fkey"
            columns: ["partner_profile_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_partner_access_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_status_reports: {
        Row: {
          authority_case_number: string | null
          authority_name: string | null
          authority_notified: boolean | null
          authority_notified_at: string | null
          closed_at: string | null
          court_order_date: string | null
          court_order_received: boolean | null
          court_order_required: boolean | null
          court_order_url: string | null
          created_at: string | null
          description: string | null
          document_urls: string[] | null
          horse_id: string
          id: string
          incident_date: string | null
          incident_location: string | null
          report_status: string | null
          report_type: string
          reported_by: string
          updated_at: string | null
        }
        Insert: {
          authority_case_number?: string | null
          authority_name?: string | null
          authority_notified?: boolean | null
          authority_notified_at?: string | null
          closed_at?: string | null
          court_order_date?: string | null
          court_order_received?: boolean | null
          court_order_required?: boolean | null
          court_order_url?: string | null
          created_at?: string | null
          description?: string | null
          document_urls?: string[] | null
          horse_id: string
          id?: string
          incident_date?: string | null
          incident_location?: string | null
          report_status?: string | null
          report_type: string
          reported_by: string
          updated_at?: string | null
        }
        Update: {
          authority_case_number?: string | null
          authority_name?: string | null
          authority_notified?: boolean | null
          authority_notified_at?: string | null
          closed_at?: string | null
          court_order_date?: string | null
          court_order_received?: boolean | null
          court_order_required?: boolean | null
          court_order_url?: string | null
          created_at?: string | null
          description?: string | null
          document_urls?: string[] | null
          horse_id?: string
          id?: string
          incident_date?: string | null
          incident_location?: string | null
          report_status?: string | null
          report_type?: string
          reported_by?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horse_status_reports_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_status_reports_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_status_reports_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_status_reports_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_status_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_status_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_transfers: {
        Row: {
          buyer_confirmed: boolean | null
          buyer_confirmed_at: string | null
          buyer_contract_url: string | null
          buyer_email: string
          buyer_id: string | null
          buyer_kid: string | null
          buyer_liability_accepted: boolean | null
          buyer_shared_password: string | null
          completed_at: string | null
          contract_verified: boolean | null
          contract_verified_at: string | null
          contract_verified_by: string | null
          exclude_provider_notes: boolean | null
          expires_at: string | null
          horse_id: string
          id: string
          include_documents: boolean | null
          include_full_history: boolean | null
          include_hoof_history: boolean | null
          include_photos: boolean | null
          initiated_at: string | null
          notes: string | null
          seller_confirmed: boolean | null
          seller_confirmed_at: string | null
          seller_contract_url: string | null
          seller_id: string
          seller_liability_accepted: boolean | null
          seller_shared_password: string | null
          shared_password_hash: string | null
          status: string
        }
        Insert: {
          buyer_confirmed?: boolean | null
          buyer_confirmed_at?: string | null
          buyer_contract_url?: string | null
          buyer_email: string
          buyer_id?: string | null
          buyer_kid?: string | null
          buyer_liability_accepted?: boolean | null
          buyer_shared_password?: string | null
          completed_at?: string | null
          contract_verified?: boolean | null
          contract_verified_at?: string | null
          contract_verified_by?: string | null
          exclude_provider_notes?: boolean | null
          expires_at?: string | null
          horse_id: string
          id?: string
          include_documents?: boolean | null
          include_full_history?: boolean | null
          include_hoof_history?: boolean | null
          include_photos?: boolean | null
          initiated_at?: string | null
          notes?: string | null
          seller_confirmed?: boolean | null
          seller_confirmed_at?: string | null
          seller_contract_url?: string | null
          seller_id: string
          seller_liability_accepted?: boolean | null
          seller_shared_password?: string | null
          shared_password_hash?: string | null
          status?: string
        }
        Update: {
          buyer_confirmed?: boolean | null
          buyer_confirmed_at?: string | null
          buyer_contract_url?: string | null
          buyer_email?: string
          buyer_id?: string | null
          buyer_kid?: string | null
          buyer_liability_accepted?: boolean | null
          buyer_shared_password?: string | null
          completed_at?: string | null
          contract_verified?: boolean | null
          contract_verified_at?: string | null
          contract_verified_by?: string | null
          exclude_provider_notes?: boolean | null
          expires_at?: string | null
          horse_id?: string
          id?: string
          include_documents?: boolean | null
          include_full_history?: boolean | null
          include_hoof_history?: boolean | null
          include_photos?: boolean | null
          initiated_at?: string | null
          notes?: string | null
          seller_confirmed?: boolean | null
          seller_confirmed_at?: string | null
          seller_contract_url?: string | null
          seller_id?: string
          seller_liability_accepted?: boolean | null
          seller_shared_password?: string | null
          shared_password_hash?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "horse_transfers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_transfers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_transfers_contract_verified_by_fkey"
            columns: ["contract_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_transfers_contract_verified_by_fkey"
            columns: ["contract_verified_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_transfers_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_transfers_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_transfers_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_transfers_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_transfers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_transfers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horse_vaccinations: {
        Row: {
          administered_by: string | null
          application_site: string | null
          batch_number: string | null
          created_at: string | null
          created_by: string | null
          document_url: string | null
          horse_id: string
          id: string
          next_due_date: string | null
          notes: string | null
          updated_at: string | null
          vaccination_date: string
          vaccine_manufacturer: string | null
          vaccine_name: string | null
          vaccine_type: string
          vet_address: string | null
          vet_clinic: string | null
          vet_profile_id: string | null
        }
        Insert: {
          administered_by?: string | null
          application_site?: string | null
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          horse_id: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string | null
          vaccination_date: string
          vaccine_manufacturer?: string | null
          vaccine_name?: string | null
          vaccine_type: string
          vet_address?: string | null
          vet_clinic?: string | null
          vet_profile_id?: string | null
        }
        Update: {
          administered_by?: string | null
          application_site?: string | null
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          document_url?: string | null
          horse_id?: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string | null
          vaccination_date?: string
          vaccine_manufacturer?: string | null
          vaccine_name?: string | null
          vaccine_type?: string
          vet_address?: string | null
          vet_clinic?: string | null
          vet_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horse_vaccinations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_vaccinations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_vaccinations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_vaccinations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_vaccinations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_vaccinations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_vaccinations_vet_profile_id_fkey"
            columns: ["vet_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horse_vaccinations_vet_profile_id_fkey"
            columns: ["vet_profile_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      horses: {
        Row: {
          anamnesis_interval_months: number | null
          app_source: string | null
          bcs_updated_at: string | null
          behavior_notes: string | null
          birth_date: string | null
          birth_year: number | null
          body_condition_score: number | null
          brand_marks: string | null
          breed: string | null
          breeding_country: string | null
          chip_number: string | null
          color: string | null
          contacts: Json | null
          created_at: string
          current_medications: string | null
          dam_name: string | null
          deleted_at: string | null
          discipline: string | null
          disciplines: string[] | null
          documents_urls: string[] | null
          eqid: string | null
          equine_type: string | null
          equipment_notes: string | null
          feeding_notes: string | null
          fn_number: string | null
          gender: string | null
          handling_warnings: string | null
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
          horse_status: string
          housing: string | null
          id: string
          insurance_company: string | null
          insurance_policy_number: string | null
          insurance_type: string[] | null
          insurance_valid_until: string | null
          is_new_horse: boolean | null
          known_allergies: string | null
          last_anamnesis_date: string | null
          last_appointment_date: string | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          markings_diagram_url: string | null
          medical_history: string | null
          name: string
          next_appointment_due: string | null
          nickname: string | null
          official_name: string | null
          organization_id: string | null
          owner_id: string
          passport_number: string | null
          photo_url: string | null
          primary_location_id: string | null
          readable_id: string | null
          recall_interval_weeks: number | null
          shoeing_interval: number | null
          shoeing_status: string | null
          sire_name: string | null
          special_notes: string | null
          stable_address_gps: Json | null
          status_changed_at: string | null
          status_reason: string | null
          status_reported_at: string | null
          studbook: string | null
          temperament: string | null
          training_level: string | null
          ueln: string | null
          updated_at: string
          usage: string | null
          usage_type: Database["public"]["Enums"]["usage_type"] | null
          weight_kg: number | null
        }
        Insert: {
          anamnesis_interval_months?: number | null
          app_source?: string | null
          bcs_updated_at?: string | null
          behavior_notes?: string | null
          birth_date?: string | null
          birth_year?: number | null
          body_condition_score?: number | null
          brand_marks?: string | null
          breed?: string | null
          breeding_country?: string | null
          chip_number?: string | null
          color?: string | null
          contacts?: Json | null
          created_at?: string
          current_medications?: string | null
          dam_name?: string | null
          deleted_at?: string | null
          discipline?: string | null
          disciplines?: string[] | null
          documents_urls?: string[] | null
          eqid?: string | null
          equine_type?: string | null
          equipment_notes?: string | null
          feeding_notes?: string | null
          fn_number?: string | null
          gender?: string | null
          handling_warnings?: string | null
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
          horse_status?: string
          housing?: string | null
          id?: string
          insurance_company?: string | null
          insurance_policy_number?: string | null
          insurance_type?: string[] | null
          insurance_valid_until?: string | null
          is_new_horse?: boolean | null
          known_allergies?: string | null
          last_anamnesis_date?: string | null
          last_appointment_date?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          markings_diagram_url?: string | null
          medical_history?: string | null
          name: string
          next_appointment_due?: string | null
          nickname?: string | null
          official_name?: string | null
          organization_id?: string | null
          owner_id: string
          passport_number?: string | null
          photo_url?: string | null
          primary_location_id?: string | null
          readable_id?: string | null
          recall_interval_weeks?: number | null
          shoeing_interval?: number | null
          shoeing_status?: string | null
          sire_name?: string | null
          special_notes?: string | null
          stable_address_gps?: Json | null
          status_changed_at?: string | null
          status_reason?: string | null
          status_reported_at?: string | null
          studbook?: string | null
          temperament?: string | null
          training_level?: string | null
          ueln?: string | null
          updated_at?: string
          usage?: string | null
          usage_type?: Database["public"]["Enums"]["usage_type"] | null
          weight_kg?: number | null
        }
        Update: {
          anamnesis_interval_months?: number | null
          app_source?: string | null
          bcs_updated_at?: string | null
          behavior_notes?: string | null
          birth_date?: string | null
          birth_year?: number | null
          body_condition_score?: number | null
          brand_marks?: string | null
          breed?: string | null
          breeding_country?: string | null
          chip_number?: string | null
          color?: string | null
          contacts?: Json | null
          created_at?: string
          current_medications?: string | null
          dam_name?: string | null
          deleted_at?: string | null
          discipline?: string | null
          disciplines?: string[] | null
          documents_urls?: string[] | null
          eqid?: string | null
          equine_type?: string | null
          equipment_notes?: string | null
          feeding_notes?: string | null
          fn_number?: string | null
          gender?: string | null
          handling_warnings?: string | null
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
          horse_status?: string
          housing?: string | null
          id?: string
          insurance_company?: string | null
          insurance_policy_number?: string | null
          insurance_type?: string[] | null
          insurance_valid_until?: string | null
          is_new_horse?: boolean | null
          known_allergies?: string | null
          last_anamnesis_date?: string | null
          last_appointment_date?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          markings_diagram_url?: string | null
          medical_history?: string | null
          name?: string
          next_appointment_due?: string | null
          nickname?: string | null
          official_name?: string | null
          organization_id?: string | null
          owner_id?: string
          passport_number?: string | null
          photo_url?: string | null
          primary_location_id?: string | null
          readable_id?: string | null
          recall_interval_weeks?: number | null
          shoeing_interval?: number | null
          shoeing_status?: string | null
          sire_name?: string | null
          special_notes?: string | null
          stable_address_gps?: Json | null
          status_changed_at?: string | null
          status_reason?: string | null
          status_reported_at?: string | null
          studbook?: string | null
          temperament?: string | null
          training_level?: string | null
          ueln?: string | null
          updated_at?: string
          usage?: string | null
          usage_type?: Database["public"]["Enums"]["usage_type"] | null
          weight_kg?: number | null
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
          {
            foreignKeyName: "horses_primary_location_id_fkey"
            columns: ["primary_location_id"]
            isOneToOne: false
            referencedRelation: "client_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      hufrente_referrals: {
        Row: {
          activated_at: string | null
          copecart_affiliate_id: string | null
          copecart_referral_id: string | null
          created_at: string | null
          id: string
          monthly_commission: number | null
          provider_id: string
          referred_email: string | null
          referred_name_anonymous: string | null
          status: string
          total_commission: number | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          copecart_affiliate_id?: string | null
          copecart_referral_id?: string | null
          created_at?: string | null
          id?: string
          monthly_commission?: number | null
          provider_id: string
          referred_email?: string | null
          referred_name_anonymous?: string | null
          status?: string
          total_commission?: number | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          copecart_affiliate_id?: string | null
          copecart_referral_id?: string | null
          created_at?: string | null
          id?: string
          monthly_commission?: number | null
          provider_id?: string
          referred_email?: string | null
          referred_name_anonymous?: string | null
          status?: string
          total_commission?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hufrente_referrals_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hufrente_referrals_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          approved_amount: number | null
          auto_attached_data: Json | null
          claim_type: string
          created_at: string | null
          description: string
          estimated_amount: number | null
          horse_id: string
          id: string
          incident_date: string | null
          policy_id: string
          reported_by: string
          reviewer_notes: string | null
          status: string | null
          supporting_documents: string[] | null
          updated_at: string | null
        }
        Insert: {
          approved_amount?: number | null
          auto_attached_data?: Json | null
          claim_type: string
          created_at?: string | null
          description: string
          estimated_amount?: number | null
          horse_id: string
          id?: string
          incident_date?: string | null
          policy_id: string
          reported_by: string
          reviewer_notes?: string | null
          status?: string | null
          supporting_documents?: string[] | null
          updated_at?: string | null
        }
        Update: {
          approved_amount?: number | null
          auto_attached_data?: Json | null
          claim_type?: string
          created_at?: string | null
          description?: string
          estimated_amount?: number | null
          horse_id?: string
          id?: string
          incident_date?: string | null
          policy_id?: string
          reported_by?: string
          reviewer_notes?: string | null
          status?: string | null
          supporting_documents?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          contract_document_url: string | null
          coverage_details: Json | null
          created_at: string | null
          deductible: number | null
          horse_id: string
          id: string
          org_id: string
          owner_id: string
          policy_number: string
          policy_type: string
          premium_monthly: number | null
          premium_yearly: number | null
          status: string | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          contract_document_url?: string | null
          coverage_details?: Json | null
          created_at?: string | null
          deductible?: number | null
          horse_id: string
          id?: string
          org_id: string
          owner_id: string
          policy_number: string
          policy_type: string
          premium_monthly?: number | null
          premium_yearly?: number | null
          status?: string | null
          valid_from: string
          valid_until?: string | null
        }
        Update: {
          contract_document_url?: string | null
          coverage_details?: Json | null
          created_at?: string | null
          deductible?: number | null
          horse_id?: string
          id?: string
          org_id?: string
          owner_id?: string
          policy_number?: string
          policy_type?: string
          premium_monthly?: number | null
          premium_yearly?: number | null
          status?: string | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policies_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
            referencedRelation: "appointments_partner_view"
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
          {
            foreignKeyName: "invoice_appointments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_client_view"
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
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices_client_view"
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
          provider_id: string
          signature_url: string | null
          status: string
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
          provider_id: string
          signature_url?: string | null
          status?: string
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
          provider_id?: string
          signature_url?: string | null
          status?: string
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
            foreignKeyName: "invoices_credit_note_for_fkey"
            columns: ["credit_note_for"]
            isOneToOne: false
            referencedRelation: "invoices_client_view"
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
          lead_quality: string | null
          lead_score: number | null
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
          lead_quality?: string | null
          lead_score?: number | null
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
          lead_quality?: string | null
          lead_score?: number | null
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
      legal_change_confirmations: {
        Row: {
          action: string | null
          confirmed_at: string | null
          created_at: string | null
          id: string
          notification_id: string
          provider_id: string
          reminder_count: number | null
        }
        Insert: {
          action?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          notification_id: string
          provider_id: string
          reminder_count?: number | null
        }
        Update: {
          action?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          notification_id?: string
          provider_id?: string
          reminder_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_change_confirmations_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "legal_change_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_change_confirmations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_change_confirmations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_change_notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          effective_date: string
          id: string
          requires_action: boolean | null
          summary: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          effective_date: string
          id?: string
          requires_action?: boolean | null
          summary: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          id?: string
          requires_action?: boolean | null
          summary?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      magic_links: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          provider_id: string
          sent_via: string | null
          slug: string
          uses_count: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          provider_id: string
          sent_via?: string | null
          slug: string
          uses_count?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          provider_id?: string
          sent_via?: string | null
          slug?: string
          uses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "magic_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magic_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payments: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string | null
          currency: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          plan_name: string | null
          provider_id: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          plan_name?: string | null
          provider_id: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          plan_name?: string | null
          provider_id?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "appointments_partner_view"
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string | null
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string | null
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string | null
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_for_all: boolean | null
          id: string
          image_url: string | null
          is_read: boolean | null
          read_at: string | null
          reply_to_content: string | null
          reply_to_id: string | null
          sender_id: string
          voice_duration_seconds: number | null
          voice_url: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_for_all?: boolean | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          read_at?: string | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          sender_id: string
          voice_duration_seconds?: number | null
          voice_url?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_for_all?: boolean | null
          id?: string
          image_url?: string | null
          is_read?: boolean | null
          read_at?: string | null
          reply_to_content?: string | null
          reply_to_id?: string | null
          sender_id?: string
          voice_duration_seconds?: number | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
          billing_type: Database["public"]["Enums"]["billing_type"] | null
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
          billing_type?: Database["public"]["Enums"]["billing_type"] | null
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
          billing_type?: Database["public"]["Enums"]["billing_type"] | null
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
      office_documents: {
        Row: {
          blocks: Json
          branding: Json | null
          color_tag: string | null
          contact_id: string | null
          created_at: string
          horse_id: string | null
          horse_name: string | null
          id: string
          is_favorite: boolean | null
          last_edited_at: string | null
          pdf_generated_at: string | null
          pdf_url: string | null
          provider_id: string
          status: string
          template_id: string | null
          template_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          branding?: Json | null
          color_tag?: string | null
          contact_id?: string | null
          created_at?: string
          horse_id?: string | null
          horse_name?: string | null
          id?: string
          is_favorite?: boolean | null
          last_edited_at?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          provider_id: string
          status?: string
          template_id?: string | null
          template_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          branding?: Json | null
          color_tag?: string | null
          contact_id?: string | null
          created_at?: string
          horse_id?: string | null
          horse_name?: string | null
          id?: string
          is_favorite?: boolean | null
          last_edited_at?: string | null
          pdf_generated_at?: string | null
          pdf_url?: string | null
          provider_id?: string
          status?: string
          template_id?: string | null
          template_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "office_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      office_templates: {
        Row: {
          added_at: string | null
          blocks: Json
          branding: Json | null
          category: string
          created_at: string
          description: string | null
          id: string
          is_featured: boolean | null
          is_preset: boolean
          name: string
          provider_id: string
          sort_order: number | null
          updated_at: string
          use_count: number | null
        }
        Insert: {
          added_at?: string | null
          blocks?: Json
          branding?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_preset?: boolean
          name: string
          provider_id: string
          sort_order?: number | null
          updated_at?: string
          use_count?: number | null
        }
        Update: {
          added_at?: string | null
          blocks?: Json
          branding?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_preset?: boolean
          name?: string
          provider_id?: string
          sort_order?: number | null
          updated_at?: string
          use_count?: number | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          org_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          org_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          org_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_orders: {
        Row: {
          created_at: string | null
          id: string
          items: Json
          notes: string | null
          ordered_by: string
          org_id: string
          shipping_address: Json | null
          status: string | null
          total_net: number | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items: Json
          notes?: string | null
          ordered_by: string
          org_id: string
          shipping_address?: Json | null
          status?: string | null
          total_net?: number | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          ordered_by?: string
          org_id?: string
          shipping_address?: Json | null
          status?: string | null
          total_net?: number | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_products: {
        Row: {
          application_areas: string[] | null
          category: string | null
          created_at: string | null
          description: string | null
          documentation_url: string | null
          ean: string | null
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean | null
          name: string
          org_id: string
          price_currency: string | null
          price_net: number | null
          recommendation_triggers: Json | null
          short_description: string | null
          sizes: string[] | null
          sku: string | null
          subcategory: string | null
          unit: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          application_areas?: string[] | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          documentation_url?: string | null
          ean?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          name: string
          org_id: string
          price_currency?: string | null
          price_net?: number | null
          recommendation_triggers?: Json | null
          short_description?: string | null
          sizes?: string[] | null
          sku?: string | null
          subcategory?: string | null
          unit?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          application_areas?: string[] | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          documentation_url?: string | null
          ean?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean | null
          name?: string
          org_id?: string
          price_currency?: string | null
          price_net?: number | null
          recommendation_triggers?: Json | null
          short_description?: string | null
          sizes?: string[] | null
          sku?: string | null
          subcategory?: string | null
          unit?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: Json | null
          brand_color_primary: string | null
          brand_color_secondary: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string
          plan: string | null
          settings: Json | null
          slug: string | null
          type: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: Json | null
          brand_color_primary?: string | null
          brand_color_secondary?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id: string
          plan?: string | null
          settings?: Json | null
          slug?: string | null
          type?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: Json | null
          brand_color_primary?: string | null
          brand_color_secondary?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          plan?: string | null
          settings?: Json | null
          slug?: string | null
          type?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      partner_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string | null
          completed_at: string | null
          completion_notes: string | null
          confirmed_at: string | null
          created_at: string
          duration: number | null
          end_time: string | null
          horse_id: string
          id: string
          location: string | null
          notes: string | null
          partner_id: string
          price: number | null
          requested_by: string | null
          service_id: string | null
          status: string
          title: string
          treatment_note_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          confirmed_at?: string | null
          created_at?: string
          duration?: number | null
          end_time?: string | null
          horse_id: string
          id?: string
          location?: string | null
          notes?: string | null
          partner_id: string
          price?: number | null
          requested_by?: string | null
          service_id?: string | null
          status?: string
          title: string
          treatment_note_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          confirmed_at?: string | null
          created_at?: string
          duration?: number | null
          end_time?: string | null
          horse_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          partner_id?: string
          price?: number | null
          requested_by?: string | null
          service_id?: string | null
          status?: string
          title?: string
          treatment_note_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "partner_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_appointments_treatment_note_id_fkey"
            columns: ["treatment_note_id"]
            isOneToOne: false
            referencedRelation: "partner_treatment_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_business_settings: {
        Row: {
          address: string | null
          bank_name: string | null
          berufsbezeichnung: string | null
          bic: string | null
          bilanzpflicht: boolean | null
          bio: string | null
          business_name: string | null
          country: string | null
          created_at: string
          currency: string | null
          datev_mandanten_nr: string | null
          default_vat_rate: number | null
          email: string | null
          finanzamt: string | null
          handelsregister: string | null
          iban: string | null
          id: string
          kammer: string | null
          kleine_unternehmer: boolean | null
          legal_form: string | null
          logo_url: string | null
          notification_preferences: Json | null
          owner_name: string | null
          partner_id: string
          phone: string | null
          price_display_mode: string | null
          public_profile_visible: boolean | null
          qualifications: string | null
          specialty: string | null
          steuerberater_email: string | null
          steuerberater_name: string | null
          tax_number: string | null
          updated_at: string
          vat_id: string | null
          vorsteuerabzug: boolean | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_name?: string | null
          berufsbezeichnung?: string | null
          bic?: string | null
          bilanzpflicht?: boolean | null
          bio?: string | null
          business_name?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          datev_mandanten_nr?: string | null
          default_vat_rate?: number | null
          email?: string | null
          finanzamt?: string | null
          handelsregister?: string | null
          iban?: string | null
          id?: string
          kammer?: string | null
          kleine_unternehmer?: boolean | null
          legal_form?: string | null
          logo_url?: string | null
          notification_preferences?: Json | null
          owner_name?: string | null
          partner_id: string
          phone?: string | null
          price_display_mode?: string | null
          public_profile_visible?: boolean | null
          qualifications?: string | null
          specialty?: string | null
          steuerberater_email?: string | null
          steuerberater_name?: string | null
          tax_number?: string | null
          updated_at?: string
          vat_id?: string | null
          vorsteuerabzug?: boolean | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_name?: string | null
          berufsbezeichnung?: string | null
          bic?: string | null
          bilanzpflicht?: boolean | null
          bio?: string | null
          business_name?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          datev_mandanten_nr?: string | null
          default_vat_rate?: number | null
          email?: string | null
          finanzamt?: string | null
          handelsregister?: string | null
          iban?: string | null
          id?: string
          kammer?: string | null
          kleine_unternehmer?: boolean | null
          legal_form?: string | null
          logo_url?: string | null
          notification_preferences?: Json | null
          owner_name?: string | null
          partner_id?: string
          phone?: string | null
          price_display_mode?: string | null
          public_profile_visible?: boolean | null
          qualifications?: string | null
          specialty?: string | null
          steuerberater_email?: string | null
          steuerberater_name?: string | null
          tax_number?: string | null
          updated_at?: string
          vat_id?: string | null
          vorsteuerabzug?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      partner_contracts: {
        Row: {
          avv_signed_at: string | null
          avv_version: string | null
          created_at: string
          id: string
          partner_id: string
        }
        Insert: {
          avv_signed_at?: string | null
          avv_version?: string | null
          created_at?: string
          id?: string
          partner_id: string
        }
        Update: {
          avv_signed_at?: string | null
          avv_version?: string | null
          created_at?: string
          id?: string
          partner_id?: string
        }
        Relationships: []
      }
      partner_conversations: {
        Row: {
          counterpart_id: string
          counterpart_role: string
          created_at: string
          horse_id: string | null
          id: string
          last_message_at: string | null
          partner_id: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          counterpart_id: string
          counterpart_role: string
          created_at?: string
          horse_id?: string | null
          id?: string
          last_message_at?: string | null
          partner_id: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          counterpart_id?: string
          counterpart_role?: string
          created_at?: string
          horse_id?: string | null
          id?: string
          last_message_at?: string | null
          partner_id?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_conversations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_conversations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_conversations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_conversations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_data_consents: {
        Row: {
          consent_type: string
          granted_at: string
          horse_id: string
          id: string
          ip_address: string | null
          partner_id: string
          user_agent: string | null
        }
        Insert: {
          consent_type?: string
          granted_at?: string
          horse_id: string
          id?: string
          ip_address?: string | null
          partner_id: string
          user_agent?: string | null
        }
        Update: {
          consent_type?: string
          granted_at?: string
          horse_id?: string
          id?: string
          ip_address?: string | null
          partner_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_data_consents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_data_consents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_data_consents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_data_consents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_documents: {
        Row: {
          appointment_id: string | null
          category: string
          description: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          horse_id: string
          id: string
          partner_id: string
          treatment_note_id: string | null
          uploaded_at: string
          visible_to_kid: boolean
          visible_to_pid: boolean
        }
        Insert: {
          appointment_id?: string | null
          category?: string
          description?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          horse_id: string
          id?: string
          partner_id: string
          treatment_note_id?: string | null
          uploaded_at?: string
          visible_to_kid?: boolean
          visible_to_pid?: boolean
        }
        Update: {
          appointment_id?: string | null
          category?: string
          description?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          horse_id?: string
          id?: string
          partner_id?: string
          treatment_note_id?: string | null
          uploaded_at?: string
          visible_to_kid?: boolean
          visible_to_pid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "partner_documents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "partner_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_documents_treatment_note_id_fkey"
            columns: ["treatment_note_id"]
            isOneToOne: false
            referencedRelation: "partner_treatment_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invoice_items: {
        Row: {
          appointment_id: string | null
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          total: number
          treatment_note_id: string | null
          unit_price: number
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total: number
          treatment_note_id?: string | null
          unit_price: number
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total?: number
          treatment_note_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_invoice_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "partner_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "partner_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoice_items_treatment_note_id_fkey"
            columns: ["treatment_note_id"]
            isOneToOne: false
            referencedRelation: "partner_treatment_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invoice_number_counters: {
        Row: {
          id: string
          last_number: number
          partner_id: string
          updated_at: string
          year: number
        }
        Insert: {
          id?: string
          last_number?: number
          partner_id: string
          updated_at?: string
          year: number
        }
        Update: {
          id?: string
          last_number?: number
          partner_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      partner_invoices: {
        Row: {
          created_at: string
          due_date: string | null
          horse_id: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          partner_id: string
          pdf_url: string | null
          recipient_address: string | null
          recipient_email: string | null
          recipient_name: string
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          horse_id?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          partner_id: string
          pdf_url?: string | null
          recipient_address?: string | null
          recipient_email?: string | null
          recipient_name: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          horse_id?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          partner_id?: string
          pdf_url?: string | null
          recipient_address?: string | null
          recipient_email?: string | null
          recipient_name?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invoices_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "partner_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_recommendations: {
        Row: {
          created_at: string | null
          horse_id: string
          id: string
          owner_id: string
          reason: string | null
          recommended_by: string
          recommended_partner_email: string | null
          recommended_partner_name: string | null
          recommended_partner_type: string
          responded_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          horse_id: string
          id?: string
          owner_id: string
          reason?: string | null
          recommended_by: string
          recommended_partner_email?: string | null
          recommended_partner_name?: string | null
          recommended_partner_type: string
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          horse_id?: string
          id?: string
          owner_id?: string
          reason?: string | null
          recommended_by?: string
          recommended_partner_email?: string | null
          recommended_partner_name?: string | null
          recommended_partner_type?: string
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_recommendations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_recommendations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_recommendations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_recommendations_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_service_price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_price: number | null
          old_price: number | null
          partner_service_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_price?: number | null
          old_price?: number | null
          partner_service_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_price?: number | null
          old_price?: number | null
          partner_service_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_service_price_history_partner_service_id_fkey"
            columns: ["partner_service_id"]
            isOneToOne: false
            referencedRelation: "partner_services"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_services: {
        Row: {
          base_price: number | null
          billing_interval: string | null
          billing_type: string
          bundle_discount_percent: number | null
          bundle_service_ids: string[] | null
          capacity_limit: number | null
          capacity_used: number | null
          category: string | null
          created_at: string
          description: string | null
          digital_asset_url: string | null
          duration: number | null
          early_bird_deadline: string | null
          early_bird_price: number | null
          id: string
          image_url: string | null
          installment_amount: number | null
          installment_count: number | null
          is_active: boolean
          item_type: string
          name: string
          partner_id: string
          session_count: number | null
          sku: string | null
          sort_order: number | null
          stock_quantity: number | null
          tier_config: Json | null
          updated_at: string
          validity_days: number | null
          vat_rate: number | null
        }
        Insert: {
          base_price?: number | null
          billing_interval?: string | null
          billing_type?: string
          bundle_discount_percent?: number | null
          bundle_service_ids?: string[] | null
          capacity_limit?: number | null
          capacity_used?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          digital_asset_url?: string | null
          duration?: number | null
          early_bird_deadline?: string | null
          early_bird_price?: number | null
          id?: string
          image_url?: string | null
          installment_amount?: number | null
          installment_count?: number | null
          is_active?: boolean
          item_type?: string
          name: string
          partner_id: string
          session_count?: number | null
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number | null
          tier_config?: Json | null
          updated_at?: string
          validity_days?: number | null
          vat_rate?: number | null
        }
        Update: {
          base_price?: number | null
          billing_interval?: string | null
          billing_type?: string
          bundle_discount_percent?: number | null
          bundle_service_ids?: string[] | null
          capacity_limit?: number | null
          capacity_used?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          digital_asset_url?: string | null
          duration?: number | null
          early_bird_deadline?: string | null
          early_bird_price?: number | null
          id?: string
          image_url?: string | null
          installment_amount?: number | null
          installment_count?: number | null
          is_active?: boolean
          item_type?: string
          name?: string
          partner_id?: string
          session_count?: number | null
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number | null
          tier_config?: Json | null
          updated_at?: string
          validity_days?: number | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      partner_treatment_notes: {
        Row: {
          body_map_zones: Json | null
          created_at: string | null
          findings: string | null
          horse_id: string
          id: string
          next_check_date: string | null
          next_treatment: string | null
          notes: string | null
          partner_id: string
          partner_type: Database["public"]["Enums"]["partner_type"] | null
          photo_urls: string[] | null
          recommendation_for: Json | null
          recommendation_for_farrier: string | null
          recommendation_for_owner: string | null
          soap_data: Json | null
          template_key: string | null
          title: string
          treatment_category: string | null
          treatment_date: string
          updated_at: string | null
          visible_to_kid: boolean
          visible_to_pid: boolean
        }
        Insert: {
          body_map_zones?: Json | null
          created_at?: string | null
          findings?: string | null
          horse_id: string
          id?: string
          next_check_date?: string | null
          next_treatment?: string | null
          notes?: string | null
          partner_id: string
          partner_type?: Database["public"]["Enums"]["partner_type"] | null
          photo_urls?: string[] | null
          recommendation_for?: Json | null
          recommendation_for_farrier?: string | null
          recommendation_for_owner?: string | null
          soap_data?: Json | null
          template_key?: string | null
          title: string
          treatment_category?: string | null
          treatment_date: string
          updated_at?: string | null
          visible_to_kid?: boolean
          visible_to_pid?: boolean
        }
        Update: {
          body_map_zones?: Json | null
          created_at?: string | null
          findings?: string | null
          horse_id?: string
          id?: string
          next_check_date?: string | null
          next_treatment?: string | null
          notes?: string | null
          partner_id?: string
          partner_type?: Database["public"]["Enums"]["partner_type"] | null
          photo_urls?: string[] | null
          recommendation_for?: Json | null
          recommendation_for_farrier?: string | null
          recommendation_for_owner?: string | null
          soap_data?: Json | null
          template_key?: string | null
          title?: string
          treatment_category?: string | null
          treatment_date?: string
          updated_at?: string | null
          visible_to_kid?: boolean
          visible_to_pid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "partner_treatment_notes_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_treatment_notes_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_treatment_notes_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_treatment_notes_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_treatment_notes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_treatment_notes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_treatment_plans: {
        Row: {
          created_at: string
          description: string | null
          diagnosis: string | null
          end_date: string | null
          goals: string | null
          horse_id: string
          id: string
          partner_id: string
          progress_percent: number | null
          recommended_frequency: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
          visible_to_kid: boolean
          visible_to_pid: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          diagnosis?: string | null
          end_date?: string | null
          goals?: string | null
          horse_id: string
          id?: string
          partner_id: string
          progress_percent?: number | null
          recommended_frequency?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          visible_to_kid?: boolean
          visible_to_pid?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          diagnosis?: string | null
          end_date?: string | null
          goals?: string | null
          horse_id?: string
          id?: string
          partner_id?: string
          progress_percent?: number | null
          recommended_frequency?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          visible_to_kid?: boolean
          visible_to_pid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "partner_treatment_plans_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_treatment_plans_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_treatment_plans_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_treatment_plans_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
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
      performance_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_type: string
          route: string | null
          user_role: string | null
          value_ms: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          route?: string | null
          user_role?: string | null
          value_ms: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          route?: string | null
          user_role?: string | null
          value_ms?: number
        }
        Relationships: []
      }
      pferdeakte_botschafter: {
        Row: {
          bid: string | null
          bio: string | null
          commission_rate: number | null
          company_logo_url: string | null
          company_name: string | null
          company_role: string | null
          converted_at: string | null
          converted_to_role: string | null
          cooperation_types: string[] | null
          copecart_username: string | null
          copecart_verified: boolean | null
          created_at: string | null
          customer_count: string | null
          discount_code: string | null
          email: string
          first_name: string
          gid_type: string | null
          heard_from: string | null
          id: string
          industry: string | null
          last_name: string
          listed_publicly: boolean | null
          motivation: string | null
          onboarding_completed: boolean | null
          phone: string | null
          plz: string | null
          profession: string | null
          profile_image_url: string | null
          public_description: string | null
          public_display_name: string | null
          referral_code: string
          social_handle: string | null
          source_role: string | null
          source_user_id: string | null
          sponsoring_page_published: boolean | null
          status: string | null
          tier: string | null
          total_clicks: number | null
          total_conversions: number | null
          total_earnings_cents: number | null
          total_leads: number | null
          total_paid_out_cents: number | null
          type: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          bid?: string | null
          bio?: string | null
          commission_rate?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          company_role?: string | null
          converted_at?: string | null
          converted_to_role?: string | null
          cooperation_types?: string[] | null
          copecart_username?: string | null
          copecart_verified?: boolean | null
          created_at?: string | null
          customer_count?: string | null
          discount_code?: string | null
          email: string
          first_name: string
          gid_type?: string | null
          heard_from?: string | null
          id?: string
          industry?: string | null
          last_name: string
          listed_publicly?: boolean | null
          motivation?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          plz?: string | null
          profession?: string | null
          profile_image_url?: string | null
          public_description?: string | null
          public_display_name?: string | null
          referral_code: string
          social_handle?: string | null
          source_role?: string | null
          source_user_id?: string | null
          sponsoring_page_published?: boolean | null
          status?: string | null
          tier?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_earnings_cents?: number | null
          total_leads?: number | null
          total_paid_out_cents?: number | null
          type: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          bid?: string | null
          bio?: string | null
          commission_rate?: number | null
          company_logo_url?: string | null
          company_name?: string | null
          company_role?: string | null
          converted_at?: string | null
          converted_to_role?: string | null
          cooperation_types?: string[] | null
          copecart_username?: string | null
          copecart_verified?: boolean | null
          created_at?: string | null
          customer_count?: string | null
          discount_code?: string | null
          email?: string
          first_name?: string
          gid_type?: string | null
          heard_from?: string | null
          id?: string
          industry?: string | null
          last_name?: string
          listed_publicly?: boolean | null
          motivation?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          plz?: string | null
          profession?: string | null
          profile_image_url?: string | null
          public_description?: string | null
          public_display_name?: string | null
          referral_code?: string
          social_handle?: string | null
          source_role?: string | null
          source_user_id?: string | null
          sponsoring_page_published?: boolean | null
          status?: string | null
          tier?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_earnings_cents?: number | null
          total_leads?: number | null
          total_paid_out_cents?: number | null
          type?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      pferdeakte_waitlist: {
        Row: {
          company: string | null
          converted_at: string | null
          created_at: string | null
          email: string
          id: string
          is_partner_interest: boolean | null
          name: string | null
          notified_at: string | null
          partner_type: string | null
          referral_code: string | null
          referred_by: string | null
          role: string
        }
        Insert: {
          company?: string | null
          converted_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_partner_interest?: boolean | null
          name?: string | null
          notified_at?: string | null
          partner_type?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role: string
        }
        Update: {
          company?: string | null
          converted_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_partner_interest?: boolean | null
          name?: string | null
          notified_at?: string | null
          partner_type?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string
        }
        Relationships: []
      }
      platform_succession: {
        Row: {
          authorized_person_email: string | null
          authorized_person_name: string | null
          authorized_person_phone: string | null
          created_at: string
          document_url: string | null
          id: string
          last_will_instructions: string | null
          lawyer_email: string | null
          lawyer_firm: string | null
          lawyer_name: string | null
          lawyer_phone: string | null
          updated_at: string
        }
        Insert: {
          authorized_person_email?: string | null
          authorized_person_name?: string | null
          authorized_person_phone?: string | null
          created_at?: string
          document_url?: string | null
          id?: string
          last_will_instructions?: string | null
          lawyer_email?: string | null
          lawyer_firm?: string | null
          lawyer_name?: string | null
          lawyer_phone?: string | null
          updated_at?: string
        }
        Update: {
          authorized_person_email?: string | null
          authorized_person_name?: string | null
          authorized_person_phone?: string | null
          created_at?: string
          document_url?: string | null
          id?: string
          last_will_instructions?: string | null
          lawyer_email?: string | null
          lawyer_firm?: string | null
          lawyer_name?: string | null
          lawyer_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      portal_applications: {
        Row: {
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          contact_position: string | null
          created_at: string | null
          description: string
          estimated_users: string | null
          expectations: string
          id: string
          newsletter_accepted: boolean | null
          portal_type: string
          preferred_payment: string | null
          privacy_accepted: boolean | null
          referral_source: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          website: string | null
        }
        Insert: {
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          contact_position?: string | null
          created_at?: string | null
          description: string
          estimated_users?: string | null
          expectations: string
          id?: string
          newsletter_accepted?: boolean | null
          portal_type: string
          preferred_payment?: string | null
          privacy_accepted?: boolean | null
          referral_source?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          website?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          contact_position?: string | null
          created_at?: string | null
          description?: string
          estimated_users?: string | null
          expectations?: string
          id?: string
          newsletter_accepted?: boolean | null
          portal_type?: string
          preferred_payment?: string | null
          privacy_accepted?: boolean | null
          referral_source?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      preview_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          preview_link_id: string
          provider_id: string
          rating: number | null
          reviewer_ip: string | null
          reviewer_name: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          preview_link_id: string
          provider_id: string
          rating?: number | null
          reviewer_ip?: string | null
          reviewer_name?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          preview_link_id?: string
          provider_id?: string
          rating?: number | null
          reviewer_ip?: string | null
          reviewer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preview_feedback_preview_link_id_fkey"
            columns: ["preview_link_id"]
            isOneToOne: false
            referencedRelation: "preview_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preview_feedback_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preview_feedback_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preview_links: {
        Row: {
          created_at: string | null
          expires_at: string
          feedback_count: number | null
          id: string
          is_active: boolean | null
          label: string | null
          last_viewed_at: string | null
          link_type: string | null
          provider_id: string
          token: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          feedback_count?: number | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_viewed_at?: string | null
          link_type?: string | null
          provider_id: string
          token: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          feedback_count?: number | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_viewed_at?: string | null
          link_type?: string | null
          provider_id?: string
          token?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "preview_links_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preview_links_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_groups: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          label: string | null
          name: string
          provider_id: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          name: string
          provider_id: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          name?: string
          provider_id?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_groups_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_groups_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
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
          account_status: string | null
          address: string | null
          affiliate_opt_in: boolean | null
          affiliate_slug: string | null
          avatar_url: string | null
          bank_name: string | null
          bic: string | null
          bio: string | null
          business_address: Json | null
          business_capacity: number | null
          business_hours: Json | null
          business_name: string | null
          business_type: string | null
          cancellation_policy: string | null
          city: string | null
          client_status: string | null
          client_type: Database["public"]["Enums"]["client_type"] | null
          company_name: string | null
          copecart_subscription_id: string | null
          country: string | null
          created_at: string
          created_by_partner_id: string | null
          created_by_provider_id: string | null
          currency: string | null
          deleted_at: string | null
          digital_signature_url: string | null
          ecosystem_id: string | null
          education_verified: boolean | null
          email: string | null
          email_preferences: string | null
          emergency_contacts: Json | null
          feature_flags: Json | null
          feature_statuses: Json | null
          first_name: string | null
          force_password_reset: boolean | null
          full_name: string | null
          geo_lat: number | null
          geo_lng: number | null
          has_logged_in: boolean | null
          house_number: string | null
          hufiai_training_consent: boolean | null
          iban: string | null
          ical_token: string | null
          id: string
          image_url: string | null
          invited_at: string | null
          invoice_footer: string | null
          invoice_notes_default: string | null
          is_discoverable: boolean | null
          is_manually_managed: boolean | null
          is_suspended: boolean | null
          is_verified_business: boolean | null
          last_active_at: string | null
          last_name: string | null
          latitude: number | null
          lifecycle_status:
            | Database["public"]["Enums"]["lifecycle_status"]
            | null
          location_name: string | null
          logo_url: string | null
          longitude: number | null
          managing_partner_id: string | null
          mobile: string | null
          notification_language: string | null
          notification_preference: string | null
          onboarding_completed: boolean | null
          onboarding_dismissed: boolean | null
          order_authorization: boolean | null
          org_role: Database["public"]["Enums"]["organization_role"] | null
          organization_id: string | null
          otp_enabled: boolean | null
          owner_name: string | null
          payment_rating: string | null
          permissions_granted: Json | null
          phone: string | null
          phone_landline: string | null
          phone_mobile: string | null
          plan_override: string | null
          preferred_app_theme: string | null
          preferred_currency: string | null
          price_group: string
          price_group_label: string | null
          primary_emergency_email: string | null
          primary_emergency_first_name: string | null
          primary_emergency_last_name: string | null
          primary_emergency_phone: string | null
          primary_emergency_relationship: string | null
          primary_emergency_verified: boolean | null
          primary_emergency_verify_token: string | null
          profession_type: string | null
          readable_id: string | null
          referred_at: string | null
          referred_by_code: string | null
          reliability_score: number | null
          reminder_1h: boolean | null
          reminder_6h: boolean | null
          reminder_evening: boolean | null
          reminder_text: string | null
          role: string | null
          service_radius_km: number | null
          service_types: string[] | null
          show_cooperation_badges: boolean | null
          specializations: string[] | null
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
          tax_model: string | null
          tax_number: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          vat_number: string | null
          vault_failed_attempts: number | null
          vault_locked_until: string | null
          vault_pin: string | null
          vehicle_consumption_per_100km: number | null
          vehicle_name: string | null
          vehicle_plate: string | null
          verification_document_url: string | null
          verification_notes: string | null
          verification_reviewed_at: string | null
          verification_reviewed_by: string | null
          verification_status: string | null
          verification_submitted_at: string | null
          website: string | null
          working_conditions: string | null
          zip_code: string | null
        }
        Insert: {
          access_valid_until?: string | null
          account_status?: string | null
          address?: string | null
          affiliate_opt_in?: boolean | null
          affiliate_slug?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          bic?: string | null
          bio?: string | null
          business_address?: Json | null
          business_capacity?: number | null
          business_hours?: Json | null
          business_name?: string | null
          business_type?: string | null
          cancellation_policy?: string | null
          city?: string | null
          client_status?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company_name?: string | null
          copecart_subscription_id?: string | null
          country?: string | null
          created_at?: string
          created_by_partner_id?: string | null
          created_by_provider_id?: string | null
          currency?: string | null
          deleted_at?: string | null
          digital_signature_url?: string | null
          ecosystem_id?: string | null
          education_verified?: boolean | null
          email?: string | null
          email_preferences?: string | null
          emergency_contacts?: Json | null
          feature_flags?: Json | null
          feature_statuses?: Json | null
          first_name?: string | null
          force_password_reset?: boolean | null
          full_name?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          has_logged_in?: boolean | null
          house_number?: string | null
          hufiai_training_consent?: boolean | null
          iban?: string | null
          ical_token?: string | null
          id: string
          image_url?: string | null
          invited_at?: string | null
          invoice_footer?: string | null
          invoice_notes_default?: string | null
          is_discoverable?: boolean | null
          is_manually_managed?: boolean | null
          is_suspended?: boolean | null
          is_verified_business?: boolean | null
          last_active_at?: string | null
          last_name?: string | null
          latitude?: number | null
          lifecycle_status?:
            | Database["public"]["Enums"]["lifecycle_status"]
            | null
          location_name?: string | null
          logo_url?: string | null
          longitude?: number | null
          managing_partner_id?: string | null
          mobile?: string | null
          notification_language?: string | null
          notification_preference?: string | null
          onboarding_completed?: boolean | null
          onboarding_dismissed?: boolean | null
          order_authorization?: boolean | null
          org_role?: Database["public"]["Enums"]["organization_role"] | null
          organization_id?: string | null
          otp_enabled?: boolean | null
          owner_name?: string | null
          payment_rating?: string | null
          permissions_granted?: Json | null
          phone?: string | null
          phone_landline?: string | null
          phone_mobile?: string | null
          plan_override?: string | null
          preferred_app_theme?: string | null
          preferred_currency?: string | null
          price_group?: string
          price_group_label?: string | null
          primary_emergency_email?: string | null
          primary_emergency_first_name?: string | null
          primary_emergency_last_name?: string | null
          primary_emergency_phone?: string | null
          primary_emergency_relationship?: string | null
          primary_emergency_verified?: boolean | null
          primary_emergency_verify_token?: string | null
          profession_type?: string | null
          readable_id?: string | null
          referred_at?: string | null
          referred_by_code?: string | null
          reliability_score?: number | null
          reminder_1h?: boolean | null
          reminder_6h?: boolean | null
          reminder_evening?: boolean | null
          reminder_text?: string | null
          role?: string | null
          service_radius_km?: number | null
          service_types?: string[] | null
          show_cooperation_badges?: boolean | null
          specializations?: string[] | null
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
          tax_model?: string | null
          tax_number?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          vat_number?: string | null
          vault_failed_attempts?: number | null
          vault_locked_until?: string | null
          vault_pin?: string | null
          vehicle_consumption_per_100km?: number | null
          vehicle_name?: string | null
          vehicle_plate?: string | null
          verification_document_url?: string | null
          verification_notes?: string | null
          verification_reviewed_at?: string | null
          verification_reviewed_by?: string | null
          verification_status?: string | null
          verification_submitted_at?: string | null
          website?: string | null
          working_conditions?: string | null
          zip_code?: string | null
        }
        Update: {
          access_valid_until?: string | null
          account_status?: string | null
          address?: string | null
          affiliate_opt_in?: boolean | null
          affiliate_slug?: string | null
          avatar_url?: string | null
          bank_name?: string | null
          bic?: string | null
          bio?: string | null
          business_address?: Json | null
          business_capacity?: number | null
          business_hours?: Json | null
          business_name?: string | null
          business_type?: string | null
          cancellation_policy?: string | null
          city?: string | null
          client_status?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company_name?: string | null
          copecart_subscription_id?: string | null
          country?: string | null
          created_at?: string
          created_by_partner_id?: string | null
          created_by_provider_id?: string | null
          currency?: string | null
          deleted_at?: string | null
          digital_signature_url?: string | null
          ecosystem_id?: string | null
          education_verified?: boolean | null
          email?: string | null
          email_preferences?: string | null
          emergency_contacts?: Json | null
          feature_flags?: Json | null
          feature_statuses?: Json | null
          first_name?: string | null
          force_password_reset?: boolean | null
          full_name?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          has_logged_in?: boolean | null
          house_number?: string | null
          hufiai_training_consent?: boolean | null
          iban?: string | null
          ical_token?: string | null
          id?: string
          image_url?: string | null
          invited_at?: string | null
          invoice_footer?: string | null
          invoice_notes_default?: string | null
          is_discoverable?: boolean | null
          is_manually_managed?: boolean | null
          is_suspended?: boolean | null
          is_verified_business?: boolean | null
          last_active_at?: string | null
          last_name?: string | null
          latitude?: number | null
          lifecycle_status?:
            | Database["public"]["Enums"]["lifecycle_status"]
            | null
          location_name?: string | null
          logo_url?: string | null
          longitude?: number | null
          managing_partner_id?: string | null
          mobile?: string | null
          notification_language?: string | null
          notification_preference?: string | null
          onboarding_completed?: boolean | null
          onboarding_dismissed?: boolean | null
          order_authorization?: boolean | null
          org_role?: Database["public"]["Enums"]["organization_role"] | null
          organization_id?: string | null
          otp_enabled?: boolean | null
          owner_name?: string | null
          payment_rating?: string | null
          permissions_granted?: Json | null
          phone?: string | null
          phone_landline?: string | null
          phone_mobile?: string | null
          plan_override?: string | null
          preferred_app_theme?: string | null
          preferred_currency?: string | null
          price_group?: string
          price_group_label?: string | null
          primary_emergency_email?: string | null
          primary_emergency_first_name?: string | null
          primary_emergency_last_name?: string | null
          primary_emergency_phone?: string | null
          primary_emergency_relationship?: string | null
          primary_emergency_verified?: boolean | null
          primary_emergency_verify_token?: string | null
          profession_type?: string | null
          readable_id?: string | null
          referred_at?: string | null
          referred_by_code?: string | null
          reliability_score?: number | null
          reminder_1h?: boolean | null
          reminder_6h?: boolean | null
          reminder_evening?: boolean | null
          reminder_text?: string | null
          role?: string | null
          service_radius_km?: number | null
          service_types?: string[] | null
          show_cooperation_badges?: boolean | null
          specializations?: string[] | null
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
          tax_model?: string | null
          tax_number?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          vat_number?: string | null
          vault_failed_attempts?: number | null
          vault_locked_until?: string | null
          vault_pin?: string | null
          vehicle_consumption_per_100km?: number | null
          vehicle_name?: string | null
          vehicle_plate?: string | null
          verification_document_url?: string | null
          verification_notes?: string | null
          verification_reviewed_at?: string | null
          verification_reviewed_by?: string | null
          verification_status?: string | null
          verification_submitted_at?: string | null
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
      provider_blog_posts: {
        Row: {
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          is_published: boolean
          owner_id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean
          owner_id: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          is_published?: boolean
          owner_id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_certifications: {
        Row: {
          certificate_title: string
          certificate_url: string | null
          course_id: string | null
          created_at: string | null
          id: string
          is_public: boolean | null
          issued_at: string | null
          issuer_name: string | null
          provider_id: string | null
          school_id: string | null
          valid_until: string | null
          verified: boolean | null
        }
        Insert: {
          certificate_title: string
          certificate_url?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          issued_at?: string | null
          issuer_name?: string | null
          provider_id?: string | null
          school_id?: string | null
          valid_until?: string | null
          verified?: boolean | null
        }
        Update: {
          certificate_title?: string
          certificate_url?: string | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          issued_at?: string | null
          issuer_name?: string | null
          provider_id?: string | null
          school_id?: string | null
          valid_until?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_certifications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "education_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_certifications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_certifications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_certifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "education_schools"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_contracts: {
        Row: {
          avv_signed_at: string | null
          avv_version: string | null
          created_at: string
          id: string
          ip_address: string | null
          privacy_accepted_at: string | null
          provider_id: string
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          avv_signed_at?: string | null
          avv_version?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          privacy_accepted_at?: string | null
          provider_id: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          avv_signed_at?: string | null
          avv_version?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          privacy_accepted_at?: string | null
          provider_id?: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_contracts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_contracts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_cooperations: {
        Row: {
          cooperation_id: string | null
          id: string
          joined_at: string | null
          provider_id: string | null
          status: string | null
        }
        Insert: {
          cooperation_id?: string | null
          id?: string
          joined_at?: string | null
          provider_id?: string | null
          status?: string | null
        }
        Update: {
          cooperation_id?: string | null
          id?: string
          joined_at?: string | null
          provider_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_cooperations_cooperation_id_fkey"
            columns: ["cooperation_id"]
            isOneToOne: false
            referencedRelation: "cooperation_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_cooperations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_cooperations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
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
            referencedRelation: "appointments_partner_view"
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
      provider_faqs: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          is_active: boolean | null
          provider_id: string
          question: string
          sort_order: number | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_id: string
          question: string
          sort_order?: number | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_id?: string
          question?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_faqs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_faqs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_page_views: {
        Row: {
          created_at: string | null
          id: string
          page: string
          provider_id: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          page?: string
          provider_id?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          page?: string
          provider_id?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_page_views_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_page_views_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
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
      provider_subscriptions: {
        Row: {
          billing_cycle: string | null
          cancelled_at: string | null
          created_at: string | null
          external_subscription_id: string | null
          id: string
          next_billing_date: string | null
          notes: string | null
          payment_method: string | null
          plan_name: string
          plan_price: number | null
          provider_id: string
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          external_subscription_id?: string | null
          id?: string
          next_billing_date?: string | null
          notes?: string | null
          payment_method?: string | null
          plan_name: string
          plan_price?: number | null
          provider_id: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          external_subscription_id?: string | null
          id?: string
          next_billing_date?: string | null
          notes?: string | null
          payment_method?: string | null
          plan_name?: string
          plan_price?: number | null
          provider_id?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_subscriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_subscriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_timeline_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_type: string
          icon: string | null
          id: string
          is_auto: boolean | null
          metadata: Json | null
          provider_id: string
          title: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_type: string
          icon?: string | null
          id?: string
          is_auto?: boolean | null
          metadata?: Json | null
          provider_id: string
          title: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_type?: string
          icon?: string | null
          id?: string
          is_auto?: boolean | null
          metadata?: Json | null
          provider_id?: string
          title?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_timeline_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_timeline_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_vehicles: {
        Row: {
          assigned_employee_id: string | null
          average_consumption: number | null
          brand: string | null
          color: string | null
          created_at: string
          current_odometer: number | null
          fuel_type: string | null
          has_trailer: boolean | null
          id: string
          initial_odometer: number | null
          insurance_company: string | null
          insurance_expiry: string | null
          insurance_policy_number: string | null
          is_primary: boolean | null
          license_plate: string | null
          model: string | null
          name: string | null
          notes: string | null
          photo_url: string | null
          price_per_km: number | null
          provider_id: string
          status: string | null
          tax_yearly: number | null
          trailer_height_cm: number | null
          trailer_length_cm: number | null
          trailer_weight_kg: number | null
          travel_cost_flat: number | null
          tuev_date: string | null
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          assigned_employee_id?: string | null
          average_consumption?: number | null
          brand?: string | null
          color?: string | null
          created_at?: string
          current_odometer?: number | null
          fuel_type?: string | null
          has_trailer?: boolean | null
          id?: string
          initial_odometer?: number | null
          insurance_company?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          is_primary?: boolean | null
          license_plate?: string | null
          model?: string | null
          name?: string | null
          notes?: string | null
          photo_url?: string | null
          price_per_km?: number | null
          provider_id: string
          status?: string | null
          tax_yearly?: number | null
          trailer_height_cm?: number | null
          trailer_length_cm?: number | null
          trailer_weight_kg?: number | null
          travel_cost_flat?: number | null
          tuev_date?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          assigned_employee_id?: string | null
          average_consumption?: number | null
          brand?: string | null
          color?: string | null
          created_at?: string
          current_odometer?: number | null
          fuel_type?: string | null
          has_trailer?: boolean | null
          id?: string
          initial_odometer?: number | null
          insurance_company?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          is_primary?: boolean | null
          license_plate?: string | null
          model?: string | null
          name?: string | null
          notes?: string | null
          photo_url?: string | null
          price_per_km?: number | null
          provider_id?: string
          status?: string | null
          tax_yearly?: number | null
          trailer_height_cm?: number | null
          trailer_length_cm?: number | null
          trailer_weight_kg?: number | null
          travel_cost_flat?: number | null
          tuev_date?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_vehicles_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_statistics: {
        Row: {
          data: Json
          generated_at: string | null
          horse_count: number | null
          id: string
          is_published: boolean | null
          period: string
          provider_count: number | null
        }
        Insert: {
          data: Json
          generated_at?: string | null
          horse_count?: number | null
          id?: string
          is_published?: boolean | null
          period: string
          provider_count?: number | null
        }
        Update: {
          data?: Json
          generated_at?: string | null
          horse_count?: number | null
          id?: string
          is_published?: boolean | null
          period?: string
          provider_count?: number | null
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
      release_history: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          breaking_changes: string | null
          changelog: string | null
          created_at: string
          deployed_at: string | null
          deployed_by: string | null
          id: string
          instance: string
          release_type: string
          rollback_notes: string | null
          rolled_back_at: string | null
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          breaking_changes?: string | null
          changelog?: string | null
          created_at?: string
          deployed_at?: string | null
          deployed_by?: string | null
          id?: string
          instance?: string
          release_type?: string
          rollback_notes?: string | null
          rolled_back_at?: string | null
          status?: string
          updated_at?: string
          version: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          breaking_changes?: string | null
          changelog?: string | null
          created_at?: string
          deployed_at?: string | null
          deployed_by?: string | null
          id?: string
          instance?: string
          release_type?: string
          rollback_notes?: string | null
          rolled_back_at?: string | null
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "review_reactions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "safe_reviews"
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
      school_cases: {
        Row: {
          course_id: string
          created_at: string | null
          due_date: string | null
          horse_id: string | null
          id: string
          instructions: string
          is_exam: boolean | null
          max_score: number | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          due_date?: string | null
          horse_id?: string | null
          id?: string
          instructions: string
          is_exam?: boolean | null
          max_score?: number | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          due_date?: string | null
          horse_id?: string | null
          id?: string
          instructions?: string
          is_exam?: boolean | null
          max_score?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_cases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "school_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_cases_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_cases_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_cases_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_cases_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      school_courses: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          instructor_id: string | null
          max_students: number | null
          name: string
          org_id: string
          start_date: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          instructor_id?: string | null
          max_students?: number | null
          name: string
          org_id: string
          start_date?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          instructor_id?: string | null
          max_students?: number | null
          name?: string
          org_id?: string
          start_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_courses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_submissions: {
        Row: {
          case_id: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          case_id: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          case_id?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_submissions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "school_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          client_id: string
          client_signature_url: string | null
          client_signed: boolean | null
          client_signed_at: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          document_urls: string[] | null
          estimated_price: number | null
          horse_id: string | null
          id: string
          notes: string | null
          order_number: string | null
          order_status: string | null
          partner_id: string | null
          provider_id: string | null
          provider_signature_url: string | null
          provider_signed: boolean | null
          provider_signed_at: string | null
          provider_type: string | null
          service_date: string | null
          service_description: string
          terms_accepted_client: boolean | null
          terms_accepted_provider: boolean | null
          terms_version: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          client_signature_url?: string | null
          client_signed?: boolean | null
          client_signed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          document_urls?: string[] | null
          estimated_price?: number | null
          horse_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          order_status?: string | null
          partner_id?: string | null
          provider_id?: string | null
          provider_signature_url?: string | null
          provider_signed?: boolean | null
          provider_signed_at?: string | null
          provider_type?: string | null
          service_date?: string | null
          service_description: string
          terms_accepted_client?: boolean | null
          terms_accepted_provider?: boolean | null
          terms_version?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          client_signature_url?: string | null
          client_signed?: boolean | null
          client_signed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          document_urls?: string[] | null
          estimated_price?: number | null
          horse_id?: string | null
          id?: string
          notes?: string | null
          order_number?: string | null
          order_status?: string | null
          partner_id?: string | null
          provider_id?: string | null
          provider_signature_url?: string | null
          provider_signed?: boolean | null
          provider_signed_at?: string | null
          provider_type?: string | null
          service_date?: string | null
          service_description?: string
          terms_accepted_client?: boolean | null
          terms_accepted_provider?: boolean | null
          terms_version?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_billing_type: Database["public"]["Enums"]["billing_type"] | null
          new_price: number | null
          old_billing_type: Database["public"]["Enums"]["billing_type"] | null
          old_price: number | null
          reason: string | null
          service_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_billing_type?: Database["public"]["Enums"]["billing_type"] | null
          new_price?: number | null
          old_billing_type?: Database["public"]["Enums"]["billing_type"] | null
          old_price?: number | null
          reason?: string | null
          service_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_billing_type?: Database["public"]["Enums"]["billing_type"] | null
          new_price?: number | null
          old_billing_type?: Database["public"]["Enums"]["billing_type"] | null
          old_price?: number | null
          reason?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_price_history_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_price_overrides: {
        Row: {
          created_at: string
          id: string
          price: number
          price_group: string
          provider_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          price_group: string
          provider_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          price_group?: string
          provider_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_price_overrides_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_time_presets: {
        Row: {
          buffer_minutes: number
          color_hex: string
          created_at: string
          estimated_minutes: number
          id: string
          provider_id: string
          service_type: string
          updated_at: string
        }
        Insert: {
          buffer_minutes?: number
          color_hex?: string
          created_at?: string
          estimated_minutes?: number
          id?: string
          provider_id: string
          service_type: string
          updated_at?: string
        }
        Update: {
          buffer_minutes?: number
          color_hex?: string
          created_at?: string
          estimated_minutes?: number
          id?: string
          provider_id?: string
          service_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          base_price: number
          billing_interval: string | null
          billing_type: Database["public"]["Enums"]["billing_type"]
          booking_action: string
          bundle_discount_percent: number | null
          bundle_service_ids: string[] | null
          capacity_limit: number | null
          capacity_used: number | null
          category: string
          created_at: string
          description: string | null
          digital_asset_url: string | null
          duration: number | null
          early_bird_deadline: string | null
          early_bird_price: number | null
          id: string
          image_url: string | null
          installment_amount: number | null
          installment_count: number | null
          is_active: boolean | null
          is_group_service: boolean | null
          item_type: string
          name: string
          provider_id: string
          session_count: number | null
          sku: string | null
          sort_order: number | null
          stock_quantity: number | null
          tier_config: Json | null
          updated_at: string
          use_group_pricing: boolean | null
          validity_days: number | null
          vat_rate: number | null
        }
        Insert: {
          base_price?: number
          billing_interval?: string | null
          billing_type?: Database["public"]["Enums"]["billing_type"]
          booking_action?: string
          bundle_discount_percent?: number | null
          bundle_service_ids?: string[] | null
          capacity_limit?: number | null
          capacity_used?: number | null
          category?: string
          created_at?: string
          description?: string | null
          digital_asset_url?: string | null
          duration?: number | null
          early_bird_deadline?: string | null
          early_bird_price?: number | null
          id?: string
          image_url?: string | null
          installment_amount?: number | null
          installment_count?: number | null
          is_active?: boolean | null
          is_group_service?: boolean | null
          item_type?: string
          name: string
          provider_id: string
          session_count?: number | null
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number | null
          tier_config?: Json | null
          updated_at?: string
          use_group_pricing?: boolean | null
          validity_days?: number | null
          vat_rate?: number | null
        }
        Update: {
          base_price?: number
          billing_interval?: string | null
          billing_type?: Database["public"]["Enums"]["billing_type"]
          booking_action?: string
          bundle_discount_percent?: number | null
          bundle_service_ids?: string[] | null
          capacity_limit?: number | null
          capacity_used?: number | null
          category?: string
          created_at?: string
          description?: string | null
          digital_asset_url?: string | null
          duration?: number | null
          early_bird_deadline?: string | null
          early_bird_price?: number | null
          id?: string
          image_url?: string | null
          installment_amount?: number | null
          installment_count?: number | null
          is_active?: boolean | null
          is_group_service?: boolean | null
          item_type?: string
          name?: string
          provider_id?: string
          session_count?: number | null
          sku?: string | null
          sort_order?: number | null
          stock_quantity?: number | null
          tier_config?: Json | null
          updated_at?: string
          use_group_pricing?: boolean | null
          validity_days?: number | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      stall_board_comments: {
        Row: {
          author_id: string
          created_at: string | null
          deleted_at: string | null
          display_name: string
          id: string
          post_id: string
          text: string
        }
        Insert: {
          author_id: string
          created_at?: string | null
          deleted_at?: string | null
          display_name: string
          id?: string
          post_id: string
          text: string
        }
        Update: {
          author_id?: string
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string
          id?: string
          post_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "stall_board_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stall_board_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stall_board_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "stall_board_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      stall_board_posts: {
        Row: {
          author_id: string
          category: string
          created_at: string | null
          deleted_at: string | null
          display_name: string
          id: string
          photo_url: string | null
          provider_id: string
          text: string
        }
        Insert: {
          author_id: string
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          display_name: string
          id?: string
          photo_url?: string | null
          provider_id: string
          text: string
        }
        Update: {
          author_id?: string
          category?: string
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string
          id?: string
          photo_url?: string | null
          provider_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "stall_board_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stall_board_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          includes: string[] | null
          interval_weeks: number | null
          is_active: boolean | null
          max_horses: number | null
          name: string
          price_monthly: number
          provider_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          includes?: string[] | null
          interval_weeks?: number | null
          is_active?: boolean | null
          max_horses?: number | null
          name: string
          price_monthly: number
          provider_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          includes?: string[] | null
          interval_weeks?: number | null
          is_active?: boolean | null
          max_horses?: number | null
          name?: string
          price_monthly?: number
          provider_id?: string
        }
        Relationships: []
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
      surcharge_rules: {
        Row: {
          amount: number
          calculation_type: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          name: string | null
          provider_id: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          calculation_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          name?: string | null
          provider_id: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          calculation_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          name?: string | null
          provider_id?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_alert_rules: {
        Row: {
          alert_level: number
          alert_name: string
          condition_type: string
          created_at: string
          id: string
          is_active: boolean
          notification_channels: string[]
          threshold_value: number | null
          updated_at: string
        }
        Insert: {
          alert_level: number
          alert_name: string
          condition_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          notification_channels?: string[]
          threshold_value?: number | null
          updated_at?: string
        }
        Update: {
          alert_level?: number
          alert_name?: string
          condition_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notification_channels?: string[]
          threshold_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_level: number
          alert_name: string
          channels_notified: string[] | null
          created_at: string
          details: Json | null
          id: string
          message: string
          resolved_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_level: number
          alert_name: string
          channels_notified?: string[] | null
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          resolved_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_level?: number
          alert_name?: string
          channels_notified?: string[] | null
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "safe_provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_anomaly_baselines: {
        Row: {
          baseline_value: number
          id: string
          last_measured_at: string | null
          metric_name: string
          threshold_multiplier: number
          updated_at: string
        }
        Insert: {
          baseline_value?: number
          id?: string
          last_measured_at?: string | null
          metric_name: string
          threshold_multiplier?: number
          updated_at?: string
        }
        Update: {
          baseline_value?: number
          id?: string
          last_measured_at?: string | null
          metric_name?: string
          threshold_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_error_log: {
        Row: {
          auto_fixed: boolean
          component: string | null
          created_at: string
          error_message: string
          error_type: string
          fix_description: string | null
          id: string
          resolved_at: string | null
          route: string | null
          severity: string
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          auto_fixed?: boolean
          component?: string | null
          created_at?: string
          error_message: string
          error_type: string
          fix_description?: string | null
          id?: string
          resolved_at?: string | null
          route?: string | null
          severity?: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          auto_fixed?: boolean
          component?: string | null
          created_at?: string
          error_message?: string
          error_type?: string
          fix_description?: string | null
          id?: string
          resolved_at?: string | null
          route?: string | null
          severity?: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_health_checks: {
        Row: {
          auto_fixed: boolean
          check_category: string
          check_duration_ms: number | null
          check_name: string
          created_at: string
          details: Json | null
          fix_applied: string | null
          health_score: number | null
          id: string
          status: string
        }
        Insert: {
          auto_fixed?: boolean
          check_category: string
          check_duration_ms?: number | null
          check_name: string
          created_at?: string
          details?: Json | null
          fix_applied?: string | null
          health_score?: number | null
          id?: string
          status?: string
        }
        Update: {
          auto_fixed?: boolean
          check_category?: string
          check_duration_ms?: number | null
          check_name?: string
          created_at?: string
          details?: Json | null
          fix_applied?: string | null
          health_score?: number | null
          id?: string
          status?: string
        }
        Relationships: []
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
      system_status_messages: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          message: string
          resolved_at: string | null
          severity: string
          show_banner: boolean
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message: string
          resolved_at?: string | null
          severity?: string
          show_banner?: boolean
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          message?: string
          resolved_at?: string | null
          severity?: string
          show_banner?: boolean
          title?: string
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
            referencedRelation: "appointments_partner_view"
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
      vault_access_log: {
        Row: {
          accessed_at: string
          admin_user_id: string
          documents_viewed: string[]
          horse_id: string
          id: string
          owner_id: string
          reason: string
        }
        Insert: {
          accessed_at?: string
          admin_user_id: string
          documents_viewed?: string[]
          horse_id: string
          id?: string
          owner_id: string
          reason: string
        }
        Update: {
          accessed_at?: string
          admin_user_id?: string
          documents_viewed?: string[]
          horse_id?: string
          id?: string
          owner_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_access_log_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_access_log_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_access_log_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_access_log_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_documents: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          horse_id: string
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          horse_id: string
          id?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          horse_id?: string
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_documents_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "safe_horses"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_costs: {
        Row: {
          amount: number
          cost_type: string
          created_at: string
          date: string
          description: string | null
          fuel_station: string | null
          id: string
          is_full_tank: boolean | null
          liters: number | null
          mileage_at_cost: number | null
          price_per_liter: number | null
          provider_id: string
          receipt_url: string | null
          recorded_by: string | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          amount: number
          cost_type: string
          created_at?: string
          date?: string
          description?: string | null
          fuel_station?: string | null
          id?: string
          is_full_tank?: boolean | null
          liters?: number | null
          mileage_at_cost?: number | null
          price_per_liter?: number | null
          provider_id: string
          receipt_url?: string | null
          recorded_by?: string | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          amount?: number
          cost_type?: string
          created_at?: string
          date?: string
          description?: string | null
          fuel_station?: string | null
          id?: string
          is_full_tank?: boolean | null
          liters?: number | null
          mileage_at_cost?: number | null
          price_per_liter?: number | null
          provider_id?: string
          receipt_url?: string | null
          recorded_by?: string | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_costs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "provider_vehicles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "appointments_partner_view"
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
      vet_profiles: {
        Row: {
          accepts_new_patients: boolean | null
          address_city: string | null
          address_country: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          clinic_name: string | null
          clinic_type: string | null
          created_at: string | null
          description: string | null
          display_name: string
          email: string | null
          emergency_service: boolean | null
          id: string
          is_public: boolean | null
          is_verified: boolean | null
          languages: string[] | null
          latitude: number | null
          longitude: number | null
          opening_hours: Json | null
          organization_id: string | null
          phone: string | null
          photo_url: string | null
          plan: string | null
          pms_software: string | null
          specializations: string[] | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          accepts_new_patients?: boolean | null
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          clinic_name?: string | null
          clinic_type?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          email?: string | null
          emergency_service?: boolean | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          latitude?: number | null
          longitude?: number | null
          opening_hours?: Json | null
          organization_id?: string | null
          phone?: string | null
          photo_url?: string | null
          plan?: string | null
          pms_software?: string | null
          specializations?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          accepts_new_patients?: boolean | null
          address_city?: string | null
          address_country?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          clinic_name?: string | null
          clinic_type?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          email?: string | null
          emergency_service?: boolean | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          latitude?: number | null
          longitude?: number | null
          opening_hours?: Json | null
          organization_id?: string | null
          phone?: string | null
          photo_url?: string | null
          plan?: string | null
          pms_software?: string | null
          specializations?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vet_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_sync_connections: {
        Row: {
          auto_sync: boolean | null
          clinic_url: string | null
          connection_name: string | null
          created_at: string | null
          credentials_encrypted: string | null
          error_message: string | null
          external_clinic_id: string | null
          id: string
          last_sync_at: string | null
          next_sync_at: string | null
          oauth_access_token: string | null
          oauth_expires_at: string | null
          oauth_refresh_token: string | null
          pms_type: string | null
          provider_type: string
          status: string | null
          sync_config: Json | null
          sync_interval_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_sync?: boolean | null
          clinic_url?: string | null
          connection_name?: string | null
          created_at?: string | null
          credentials_encrypted?: string | null
          error_message?: string | null
          external_clinic_id?: string | null
          id?: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          oauth_access_token?: string | null
          oauth_expires_at?: string | null
          oauth_refresh_token?: string | null
          pms_type?: string | null
          provider_type: string
          status?: string | null
          sync_config?: Json | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_sync?: boolean | null
          clinic_url?: string | null
          connection_name?: string | null
          created_at?: string | null
          credentials_encrypted?: string | null
          error_message?: string | null
          external_clinic_id?: string | null
          id?: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          oauth_access_token?: string | null
          oauth_expires_at?: string | null
          oauth_refresh_token?: string | null
          pms_type?: string | null
          provider_type?: string
          status?: string | null
          sync_config?: Json | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vet_sync_log: {
        Row: {
          completed_at: string | null
          connection_id: string
          details: Json | null
          error_message: string | null
          id: string
          records_failed: number | null
          records_synced: number | null
          started_at: string | null
          status: string | null
          sync_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          details?: Json | null
          error_message?: string | null
          id?: string
          records_failed?: number | null
          records_synced?: number | null
          started_at?: string | null
          status?: string | null
          sync_type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          records_failed?: number | null
          records_synced?: number | null
          started_at?: string | null
          status?: string | null
          sync_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_sync_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "vet_sync_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      website_leads: {
        Row: {
          breed: string | null
          contact_name: string
          created_at: string
          dsgvo_consent: boolean
          email: string | null
          hoof_condition: string | null
          horse_age: string | null
          horse_name: string | null
          id: string
          notes: string | null
          owner_id: string
          phone: string | null
          plz: string | null
          preferred_timeframe: string | null
          referral_source: string | null
          service_interest: string | null
          source: string | null
          status: string
          updated_at: string
          urgency: number | null
        }
        Insert: {
          breed?: string | null
          contact_name: string
          created_at?: string
          dsgvo_consent?: boolean
          email?: string | null
          hoof_condition?: string | null
          horse_age?: string | null
          horse_name?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          plz?: string | null
          preferred_timeframe?: string | null
          referral_source?: string | null
          service_interest?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          urgency?: number | null
        }
        Update: {
          breed?: string | null
          contact_name?: string
          created_at?: string
          dsgvo_consent?: boolean
          email?: string | null
          hoof_condition?: string | null
          horse_age?: string | null
          horse_name?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          plz?: string | null
          preferred_timeframe?: string | null
          referral_source?: string | null
          service_interest?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          urgency?: number | null
        }
        Relationships: []
      }
      website_pages: {
        Row: {
          content_json: Json | null
          created_at: string
          id: string
          is_published: boolean
          owner_id: string
          owner_type: string
          page_type: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content_json?: Json | null
          created_at?: string
          id?: string
          is_published?: boolean
          owner_id: string
          owner_type?: string
          page_type?: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content_json?: Json | null
          created_at?: string
          id?: string
          is_published?: boolean
          owner_id?: string
          owner_type?: string
          page_type?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "appointments_partner_view"
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_sessions_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
      appointments_partner_view: {
        Row: {
          date: string | null
          duration: number | null
          horse_id: string | null
          id: string | null
          is_confirmed_by_client: boolean | null
          location: string | null
          notes: string | null
          price: number | null
          provider_id: string | null
          service_type: string | null
          status: string | null
          time: string | null
        }
        Insert: {
          date?: string | null
          duration?: number | null
          horse_id?: string | null
          id?: string | null
          is_confirmed_by_client?: boolean | null
          location?: string | null
          notes?: string | null
          price?: number | null
          provider_id?: string | null
          service_type?: string | null
          status?: string | null
          time?: string | null
        }
        Update: {
          date?: string | null
          duration?: number | null
          horse_id?: string | null
          id?: string | null
          is_confirmed_by_client?: boolean | null
          location?: string | null
          notes?: string | null
          price?: number | null
          provider_id?: string | null
          service_type?: string | null
          status?: string | null
          time?: string | null
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
      horses_basic: {
        Row: {
          anamnesis_interval_months: number | null
          app_source: string | null
          birth_date: string | null
          birth_year: number | null
          breed: string | null
          chip_number: string | null
          color: string | null
          created_at: string | null
          deleted_at: string | null
          discipline: string | null
          equine_type: string | null
          gender: string | null
          height: string | null
          height_cm: number | null
          holding_type: string | null
          hoof_data: Json | null
          hoof_details: Json | null
          hoof_measurements: Json | null
          hoof_protection: string | null
          hoof_type: string | null
          housing: string | null
          id: string | null
          is_new_horse: boolean | null
          last_anamnesis_date: string | null
          last_appointment_date: string | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          name: string | null
          next_appointment_due: string | null
          nickname: string | null
          official_name: string | null
          organization_id: string | null
          owner_id: string | null
          photo_url: string | null
          primary_location_id: string | null
          readable_id: string | null
          recall_interval_weeks: number | null
          shoeing_interval: number | null
          shoeing_status: string | null
          stable_address_gps: Json | null
          updated_at: string | null
          usage: string | null
          usage_type: Database["public"]["Enums"]["usage_type"] | null
        }
        Insert: {
          anamnesis_interval_months?: number | null
          app_source?: string | null
          birth_date?: string | null
          birth_year?: number | null
          breed?: string | null
          chip_number?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          discipline?: string | null
          equine_type?: string | null
          gender?: string | null
          height?: string | null
          height_cm?: number | null
          holding_type?: string | null
          hoof_data?: Json | null
          hoof_details?: Json | null
          hoof_measurements?: Json | null
          hoof_protection?: string | null
          hoof_type?: string | null
          housing?: string | null
          id?: string | null
          is_new_horse?: boolean | null
          last_anamnesis_date?: string | null
          last_appointment_date?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          name?: string | null
          next_appointment_due?: string | null
          nickname?: string | null
          official_name?: string | null
          organization_id?: string | null
          owner_id?: string | null
          photo_url?: string | null
          primary_location_id?: string | null
          readable_id?: string | null
          recall_interval_weeks?: number | null
          shoeing_interval?: number | null
          shoeing_status?: string | null
          stable_address_gps?: Json | null
          updated_at?: string | null
          usage?: string | null
          usage_type?: Database["public"]["Enums"]["usage_type"] | null
        }
        Update: {
          anamnesis_interval_months?: number | null
          app_source?: string | null
          birth_date?: string | null
          birth_year?: number | null
          breed?: string | null
          chip_number?: string | null
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          discipline?: string | null
          equine_type?: string | null
          gender?: string | null
          height?: string | null
          height_cm?: number | null
          holding_type?: string | null
          hoof_data?: Json | null
          hoof_details?: Json | null
          hoof_measurements?: Json | null
          hoof_protection?: string | null
          hoof_type?: string | null
          housing?: string | null
          id?: string | null
          is_new_horse?: boolean | null
          last_anamnesis_date?: string | null
          last_appointment_date?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          name?: string | null
          next_appointment_due?: string | null
          nickname?: string | null
          official_name?: string | null
          organization_id?: string | null
          owner_id?: string | null
          photo_url?: string | null
          primary_location_id?: string | null
          readable_id?: string | null
          recall_interval_weeks?: number | null
          shoeing_interval?: number | null
          shoeing_status?: string | null
          stable_address_gps?: Json | null
          updated_at?: string | null
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
          {
            foreignKeyName: "horses_primary_location_id_fkey"
            columns: ["primary_location_id"]
            isOneToOne: false
            referencedRelation: "client_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      horses_medical: {
        Row: {
          breed: string | null
          contacts: Json | null
          documents_urls: string[] | null
          feeding_notes: string | null
          health_issues_general: string | null
          health_status: string | null
          id: string | null
          medical_history: string | null
          name: string | null
          owner_id: string | null
          photo_url: string | null
          readable_id: string | null
          special_notes: string | null
        }
        Insert: {
          breed?: string | null
          contacts?: Json | null
          documents_urls?: string[] | null
          feeding_notes?: string | null
          health_issues_general?: string | null
          health_status?: string | null
          id?: string | null
          medical_history?: string | null
          name?: string | null
          owner_id?: string | null
          photo_url?: string | null
          readable_id?: string | null
          special_notes?: string | null
        }
        Update: {
          breed?: string | null
          contacts?: Json | null
          documents_urls?: string[] | null
          feeding_notes?: string | null
          health_issues_general?: string | null
          health_status?: string | null
          id?: string | null
          medical_history?: string | null
          name?: string | null
          owner_id?: string | null
          photo_url?: string | null
          readable_id?: string | null
          special_notes?: string | null
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
      invoices_client_view: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string | null
          created_at: string | null
          credit_note_for: string | null
          customer_type: string | null
          due_date: string | null
          horse_id: string | null
          id: string | null
          invoice_number: string | null
          issue_date: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          pdf_url: string | null
          provider_id: string | null
          signature_url: string | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          created_at?: string | null
          credit_note_for?: string | null
          customer_type?: string | null
          due_date?: string | null
          horse_id?: string | null
          id?: string | null
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          provider_id?: string | null
          signature_url?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string | null
          created_at?: string | null
          credit_note_for?: string | null
          customer_type?: string | null
          due_date?: string | null
          horse_id?: string | null
          id?: string | null
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          provider_id?: string | null
          signature_url?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
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
            foreignKeyName: "invoices_credit_note_for_fkey"
            columns: ["credit_note_for"]
            isOneToOne: false
            referencedRelation: "invoices_client_view"
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
            referencedRelation: "horses_basic"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_horse_id_fkey"
            columns: ["horse_id"]
            isOneToOne: false
            referencedRelation: "horses_medical"
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
      safe_feedbacks: {
        Row: {
          created_at: string | null
          customer_name: string | null
          id: string | null
          is_featured: boolean | null
          provider_id: string | null
          rating: number | null
          source: string | null
          text: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          id?: string | null
          is_featured?: boolean | null
          provider_id?: string | null
          rating?: number | null
          source?: string | null
          text?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          id?: string | null
          is_featured?: boolean | null
          provider_id?: string | null
          rating?: number | null
          source?: string | null
          text?: string | null
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
      safe_reviews: {
        Row: {
          category: string | null
          created_at: string | null
          id: string | null
          is_approved: boolean | null
          is_visible: boolean | null
          proof_image_url: string | null
          provider_id: string | null
          rating: number | null
          reactions: Json | null
          reviewer_name: string | null
          source: string | null
          text: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          is_approved?: boolean | null
          is_visible?: boolean | null
          proof_image_url?: string | null
          provider_id?: string | null
          rating?: number | null
          reactions?: Json | null
          reviewer_name?: string | null
          source?: string | null
          text?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string | null
          is_approved?: boolean | null
          is_visible?: boolean | null
          proof_image_url?: string | null
          provider_id?: string | null
          rating?: number | null
          reactions?: Json | null
          reviewer_name?: string | null
          source?: string | null
          text?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_partner_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: Json
      }
      admin_repair_user_role: {
        Args: {
          p_admin_id: string
          p_new_role: string
          p_reason?: string
          p_user_id: string
        }
        Returns: Json
      }
      auth_user_email: { Args: never; Returns: string }
      calculate_effective_price: {
        Args: { _client_id: string; _provider_id: string; _service_id: string }
        Returns: number
      }
      can_submit_review: {
        Args: { p_provider_id: string; p_token?: string }
        Returns: boolean
      }
      check_provider_profile_update_allowed: {
        Args: {
          _new_force_password_reset: boolean
          _new_is_suspended: boolean
          _new_subscription_plan: string
          _new_subscription_status: string
          _profile_id: string
        }
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
      create_default_service_presets: {
        Args: { _profession_type: string; _provider_id: string }
        Returns: undefined
      }
      create_emergency_otp: {
        Args: { _client_id: string; _provider_id: string }
        Returns: string
      }
      delete_client_cascade: {
        Args: { _client_id: string }
        Returns: undefined
      }
      delete_employee_account: {
        Args: { _employee_user_id: string }
        Returns: undefined
      }
      delete_horse_safe: { Args: { _horse_id: string }; Returns: undefined }
      delete_provider_cascade: {
        Args: { _provider_id: string }
        Returns: undefined
      }
      generate_invoice_number: {
        Args: { p_provider_id: string }
        Returns: string
      }
      generate_partner_invoice_number: {
        Args: { p_partner_id: string }
        Returns: string
      }
      generate_preview_token: { Args: never; Returns: string }
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
      get_admin_auth_metadata: {
        Args: never
        Returns: {
          email_confirmed_at: string
          last_sign_in_at: string
          user_id: string
        }[]
      }
      get_agent_data_hub: {
        Args: never
        Returns: {
          eqid: string
          gps_daten: string
          kid: string
          kunden_name: string
          kunden_telefon: string
          pferdename: string
          pid: string
          profi_name: string
          stall_name: string
          termin_datum: string
          termin_zeit: string
        }[]
      }
      get_demo_user_ids: { Args: never; Returns: string[] }
      get_employee_profile_id: { Args: { _user_id: string }; Returns: string }
      get_health_score_trend: {
        Args: { days_back?: number }
        Returns: {
          avg_score: number
          check_date: string
          critical_count: number
          total_checks: number
          warning_count: number
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
      get_owner_horse_ids: { Args: { _owner_id: string }; Returns: string[] }
      get_partner_invitation: { Args: { p_token: string }; Returns: Json }
      get_partner_shared_data: {
        Args: { p_partner_email: string }
        Returns: Json
      }
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
      get_provider_clients: {
        Args: { _provider_id: string }
        Returns: {
          client_email: string
          client_id: string
          client_name: string
          client_readable_id: string
        }[]
      }
      get_public_business_landing: {
        Args: { subdomain_input: string }
        Returns: Json
      }
      get_public_faqs: {
        Args: { provider_id_input: string }
        Returns: {
          answer: string
          id: string
          question: string
          sort_order: number
        }[]
      }
      get_public_feedbacks: {
        Args: { provider_id_input: string }
        Returns: {
          customer_name: string
          id: string
          is_featured: boolean
          rating: number
          text: string
        }[]
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
      get_public_partner_profile: {
        Args: { p_partner_id: string }
        Returns: Json
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
      has_active_access_grant: {
        Args: { _client_id: string; _provider_id: string }
        Returns: boolean
      }
      has_active_horse_partner_access: {
        Args: { _horse_id: string; _user_id: string }
        Returns: boolean
      }
      has_horse_chat_access: {
        Args: { p_horse_id: string; p_user_id: string }
        Returns: boolean
      }
      has_horse_partner_access: {
        Args: { _horse_id: string; _partner_id: string }
        Returns: boolean
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
      is_employee_of_provider: {
        Args: { _provider_id: string; _user_id: string }
        Returns: boolean
      }
      is_horse_owner: {
        Args: { _horse_id: string; _user_id: string }
        Returns: boolean
      }
      is_master_admin: { Args: never; Returns: boolean }
      is_org_admin:
        | { Args: { _user_id: string }; Returns: boolean }
        | { Args: { _org_id: string; _user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_provider_for_horse: {
        Args: { _horse_id: string; _provider_id: string }
        Returns: boolean
      }
      is_team_lead_for_provider: {
        Args: { _provider_id: string; _user_id: string }
        Returns: boolean
      }
      log_emergency_action: {
        Args: {
          _action_type: string
          _actor_id: string
          _details?: Json
          _target_kid: string
        }
        Returns: string
      }
      provider_can_manage_client_horses: {
        Args: { _client_id: string; _provider_id: string }
        Returns: boolean
      }
      run_health_fix: { Args: { fix_type: string }; Returns: Json }
      search_horse_by_readable_id: {
        Args: { search_id: string }
        Returns: Json
      }
      search_profile_by_readable_id: {
        Args: { search_id: string }
        Returns: Json
      }
      search_profiles_universal: {
        Args: { search_limit?: number; search_term: string }
        Returns: Json
      }
      sync_affiliate_stats: {
        Args: { p_provider_id: string }
        Returns: undefined
      }
      validate_magic_link: { Args: { slug_input: string }; Returns: Json }
    }
    Enums: {
      app_role: "provider" | "client" | "admin" | "employee" | "partner"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "canceled_by_client"
        | "canceled_by_provider"
        | "no_show"
      billing_type:
        | "standard"
        | "flat_rate"
        | "series"
        | "subscription"
        | "installment"
        | "hourly"
        | "session_card"
        | "tiered"
        | "early_bird"
        | "free"
      client_type: "private" | "commercial"
      contact_category: "client" | "partner" | "supplier" | "lead"
      employee_role: "view" | "employee" | "team_lead"
      employee_status: "active" | "sick" | "vacation" | "suspended" | "inactive"
      employment_type: "employee" | "contractor"
      equine_type: "horse" | "pony" | "donkey" | "mule" | "zebra"
      feature_status: "disabled" | "beta" | "early_access" | "public"
      help_article_role_access: "all" | "pid_only" | "kid_only"
      holding_type: "box" | "open_stable" | "mixed" | "pasture"
      lifecycle_status: "new" | "active" | "archive"
      organization_role: "admin" | "employee"
      partner_type:
        | "tierarzt"
        | "physiotherapeut"
        | "osteopath"
        | "chiropraktiker"
        | "reitlehrer"
        | "trainer"
        | "sattler"
        | "huforthopaedie"
        | "zahnarzt"
        | "ernaehrungsberater"
        | "other"
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
      app_role: ["provider", "client", "admin", "employee", "partner"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "canceled_by_client",
        "canceled_by_provider",
        "no_show",
      ],
      billing_type: [
        "standard",
        "flat_rate",
        "series",
        "subscription",
        "installment",
        "hourly",
        "session_card",
        "tiered",
        "early_bird",
        "free",
      ],
      client_type: ["private", "commercial"],
      contact_category: ["client", "partner", "supplier", "lead"],
      employee_role: ["view", "employee", "team_lead"],
      employee_status: ["active", "sick", "vacation", "suspended", "inactive"],
      employment_type: ["employee", "contractor"],
      equine_type: ["horse", "pony", "donkey", "mule", "zebra"],
      feature_status: ["disabled", "beta", "early_access", "public"],
      help_article_role_access: ["all", "pid_only", "kid_only"],
      holding_type: ["box", "open_stable", "mixed", "pasture"],
      lifecycle_status: ["new", "active", "archive"],
      organization_role: ["admin", "employee"],
      partner_type: [
        "tierarzt",
        "physiotherapeut",
        "osteopath",
        "chiropraktiker",
        "reitlehrer",
        "trainer",
        "sattler",
        "huforthopaedie",
        "zahnarzt",
        "ernaehrungsberater",
        "other",
      ],
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
