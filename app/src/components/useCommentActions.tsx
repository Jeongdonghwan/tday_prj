/** 댓글 신고/작성자 차단 공용 훅 — 글 댓글('comment')·이슈 댓글('issue_comment') 겸용.
 *  UGC 개별 신고 기능 (애플/구글 커뮤니티 앱 심사 요건). */
import { useState } from 'react';

import { blockUser, reportTarget } from '@/api/moderation';
import { useAuth } from '@/auth/AuthContext';
import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { confirmAsync, notify, requireLogin } from '@/lib/dialogs';

type TargetComment = { id: number; author: { id: number | null } };

export function useCommentActions(targetType: 'comment' | 'issue_comment', onChanged?: () => void) {
  const { token, user } = useAuth();
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
          label: '댓글 신고하기',
          onPress: async () => {
            if (!token) return requireLogin();
            if (!(await confirmAsync('신고', '이 댓글을 신고할까요?', '신고'))) return;
            try {
              const r = await reportTarget({ target_type: targetType, target_id: target.id, reason: '부적절' }, token);
              notify('신고', r.blinded ? '신고가 누적되어 가려졌어요.' : '신고가 접수됐어요.');
              if (r.blinded) onChanged?.();
            } catch {
              notify('신고', '신고에 실패했어요.');
            }
          },
        },
        {
          label: '작성자 차단',
          destructive: true,
          onPress: async () => {
            if (!token || !target.author.id) return;
            try {
              await blockUser(target.author.id, token);
              notify('차단', '차단했어요. 이 유저의 글과 댓글이 보이지 않아요.');
              onChanged?.();
            } catch {
              notify('차단', '차단에 실패했어요.');
            }
          },
        },
      ];

  const sheet = <ActionSheet visible={!!target} actions={actions} onClose={() => setTarget(null)} />;

  return { openFor, isMine, sheet };
}
