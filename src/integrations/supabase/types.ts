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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      bitcoin_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          is_active: boolean
          private_key_encrypted: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_active?: boolean
          private_key_encrypted: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_active?: boolean
          private_key_encrypted?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bitcoin_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bulk_discounts: {
        Row: {
          created_at: string | null
          discount_percentage: number
          id: string
          min_quantity: number
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_percentage: number
          id?: string
          min_quantity: number
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number
          id?: string
          min_quantity?: number
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_discounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          category: string
          created_at: string
          id: string
          image_url: string | null
          price: number
          product_id: string
          quantity: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          image_url?: string | null
          price: number
          product_id: string
          quantity?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          price?: number
          product_id?: string
          quantity?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          conversation_id: string
          created_at: string
          delivered_at: string | null
          id: string
          is_read: boolean
          message: string
          message_type: string
          read_at: string | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          message_type?: string
          read_at?: string | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          message_type?: string
          read_at?: string | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string | null
          order_id: string | null
          product_id: string
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          order_id?: string | null
          product_id: string
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          order_id?: string | null
          product_id?: string
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_purchases: {
        Row: {
          completed_at: string | null
          created_at: string
          credits_amount: number
          crypto_amount: number | null
          crypto_currency: string | null
          eur_amount: number
          id: string
          payment_id: string | null
          payment_provider: string
          payment_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          credits_amount: number
          crypto_amount?: number | null
          crypto_currency?: string | null
          eur_amount: number
          id?: string
          payment_id?: string | null
          payment_provider?: string
          payment_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          credits_amount?: number
          crypto_amount?: number | null
          crypto_currency?: string | null
          eur_amount?: number
          id?: string
          payment_id?: string | null
          payment_provider?: string
          payment_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          related_order_id: string | null
          related_purchase_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          related_order_id?: string | null
          related_purchase_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          related_order_id?: string | null
          related_purchase_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_related_purchase_id_fkey"
            columns: ["related_purchase_id"]
            isOneToOne: false
            referencedRelation: "credit_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          address: string
          confirmations: number
          created_at: string
          crypto_amount: number
          currency: string
          expires_at: string
          fingerprint: number
          id: string
          rate_locked: number
          requested_eur: number
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          confirmations?: number
          created_at?: string
          crypto_amount: number
          currency: string
          expires_at: string
          fingerprint: number
          id?: string
          rate_locked: number
          requested_eur: number
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          confirmations?: number
          created_at?: string
          crypto_amount?: number
          currency?: string
          expires_at?: string
          fingerprint?: number
          id?: string
          rate_locked?: number
          requested_eur?: number
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dispute_messages: {
        Row: {
          created_at: string | null
          dispute_id: string
          id: string
          is_admin: boolean | null
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          dispute_id: string
          id?: string
          is_admin?: boolean | null
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          dispute_id?: string
          id?: string
          is_admin?: boolean | null
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_assigned: string | null
          created_at: string | null
          defendant_id: string
          evidence_files: string[] | null
          id: string
          order_id: string
          plaintiff_id: string
          priority: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_assigned?: string | null
          created_at?: string | null
          defendant_id: string
          evidence_files?: string[] | null
          id?: string
          order_id: string
          plaintiff_id: string
          priority?: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_assigned?: string | null
          created_at?: string | null
          defendant_id?: string
          evidence_files?: string[] | null
          id?: string
          order_id?: string
          plaintiff_id?: string
          priority?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_codes: {
        Row: {
          code: string
          created_at: string
          date_of_birth: string
          email: string
          expires_at: string
          id: string
          is_email_registration: boolean
          password_hash: string
          username: string
          verification_type: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          date_of_birth: string
          email: string
          expires_at?: string
          id?: string
          is_email_registration?: boolean
          password_hash: string
          username: string
          verification_type?: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          date_of_birth?: string
          email?: string
          expires_at?: string
          id?: string
          is_email_registration?: boolean
          password_hash?: string
          username?: string
          verification_type?: string
          verified?: boolean
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
      news: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_addon_selections: {
        Row: {
          addon_id: string
          addon_name: string
          created_at: string
          custom_value: string | null
          id: string
          order_id: string
          order_item_id: string
          price_eur: number
        }
        Insert: {
          addon_id: string
          addon_name: string
          created_at?: string
          custom_value?: string | null
          id?: string
          order_id: string
          order_item_id: string
          price_eur: number
        }
        Update: {
          addon_id?: string
          addon_name?: string
          created_at?: string
          custom_value?: string | null
          id?: string
          order_id?: string
          order_item_id?: string
          price_eur?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_eur: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_eur: number
          product_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_eur?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          fansign_image_url: string | null
          fansign_uploaded_at: string | null
          id: string
          order_status: Database["public"]["Enums"]["order_status"] | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_first_name: string | null
          shipping_house_number: string | null
          shipping_last_name: string | null
          shipping_postal_code: string | null
          shipping_street: string | null
          status: string
          status_updated_at: string | null
          status_updated_by: string | null
          total_amount_eur: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fansign_image_url?: string | null
          fansign_uploaded_at?: string | null
          id?: string
          order_status?: Database["public"]["Enums"]["order_status"] | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_first_name?: string | null
          shipping_house_number?: string | null
          shipping_last_name?: string | null
          shipping_postal_code?: string | null
          shipping_street?: string | null
          status?: string
          status_updated_at?: string | null
          status_updated_by?: string | null
          total_amount_eur: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fansign_image_url?: string | null
          fansign_uploaded_at?: string | null
          id?: string
          order_status?: Database["public"]["Enums"]["order_status"] | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_first_name?: string | null
          shipping_house_number?: string | null
          shipping_last_name?: string | null
          shipping_postal_code?: string | null
          shipping_street?: string | null
          status?: string
          status_updated_at?: string | null
          status_updated_by?: string | null
          total_amount_eur?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      product_addons: {
        Row: {
          addon_type: string
          created_at: string
          id: string
          is_required: boolean
          name: string
          price_eur: number
          product_id: string
          updated_at: string
        }
        Insert: {
          addon_type?: string
          created_at?: string
          id?: string
          is_required?: boolean
          name: string
          price_eur?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          addon_type?: string
          created_at?: string
          id?: string
          is_required?: boolean
          name?: string
          price_eur?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          image_url: string
          product_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          id?: string
          image_url: string
          product_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          image_url?: string
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          price: number
          requires_verification: boolean
          seller_id: string
          stock: number
          title: string
          updated_at: string
          visibility_level: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price: number
          requires_verification?: boolean
          seller_id: string
          stock?: number
          title: string
          updated_at?: string
          visibility_level?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          requires_verification?: boolean
          seller_id?: string
          stock?: number
          title?: string
          updated_at?: string
          visibility_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          id: string
          is_verified: boolean
          role: Database["public"]["Enums"]["user_role"]
          theme_preference: string | null
          updated_at: string
          user_id: string
          username: string
          verification_level: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          id?: string
          is_verified?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          theme_preference?: string | null
          updated_at?: string
          user_id: string
          username: string
          verification_level?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          id?: string
          is_verified?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
          username?: string
          verification_level?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          completed_at: string | null
          created_at: string
          credits_awarded: number
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          credits_awarded?: number
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          credits_awarded?: number
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "referral_rewards_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          reviewer_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          reviewer_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          reviewer_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_ratings: {
        Row: {
          average_rating: number
          id: string
          seller_id: string
          total_rating_points: number
          total_reviews: number
          updated_at: string
        }
        Insert: {
          average_rating?: number
          id?: string
          seller_id: string
          total_rating_points?: number
          total_reviews?: number
          updated_at?: string
        }
        Update: {
          average_rating?: number
          id?: string
          seller_id?: string
          total_rating_points?: number
          total_reviews?: number
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_btc: number
          amount_eur: number
          btc_confirmations: number | null
          btc_tx_hash: string | null
          confirmed_at: string | null
          created_at: string
          description: string | null
          from_username: string | null
          id: string
          related_order_id: string | null
          status: string
          to_username: string | null
          transaction_direction: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount_btc?: number
          amount_eur: number
          btc_confirmations?: number | null
          btc_tx_hash?: string | null
          confirmed_at?: string | null
          created_at?: string
          description?: string | null
          from_username?: string | null
          id?: string
          related_order_id?: string | null
          status?: string
          to_username?: string | null
          transaction_direction?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount_btc?: number
          amount_eur?: number
          btc_confirmations?: number | null
          btc_tx_hash?: string | null
          confirmed_at?: string | null
          created_at?: string
          description?: string | null
          from_username?: string | null
          id?: string
          related_order_id?: string | null
          status?: string
          to_username?: string | null
          transaction_direction?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          address: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          private_key_encrypted: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          currency: string
          id?: string
          is_active?: boolean
          private_key_encrypted?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          private_key_encrypted?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          created_at: string
          id: string
          is_online: boolean
          last_seen: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_verifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
          verification_data: Json | null
          verification_type: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          verification_data?: Json | null
          verification_type: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          verification_data?: Json | null
          verification_type?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      wallet_balances: {
        Row: {
          balance_btc: number
          balance_btc_deposited: number
          balance_credits: number
          balance_eth: number
          balance_eth_deposited: number
          balance_eur: number
          balance_ltc: number
          balance_ltc_deposited: number
          balance_xmr: number
          balance_xmr_deposited: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_btc?: number
          balance_btc_deposited?: number
          balance_credits?: number
          balance_eth?: number
          balance_eth_deposited?: number
          balance_eur?: number
          balance_ltc?: number
          balance_ltc_deposited?: number
          balance_xmr?: number
          balance_xmr_deposited?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_btc?: number
          balance_btc_deposited?: number
          balance_credits?: number
          balance_eth?: number
          balance_eth_deposited?: number
          balance_eur?: number
          balance_ltc?: number
          balance_ltc_deposited?: number
          balance_xmr?: number
          balance_xmr_deposited?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wallet_security: {
        Row: {
          created_at: string
          id: string
          last_withdrawal_at: string | null
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
          withdrawal_limit_daily_eur: number
          withdrawal_limit_monthly_eur: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_withdrawal_at?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
          withdrawal_limit_daily_eur?: number
          withdrawal_limit_monthly_eur?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_withdrawal_at?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
          withdrawal_limit_daily_eur?: number
          withdrawal_limit_monthly_eur?: number
        }
        Relationships: []
      }
      withdrawal_fees: {
        Row: {
          base_fee_eur: number
          created_at: string
          currency: string
          id: string
          min_amount_eur: number
          network_fee_crypto: number
          percentage_fee: number
          updated_at: string
        }
        Insert: {
          base_fee_eur?: number
          created_at?: string
          currency: string
          id?: string
          min_amount_eur?: number
          network_fee_crypto?: number
          percentage_fee?: number
          updated_at?: string
        }
        Update: {
          base_fee_eur?: number
          created_at?: string
          currency?: string
          id?: string
          min_amount_eur?: number
          network_fee_crypto?: number
          percentage_fee?: number
          updated_at?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount_crypto: number
          amount_eur: number
          created_at: string
          currency: string
          destination_address: string
          fee_eur: number
          id: string
          notes: string | null
          processed_at: string | null
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_crypto: number
          amount_eur: number
          created_at?: string
          currency: string
          destination_address: string
          fee_eur?: number
          id?: string
          notes?: string | null
          processed_at?: string | null
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_crypto?: number
          amount_eur?: number
          created_at?: string
          currency?: string
          destination_address?: string
          fee_eur?: number
          id?: string
          notes?: string | null
          processed_at?: string | null
          status?: string
          tx_hash?: string | null
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
      check_withdrawal_limits: {
        Args: { amount_eur: number; user_uuid: string }
        Returns: boolean
      }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      cleanup_old_referral_codes: {
        Args: never
        Returns: {
          deleted_count: number
          user_id: string
        }[]
      }
      close_conversation: {
        Args: { conversation_uuid: string }
        Returns: boolean
      }
      close_deposit_request: { Args: { request_id: string }; Returns: boolean }
      get_or_create_wallet_balance: {
        Args: { user_uuid: string }
        Returns: {
          balance_btc: number
          balance_eur: number
          balance_ltc: number
        }[]
      }
      get_seller_orders: {
        Args: { seller_uuid: string }
        Returns: {
          buyer_username: string
          created_at: string
          id: string
          items: Json
          shipping_city: string
          shipping_country: string
          shipping_first_name: string
          shipping_house_number: string
          shipping_last_name: string
          shipping_postal_code: string
          shipping_street: string
          status: string
          total_amount_eur: number
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_user_verified: { Args: { user_uuid: string }; Returns: boolean }
      make_user_admin: { Args: { user_email: string }; Returns: undefined }
      revoke_user_verification: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      update_order_status: {
        Args: {
          new_status: Database["public"]["Enums"]["order_status"]
          order_uuid: string
          tracking_link?: string
          tracking_num?: string
        }
        Returns: boolean
      }
      verify_user: {
        Args: { target_user_id: string; verification_level_param?: string }
        Returns: boolean
      }
    }
    Enums: {
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      product_category:
        | "electronics"
        | "clothing"
        | "books"
        | "home"
        | "sports"
        | "other"
      user_role: "user" | "seller" | "admin"
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
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      product_category: [
        "electronics",
        "clothing",
        "books",
        "home",
        "sports",
        "other",
      ],
      user_role: ["user", "seller", "admin"],
    },
  },
} as const
