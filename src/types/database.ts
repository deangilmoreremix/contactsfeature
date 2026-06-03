export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          name: string;
          email: string;
          phone: string | null;
          title: string;
          company: string;
          industry: string | null;
          avatar_src: string;
          sources: string[];
          interest_level: string;
          status: string;
          last_connected: string | null;
          notes: string | null;
          ai_score: number | null;
          tags: string[];
          is_favorite: boolean;
          social_profiles: Json;
          custom_fields: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          name: string;
          email: string;
          phone?: string | null;
          title: string;
          company: string;
          industry?: string | null;
          avatar_src: string;
          sources?: string[];
          interest_level?: string;
          status?: string;
          last_connected?: string | null;
          notes?: string | null;
          ai_score?: number | null;
          tags?: string[];
          is_favorite?: boolean;
          social_profiles?: Json;
          custom_fields?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          title?: string;
          company?: string;
          industry?: string | null;
          avatar_src?: string;
          sources?: string[];
          interest_level?: string;
          status?: string;
          last_connected?: string | null;
          notes?: string | null;
          ai_score?: number | null;
          tags?: string[];
          is_favorite?: boolean;
          social_profiles?: Json;
          custom_fields?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      custom_field_definitions: {
        Row: {
          id: string;
          name: string;
          label: string;
          field_type: string;
          options: Json | null;
          is_required: boolean;
          default_value: Json | null;
          display_order: number;
          is_active: boolean;
          description: string | null;
          placeholder: string | null;
          user_id: string;
          workspace_id: string;
          created_at: string;
          updated_at: string;
        };
      };
      custom_field_values: {
        Row: {
          id: string;
          contact_id: string;
          field_id: string;
          value: Json | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
      };
      contact_attachments: {
        Row: {
          id: string;
          contact_id: string;
          file_name: string;
          file_path: string;
          file_size: number | null;
          mime_type: string | null;
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
      };
      contact_timeline: {
        Row: {
          id: string;
          contact_id: string;
          activity_type: string;
          description: string;
          metadata: Json | null;
          user_name: string | null;
          created_at: string;
        };
      };
    };
  };
}
