import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import { motion } from 'framer-motion';
import { fetchWeeklySnapshot } from '@/store/groupSlice';
import type { AppDispatch, RootState } from '@/store';

interface WeeklyLeaderboardProps {
  groupId: string;
}

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

const fmtMinutes = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;

const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

// MotionTableRow — правильный способ анимировать MUI компоненты
const MotionTableRow = motion(TableRow);

export default function WeeklyLeaderboard({ groupId }: WeeklyLeaderboardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const snapshot = useSelector(
    (s: RootState) => s.groups.weeklySnapshots[groupId]
  );
  const loading = useSelector((s: RootState) => s.groups.loading);

  useEffect(() => {
    dispatch(fetchWeeklySnapshot(groupId));
  }, [dispatch, groupId]);

  if (loading && !snapshot) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!snapshot) return null;

  const sorted = [...snapshot.members].sort((a, b) => a.rank - b.rank);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          주간 랭킹
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {snapshot.weekStart} ~ {snapshot.weekEnd}
        </Typography>
      </Box>

      {/* Top 3 podium */}
      {sorted.length >= 3 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: 2,
            mb: 3,
            pt: 1,
          }}
        >
          {[1, 0, 2].map((rankIdx) => {
            const m = sorted[rankIdx];
            if (!m) return null;
            const isFirst = rankIdx === 0;
            return (
              <motion.div
                key={m.userId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rankIdx * 0.1 }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                  <Typography fontSize={20}>{RANK_EMOJIS[rankIdx]}</Typography>
                  <Avatar
                    src={m.profileImageUrl}
                    sx={{
                      width: isFirst ? 52 : 40,
                      height: isFirst ? 52 : 40,
                      border: `3px solid ${RANK_COLORS[rankIdx]}`,
                    }}
                  >
                    {m.nickname[0]}
                  </Avatar>
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    noWrap
                    sx={{ maxWidth: 70, textAlign: 'center' }}
                  >
                    {m.nickname}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fmtMinutes(m.totalStudyMinutes)}
                  </Typography>
                  <Box
                    sx={{
                      height: isFirst ? 48 : rankIdx === 1 ? 32 : 24,
                      width: 52,
                      bgcolor: RANK_COLORS[rankIdx] + '40',
                      borderRadius: '4px 4px 0 0',
                      mt: 0.5,
                    }}
                  />
                </Box>
              </motion.div>
            );
          })}
        </Box>
      )}

      {/* Full table */}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>#</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>닉네임</TableCell>
            <Tooltip title="출석률">
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>출석</TableCell>
            </Tooltip>
            <Tooltip title="공부량">
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>공부</TableCell>
            </Tooltip>
            <Tooltip title="캠스터디">
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>캠</TableCell>
            </Tooltip>
            <Tooltip title="미션인증">
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>미션</TableCell>
            </Tooltip>
            <Tooltip title="위반">
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>위반</TableCell>
            </Tooltip>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((m, i) => (
            <MotionTableRow
              key={m.userId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              sx={{ bgcolor: i < 3 ? `${RANK_COLORS[i]}15` : 'transparent' }}
            >
              <TableCell sx={{ fontSize: 12 }}>
                {i < 3 ? RANK_EMOJIS[i] : m.rank}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Avatar
                    src={m.profileImageUrl}
                    sx={{ width: 20, height: 20, fontSize: 10 }}
                  >
                    {m.nickname[0]}
                  </Avatar>
                  <Typography variant="caption" noWrap sx={{ maxWidth: 90 }}>
                    {m.nickname}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="caption"
                  color={m.attendanceRate >= 0.8 ? 'success.main' : 'warning.main'}
                >
                  {fmtPct(m.attendanceRate)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="caption">
                  {fmtMinutes(m.totalStudyMinutes)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="caption">
                  {fmtMinutes(m.camStudyMinutes)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="caption">{m.missionCompletions}</Typography>
              </TableCell>
              <TableCell align="right">
                {m.violations > 0 ? (
                  <Chip
                    label={m.violations}
                    size="small"
                    color="warning"
                    sx={{ height: 16, fontSize: 10 }}
                  />
                ) : (
                  <Typography variant="caption" color="text.secondary">—</Typography>
                )}
              </TableCell>
            </MotionTableRow>
          ))}
        </TableBody>
      </Table>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', px: 0.5 }}>
        * 하루 20시간 초과 또는 연속 9시간 초과 기록은 집계에서 제외돼요
      </Typography>
    </Box>
  );
}