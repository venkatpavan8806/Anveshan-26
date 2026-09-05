// Hand-written types matching supabase/schema.sql.
// If you later run `supabase gen types typescript`, you can replace this
// file with the generated one — the shapes below match the schema 1:1.

export type Role = "ADMIN" | "VOLUNTEER" | "PARTICIPANT";
export type ParticipantStatus = "PENDING" | "IN" | "OUT";
export type MovementAction = "CHECK_IN" | "CHECK_OUT";
export type SlotStatus = "UPCOMING" | "READY_CALL" | "IN_PROGRESS" | "DONE";
export type NotificationTarget = "ALL" | "TEAM" | "PARTICIPANT";
export type NotificationType = "INFO" | "READY_CALL" | "PRESENTATION_TIME";

export type Profile = {
  id: string;
  role: Role;
  name: string;
  team_id: string | null;
  created_at: string;
}

export type Team = {
  id: string;
  name: string;
  project_title: string | null;
  created_at: string;
}

export type Participant = {
  id: string;
  unique_code: string;
  name: string;
  contact: string | null;
  team_id: string | null;
  qr_data: string;
  status: ParticipantStatus;
  photo_url: string | null;
  profile_id: string | null;
  created_at: string;
}

export type MovementLog = {
  id: string;
  participant_id: string;
  action: MovementAction;
  timestamp: string;
  scanned_by: string | null;
  gate_label: string | null;
  reason: string | null;
}

export type ScheduleSlot = {
  id: string;
  team_id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  status: SlotStatus;
  created_at: string;
}

export type Rule = {
  id: string;
  section_title: string;
  content: string;
  order_index: number;
}

export type TimelineEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  order_index: number;
}

export type Notification = {
  id: string;
  title: string;
  body: string;
  target: NotificationTarget;
  target_id: string | null;
  sent_at: string;
  type: NotificationType;
}

export type NotificationRead = {
  id: string;
  notification_id: string;
  participant_id: string;
  read_at: string;
}

export type PushSubscriptionRow = {
  id: string;
  participant_id: string;
  subscription_json: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  created_at: string;
}

export type GameScore = {
  id: string;
  participant_id: string;
  game: "trivia" | "memory" | "reaction" | "game2048" | "flappy";
  score: number;
  created_at: string;
}

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  order_index: number;
}

export type CurrentlyOutRow = {
  participant_id: string;
  name: string;
  unique_code: string;
  photo_url: string | null;
  team_id: string | null;
  checked_out_at: string;
  gate_label: string | null;
  reason: string | null;
}

export type Database = {
  public: {
    Tables: {
      v_currently_out: {
        Row: CurrentlyOutRow;
        Insert: Partial<CurrentlyOutRow>;
        Update: Partial<CurrentlyOutRow>;
        Relationships: [];
      };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] };
      teams: { Row: Team; Insert: Partial<Team>; Update: Partial<Team>; Relationships: [] };
      participants: {
        Row: Participant;
        Insert: Partial<Participant>;
        Update: Partial<Participant>;
        Relationships: [];
      };
      movement_logs: {
        Row: MovementLog;
        Insert: Partial<MovementLog>;
        Update: Partial<MovementLog>;
        Relationships: [];
      };
      schedule_slots: {
        Row: ScheduleSlot;
        Insert: Partial<ScheduleSlot>;
        Update: Partial<ScheduleSlot>;
        Relationships: [];
      };
      rules: { Row: Rule; Insert: Partial<Rule>; Update: Partial<Rule>; Relationships: [] };
      timeline_events: {
        Row: TimelineEvent;
        Insert: Partial<TimelineEvent>;
        Update: Partial<TimelineEvent>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification>;
        Update: Partial<Notification>;
        Relationships: [];
      };
      notification_reads: {
        Row: NotificationRead;
        Insert: Partial<NotificationRead>;
        Update: Partial<NotificationRead>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Partial<PushSubscriptionRow>;
        Update: Partial<PushSubscriptionRow>;
        Relationships: [];
      };
      game_scores: {
        Row: GameScore;
        Insert: Partial<GameScore>;
        Update: Partial<GameScore>;
        Relationships: [];
      };
      quiz_questions: {
        Row: QuizQuestion;
        Insert: Partial<QuizQuestion>;
        Update: Partial<QuizQuestion>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      next_participant_code: { Args: Record<string, never>; Returns: string };
      toggle_participant_status: {
        Args: { p_participant_id: string; p_gate_label?: string | null; p_reason?: string | null };
        Returns: Participant;
      };
      update_my_profile: {
        Args: { p_name?: string | null; p_contact?: string | null; p_photo_url?: string | null };
        Returns: Participant;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
