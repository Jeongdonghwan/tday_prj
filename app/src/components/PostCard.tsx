/** 피드 글 카드 (DESIGN_UPDATE §2). 헤더(아바타/닉/상태칩/메타) + 본문(±썸네일) + 투표 + 알약 액션. */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { StatusChip } from '@/components/StatusChip';
import { colors, radius, weight, type RelationshipStatus } from '@/theme';

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
  likeCount: number;
  commentCount: number;
  /** 이미지 첨부 글 썸네일 (없으면 텍스트 글) */
  imageUrl?: string;
};

export function PostCard({ post, onPress }: { post: FeedPost; onPress?: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* 헤더 행 */}
      <View style={styles.header}>
        <Avatar avatarNo={post.authorAvatarNo} size={34} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{post.authorName}</Text>
            <StatusChip status={post.authorStatus} small />
          </View>
          <Text style={styles.meta}>
            {post.categoryLabel} · {post.timeText} · 조회 {post.viewCount.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* 본문 행 */}
      <View style={styles.bodyRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleLine}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{post.tag}</Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
          </View>
          {post.body ? <Text style={styles.body} numberOfLines={2}>{post.body}</Text> : null}
        </View>
        {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.thumb} /> : null}
      </View>

      {/* 투표형: rose/blue 채움 게이지 */}
      {post.poll && (
        <View style={styles.vote}>
          <View style={styles.vrow}>
            <Text style={[styles.vlabel, { color: colors.rose }]}>
              {post.poll.aLabel} · {post.poll.aPct}%
            </Text>
            <Text style={[styles.vlabel, { color: colors.blue }]}>
              {100 - post.poll.aPct}% · {post.poll.bLabel}
            </Text>
          </View>
          <View style={styles.vtrack}>
            <View style={[styles.vfill, { width: `${post.poll.aPct}%` }]} />
          </View>
        </View>
      )}

      {/* 액션 행: 알약 버튼 */}
      <View style={styles.actions}>
        <View style={styles.pill}>
          <Icon name="heart" size={14} color={BODY} />
          <Text style={styles.pillText}>공감 {post.likeCount}</Text>
        </View>
        <View style={styles.pill}>
          <Icon name="chat" size={14} color={BODY} />
          <Text style={styles.pillText}>댓글 {post.commentCount}</Text>
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 13, fontWeight: weight.semibold as '600', color: colors.ink },
  meta: { fontSize: 11.5, color: colors.sub, marginTop: 2 },
  bodyRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 11 },
  titleLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: colors.roseBg, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6, marginTop: 1 },
  tagText: { color: colors.rose, fontSize: 10.5, fontWeight: weight.bold as '700' },
  title: { flex: 1, fontSize: 15, fontWeight: weight.semibold as '600', color: colors.ink, lineHeight: 22, letterSpacing: -0.4 },
  body: { fontSize: 13.5, color: BODY, lineHeight: 20, marginTop: 4 },
  thumb: { width: 66, height: 66, borderRadius: 12, backgroundColor: colors.soft },
  vote: { marginTop: 12 },
  vrow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  vlabel: { fontSize: 12, fontWeight: weight.bold as '700' },
  vtrack: { height: 8, borderRadius: 5, backgroundColor: colors.blue, overflow: 'hidden' },
  vfill: { height: '100%', backgroundColor: colors.rose, borderRadius: 5 },
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
