import React, { useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { DancingScript_700Bold, useFonts } from '@expo-google-fonts/dancing-script';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { ageFromBirthday } from '../../utils/age';
import { colors, layout, radii, spacing, typography } from '../../theme';

// Navigates into RootStack screens (EditProfile, AdminDashboard) even though this
// screen itself lives in the nested tab navigator — kept loosely typed rather than
// wiring a full CompositeScreenProps chain for a one-field navigation prop.
export const ProfileScreen = ({ navigation }: { navigation: any }) => {
  const { user } = useAuth();
  const [galleryWidth, setGalleryWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fontLoaded] = useFonts({ DancingScript_700Bold });

  if (!user) return null;

  const photos = [
    user.images.image_1,
    user.images.image_2,
    user.images.image_3,
    user.images.image_4,
    user.images.image_5,
    user.images.image_6,
  ].filter((uri): uri is string => !!uri);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!galleryWidth) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / galleryWidth);
    setActiveIndex(index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Spacer the width of the edit button keeps the title centered */}
        <View style={styles.headerSide} />
        <Text style={[styles.brand, fontLoaded && styles.brandFont]}>Wakesurf Club</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="create-outline" size={22} color={colors.ocean} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarWrap} onLayout={(e) => setGalleryWidth(e.nativeEvent.layout.width)}>
          {photos.length > 0 && galleryWidth > 0 ? (
            <>
              {/* Percentage widths on horizontal-ScrollView children can't resolve
                  (the content container's width depends on its children, which
                  depend on it back), so each slide is sized explicitly from the
                  measured wrap width instead of relying on '100%'/aspectRatio. */}
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
              <Text style={styles.avatarInitial}>{user.first_name?.[0] ?? '?'}</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>
          {user.first_name}
          {user.birthday ? `, ${ageFromBirthday(user.birthday)}` : ''}
        </Text>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

        {user.is_admin && (
          <Button
            title="Admin Dashboard"
            variant="secondary"
            onPress={() => navigation.navigate('AdminDashboard')}
            style={styles.spaced}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerSide: { width: 40 },
  brand: { fontSize: 36, color: '#3D8FD9', fontWeight: '700' },
  // The bold weight is its own font file; clear fontWeight so iOS doesn't fall back to the system font
  brandFont: { fontFamily: 'DancingScript_700Bold', fontWeight: 'normal' },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
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
  bio: { ...typography.body, textAlign: 'center', marginTop: spacing.md, color: colors.slate },
  spaced: { marginTop: spacing.md, width: '100%' },
});
