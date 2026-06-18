import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, Button, CircularProgress, Chip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppDispatch, RootState } from '@/store';
import { fetchMyGroups, setActiveGroup } from '@/store/groupSlice';
import { GroupType, GroupVisibility } from '@/types/group';
import GroupCard from './GroupCard';

interface GroupListProps {
  onCreateClick: () => void;
  onJoinClick: () => void;
}

export default function GroupList({ onCreateClick, onJoinClick }: GroupListProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { groups, loading, error } = useSelector((s: RootState) => s.groups);

  useEffect(() => {
    dispatch(fetchMyGroups());
  }, [dispatch]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="error" variant="body2">{error}</Typography>
        <Button onClick={() => dispatch(fetchMyGroups())} sx={{ mt: 1 }}>
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        px={1}
      >
        <Typography variant="h6" fontWeight={700}>
          내 그룹
          {groups.length > 0 && (
            <Chip
              label={groups.length}
              size="small"
              sx={{ ml: 1, fontSize: 11 }}
            />
          )}
        </Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" size="small" onClick={onJoinClick}>
            참여
          </Button>
          <Button variant="contained" size="small" onClick={onCreateClick}>
            + 만들기
          </Button>
        </Box>
      </Box>

      {/* Empty state */}
      {groups.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            px: 3,
            bgcolor: 'action.hover',
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary" mb={2}>
            아직 참여한 그룹이 없어요
          </Typography>
          <Button variant="contained" onClick={onCreateClick}>
            첫 번째 그룹 만들기
          </Button>
        </Box>
      ) : (
        <AnimatePresence mode="popLayout">
          <Box display="flex" flexDirection="column" gap={1.5}>
            {groups.map((group, i) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <GroupCard
                  group={group}
                  onClick={() => dispatch(setActiveGroup(group.id))}
                />
              </motion.div>
            ))}
          </Box>
        </AnimatePresence>
      )}
    </Box>
  );
}