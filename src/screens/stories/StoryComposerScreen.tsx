import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiPostStory } from '../../api/stories';
import { toApiError } from '../../api/client';
import { colors, radii, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

const CAPTION_LIMIT = 200;

type Props = NativeStackScreenProps<RootStackParamList, 'StoryComposer'>;

// Preview a picked photo or video, add an optional caption, and post it as a story.
export const StoryComposerScreen = ({ navigation, route }: Props) => {
  const { uri, mediaType, mimeType } = route.params;
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState<number | null>(null);

  const player = useVideoPlayer(mediaType === 'video' ? uri : null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const posting = progress !== null;

  const handlePost = async () => {
    setProgress(0);
    try {
      await apiPostStory({ uri, mediaType, mimeType, caption }, setProgress);
      navigation.goBack();
    } catch (error) {
      setProgress(null);
      const { status, message } = toApiError(error);
      Alert.alert(
        'Could not post story',
        status === 413 ? 'That file is too large. Try a shorter video.' : message
      );
    }
  };

  return (
    <View style={styles.container}>
      {mediaType === 'video' ? (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      ) : (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}

      <TouchableOpacity
        style={[styles.close, { top: insets.top + spacing.sm }]}
        onPress={() => navigation.goBack()}
        disabled={posting}
        accessibilityLabel="Discard story"
      >
        <Ionicons name="close" size={28} color={colors.white} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottom}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.bottomInner, { paddingBottom: insets.bottom + spacing.md }]}>
          <TextInput
            style={styles.caption}
            placeholder="Add a caption (optional)"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={caption}
            onChangeText={setCaption}
            maxLength={CAPTION_LIMIT}
            multiline
            editable={!posting}
          />
          <View style={styles.row}>
            <Text style={styles.count}>
              {caption.length}/{CAPTION_LIMIT}
            </Text>
            <TouchableOpacity style={styles.post} onPress={handlePost} disabled={posting}>
              {posting ? (
                <>
                  <ActivityIndicator color={colors.white} />
                  <Text style={styles.postText}>{Math.round((progress ?? 0) * 100)}%</Text>
                </>
              ) : (
                <>
                  <Text style={styles.postText}>Share story</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.white} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  close: {
    position: 'absolute',
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomInner: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  caption: {
    ...typography.body,
    color: colors.white,
    minHeight: 44,
    maxHeight: 120,
    paddingVertical: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  count: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },
  post: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.coral,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    minWidth: 130,
    justifyContent: 'center',
  },
  postText: { ...typography.body, color: colors.white, fontWeight: '700' },
});
