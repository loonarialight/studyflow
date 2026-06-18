import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { joinGroup, joinGroupByInviteCode } from '@/store/groupSlice';
import { GroupVisibility } from '@/types/group';
import type { AppDispatch, RootState } from '@/store';
import GroupList from './GroupList';
import GroupDetail from './GroupDetail';
import CreateGroupModal from './CreateGroupModal';

interface GroupModuleProps {
  currentUserId: string;
}

export default function GroupModule({ currentUserId }: GroupModuleProps) {
  const dispatch = useDispatch<AppDispatch>();
  const activeGroupId = useSelector((s: RootState) => s.groups.activeGroupId);

  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError('');
    try {
      await dispatch(
        joinGroupByInviteCode({
          inviteCode: joinCode.trim(),
          password: joinPassword || undefined,
        })
      ).unwrap();
      setJoinOpen(false);
      resetJoinForm();
    } catch (e) {
      const msg = (e as Error).message;
      // If server returns a password-required signal
      if (msg.includes('password') || msg.includes('비밀번호')) {
        setNeedsPassword(true);
        setJoinError('비공개 그룹이에요. 비밀번호를 입력해주세요.');
      } else {
        setJoinError(msg);
      }
    } finally {
      setJoinLoading(false);
    }
  };

  const resetJoinForm = () => {
    setJoinCode('');
    setJoinPassword('');
    setNeedsPassword(false);
    setJoinError('');
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {activeGroupId ? (
        <GroupDetail
          groupId={activeGroupId}
          currentUserId={currentUserId}
        />
      ) : (
        <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
          <GroupList
            onCreateClick={() => setCreateOpen(true)}
            onJoinClick={() => setJoinOpen(true)}
          />
        </Box>
      )}

      {/* Create group modal */}
      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Join by invite code modal */}
      <Dialog
        open={joinOpen}
        onClose={() => {
          setJoinOpen(false);
          resetJoinForm();
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700}>그룹 참여</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
        >
          {joinError && <Alert severity="error">{joinError}</Alert>}

          <TextField
            label="초대 코드"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            fullWidth
            placeholder="코드를 입력하세요"
            autoFocus
          />

          {/* Password field — shown after server indicates private group */}
          {needsPassword && (
            <TextField
              label="비밀번호"
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              fullWidth
              autoFocus
              InputProps={{
                startAdornment: <LockIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />,
              }}
            />
          )}

          <Typography variant="caption" color="text.secondary">
            초대 링크가 있다면 그냥 클릭하면 자동으로 참여돼요.
            코드만 있을 경우 여기에 입력하세요.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => {
              setJoinOpen(false);
              resetJoinForm();
            }}
          >
            취소
          </Button>
          <Button
            variant="contained"
            onClick={handleJoin}
            disabled={!joinCode.trim() || joinLoading}
          >
            {joinLoading ? '참여 중...' : '참여하기'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}