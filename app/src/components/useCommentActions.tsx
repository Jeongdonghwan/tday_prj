/** 댓글 신고/작성자 차단 공용 훅 — 글 댓글('comment')·이슈 댓글('issue_comment') 겸용.
 *  UGC 개별 신고 기능 (애플/구글 커뮤니티 앱 심사 요건). */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { blockUser, reportTarget } from '@/api/moderation';
import { useAuth } from '@/auth/AuthContext';
import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { confirmAsync, notify, requireLogin } from '@/lib/dialogs';

type TargetComment = { id: number; author: { id: number | null } };

export function useCommentActions(targetType: 'comment' | 'issue_comment', onChanged?: () => void) {
  const { token, user } = useAuth();
  const { t } = useTranslation();
  const [target, setTarget] = useState<TargetComment | null>(null);

  /** 내 댓글이면 메뉴 미노출용 */
  const isMine = (c: TargetComment) => user != null && c.author.id === user.id;

  const openFor = (c: TargetComment) => {
    if (!token) return requireLogin();
    setTarget(c);
  };

  const actions: SheetAction[] = !target
    ? []
    : [
        {
          label: t('report.reportComment'),
          onPress: async () => {
            if (!token) return requireLogin();
            if (!(await confirmAsync(t('report.reportComment'), t('report.reportComment') + '?', t('report.reportComment')))) return;
            try {
              const r = await reportTarget({ target_type: targetType, target_id: target.id, reason: '부적절' }, token);
              notify(t('report.reportComment'), t('report.reported'));
              if (r.blinded) onChanged?.();
            } catch {
              notify(t('report.reportComment'), t('common.retry'));
            }
          },
        },
        {
          label: t('report.blockAuthor'),
          destructive: true,
          onPress: async () => {
            if (!token || !target.author.id) return;
            try {
              await blockUser(target.author.id, token);
              notify(t('report.blockAuthor'), t('report.blocked'));
              onChanged?.();
            } catch {
              notify(t('report.blockAuthor'), t('common.retry'));
            }
          },
        },
      ];

  const sheet = <ActionSheet visible={!!target} actions={actions} onClose={() => setTarget(null)} />;

  return { openFor, isMine, sheet };
}
