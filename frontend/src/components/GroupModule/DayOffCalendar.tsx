import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Alert,
  Chip,
} from '@mui/material';
import { motion } from 'framer-motion';
import { setDayOff } from '@/store/groupSlice';
import { DayOffStatus } from '@/types/group';
import type { AppDispatch, RootState } from '@/store';

interface DayOffCalendarProps {
  groupId: string;
  userId: string;
}

const STATUS_CONFIG = {
  [DayOffStatus.NONE]: {
    label: '공부함',
    emoji: '📚',
    color: 'success' as const,
    desc: '정상 출석으로 처리돼요',
  },
  [DayOffStatus.HALF]: {
    label: '반데옾',
    emoji: '🌙',
    color: 'warning' as const,
    desc: `최소 시간보다 적게 공부했을 때 (0분 초과)`,
  },
  [DayOffStatus.FULL]: {
    label: '데옾',
    emoji: '😴',
    color: 'default' as const,
    desc: '오늘 공부를 쉬어요. 활동 없으면 규칙 위반이에요!',
  },
};

export default function DayOffCalendar({ groupId, userId }: DayOffCalendarProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const member = useSelector((s: RootState) =>
    (s.groups.memberships[groupId] ?? []).find((m) => m.userId === userId)
  );
  const group = useSelector((s: RootState) =>
    s.groups.groups.find((g) => g.id === groupId)
  );

  const [selected, setSelected] = useState<DayOffStatus>(
    member?.dayOffStatusToday ?? DayOffStatus.NONE
  );

  const today = new Date().toISOString().split('T')[0];

  const handleSave = async () => {
    setError('');
    setSuccess(false);
    try {
      await dispatch(
        setDayOff({ groupId, userId, status: selected, date: today })
      ).unwrap();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} mb={0.5}>
        오늘 상태 설정
      </Typography>
      <Typography variant="caption" color="text.secondary" mb={2} display="block">
        활동 없이 데옾을 안 체크하면 위반으로 처리돼요
      </Typography>

      {/* Status options */}
      <Box display="flex" flexDirection="column" gap={1.5} mb={2}>
        {(Object.entries(STATUS_CONFIG) as [DayOffStatus, typeof STATUS_CONFIG[DayOffStatus]][]).map(
          ([status, cfg]) => (
            <motion.div
              key={status}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(status)}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor:
                    selected === status ? `${cfg.color}.main` : 'divider',
                  bgcolor:
                    selected === status ? `${cfg.color}.50` : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Typography fontSize={22}>{cfg.emoji}</Typography>
                <Box flex={1}>
                  <Typography variant="body2" fontWeight={600}>
                    {cfg.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cfg.desc}
                  </Typography>
                </Box>
                {selected === status && (
                  <Chip
                    label="선택됨"
                    size="small"
                    color={cfg.color === 'default' ? undefined : cfg.color}
                    sx={{ fontSize: 10 }}
                  />
                )}
              </Box>
            </motion.div>
          )
        )}
      </Box>

      {/* Min study rule reminder */}
      {(group?.rules?.minStudyMinutesPerDay ?? 0) > 0 && (
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 2,
            mb: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            이 그룹 최소 공부 시간:{' '}
            <strong>{group.rules.minStudyMinutesPerDay}분</strong>
            {' '}/ {group.rules.maxDayOffsPerPeriod}회 데옾 허용
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 1.5 }}>
          저장됐어요!
        </Alert>
      )}

      <Button
        variant="contained"
        fullWidth
        onClick={handleSave}
        disabled={selected === member?.dayOffStatusToday}
      >
        저장
      </Button>
    </Box>
  );
}