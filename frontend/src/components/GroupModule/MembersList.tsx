import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { motion, AnimatePresence } from 'framer-motion';
import {
  kickMember,
  transferOwnership,
  addViolation,
  setMemberSendPermission,
} from '@/store/groupSlice';
import type { AppDispatch, RootState } from '@/store';
import {
  DayOffStatus,
  GroupRole,
  Membership,
  ViolationType,
} from '@/types/group';

const DAY_OFF_LABEL: Record<DayOffStatus, string> = {
  [DayOffStatus.FULL]: '데옾',
  [DayOffStatus.HALF]: '반데옾',
  [DayOffStatus.NONE]: '',
};

const DAY_OFF_COLOR: Record<DayOffStatus, 'default' | 'warning' | 'error'> = {
  [DayOffStatus.FULL]: 'default',
  [DayOffStatus.HALF]: 'warning',
  [DayOffStatus.NONE]: 'default',
};

const VIOLATION_LABEL: Record<ViolationType, string> = {
  [ViolationType.UNAUTHORIZED_LEAVE]: '무탈',
  [ViolationType.FAKE_TIMER]: '부측',
  [ViolationType.MISSING_DAYOFF]: '데옾 미체크',
};

interface MembersListProps {
  groupId: string;
  currentUserId: string;
}

interface MemberRowProps {
  member: Membership;
  isCurrentUserOwner: boolean;
  currentUserId: string;
  groupId: string;
}

