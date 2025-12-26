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
      admin_fee_addresses: {
        Row: {
          address: string
          admin_user_id: string
          balance: number
          created_at: string
          currency: string
          id: string
          private_key_encrypted: string | null
          updated_at: string
        }
        Insert: {
          address: string
          admin_user_id?: string
          balance?: number
          created_at?: string
          currency: string
          id?: string
          private_key_encrypted?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          admin_user_id?: string
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          private_key_encrypted?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_fee_transactions: {
        Row: {
          amount_crypto: number
          amount_eur: number
          created_at: string
          currency: string
          destination_address: string | null
          escrow_holding_id: string | null
          id: string
          order_id: string
          status: string
          transaction_type: string
          tx_hash: string | null
        }
        Insert: {
          amount_crypto: number
          amount_eur: number
          created_at?: string
          currency: string
          destination_address?: string | null
          escrow_holding_id?: string | null
          id?: string
          order_id: string
          status?: string
          transaction_type?: string
          tx_hash?: string | null
        }
        Update: {
          amount_crypto?: number
          amount_eur?: number
          created_at?: string
          currency?: string
          destination_address?: string | null
          escrow_holding_id?: string | null
          id?: string
          order_id?: string
          status?: string
          transaction_type?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_fee_transactions_escrow_holding_id_fkey"
            columns: ["escrow_holding_id"]
            isOneToOne: false
            referencedRelation: "escrow_holdings"
            referencedColumns: ["id"]
          },
        ]
      }
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
      blocked_ips: {
        Row: {
          blocked_at: string
          blocked_until: string | null
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_until?: string | null
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_until?: string | null
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
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
          product_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_type?: string
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
      credit_withdrawals: {
        Row: {
          created_at: string
          credits_amount: number
          crypto_amount: number
          crypto_currency: string
          destination_address: string
          eur_amount: number
          fee_eur: number
          id: string
          status: string
          tx_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_amount: number
          crypto_amount: number
          crypto_currency: string
          destination_address: string
          eur_amount: number
          fee_eur?: number
          id?: string
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_amount?: number
          crypto_amount?: number
          crypto_currency?: string
          destination_address?: string
          eur_amount?: number
          fee_eur?: number
          id?: string
          status?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      escrow_holdings: {
        Row: {
          amount_crypto: number
          amount_eur: number
          auto_release_at: string
          blockchain_fee_satoshi: number | null
          blockchain_tx_hash: string | null
          blockchain_tx_status: string | null
          buyer_id: string
          created_at: string
          currency: string
          fee_amount_crypto: number
          fee_amount_eur: number
          id: string
          order_id: string
          released_at: string | null
          seller_amount_crypto: number
          seller_amount_eur: number
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_crypto: number
          amount_eur: number
          auto_release_at: string
          blockchain_fee_satoshi?: number | null
          blockchain_tx_hash?: string | null
          blockchain_tx_status?: string | null
          buyer_id: string
          created_at?: string
          currency: string
          fee_amount_crypto: number
          fee_amount_eur: number
          id?: string
          order_id: string
          released_at?: string | null
          seller_amount_crypto: number
          seller_amount_eur: number
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_crypto?: number
          amount_eur?: number
          auto_release_at?: string
          blockchain_fee_satoshi?: number | null
          blockchain_tx_hash?: string | null
          blockchain_tx_status?: string | null
          buyer_id?: string
          created_at?: string
          currency?: string
          fee_amount_crypto?: number
          fee_amount_eur?: number
          id?: string
          order_id?: string
          released_at?: string | null
          seller_amount_crypto?: number
          seller_amount_eur?: number
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_holdings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      forum_awards: {
        Row: {
          cost_credits: number | null
          created_at: string | null
          description: string | null
          icon: string
          id: string
          name: string
        }
        Insert: {
          cost_credits?: number | null
          created_at?: string | null
          description?: string | null
          icon: string
          id?: string
          name: string
        }
        Update: {
          cost_credits?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      forum_comment_votes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
          vote_type: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          downvotes: number | null
          id: string
          is_deleted: boolean | null
          parent_id: string | null
          post_id: string
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          downvotes?: number | null
          id?: string
          is_deleted?: boolean | null
          parent_id?: string | null
          post_id: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          downvotes?: number | null
          id?: string
          is_deleted?: boolean | null
          parent_id?: string | null
          post_id?: string
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_post_awards: {
        Row: {
          award_id: string
          created_at: string | null
          giver_id: string
          id: string
          post_id: string
        }
        Insert: {
          award_id: string
          created_at?: string | null
          giver_id: string
          id?: string
          post_id: string
        }
        Update: {
          award_id?: string
          created_at?: string | null
          giver_id?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_post_awards_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "forum_awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_post_awards_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_post_views: {
        Row: {
          id: string
          post_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_post_votes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          category_id: string
          comment_count: number | null
          content: string
          created_at: string | null
          downvotes: number | null
          flair: string | null
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          linked_product_id: string | null
          title: string
          updated_at: string | null
          upvotes: number | null
          view_count: number | null
        }
        Insert: {
          author_id: string
          category_id: string
          comment_count?: number | null
          content: string
          created_at?: string | null
          downvotes?: number | null
          flair?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          linked_product_id?: string | null
          title: string
          updated_at?: string | null
          upvotes?: number | null
          view_count?: number | null
        }
        Update: {
          author_id?: string
          category_id?: string
          comment_count?: number | null
          content?: string
          created_at?: string | null
          downvotes?: number | null
          flair?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          linked_product_id?: string | null
          title?: string
          updated_at?: string | null
          upvotes?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_linked_product_id_fkey"
            columns: ["linked_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_saved_posts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_user_karma: {
        Row: {
          comment_karma: number | null
          created_at: string | null
          id: string
          post_karma: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_karma?: number | null
          created_at?: string | null
          id?: string
          post_karma?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_karma?: number | null
          created_at?: string | null
          id?: string
          post_karma?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_address: string
          success: boolean
          username: string | null
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_address: string
          success?: boolean
          username?: string | null
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_address?: string
          success?: boolean
          username?: string | null
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
          digital_content: string | null
          digital_content_delivered_at: string | null
          digital_content_files: string[] | null
          digital_content_images: string[] | null
          id: string
          order_id: string
          price_eur: number
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          digital_content?: string | null
          digital_content_delivered_at?: string | null
          digital_content_files?: string[] | null
          digital_content_images?: string[] | null
          id?: string
          order_id: string
          price_eur: number
          product_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          digital_content?: string | null
          digital_content_delivered_at?: string | null
          digital_content_files?: string[] | null
          digital_content_images?: string[] | null
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
          auto_release_at: string | null
          buyer_confirmed_at: string | null
          buyer_notes: string | null
          buyer_notes_images: string[] | null
          created_at: string
          escrow_status: string | null
          fansign_image_url: string | null
          fansign_uploaded_at: string | null
          id: string
          order_status: Database["public"]["Enums"]["order_status"] | null
          payment_currency: string | null
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
          auto_release_at?: string | null
          buyer_confirmed_at?: string | null
          buyer_notes?: string | null
          buyer_notes_images?: string[] | null
          created_at?: string
          escrow_status?: string | null
          fansign_image_url?: string | null
          fansign_uploaded_at?: string | null
          id?: string
          order_status?: Database["public"]["Enums"]["order_status"] | null
          payment_currency?: string | null
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
          auto_release_at?: string | null
          buyer_confirmed_at?: string | null
          buyer_notes?: string | null
          buyer_notes_images?: string[] | null
          created_at?: string
          escrow_status?: string | null
          fansign_image_url?: string | null
          fansign_uploaded_at?: string | null
          id?: string
          order_status?: Database["public"]["Enums"]["order_status"] | null
          payment_currency?: string | null
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
      page_visits: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          device_type: string | null
          id: string
          ip_address: string
          is_suspicious: boolean | null
          os: string | null
          page: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          visited_at: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address: string
          is_suspicious?: boolean | null
          os?: string | null
          page?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visited_at?: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string
          is_suspicious?: boolean | null
          os?: string | null
          page?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visited_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
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
          digital_content: string | null
          fansign_delivery_days: string
          id: string
          image_url: string | null
          is_active: boolean
          price: number
          product_type: string
          requires_verification: boolean
          seller_id: string
          stock: number
          subcategory_id: string | null
          title: string
          updated_at: string
          visibility_level: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          digital_content?: string | null
          fansign_delivery_days?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price: number
          product_type?: string
          requires_verification?: boolean
          seller_id: string
          stock?: number
          subcategory_id?: string | null
          title: string
          updated_at?: string
          visibility_level?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          digital_content?: string | null
          fansign_delivery_days?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          product_type?: string
          requires_verification?: boolean
          seller_id?: string
          stock?: number
          subcategory_id?: string | null
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
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          id: string
          is_verified: boolean
          profile_picture_url: string | null
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
          profile_picture_url?: string | null
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
          profile_picture_url?: string | null
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
      report_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean | null
          message: string
          report_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean | null
          message: string
          report_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean | null
          message?: string
          report_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_messages_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "seller_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          product_id: string | null
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
          product_id?: string | null
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
          product_id?: string | null
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
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      seller_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          custom_note: string | null
          evidence_image_url: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          reason: string
          reported_seller_id: string
          reporter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          custom_note?: string | null
          evidence_image_url?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason: string
          reported_seller_id: string
          reporter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          custom_note?: string | null
          evidence_image_url?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason?: string
          reported_seller_id?: string
          reporter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          product_type: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          product_type?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          product_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
          buyer_notes: string
          buyer_notes_images: string[]
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
      get_user_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_moderator_or_admin: { Args: { user_uuid: string }; Returns: boolean }
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
      app_role: "admin" | "moderator" | "seller" | "user"
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
      app_role: ["admin", "moderator", "seller", "user"],
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
