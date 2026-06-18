import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip,
  Chip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { AnimatePresence, motion } from 'framer-motion';
import {
  fetchChatMessages,
  sendChatMessage,
  toggleChatEnabled,
  setMemberSendPermission,
} from '@/store/groupSlice';
import type { AppDispatch, RootState } from '@/store';
import { GroupRole } from '@/types/group';

interface GroupChatProps {
  groupId: string;
  currentUserId: string;
}

export default function GroupChat({ groupId, currentUserId }: GroupChatProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const group = useSelector((s: RootState) =>
    s.groups.groups.find((g) => g.id === groupId)
  );
  const messages = useSelector(
    (s: RootState) => s.groups.messages[groupId] ?? []
  );
  const members = useSelector(
    (s: RootState) => s.groups.memberships[groupId] ?? []
  );
  const chatLoading = useSelector((s: RootState) => s.groups.chatLoading);

  const me = members.find((m) => m.userId === currentUserId);
  const isOwner = me?.role === GroupRole.OWNER;

  // Level 1: chat must be enabled
  // Level 2: this member must have send permission
  const canSend =
    !!group?.chatEnabled && (isOwner || !!me?.canSendMessages);

  useEffect(() => {
    if (group?.chatEnabled) {
      dispatch(fetchChatMessages({ groupId }));
    }
  }, [dispatch, groupId, group?.chatEnabled]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !canSend) return;
    dispatch(sendChatMessage({ groupId, content: trimmed }));
    setText('');
  };

  // ─── Chat disabled state ─────────────────────────────────────────────────

  if (!group?.chatEnabled) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
          gap: 1.5,
          color: 'text.secondary',
        }}
      >
        <ChatBubbleOutlineIcon sx={{ fontSize: 40, opacity: 0.3 }} />
        <Typography variant="body2">채팅이 꺼져 있어요</Typography>
        {isOwner && (
          <FormControlLabel
            control={
              <Switch
                checked={false}
                onChange={(_, v) =>
                  dispatch(toggleChatEnabled({ groupId, enabled: v }))
                }
              />
            }
            label="채팅 켜기"
          />
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Owner controls — toggle chat + default member send permission */}
      {isOwner && (
        <Box
          sx={{
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexWrap: 'wrap',
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={group.chatEnabled}
                size="small"
                onChange={(_, v) =>
                  dispatch(toggleChatEnabled({ groupId, enabled: v }))
                }
              />
            }
            label={<Typography variant="caption">채팅</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                checked={group.memberSendPermissionDefault}
                size="small"
                onChange={(_, v) => {
                  // toggle all non-owner members
                  members
                    .filter((m) => m.role !== GroupRole.OWNER)
                    .forEach((m) =>
                      dispatch(
                        setMemberSendPermission({
                          groupId,
                          userId: m.userId,
                          canSend: v,
                        })
                      )
                    );
                }}
              />
            }
            label={
              <Typography variant="caption">멤버 메시지 허용</Typography>
            }
          />
        </Box>
      )}

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            if (msg.isSystem) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Box textAlign="center">
                    <Chip
                      label={msg.content}
                      size="small"
                      sx={{ fontSize: 11, bgcolor: 'action.hover' }}
                    />
                  </Box>
                </motion.div>
              );
            }
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: isMe ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    gap: 1,
                  }}
                >
                  {!isMe && (
                    <Avatar
                      src={msg.profileImageUrl}
                      sx={{ width: 28, height: 28, fontSize: 12 }}
                    >
                      {msg.nickname[0]}
                    </Avatar>
                  )}
                  <Box sx={{ maxWidth: '70%' }}>
                    {!isMe && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 0.5 }}
                      >
                        {msg.nickname}
                      </Typography>
                    )}
                    <Box
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: isMe
                          ? '16px 16px 4px 16px'
                          : '16px 16px 16px 4px',
                        bgcolor: isMe ? 'primary.main' : 'action.hover',
                        color: isMe ? 'primary.contrastText' : 'text.primary',
                      }}
                    >
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                        {msg.content}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        textAlign: isMe ? 'right' : 'left',
                        mt: 0.25,
                        mx: 0.5,
                        fontSize: 10,
                      }}
                    >
                      {new Date(msg.sentAt).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </Box>

      {/* Input */}
      <Divider />
      <Box sx={{ p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        {canSend ? (
          <>
            <TextField
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="메시지 입력..."
              multiline
              maxRows={4}
              fullWidth
              size="small"
              sx={{ '& fieldset': { borderRadius: 3 } }}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!text.trim() || chatLoading}
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ py: 1, textAlign: 'center', width: '100%' }}
          >
            메시지 전송 권한이 없어요
          </Typography>
        )}
      </Box>
    </Box>
  );
}