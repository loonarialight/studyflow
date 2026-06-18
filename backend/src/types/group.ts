import { GroupRole, DayOffStatus, ViolationType } from '@prisma/client';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum GroupType {
  STUDY = 'study',
  MISSION = 'mission',
}

export enum GroupVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

// ─── DB Models ────────────────────────────────────────────────────────────────

export interface GroupDB {
  id: string;
  name: string;
  type: GroupType;
  visibility: GroupVisibility;
  passwordHash?: string;
  ownerId: string;
  rulesText: string;
  minStudyMinutesPerDay: number;
  maxDayOffsPerPeriod: number;
  allowedApps: string[];
  announcement: string;
  chatEnabled: boolean;
  memberSendPermissionDefault: boolean;
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipDB {
  id: string;
  userId: string;
  groupId: string;
  role: GroupRole;
  canSendMessages: boolean;
  joinedAt: Date;
}

export interface DayOffDB {
  id: string;
  userId: string;
  groupId: string;
  date: string;
  status: DayOffStatus;
}

export interface ViolationDB {
  id: string;
  userId: string;
  groupId: string;
  type: ViolationType;
  date: string;
  note?: string;
  createdAt: Date;
}

export interface ChatMessageDB {
  id: string;
  groupId: string;
  userId: string;
  content: string;
  isSystem: boolean;
  createdAt: Date;
}

// ─── Request bodies ───────────────────────────────────────────────────────────

export interface CreateGroupBody {
  name: string;
  type: GroupType;
  visibility: GroupVisibility;
  password?: string;
  rules: {
    text: string;
    minStudyMinutesPerDay: number;
    maxDayOffsPerPeriod: number;
    allowedApps: string[];
  };
  announcement: string;
}

export interface UpdateGroupBody {
  name?: string;
  announcement?: string;
  chatEnabled?: boolean;
  memberSendPermissionDefault?: boolean;
  rules?: Partial<CreateGroupBody['rules']>;
}

export interface JoinGroupBody {
  password?: string;
}

export interface JoinByCodeBody {
  inviteCode: string;
  password?: string;
}

export interface DayOffBody {
  userId: string;
  status: DayOffStatus;
  date: string;
}

export interface AddViolationBody {
  type: ViolationType;
  note?: string;
}

export interface SendMessageBody {
  content: string;
}

export interface TransferOwnerBody {
  newOwnerId: string;
}

// ─── Anti-cheat constants ─────────────────────────────────────────────────────

export const ANTI_CHEAT = {
  MAX_DAILY_STUDY_MINUTES: 20 * 60,
  MAX_CONTINUOUS_FOCUS_MINUTES: 9 * 60,
} as const;

export { GroupRole, DayOffStatus, ViolationType };