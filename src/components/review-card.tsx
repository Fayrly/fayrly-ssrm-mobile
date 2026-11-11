import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Review } from '@/lib/api';
import { formatShortDate } from '@/lib/format';
import { c, f, hairline } from '@/theme';
import { Avatar, Stars } from '@/components/ui';

export function ReviewCard({
  review,
  onEventPress,
  compact,
}: {
  review: Review;
  onEventPress?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.topLine}>
        <Stars value={review.rating} size={13} />
        <Text style={styles.date}>{formatShortDate(review.created_at)}</Text>
      </View>
      <Text style={styles.body} numberOfLines={compact ? 3 : undefined}>
        {review.body}
      </Text>
      <View style={styles.footer}>
        <Avatar name={review.user_name} size={30} />
        <View style={styles.footerText}>
          <Text style={styles.name} numberOfLines={1}>
            {review.user_name}
          </Text>
          {onEventPress ? (
            <Pressable onPress={onEventPress} hitSlop={6} accessibilityRole="link">
              <Text style={styles.event} numberOfLines={1}>
                {review.event_title}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.event} numberOfLines={1}>
              {review.event_title}
            </Text>
          )}
        </View>
        {review.helpful_count > 0 ? (
          <Text style={styles.helpful}>{review.helpful_count} membantu</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: hairline,
    borderBottomColor: c.line,
    gap: 9,
  },
  compact: {
    paddingVertical: 14,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontFamily: f.regular,
    fontSize: 11,
    color: c.soft,
  },
  body: {
    fontFamily: f.regular,
    fontSize: 13,
    lineHeight: 20,
    color: c.ink,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 2,
  },
  footerText: {
    flex: 1,
  },
  name: {
    fontFamily: f.semibold,
    fontSize: 12,
    color: c.ink,
  },
  event: {
    fontFamily: f.regular,
    fontSize: 11,
    color: c.mint700,
  },
  helpful: {
    fontFamily: f.regular,
    fontSize: 10,
    color: c.soft,
  },
});
