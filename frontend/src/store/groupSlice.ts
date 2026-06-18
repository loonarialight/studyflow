import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type {
  Group,
  Membership,
  ChatMessage,
  WeeklySnapshot,
  DayOffStatus,
  JoinGroupPayload,
  CreateGroupPayload,
  UpdateGroupPayload,
  ViolationType,
} from '@/types/group';
import { GroupRole } from '@/types/group';
// ─── State ────────────────────────────────────────────────────────────────────

interface GroupState {
  groups: Group[];
  memberships: Record<string, Membership[]>;       // groupId → members
  messages: Record<string, ChatMessage[]>;          // groupId → messages
  weeklySnapshots: Record<string, WeeklySnapshot>; // groupId → latest snapshot
  activeGroupId: string | null;
  loading: boolean;
  chatLoading: boolean;
  error: string | null;
}

const initialState: GroupState = {
  groups: [],
  memberships: {},
  messages: {},
  weeklySnapshots: {},
  activeGroupId: null,
  loading: false,
  chatLoading: false,
  error: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const apiCall = async (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg);
  }
  return res;
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchMyGroups = createAsyncThunk(
  'groups/fetchMyGroups',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiCall('/api/groups/my');
      return (await res.json()) as Group[];
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

export const createGroup = createAsyncThunk(
  'groups/create',
  async (payload: CreateGroupPayload, { rejectWithValue }) => {
    try {
      const res = await apiCall('/api/groups', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return (await res.json()) as Group;
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

export const joinGroup = createAsyncThunk(
  'groups/join',
  async (payload: JoinGroupPayload, { rejectWithValue }) => {
    try {
      const res = await apiCall(`/api/groups/${payload.groupId}/join`, {
        method: 'POST',
        body: JSON.stringify({ password: payload.password }),
      });
      return (await res.json()) as { group: Group; membership: Membership };
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

/** Deferred deep-link join — called after app install completes the flow */
export const joinGroupByInviteCode = createAsyncThunk(
  'groups/joinByInviteCode',
  async (
    { inviteCode, password }: { inviteCode: string; password?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiCall('/api/groups/join-by-code', {
        method: 'POST',
        body: JSON.stringify({ inviteCode, password }),
      });
      return (await res.json()) as { group: Group; membership: Membership };
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

export const leaveGroup = createAsyncThunk(
  'groups/leave',
  async (groupId: string, { rejectWithValue }) => {
    try {
      await apiCall(`/api/groups/${groupId}/leave`, { method: 'POST' });
      return groupId;
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

export const updateGroup = createAsyncThunk(
  'groups/update',
  async (payload: UpdateGroupPayload, { rejectWithValue }) => {
    try {
      const { groupId, ...body } = payload;
      const res = await apiCall(`/api/groups/${groupId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return (await res.json()) as Group;
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

export const fetchMembers = createAsyncThunk(
  'groups/fetchMembers',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const res = await apiCall(`/api/groups/${groupId}/members`);
      const members = (await res.json()) as Membership[];
      return { groupId, members };
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

export const kickMember = createAsyncThunk(
  'groups/kickMember',
  async (
    { groupId, userId }: { groupId: string; userId: string },
    { rejectWithValue }
  ) => {
    try {
      await apiCall(`/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
      });
      return { groupId, userId };
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

/** 그룹장 위임 — transfer ownership to another member */
export const transferOwnership = createAsyncThunk(
  'groups/transferOwnership',
  async (
    { groupId, newOwnerId }: { groupId: string; newOwnerId: string },
    { rejectWithValue }
  ) => {
    try {
      await apiCall(`/api/groups/${groupId}/owner`, {
        method: 'PUT',
        body: JSON.stringify({ newOwnerId }),
      });
      return { groupId, newOwnerId };
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

/**
 * Day-off is an explicit write operation by the user.
 * Absence without this = violation, NOT a neutral event.
 */
export const setDayOff = createAsyncThunk(
  'groups/setDayOff',
  async (
    {
      groupId,
      userId,
      status,
      date,
    }: {
      groupId: string;
      userId: string;
      status: DayOffStatus;
      date: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await apiCall(`/api/groups/${groupId}/dayoff`, {
        method: 'POST',
        body: JSON.stringify({ userId, status, date }),
      });
      return { groupId, userId, status };
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

export const fetchChatMessages = createAsyncThunk(
  'groups/fetchMessages',
  async (
    { groupId, before }: { groupId: string; before?: string },
    { rejectWithValue }
  ) => {
    try {
      const params = before ? `?before=${before}` : '';
      const res = await apiCall(`/api/groups/${groupId}/chat${params}`);
      const messages = (await res.json()) as ChatMessage[];
      return { groupId, messages };
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  'groups/sendMessage',
  async (
    { groupId, content }: { groupId: string; content: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiCall(`/api/groups/${groupId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      return (await res.json()) as ChatMessage;
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

export const fetchWeeklySnapshot = createAsyncThunk(
  'groups/fetchWeeklySnapshot',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const res = await apiCall(`/api/groups/${groupId}/stats/weekly`);
      const snapshot = (await res.json()) as WeeklySnapshot;
      return { groupId, snapshot };
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

export const addViolation = createAsyncThunk(
  'groups/addViolation',
  async (
    {
      groupId,
      userId,
      type,
      note,
    }: { groupId: string; userId: string; type: ViolationType; note?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiCall(
        `/api/groups/${groupId}/members/${userId}/violations`,
        {
          method: 'POST',
          body: JSON.stringify({ type, note }),
        }
      );
      const violation = await res.json();
      return { groupId, userId, violation };
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

export const regenerateInviteCode = createAsyncThunk(
  'groups/regenerateInviteCode',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const res = await apiCall(`/api/groups/${groupId}/invite`, {
        method: 'POST',
      });
      const { inviteCode } = await res.json();
      return { groupId, inviteCode };
    } catch (e) {
      return rejectWithValue((e as Error).message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const groupSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setActiveGroup(state, action: PayloadAction<string | null>) {
      state.activeGroupId = action.payload;
    },
    /** Called from WebSocket handler to push incoming messages */
    appendMessage(state, action: PayloadAction<ChatMessage>) {
      const { groupId } = action.payload;
      if (!state.messages[groupId]) state.messages[groupId] = [];
      // deduplicate by id
      const exists = state.messages[groupId].some(
        (m) => m.id === action.payload.id
      );
      if (!exists) state.messages[groupId].push(action.payload);
    },
    /** Two-level chat model master switch */
    toggleChatEnabled(
      state,
      action: PayloadAction<{ groupId: string; enabled: boolean }>
    ) {
      const group = state.groups.find((g) => g.id === action.payload.groupId);
      if (group) group.chatEnabled = action.payload.enabled;
    },
    /** Per-member send permission (second level) */
    setMemberSendPermission(
      state,
      action: PayloadAction<{
        groupId: string;
        userId: string;
        canSend: boolean;
      }>
    ) {
      const members = state.memberships[action.payload.groupId] ?? [];
      const member = members.find((m) => m.userId === action.payload.userId);
      if (member) member.canSendMessages = action.payload.canSend;
    },
    /** Realtime layer — who is studying now (push from SSE/WS) */
    updateRealtimeStatus(
      state,
      action: PayloadAction<{
        groupId: string;
        userId: string;
        isStudyingNow: boolean;
        todayStudyMinutes: number;
      }>
    ) {
      const { groupId, userId, isStudyingNow, todayStudyMinutes } =
        action.payload;
      const members = state.memberships[groupId] ?? [];
      const member = members.find((m) => m.userId === userId);
      if (member) {
        member.isStudyingNow = isStudyingNow;
        member.todayStudyMinutes = todayStudyMinutes;
      }
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchMyGroups
      .addCase(fetchMyGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload;
      })
      .addCase(fetchMyGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // createGroup
      .addCase(createGroup.fulfilled, (state, action) => {
        state.groups.unshift(action.payload);
      })

      // joinGroup / joinGroupByInviteCode — shared logic
      .addCase(joinGroup.fulfilled, (state, action) => {
        const { group, membership } = action.payload;
        if (!state.groups.find((g) => g.id === group.id)) {
          state.groups.push(group);
        }
        if (!state.memberships[group.id]) state.memberships[group.id] = [];
        state.memberships[group.id].push(membership);
      })
      .addCase(joinGroupByInviteCode.fulfilled, (state, action) => {
        const { group, membership } = action.payload;
        if (!state.groups.find((g) => g.id === group.id)) {
          state.groups.push(group);
        }
        if (!state.memberships[group.id]) state.memberships[group.id] = [];
        state.memberships[group.id].push(membership);
      })

      // leaveGroup
      .addCase(leaveGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter((g) => g.id !== action.payload);
        delete state.memberships[action.payload];
        delete state.messages[action.payload];
        if (state.activeGroupId === action.payload) state.activeGroupId = null;
      })

      // updateGroup
      .addCase(updateGroup.fulfilled, (state, action) => {
        const idx = state.groups.findIndex((g) => g.id === action.payload.id);
        if (idx !== -1) state.groups[idx] = action.payload;
      })

      // fetchMembers
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.memberships[action.payload.groupId] = action.payload.members;
      })

      // kickMember
      .addCase(kickMember.fulfilled, (state, action) => {
        const { groupId, userId } = action.payload;
        if (state.memberships[groupId]) {
          state.memberships[groupId] = state.memberships[groupId].filter(
            (m) => m.userId !== userId
          );
        }
        const group = state.groups.find((g) => g.id === groupId);
        if (group) group.memberCount = Math.max(0, group.memberCount - 1);
      })

      // transferOwnership — 그룹장 위임
      .addCase(transferOwnership.fulfilled, (state, action) => {
        const { groupId, newOwnerId } = action.payload;
        const group = state.groups.find((g) => g.id === groupId);
        if (group) group.ownerId = newOwnerId;
        const members = state.memberships[groupId] ?? [];
        members.forEach((m) => {
          m.role = m.userId === newOwnerId ? GroupRole.OWNER : GroupRole.MEMBER;
        });
      })

      // setDayOff
      .addCase(setDayOff.fulfilled, (state, action) => {
        const { groupId, userId, status } = action.payload;
        const member = (state.memberships[groupId] ?? []).find(
          (m) => m.userId === userId
        );
        if (member) member.dayOffStatusToday = status;
      })

      // fetchChatMessages
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        const { groupId, messages } = action.payload;
        if (!state.messages[groupId]) {
          state.messages[groupId] = messages;
        } else {
          // prepend older messages (pagination)
          const existing = new Set(state.messages[groupId].map((m) => m.id));
          const older = messages.filter((m) => !existing.has(m.id));
          state.messages[groupId] = [...older, ...state.messages[groupId]];
        }
      })

      // sendChatMessage
      .addCase(sendChatMessage.pending, (state) => {
        state.chatLoading = true;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.chatLoading = false;
        const msg = action.payload;
        if (!state.messages[msg.groupId]) state.messages[msg.groupId] = [];
        const exists = state.messages[msg.groupId].some((m) => m.id === msg.id);
        if (!exists) state.messages[msg.groupId].push(msg);
      })
      .addCase(sendChatMessage.rejected, (state) => {
        state.chatLoading = false;
      })

      // fetchWeeklySnapshot
      .addCase(fetchWeeklySnapshot.fulfilled, (state, action) => {
        state.weeklySnapshots[action.payload.groupId] =
          action.payload.snapshot;
      })

      // addViolation
      .addCase(addViolation.fulfilled, (state, action) => {
        const { groupId, userId, violation } = action.payload;
        const member = (state.memberships[groupId] ?? []).find(
          (m) => m.userId === userId
        );
        if (member) member.violations.push(violation);
      })

      // regenerateInviteCode
      .addCase(regenerateInviteCode.fulfilled, (state, action) => {
        const { groupId, inviteCode } = action.payload;
        const group = state.groups.find((g) => g.id === groupId);
        if (group) group.inviteCode = inviteCode;
      });
  },
});

export const {
  setActiveGroup,
  appendMessage,
  toggleChatEnabled,
  setMemberSendPermission,
  updateRealtimeStatus,
  clearError,
} = groupSlice.actions;

export default groupSlice.reducer;