import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing } from '../../theme';

// Nav header title for a group chat: the outing's photo beside its name.
export const ChatHeaderTitle = ({ title, image }: { title: string; image?: string | null }) => (
  <View style={styles.row}>
    {image ? <Image source={{ uri: image }} style={styles.image} contentFit="cover" /> : null}
    <Text style={styles.title} numberOfLines={1}>
      {title}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: 260 },
  image: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border },
  title: { fontSize: 17, fontWeight: '600', color: colors.ink, flexShrink: 1 },
});
