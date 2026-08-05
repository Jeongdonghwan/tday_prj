/** 피드 글 카드 (DESIGN_UPDATE §2). 헤더(아바타/닉/상태칩/메타) + 본문(±썸네일) + 투표 + 알약 액션. */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { PollResultBar } from '@/components/PollResultBar';
import { colors, radius, statusTheme, weight, type RelationshipStatus } from '@/theme';

// DESIGN_UPDATE §2 고정 색 (기존 토큰 외 문서 지정값)
const BODY = '#4E5968';
const LIKE_BORDER_ON = '#F8C3CE';

export type FeedPost = {
  id: number;
  tag: string; // 말머리 미니뱃지 (썰/고민/투표 등)
  categoryLabel: string; // 메타줄 카테고리
  title: string;
  body?: string;
  authorName: string;
  authorStatus: RelationshipStatus;
  authorAvatarNo: number;
  timeText: string;
  viewCount: number;
  poll?: { aLabel: string; bLabel: string; aPct: number };
  voteCount?: number;
  myVote?: 'A' | 'B' | null;
  likeCount: number;
  commentCount: number;
  /** 이미지 첨부 글 썸네일 (없으면 텍스트 글) */
  imageUrl?: string;
  /** K-Story(한국 인기글 번역·각색) 여부 → 전용 뱃지 */
  isKStory?: boolean;
};

export function PostCard({ post, onPress }: { post: FeedPost; onPress?: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* 헤더 행 */}
      <View style={styles.header}>
        <Avatar avatarNo={post.authorAvatarNo} size={34} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{post.authorName}</Text>
            <Text style={styles.status}>· {statusTheme[post.authorStatus].label}</Text>
          </View>
          <Text style={styles.meta}>
            {post.categoryLabel} · {post.timeText} · 조회 {post.viewCount.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* 본문 행 */}
      <View style={styles.bodyRow}>
        <View style={{ flex: 1 }}>
          {/* K-Story 뱃지 — 한국 인기글 번역·각색 글 구분 */}
          {post.isKStory && (
            <View style={styles.kstoryBadge}>
              <Text style={styles.kstoryBadgeText}>{t('post.kstoryBadge')}</Text>
            </View>
          )}
          <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
          {post.body ? <Text style={styles.body} numberOfLines={2}>{post.body}</Text> : null}
        </View>
        {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.thumb} /> : null}
      </View>

      {/* 투표형: 공용 결과바 (우세 로즈 / 열세 그레이, 퍼센트만, 내 투표 ✓) */}
      {post.poll && (
        <PollResultBar
          aLabel={post.poll.aLabel}
          bLabel={post.poll.bLabel}
          aPct={post.poll.aPct}
          total={post.voteCount}
          myVote={post.myVote}
        />
      )}

      {/* 액션 행: 알약 버튼 */}
      <View style={styles.actions}>
        <View style={styles.pill}>
          <Icon name="heart" size={14} color={BODY} />
          <Text style={styles.pillText}>{t('post.like')} {post.likeCount}</Text>
        </View>
        <View style={styles.pill}>
          <Icon name="chat" size={14} color={BODY} />
          <Text style={styles.pillText}>{t('post.comment')} {post.commentCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderWidth: 0.5,
    borderColor: colors.line,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 17,
    paddingBottom: 13,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 13, fontWeight: weight.semibold as '600', color: colors.ink },
  status: { fontSize: 10.5, color: colors.statusText },
  meta: { fontSize: 11.5, color: colors.sub, marginTop: 2 },
  bodyRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 11 },
  kstoryBadge: { alignSelf: 'flex-start', backgroundColor: '#1C1430', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 6 },
  kstoryBadgeText: { color: '#F5C36B', fontSize: 10, fontWeight: weight.extrabold as '800', letterSpacing: 0.5 },
  title: { flex: 1, fontSize: 15, fontWeight: weight.semibold as '600', color: colors.ink, lineHeight: 22, letterSpacing: -0.4 },
  body: { fontSize: 13.5, color: BODY, lineHeight: 20, marginTop: 4 },
  thumb: { width: 66, height: 66, borderRadius: 12, backgroundColor: colors.soft },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 0.5,
    borderColor: colors.line,
    backgroundColor: colors.soft,
    borderRadius: 17,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillText: { fontSize: 12.5, fontWeight: '500', color: BODY },
});

// (공감 활성 시 pill: bg roseBg, border LIKE_BORDER_ON, text rose 600 — 상세화면에서 상태 반영)
export const LIKE_ACTIVE = { bg: colors.roseBg, border: LIKE_BORDER_ON };
