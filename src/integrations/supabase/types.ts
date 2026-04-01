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
      incidents: {
        Row: {
          assigned_vehicles: string[] | null
          created_at: string
          description: string
          id: string
          image_url: string | null
          lat: number
          lng: number
          reported_by: string | null
          resolved_at: string | null
          severity: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_vehicles?: string[] | null
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          lat: number
          lng: number
          reported_by?: string | null
          resolved_at?: string | null
          severity?: string
          type: string
          updated_at?: string
        }
        Update: {
          assigned_vehicles?: string[] | null
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          lat?: number
          lng?: number
          reported_by?: string | null
          resolved_at?: string | null
          severity?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      road_segments: {
        Row: {
          congestion: string
          created_at: string
          current_speed: number
          end_lat: number
          end_lng: number
          id: string
          speed_limit: number
          start_lat: number
          start_lng: number
          updated_at: string
        }
        Insert: {
          congestion?: string
          created_at?: string
          current_speed?: number
          end_lat: number
          end_lng: number
          id?: string
          speed_limit?: number
          start_lat: number
          start_lng: number
          updated_at?: string
        }
        Update: {
          congestion?: string
          created_at?: string
          current_speed?: number
          end_lat?: number
          end_lng?: number
          id?: string
          speed_limit?: number
          start_lat?: number
          start_lng?: number
          updated_at?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          active: boolean
          created_at: string
          eta: number | null
          id: string
          path: Json
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          eta?: number | null
          id?: string
          path?: Json
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          eta?: number | null
          id?: string
          path?: Json
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_signals: {
        Row: {
          corridor_active: boolean
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          overridden: boolean
          state: string
          updated_at: string
        }
        Insert: {
          corridor_active?: boolean
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          overridden?: boolean
          state?: string
          updated_at?: string
        }
        Update: {
          corridor_active?: boolean
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          overridden?: boolean
          state?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          callsign: string
          created_at: string
          dest_lat: number | null
          dest_lng: number | null
          driver_id: string | null
          eta: number | null
          id: string
          lat: number
          lng: number
          priority: number
          speed: number
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          callsign: string
          created_at?: string
          dest_lat?: number | null
          dest_lng?: number | null
          driver_id?: string | null
          eta?: number | null
          id?: string
          lat?: number
          lng?: number
          priority?: number
          speed?: number
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          callsign?: string
          created_at?: string
          dest_lat?: number | null
          dest_lng?: number | null
          driver_id?: string | null
          eta?: number | null
          id?: string
          lat?: number
          lng?: number
          priority?: number
          speed?: number
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "driver" | "citizen"
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
      app_role: ["admin", "driver", "citizen"],
    },
  },
} as const
