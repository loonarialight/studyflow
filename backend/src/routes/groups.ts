                                                                                                    import { Router } from 'express';
import * as ctrl from '../controllers/groupController';
import { requireMember, requireOwner } from '../middleware/groupAuth';

// Предполагается что auth middleware уже подключён глобально
// и добавляет req.userId. Если нет — добавь его сюда:
// import { authMiddleware } from '../middleware/auth';
// router.use(authMiddleware);

const router = Router();

// ─── Без привязки к конкретной группе ────────────────────────────────────────

/** Мои группы */
router.get('/my', ctrl.getMyGroups);

/** Создать группу */
router.post('/', ctrl.createGroup);

/** Вступить по invite-коду (deferred deep link) */
router.post('/join-by-code', ctrl.joinByCode);

// ─── Действия с конкретной группой ───────────────────────────────────────────

/** Вступить по id */
router.post('/:id/join', ctrl.joinGroup);

/** Покинуть группу */
router.post('/:id/leave', requireMember, ctrl.leaveGroup);

/** Обновить настройки группы (только владелец) */
router.patch('/:id', requireOwner, ctrl.updateGroup);

// ─── Участники ────────────────────────────────────────────────────────────────

/** Список участников */
router.get('/:id/members', requireMember, ctrl.getMembers);

/** Исключить участника (только владелец) */
router.delete('/:id/members/:userId', requireOwner, ctrl.kickMember);

/** Добавить нарушение участнику (только владелец) */
router.post('/:id/members/:userId/violations', requireOwner, ctrl.addViolation);

// ─── Передача прав ────────────────────────────────────────────────────────────

/** 그룹장 위임 — передать владение (только владелец) */
router.put('/:id/owner', requireOwner, ctrl.transferOwnership);

// ─── Day-off ──────────────────────────────────────────────────────────────────

/** Выставить day-off статус */
router.post('/:id/dayoff', requireMember, ctrl.setDayOff);

// ─── Чат ──────────────────────────────────────────────────────────────────────

/** Получить сообщения (с пагинацией через ?before=ISO_DATE) */
router.get('/:id/chat', requireMember, ctrl.getChatMessages);

/** Отправить сообщение */
router.post('/:id/chat', requireMember, ctrl.sendMessage);

// ─── Статистика ───────────────────────────────────────────────────────────────

/** Недельный снапшот (батч-агрегация, не realtime) */
router.get('/:id/stats/weekly', requireMember, ctrl.getWeeklySnapshot);

// ─── Инвайт ───────────────────────────────────────────────────────────────────

/** Перегенерировать invite-код (только владелец) */
router.post('/:id/invite', requireOwner, ctrl.regenerateInviteCode);

export default router;