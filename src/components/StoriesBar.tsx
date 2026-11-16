import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import type { StoryGroup, User } from '../types';

const MAX_STORY_BYTES = 20 * 1024 * 1024; // matches the server's upload limit
const MAX_VIDEO_SECONDS = 30;

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images', 'videos'],
  allowsEditing: true,
  aspect: [9, 16],
  quality: 0.8,
  videoMaxDuration: MAX_VIDEO_SECONDS,
  videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
};

export type PickedStoryMedia = { uri: string; mediaType: 'image' | 'video'; mimeType?: string | null };

/** Asks camera vs. library, then hands back the picked photo or video (or nothing if cancelled). */
export const pickStoryMedia = (onPicked: (media: PickedStoryMedia) => void) => {
  const handle = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_STORY_BYTES) {
      Alert.alert('Too large', 'That file is over 20 MB. Try a shorter video.');
      return;
    }
    if (asset.type === 'video' && asset.duration && asset.duration / 1000 > MAX_VIDEO_SECONDS + 1) {
      Alert.alert('Too long', `Story videos can be up to ${MAX_VIDEO_SECONDS} seconds.`);
      return;
    }
    onPicked({
      uri: asset.uri,
      mediaType: asset.type === 'video' ? 'video' : 'image',
      mimeType: asset.mimeType,
    });
  };

  const fromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to post a story from your camera.');
      return;
    }
    try {
      handle(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
    } catch {
      // The iOS Simulator has no camera.
      Alert.alert('Camera unavailable', 'Choose a photo or video from your library instead.');
    }
  };

  const fromLibrary = async () => handle(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));

  Alert.alert('Add to your story', undefined, [
    { text: 'Take Photo or Video', onPress: fromCamera },
    { text: 'Choose from Library', onPress: fromLibrary },
    { text: 'Cancel', style: 'cancel' },
  ]);
};

interface Props {
  me: User;
  groups: StoryGroup[];
  onOpenGroup: (index: number) => void;
  onAddStory: () => void;
}

/** Horizontal row of story bubbles: yours first (tap + to add), then everyone else's. */
export const StoriesBar = ({ me, groups, onOpenGroup, onAddStory }: Props) => {
  const myIndex = groups.findIndex((g) => g.is_mine);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <View style={styles.item}>
        <TouchableOpacity
          onPress={() => (myIndex >= 0 ? onOpenGroup(myIndex) : onAddStory())}
          accessibilityLabel={myIndex >= 0 ? 'View your story' : 'Add to your story'}
        >
          <Bubble uri={me.images.image_1} ring={myIndex >= 0 ? 'seen' : 'none'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBadge} onPress={onAddStory} accessibilityLabel="Add to your story" hitSlop={8}>
          <Ionicons name="add" size={16} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.label} numberOfLines={1}>
          Your story
        </Text>
      </View>

      {groups.map((g, index) =>
        g.is_mine ? null : (
          <TouchableOpacity key={g.user.id} style={styles.item} onPress={() => onOpenGroup(index)}>
            <Bubble uri={g.user.images.image_1} ring={g.has_unseen ? 'unseen' : 'seen'} />
            <Text style={[styles.label, g.has_unseen && styles.labelUnseen]} numberOfLines={1}>
              {g.user.first_name}
            </Text>
          </TouchableOpacity>
        )
      )}
    </ScrollView>
  );
};

const Bubble = ({ uri, ring }: { uri: string | null; ring: 'unseen' | 'seen' | 'none' }) => (
  <View style={[styles.ring, ring === 'unseen' && styles.ringUnseen, ring === 'seen' && styles.ringSeen]}>
    {uri ? (
      <Image source={{ uri }} style={styles.avatar} contentFit="cover" />
    ) : (
      <View style={[styles.avatar, styles.avatarPlaceholder]}>
        <Ionicons name="person" size={28} color={colors.white} />
      </View>
    )}
  </View>
);

const BUBBLE = 62;
const RING = BUBBLE + 8;

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md },
  item: { width: RING, alignItems: 'center' },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringUnseen: { borderColor: colors.coral },
  ringSeen: { borderColor: colors.border },
  avatar: { width: BUBBLE, height: BUBBLE, borderRadius: BUBBLE / 2, backgroundColor: colors.border },
  avatarPlaceholder: { backgroundColor: colors.slate, alignItems: 'center', justifyContent: 'center' },
  addBadge: {
    position: 'absolute',
    top: RING - 22,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.lake,
    borderWidth: 2,
    borderColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.caption, fontSize: 12, marginTop: spacing.xs, maxWidth: RING + 8 },
  labelUnseen: { color: colors.ink, fontWeight: '600' },
});
