import React, { useEffect, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { apiGetPublicProfile } from '../../api/user';
import { colors, radii, spacing, typography } from '../../theme';
import type { PublicUser } from '../../types';

// Read-only view of another member's profile. Renders straight away from the
// name/photo passed in by the screen that linked here, then fills in the bio
// and remaining photos once the full profile loads.
export const UserProfileScreen = ({ route }: { route: any }) => {
  const { userId, firstName, image } = route.params;
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [galleryWidth, setGalleryWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    apiGetPublicProfile(userId)
      .then(setProfile)
      .catch(() => {});
  }, [userId]);

  const photos = profile
    ? [
        profile.images.image_1,
        profile.images.image_2,
        profile.images.image_3,
        profile.images.image_4,
        profile.images.image_5,
        profile.images.image_6,
      ].filter((uri): uri is string => !!uri)
    : image
      ? [image]
      : [];
  const name = profile?.first_name ?? firstName;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!galleryWidth) return;
    setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / galleryWidth));
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarWrap} onLayout={(e) => setGalleryWidth(e.nativeEvent.layout.width)}>
          {photos.length > 0 && galleryWidth > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={{ width: galleryWidth, height: galleryWidth }}
              >
                {photos.map((uri, index) => (
                  <Image
                    key={index}
                    source={{ uri }}
                    style={[styles.avatar, { width: galleryWidth, height: galleryWidth }]}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>
              {photos.length > 1 && (
                <View style={styles.dots}>
                  {photos.map((_, index) => (
                    <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{name?.[0] ?? '?'}</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>
          {name}
          {profile?.age != null ? `, ${profile.age}` : ''}
        </Text>
        {profile?.owner_or_rider ? <Text style={styles.role}>{profile.owner_or_rider}</Text> : null}

        {profile?.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>About Me</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  content: { padding: spacing.lg, alignItems: 'center' },
  avatarWrap: { width: '100%', marginBottom: spacing.md },
  avatar: { width: '100%', aspectRatio: 1, borderRadius: radii.lg, backgroundColor: colors.border },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 72, color: colors.ocean, fontWeight: '700' },
  dots: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: colors.white, width: 16 },
  name: { ...typography.heading, fontSize: 24, marginTop: spacing.sm },
  role: { ...typography.caption, marginTop: spacing.xs },
  section: { width: '100%', marginTop: spacing.lg },
  sectionHeading: { ...typography.heading, fontSize: 17, marginBottom: spacing.xs },
  bio: { ...typography.body, color: colors.slate },
});
