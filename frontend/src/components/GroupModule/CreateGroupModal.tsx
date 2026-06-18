import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
  Chip,
  Box,
  Typography,
  Divider,
  InputAdornment,
  Alert,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import { createGroup } from '@/store/groupSlice';
import {
  GroupType,
  GroupVisibility,
  CreateGroupPayload,
} from '@/types/group';
import type { AppDispatch } from '@/store';

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_RULES = {
  text: '',
  minStudyMinutesPerDay: 60,
  maxDayOffsPerPeriod: 3,
  allowedApps: [] as string[],
};

export default function CreateGroupModal({ open, onClose }: CreateGroupModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appInput, setAppInput] = useState('');

  const [form, setForm] = useState<CreateGroupPayload>({
    name: '',
    type: GroupType.STUDY,
    visibility: GroupVisibility.PUBLIC,
    password: '',
    rules: { ...DEFAULT_RULES },
    announcement: '',
  });

  const set = <K extends keyof CreateGroupPayload>(
    key: K,
    value: CreateGroupPayload[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const setRule = <K extends keyof typeof DEFAULT_RULES>(
    key: K,
    value: (typeof DEFAULT_RULES)[K]
  ) => setForm((f) => ({ ...f, rules: { ...f.rules, [key]: value } }));

  const addApp = () => {
    const trimmed = appInput.trim();
    if (trimmed && !form.rules.allowedApps.includes(trimmed)) {
      setRule('allowedApps', [...form.rules.allowedApps, trimmed]);
      setAppInput('');
    }
  };

  const removeApp = (app: string) =>
    setRule(
      'allowedApps',
      form.rules.allowedApps.filter((a) => a !== app)
    );

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('그룹 이름을 입력해주세요');
      return;
    }
    if (
      form.visibility === GroupVisibility.PRIVATE &&
      !form.password?.trim()
    ) {
      setError('비공개 그룹에는 비밀번호가 필요해요');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await dispatch(createGroup(form)).unwrap();
      onClose();
      setForm({ name: '', type: GroupType.STUDY, visibility: GroupVisibility.PUBLIC, password: '', rules: { ...DEFAULT_RULES }, announcement: '' });
    } catch (e) {
      setError((e as Error).message ?? '오류가 발생했어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>그룹 만들기</DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Group name */}
        <TextField
          label="그룹 이름"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          fullWidth
          inputProps={{ maxLength: 30 }}
        />

        {/* Type — 스터디 vs 미션 */}
        <Box>
          <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
            그룹 유형
          </Typography>
          <ToggleButtonGroup
            value={form.type}
            exclusive
            onChange={(_, v) => v && set('type', v)}
            size="small"
            fullWidth
          >
            <ToggleButton value={GroupType.STUDY}>
              📚 스터디 그룹 (무료)
            </ToggleButton>
            <ToggleButton value={GroupType.MISSION}>
              🎯 미션 그룹 (유료)
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Visibility — set once, determines join flow */}
        <Box>
          <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
            공개 설정 (변경 불가)
          </Typography>
          <ToggleButtonGroup
            value={form.visibility}
            exclusive
            onChange={(_, v) => v && set('visibility', v)}
            size="small"
            fullWidth
          >
            <ToggleButton value={GroupVisibility.PUBLIC}>
              <PublicIcon sx={{ mr: 0.5, fontSize: 16 }} />
              공개
            </ToggleButton>
            <ToggleButton value={GroupVisibility.PRIVATE}>
              <LockIcon sx={{ mr: 0.5, fontSize: 16 }} />
              비공개
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Password — only shown when private */}
        {form.visibility === GroupVisibility.PRIVATE && (
          <TextField
            label="비밀번호"
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            fullWidth
            helperText="참여 시 이 비밀번호를 공유해주세요"
          />
        )}

        <Divider />

        {/* Rules — free text (필독) */}
        <TextField
          label="필독 규칙 (참여 전 공개)"
          value={form.rules.text}
          onChange={(e) => setRule('text', e.target.value)}
          multiline
          rows={3}
          fullWidth
          helperText="가입 신청 전에 잠재 참여자에게 보여지는 텍스트예요"
        />

        {/* Structured rules */}
        <Box display="flex" gap={2}>
          <TextField
            label="일 최소 공부 시간 (분)"
            type="number"
            value={form.rules.minStudyMinutesPerDay}
            onChange={(e) =>
              setRule('minStudyMinutesPerDay', Number(e.target.value))
            }
            inputProps={{ min: 0, max: 1200 }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="허용 day-off 횟수"
            type="number"
            value={form.rules.maxDayOffsPerPeriod}
            onChange={(e) =>
              setRule('maxDayOffsPerPeriod', Number(e.target.value))
            }
            inputProps={{ min: 0, max: 30 }}
            sx={{ flex: 1 }}
          />
        </Box>

        {/* Allowed apps */}
        <Box>
          <TextField
            label="허용 앱 추가"
            value={appInput}
            onChange={(e) => setAppInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addApp()}
            fullWidth
            helperText="Enter 또는 추가 버튼으로 입력"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button size="small" onClick={addApp}>추가</Button>
                </InputAdornment>
              ),
            }}
          />
          {form.rules.allowedApps.length > 0 && (
            <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
              {form.rules.allowedApps.map((app) => (
                <Chip
                  key={app}
                  label={app}
                  size="small"
                  onDelete={() => removeApp(app)}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Announcement */}
        <TextField
          label="공지사항"
          value={form.announcement}
          onChange={(e) => set('announcement', e.target.value)}
          multiline
          rows={2}
          fullWidth
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={loading}>취소</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? '생성 중...' : '만들기'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}