export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activity_events: {
        Row: {
          activity_type: string;
          client_event_id: string;
          count: number;
          created_at: string | null;
          event_id: string;
          id: string;
          lat: number | null;
          lng: number | null;
          notes: string | null;
          occurred_at: string;
          person_id: string | null;
          team_id: string;
          user_id: string;
        };
        Insert: {
          activity_type: string;
          client_event_id: string;
          count?: number;
          created_at?: string | null;
          event_id: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          notes?: string | null;
          occurred_at: string;
          person_id?: string | null;
          team_id: string;
          user_id: string;
        };
        Update: {
          activity_type?: string;
          client_event_id?: string;
          count?: number;
          created_at?: string | null;
          event_id?: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          notes?: string | null;
          occurred_at?: string;
          person_id?: string | null;
          team_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_events_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_events_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_events_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people_reached";
            referencedColumns: ["id"];
          },
        ];
      };
      consent_logs: {
        Row: {
          collected_at: string;
          collected_by: string;
          consent_level: number;
          id: string;
          person_id: string;
          text_shown: string;
        };
        Insert: {
          collected_at?: string;
          collected_by: string;
          consent_level: number;
          id?: string;
          person_id: string;
          text_shown: string;
        };
        Update: {
          collected_at?: string;
          collected_by?: string;
          consent_level?: number;
          id?: string;
          person_id?: string;
          text_shown?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consent_logs_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people_reached";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "consent_logs_collected_by_fkey";
            columns: ["collected_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          created_at: string | null;
          end_date: string;
          id: string;
          name: string;
          region: string;
          start_date: string;
        };
        Insert: {
          created_at?: string | null;
          end_date: string;
          id?: string;
          name: string;
          region: string;
          start_date: string;
        };
        Update: {
          created_at?: string | null;
          end_date?: string;
          id?: string;
          name?: string;
          region?: string;
          start_date?: string;
        };
        Relationships: [];
      };
      follow_ups: {
        Row: {
          assigned_to: string | null;
          created_at: string | null;
          id: string;
          last_contact_at: string | null;
          notes: string | null;
          person_id: string;
          status: string;
        };
        Insert: {
          assigned_to?: string | null;
          created_at?: string | null;
          id?: string;
          last_contact_at?: string | null;
          notes?: string | null;
          person_id: string;
          status?: string;
        };
        Update: {
          assigned_to?: string | null;
          created_at?: string | null;
          id?: string;
          last_contact_at?: string | null;
          notes?: string | null;
          person_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_ups_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people_reached";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_ups_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      people_reached: {
        Row: {
          address: string | null;
          city: string | null;
          client_event_id: string;
          consent_level: number;
          consent_proof_url: string | null;
          consent_text_shown: string | null;
          consent_timestamp: string | null;
          conversion_decision: boolean | null;
          created_at: string | null;
          event_id: string;
          id: string;
          name: string | null;
          need_type: string | null;
          neighborhood: string | null;
          phone: string | null;
          photo_url: string | null;
          prayer_request: string | null;
          registered_by: string;
          team_id: string;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          client_event_id: string;
          consent_level: number;
          consent_proof_url?: string | null;
          consent_text_shown?: string | null;
          consent_timestamp?: string | null;
          conversion_decision?: boolean | null;
          created_at?: string | null;
          event_id: string;
          id?: string;
          name?: string | null;
          need_type?: string | null;
          neighborhood?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          prayer_request?: string | null;
          registered_by: string;
          team_id: string;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          client_event_id?: string;
          consent_level?: number;
          consent_proof_url?: string | null;
          consent_text_shown?: string | null;
          consent_timestamp?: string | null;
          conversion_decision?: boolean | null;
          created_at?: string | null;
          event_id?: string;
          id?: string;
          name?: string | null;
          need_type?: string | null;
          neighborhood?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          prayer_request?: string | null;
          registered_by?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "people_reached_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "people_reached_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "people_reached_registered_by_fkey";
            columns: ["registered_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          code_4dig: string;
          color: string | null;
          created_at: string | null;
          event_id: string;
          id: string;
          leader_id: string | null;
          name: string;
        };
        Insert: {
          code_4dig: string;
          color?: string | null;
          created_at?: string | null;
          event_id: string;
          id?: string;
          leader_id?: string | null;
          name: string;
        };
        Update: {
          code_4dig?: string;
          color?: string | null;
          created_at?: string | null;
          event_id?: string;
          id?: string;
          leader_id?: string | null;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teams_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string | null;
          event_id: string;
          id: string;
          name: string;
          phone: string | null;
          role: string;
          team_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          event_id: string;
          id: string;
          name: string;
          phone?: string | null;
          role: string;
          team_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          event_id?: string;
          id?: string;
          name?: string;
          phone?: string | null;
          role?: string;
          team_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {};
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_user_team: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | { schema: keyof Database }
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"]),
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | { schema: keyof Database }
    | keyof PublicSchema["Tables"],
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | { schema: keyof Database }
    | keyof PublicSchema["Tables"],
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | { schema: keyof Database }
    | keyof (PublicSchema["Enums"] & PublicSchema["CompositeTypes"]),
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicEnumNameOrOptions["schema"]]["Enums"] &
        Database[PublicEnumNameOrOptions["schema"]]["CompositeTypes"])
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicEnumNameOrOptions["schema"]]["Enums"] &
      Database[PublicEnumNameOrOptions["schema"]]["CompositeTypes"])[EnumName]
  : PublicEnumNameOrOptions extends keyof (PublicSchema["Enums"] &
        PublicSchema["CompositeTypes"])
    ? (PublicSchema["Enums"] &
        PublicSchema["CompositeTypes"])[PublicEnumNameOrOptions]
    : never;
