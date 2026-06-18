import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Button,
  Divider,
  Alert,
  TextField,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IosShareIcon from '@mui/icons-material/IosShare';
import EditIcon from '@mui/icons-material/Edit';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchMembers,
  setActiveGroup,
  leaveGroup,
  updateGroup,
} from '@/store/groupSlice';
import type { AppDispatch, RootState } from '@/store';
import { GroupRole, GroupType, GroupVisibility } from '@/types/group';
import MembersList from './MembersList';
import GroupChat from './GroupChat';
import WeeklyLeaderboard from './WeeklyLeaderboard';
import DayOffCalendar from './DayOffCalendar';
import InviteModal from './InviteModal';

interface GroupDetailProps {
  groupId: string;
  currentUserId: string;
}

export default function GroupDetail({ groupId, currentUserId }: GroupDetailProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [tab, setTab] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [leaving, setLeaving] = useState(false);

  const group = useSelector((s: RootState) =>
    s.groups.groups.find((g) => g.id === groupId)
  );
  const members = useSelector(
    (s: RootState) => s.groups.memberships[groupId] ?? []
  );
  const loading = useSelector((s: RootState) => s.groups.loading);

  const me = members.find((m) => m.userId === currentUserId);
  const isOwner = me?.role === GroupRole.OWNER || group?.ownerId === currentUserId;

  useEffect(() => {
    dispatch(fetchMembers(groupId));
  }, [dispatch, groupId]);

  useEffect(() => {
    if (group) setAnnouncementText(group.announcement);
  }, [group]);

  const handleLeave = async () => {
    if (!confirm('그룹에서 나가시겠어요?')) return;
    setLeaving(true);
    try {
      await dispatch(leaveGroup(groupId)).unwrap();
    } finally {
      setLeaving(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    await dispatch(
      updateGroup({ groupId, announcement: announcementText })
    ).unwrap();
    setEditAnnouncement(false);
  };

  if (!group) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <IconButton
          size="small"
          onClick={() => dispatch(setActiveGroup(null))}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>

        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={0.75}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {group.name}
            </Typography>
            {group.visibility === GroupVisibility.PRIVATE && (
              <Chip label="비공개" size="small" sx={{ height: 18, fontSize: 10 }} />
            )}
            <Chip
              label={group.type === GroupType.MISSION ? '미션' : '스터디'}
              size="small"
              color={group.type === GroupType.MISSION ? 'secondary' : 'default'}
              sx={{ height: 18, fontSize: 10 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            {members.length}명
            {group.maxMembers ? `/${group.maxMembers}` : ''}
          </Typography>
        </Box>

        <Tooltip title="초대">
          <IconButton size="small" onClick={() => setInviteOpen(true)}>
            <IosShareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Announcement banner */}
      {(group.announcement || isOwner) && (
        <Box sx={{ px: 2, py: 1.25, bgcolor: 'info.50', borderBottom: '1px solid', borderColor: 'divider' }}>
          {editAnnouncement && isOwner ? (
            <Box display="flex" gap={1}>
              <TextField
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                size="small"
                fullWidth
                multiline
                maxRows={3}
              />
              <Box display="flex" flexDirection="column" gap={0.5}>
                <Button size="small" variant="contained" onClick={handleSaveAnnouncement}>
                  저장
                </Button>
                <Button size="small" onClick={() => setEditAnnouncement(false)}>
                  취소
                </Button>
              </Box>
            </Box>
          ) : (
            <Box display="flex" alignItems="flex-start" gap={0.5}>
              <Typography variant="caption" flex={1} sx={{ whiteSpace: 'pre-wrap' }}>
                📢 {group.announcement || '공지사항을 입력하세요'}
              </Typography>
              {isOwner && (
                <IconButton size="small" onClick={() => setEditAnnouncement(true)}>
                  <EditIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Rules text — shown to all, visible before join */}
      {group.rules.text && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'warning.50', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="warning.dark" sx={{ whiteSpace: 'pre-wrap' }}>
            📋 필독: {group.rules.text}
          </Typography>
        </Box>
      )}

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: '1px solid', borderColor: 'divider', minHeight: 40 }}
      >
        <Tab label="멤버" sx={{ minHeight: 40, fontSize: 12 }} />
        <Tab label="채팅" sx={{ minHeight: 40, fontSize: 12 }} />
        <Tab label="주간 랭킹" sx={{ minHeight: 40, fontSize: 12 }} />
        <Tab label="데옾 설정" sx={{ minHeight: 40, fontSize: 12 }} />
      </Tabs>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={{ flex: 1, overflow: 'auto', height: '100%' }}
          >
            {tab === 0 && (
              <Box p={1.5}>
                <MembersList groupId={groupId} currentUserId={currentUserId} />
              </Box>
            )}
            {tab === 1 && (
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <GroupChat groupId={groupId} currentUserId={currentUserId} />
              </Box>
            )}
            {tab === 2 && (
              <Box p={2}>
                <WeeklyLeaderboard groupId={groupId} />
              </Box>
            )}
            {tab === 3 && (
              <Box p={2}>
                <DayOffCalendar groupId={groupId} userId={currentUserId} />
              </Box>
            )}
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Footer — leave group */}
      {!isOwner && (
        <Box p={2} borderTop="1px solid" sx={{ borderColor: 'divider' }}>
          <Button
            variant="text"
            color="error"
            size="small"
            fullWidth
            onClick={handleLeave}
            disabled={leaving}
          >
            그룹 나가기
          </Button>
        </Box>
      )}

      <InviteModal
        groupId={groupId}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </Box>
  );
}