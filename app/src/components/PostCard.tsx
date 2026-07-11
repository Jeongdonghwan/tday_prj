/** 피드 글 카드 (목업 .post). 투표글이면 게이지, hot 마크, 작성자 상태칩, 우측 썸네일. */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { StatusChip } from '@/components/StatusChip';
import { colors, weight, type RelationshipStatus } from '@/theme';

export type FeedPost = {
  id: number;
  categoryLabel: string;
  title: string;
  body?: string;
  authorName: string;
  authorStatus: RelationshipStatus;
  timeText: string;
  hot?: boolean;
  poll?: { aLabel: string; bLabel: string; aPct: number };
  voteCount?: number;
  commentCount?: number;
  /** 우측 썸네일 (없으면 미표시) */
  imageUrl?: string;
};

export function PostCard({ post, onPress }: { post: FeedPost; onPress?: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {post.hot && (
        <View style={styles.hot}>
          <Icon name="fire" size={13} color={colors.rose} />
          <Text style={styles.hotText}>지금 뜨는 썰</Text>
        </View>
      )}

      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={[styles.cat, post.hot && { marginTop: 8 }]}>{post.categoryLabel}</Text>
          <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
          {post.body ? <Text style={styles.body} numberOfLines={2}>{post.body}</Text> : null}
        </View>
        {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.thumb} /> : null}
      </View>

      <View style={styles.author}>
        <StatusChip status={post.authorStatus} />
        <Text style={styles.authorName}>
          {post.authorName} · {post.timeText}
        </Text>
      </View>

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

      {(post.voteCount != null || post.commentCount != null) && (
        <View style={styles.stat}>
          {post.voteCount != null && (
            <View style={styles.statItem}>
              <Icon name="vote" size={14} color={colors.sub} />
              <Text style={styles.statText}>{post.voteCount.toLocaleString()}명 투표</Text>
            </View>
          )}
          {post.commentCount != null && (
            <View style={styles.statItem}>
              <Icon name="chat" size={14} color={colors.sub} />
              <Text style={styles.statText}>댓글 {post.commentCount}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: 20, paddingVertical: 17 },
  hot: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  hotText: { fontSize: 11, fontWeight: weight.extrabold as '800', color: colors.rose },
  topRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  topLeft: { flex: 1 },
  thumb: { width: 76, height: 76, borderRadius: 12, backgroundColor: colors.soft, marginTop: 2 },
  cat: { fontSize: 11.5, fontWeight: weight.bold as '700', color: colors.sub },
  title: { fontSize: 16.5, fontWeight: weight.bold as '700', color: colors.ink, lineHeight: 23, marginTop: 7, letterSpacing: -0.2 },
  body: { fontSize: 13.5, color: colors.bodySoft, lineHeight: 20, marginTop: 6 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11 },
  authorName: { fontSize: 12, color: colors.sub, fontWeight: weight.regular as '400' },
  vote: { marginTop: 13 },
  vrow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  vlabel: { fontSize: 12, fontWeight: weight.bold as '700' },
  vtrack: { height: 7, borderRadius: 999, backgroundColor: colors.blue, overflow: 'hidden' },
  vfill: { height: '100%', backgroundColor: colors.rose, borderRadius: 999 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 12, color: colors.sub, fontWeight: weight.regular as '400' },
});