function MemberRow({ member, isCurrentUserOwner, currentUserId, groupId }: MemberRowProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showViolations, setShowViolations] = useState(false);

  const isMe = member.userId === currentUserId;
  const hasViolations = member.violations.length > 0;
  const minutesFormatted = member.todayStudyMinutes > 0
    ? `${Math.floor(member.todayStudyMinutes / 60)}h ${member.todayStudyMinutes % 60}m`
    : null;

  const handleKick = () => {
    dispatch(kickMember({ groupId, userId: member.userId }));
    setAnchorEl(null);
  };

  const handleTransfer = () => {
    dispatch(transferOwnership({ groupId, newOwnerId: member.userId }));
    setAnchorEl(null);
  };

  const handleAddViolation = (type: ViolationType) => {
    dispatch(addViolation({ groupId, userId: member.userId, type }));
    setAnchorEl(null);
  };

  const handleToggleSend = () => {
    dispatch(
      setMemberSendPermission({
        groupId,
        userId: member.userId,
        canSend: !member.canSendMessages,
      })
    );
    setAnchorEl(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 1.25,
            px: 1.5,
            borderRadius: 2,
            '&:hover': { bgcolor: 'action.hover' },
            transition: 'background 0.12s',
          }}
        >
          {/* Avatar + online dot */}
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              member.isStudyingNow ? (
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    border: '2px solid white',
                  }}
                />
              ) : null
            }
          >
            <Avatar
              src={member.profileImageUrl}
              sx={{ width: 36, height: 36, fontSize: 14 }}
            >
              {member.nickname[0]}
            </Avatar>
          </Badge>

          {/* Name + info */}
          <Box flex={1} minWidth={0}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography
                variant="body2"
                fontWeight={member.role === GroupRole.OWNER ? 700 : 400}
                noWrap
              >
                {member.nickname}
                {isMe && (
                  <Typography component="span" variant="caption" color="text.secondary" ml={0.5}>
                    (나)
                  </Typography>
                )}
              </Typography>

              {/* Role badge */}
              {member.role === GroupRole.OWNER && (
                <Chip label="그룹장" size="small" color="primary" sx={{ height: 16, fontSize: 10 }} />
              )}

              {/* Day-off badge */}
              {member.dayOffStatusToday !== DayOffStatus.NONE && (
                <Chip
                  label={DAY_OFF_LABEL[member.dayOffStatusToday]}
                  size="small"
                  color={DAY_OFF_COLOR[member.dayOffStatusToday]}
                  sx={{ height: 16, fontSize: 10 }}
                />
              )}
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              {/* Study time today */}
              {minutesFormatted && (
                <Typography variant="caption" color="success.main">
                  {minutesFormatted}
                </Typography>
              )}
              {member.isStudyingNow && (
                <Typography variant="caption" color="success.main">
                  공부 중
                </Typography>
              )}
            </Box>
          </Box>

          {/* Violation indicator */}
          {hasViolations && (
            <Tooltip title={`위반 ${member.violations.length}건`}>
              <IconButton
                size="small"
                onClick={() => setShowViolations((v) => !v)}
              >
                <Badge badgeContent={member.violations.length} color="error">
                  <WarningAmberIcon fontSize="small" color="warning" />
                </Badge>
              </IconButton>
            </Tooltip>
          )}

          {/* Owner actions menu */}
          {isCurrentUserOwner && !isMe && (
            <>
              <IconButton
                size="small"
                onClick={(e) => setAnchorEl(e.currentTarget)}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                {/* Chat permission toggle */}
                <MenuItem onClick={handleToggleSend}>
                  {member.canSendMessages
                    ? '채팅 권한 제거'
                    : '채팅 권한 부여'}
                </MenuItem>
                <Divider />
                {/* Violation triggers */}
                <MenuItem
                  onClick={() => handleAddViolation(ViolationType.FAKE_TIMER)}
                  sx={{ color: 'warning.main' }}
                >
                  부측 경고 추가
                </MenuItem>
                <MenuItem
                  onClick={() =>
                    handleAddViolation(ViolationType.MISSING_DAYOFF)
                  }
                  sx={{ color: 'warning.main' }}
                >
                  데옾 미체크 경고
                </MenuItem>
                <Divider />
                {/* Ownership transfer — 그룹장 위임 */}
                <MenuItem onClick={handleTransfer}>그룹장 위임</MenuItem>
                {/* Kick */}
                <MenuItem onClick={handleKick} sx={{ color: 'error.main' }}>
                  내보내기
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        {/* Violation log — expandable */}
        <Collapse in={showViolations}>
          <List dense sx={{ pl: 7, pr: 1 }}>
            {member.violations.map((v) => (
              <ListItem key={v.id} disablePadding>
                <ListItemText
                  primary={
                    <Typography variant="caption" color="warning.main">
                      {VIOLATION_LABEL[v.type]}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {v.date}{v.note ? ` · ${v.note}` : ''}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </motion.div>
      <Divider sx={{ my: 0.25, opacity: 0.4 }} />
    </>
  );
}

export default function MembersList({ groupId, currentUserId }: MembersListProps) {
  const members = useSelector(
    (s: RootState) => s.groups.memberships[groupId] ?? []
  );
  const group = useSelector((s: RootState) =>
    s.groups.groups.find((g) => g.id === groupId)
  );

  const isCurrentUserOwner =
    group?.ownerId === currentUserId;

  const studyingNow = members.filter((m) => m.isStudyingNow);
  const rest = members.filter((m) => !m.isStudyingNow);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} px={0.5}>
        <Typography variant="subtitle2" fontWeight={700}>
          멤버 ({members.length})
        </Typography>
        {studyingNow.length > 0 && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <FiberManualRecordIcon sx={{ fontSize: 10, color: 'success.main' }} />
            <Typography variant="caption" color="success.main">
              {studyingNow.length}명 공부 중
            </Typography>
          </Box>
        )}
      </Box>

      <AnimatePresence>
        {/* Studying now — shown first */}
        {studyingNow.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, mb: 0.5, display: 'block' }}>
              공부 중
            </Typography>
            {studyingNow.map((m) => (
              <MemberRow
                key={m.userId}
                member={m}
                isCurrentUserOwner={isCurrentUserOwner}
                currentUserId={currentUserId}
                groupId={groupId}
              />
            ))}
            <Divider sx={{ my: 1 }} />
          </>
        )}

        {/* Rest */}
        {rest.map((m) => (
          <MemberRow
            key={m.userId}
            member={m}
            isCurrentUserOwner={isCurrentUserOwner}
            currentUserId={currentUserId}
            groupId={groupId}
          />
        ))}
      </AnimatePresence>
    </Box>
  );
}