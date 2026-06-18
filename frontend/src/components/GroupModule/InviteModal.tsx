import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Divider,
  Alert,
  Chip,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import LockIcon from '@mui/icons-material/Lock';
import { regenerateInviteCode } from '@/store/groupSlice';
import { GroupVisibility } from '@/types/group';
import type { AppDispatch, RootState } from '@/store';

interface InviteModalProps {
  groupId: string;
  open: boolean;
  onClose: () => void;
}

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

export default function InviteModal({ groupId, open, onClose }: InviteModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const group = useSelector((s: RootState) =>
    s.groups.groups.find((g) => g.id === groupId)
  );

  if (!group) return null;

  const inviteLink = `${BASE_URL}/join/${group.inviteCode}`;
  const isPrivate = group.visibility === GroupVisibility.PRIVATE;

  const copy = async (text: string, type: 'link' | 'code') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await dispatch(regenerateInviteCode(groupId)).unwrap();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={700}>초대 링크</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Invite link */}
        <Box>
          <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
            링크 공유
          </Typography>
          <Box display="flex" gap={1}>
            <TextField
              value={inviteLink}
              size="small"
              fullWidth
              InputProps={{ readOnly: true, sx: { fontSize: 12 } }}
            />
            <IconButton
              onClick={() => copy(inviteLink, 'link')}
              color={copied === 'link' ? 'success' : 'default'}
              size="small"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>
          {copied === 'link' && (
            <Typography variant="caption" color="success.main">
              복사됐어요!
            </Typography>
          )}
        </Box>

        {/* Invite code only */}
        <Box>
          <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
            초대 코드만
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={group.inviteCode}
              sx={{ fontFamily: 'monospace', fontSize: 14, letterSpacing: 2 }}
            />
            <IconButton
              onClick={() => copy(group.inviteCode, 'code')}
              color={copied === 'code' ? 'success' : 'default'}
              size="small"
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={handleRegenerate}
              disabled={regenerating}
              size="small"
              title="코드 재발급"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Private group — password reminder */}
        {isPrivate && (
          <>
            <Divider />
            <Alert icon={<LockIcon fontSize="small" />} severity="info">
              <Typography variant="caption">
                비공개 그룹이에요. 참여자가 링크 클릭 시 비밀번호도 함께 공유해주세요.
              </Typography>
            </Alert>
          </>
        )}

        <Divider />

        {/* Deep link explanation */}
        <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 1.5 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            📱 앱이 없으면 링크를 클릭하면 설치 페이지로 이동해요.
            설치 후 자동으로 이 그룹에 참여돼요.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}