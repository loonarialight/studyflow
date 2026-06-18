// ============================================================
// GROUP MODULE — TypeScript Types
// Based on Yeolpumta group module specification
// ============================================================

/** 스터디 그룹 — free, user-managed | 미션 그룹 — paid, app-managed */
export enum GroupType {
  STUDY = 'study',
  MISSION = 'mission',
}

/** 공개 / 비공개 */
export enum GroupVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

/** 그룹장 / 그룹원 */
export enum GroupRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

/**
 * NOT a boolean — three states per ТЗ:
 * none   → studied (or violation if no activity logged)
 * half   → 반데옾 — below minimum but non-zero
 * full   → 데옾 — explicit day-off
 */
export enum DayOffStatus {
  NONE = 'none',
  HALF = 'half',
  FULL = 'full',
}

/** Kick-trigger types for the violation log */
export enum ViolationType {
  UNAUTHORIZED_LEAVE = 'unauthorized_leave', // 무탈
  FAKE_TIMER = 'fake_timer',                 // 부측
  MISSING_DAYOFF = 'missing_dayoff',         // no activity + no dayoff marked
}

export interface Violation {
  id: string;
  userId: string;
  groupId: string;
  type: ViolationType;
  date: string; // ISO YYYY-MM-DD
  note?: string;
}

/** Two-component rules model */
export interface GroupRules {
  /** 필독 — free text shown to visitors before they join */
  text: string;
  /** Min study time per day in minutes (machine-readable) */
  minStudyMinutesPerDay: number;
  /** How many day-offs allowed per challenge period */
  maxDayOffsPerPeriod: number;
  /** Apps allowed during a focus session */
  allowedApps: string[];
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  visibility: GroupVisibility;
  passwordHash?: string; // only if visibility === PRIVATE
  ownerId: string;
  rules: GroupRules;
  announcement: string;
  /** Two-level chat model: master switch */
  chatEnabled: boolean;
  /** Default send permission for new members */
  memberSendPermissionDefault: boolean;
  memberCount: number;
  maxMembers?: number;
  inviteCode: string;
  createdAt: string;
}

export interface Membership {
  userId: string;
  groupId: string;
  role: GroupRole;
  nickname: string;
  profileImageUrl?: string;
  joinedAt: string;
  dayOffStatusToday: DayOffStatus;
  /** Per-member override — without explicit grant, member can read but not write */
  canSendMessages: boolean;
  violations: Violation[];
  /** Realtime flag — "who is studying now" layer */
  isStudyingNow: boolean;
  todayStudyMinutes: number;
}

export interface ChatMessage {
  id: string;
  groupId: string;
  userId: string;
  nickname: string;
  profileImageUrl?: string;
  content: string;
  sentAt: string;
  /** join / kick / ownership-transfer events */
  isSystem: boolean;
}

/** Weekly aggregate snapshot — built as a batch, not recalculated every request */
export interface WeeklySnapshot {
  groupId: string;
  weekStart: string;
  weekEnd: string;
  members: WeeklyMemberStats[];
}

export interface WeeklyMemberStats {
  userId: string;
  nickname: string;
  profileImageUrl?: string;
  /** 출석률 */
  attendanceRate: number;
  /** 공부량 — total minutes */
  totalStudyMinutes: number;
  /** 캠스터디 */
  camStudyMinutes: number;
  /** 미션인증 */
  missionCompletions: number;
  dayOffs: number;
  violations: number;
  rank: number;
}

/** Server-side anti-cheat constants (useful for client validation feedback) */
export const ANTI_CHEAT = {
  MAX_DAILY_STUDY_HOURS: 20,
  MAX_CONTINUOUS_FOCUS_HOURS: 9,
} as const;

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface JoinGroupPayload {
  groupId: string;
  password?: string; // required when visibility === PRIVATE
}

export interface CreateGroupPayload {
  name: string;
  type: GroupType;
  visibility: GroupVisibility;
  password?: string;
  rules: GroupRules;
  announcement: string;
}

export interface UpdateGroupPayload {
  groupId: string;
  name?: string;
  announcement?: string;
  rules?: Partial<GroupRules>;
  chatEnabled?: boolean;
  memberSendPermissionDefault?: boolean;
}