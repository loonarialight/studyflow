import React from 'react';
import { Box, Typography, Chip, Avatar, AvatarGroup } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PeopleIcon from '@mui/icons-material/People';
import { motion } from 'framer-motion';
import { Group, GroupType, GroupVisibility } from '@/types/group';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

interface GroupCardProps {
  group: Group;
  onClick: () => void;
}

export default function GroupCard({ group, onClick }: GroupCardProps) {
  const members = useSelector(
    (s: RootState) => s.groups.memberships[group.id] ?? []
  );
  const studyingNow = members.filter((m) => m.isStudyingNow).length;

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          cursor: 'pointer',
          transition: 'box-shadow 0.15s',
          '&:hover': { boxShadow: 3 },
        }}
      >
        {/* Avatar / icon */}
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor:
              group.type === GroupType.MISSION ? 'secondary.main' : 'primary.main',
            fontSize: 20,
          }}
        >
          {group.name[0]}
        </Avatar>

        {/* Info */}
        <Box flex={1} minWidth={0}>
          <Box display="flex" alignItems="center" gap={0.5} mb={0.25}>
            <Typography
              variant="body1"
              fontWeight={600}
              noWrap
              sx={{ maxWidth: 180 }}
            >
              {group.name}
            </Typography>
            {group.visibility === GroupVisibility.PRIVATE && (
              <LockIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            )}
          </Box>

          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            {/* Group type badge */}
            <Chip
              label={group.type === GroupType.MISSION ? '미션' : '스터디'}
              size="small"
              color={group.type === GroupType.MISSION ? 'secondary' : 'default'}
              sx={{ height: 18, fontSize: 10 }}
            />

            {/* Member count */}
            <Box display="flex" alignItems="center" gap={0.25}>
              <PeopleIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {group.memberCount}
                {group.maxMembers ? `/${group.maxMembers}` : ''}명
              </Typography>
            </Box>

            {/* Realtime: who is studying now */}
            {studyingNow > 0 && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.4 },
                    },
                  }}
                />
                <Typography variant="caption" color="success.main">
                  {studyingNow}명 공부 중
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Mini avatar group — top 3 members */}
        {members.length > 0 && (
          <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 11 } }}>
            {members.slice(0, 3).map((m) => (
              <Avatar
                key={m.userId}
                src={m.profileImageUrl}
                alt={m.nickname}
              >
                {m.nickname[0]}
              </Avatar>
            ))}
          </AvatarGroup>
        )}
      </Box>
    </motion.div>
  );
}