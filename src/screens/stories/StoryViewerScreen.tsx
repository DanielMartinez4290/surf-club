import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { apiDeleteStory, apiMarkStoryViewed } from '../../api/stories';
import { apiSendMessage } from '../../api/messages';
import { toApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { promptBlock, promptReport } from '../../utils/moderation';
import { colors, radii, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import type { Story, StoryGroup } from '../../types';

const IMAGE_DURATION_MS = 5000;
const TICK_MS = 50;

type Props = NativeStackScreenProps<RootStackParamList, 'StoryViewer'>;

const firstUnseenIndex = (group: StoryGroup) => {
  if (group.is_mine) return 0;
  const i = group.stories.findIndex((s) => !s.viewed);
  return i === -1 ? 0 : i;
};

const timeAgo = (iso: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

/**
 * Full-screen story player. Plays every story in a member's group, then moves on to
 * the next member. Tap right/left to skip, hold to pause.
 */
export const StoryViewerScreen = ({ navigation, route }: Props) => {
  const { user: me } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [groups, setGroups] = useState<StoryGroup[]>(route.params.groups);
  const [groupIndex, setGroupIndex] = useState(route.params.startGroupIndex);
  const [storyIndex, setStoryIndex] = useState(() =>
    firstUnseenIndex(route.params.groups[route.params.startGroupIndex])
  );
  const [holding, setHolding] = useState(false);
  const [replyFocused, setReplyFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  // Keyed by story id so a load/error event can never be applied to the wrong story.
  const [loadedStoryId, setLoadedStoryId] = useState<number | null>(null);
  const [failedStoryId, setFailedStoryId] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const group = groups[groupIndex];
  const story: Story | undefined = group?.stories[storyIndex];
  const isVideo = story?.media_type === 'video';
  const imageReady = !!story && loadedStoryId === story.id;
  const mediaFailed = !!story && failedStoryId === story.id;
  const focused = useIsFocused();
  const paused = !focused || holding || replyFocused || menuOpen || viewersOpen || sending;

  const progress = useSharedValue(0);
  const elapsedMs = useRef(0);

  const close = useCallback(() => navigation.goBack(), [navigation]);

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(firstUnseenIndex(groups[groupIndex + 1]));
    } else {
      close();
    }
  }, [group, groups, groupIndex, storyIndex, close]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(0);
    } else {
      // Already at the very first story: restart it.
      elapsedMs.current = 0;
      progress.value = 0;
      if (isVideo) player.currentTime = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, isVideo]);

  // --- Video ---
  const player = useVideoPlayer(isVideo && story ? story.media_url : null, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = TICK_MS / 1000;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (!isVideo) return;
    if (paused || status !== 'readyToPlay') player.pause();
    else player.play();
  }, [player, isVideo, paused, status]);

  useEffect(() => {
    if (!isVideo) return;
    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (player.duration > 0) progress.value = Math.min(1, currentTime / player.duration);
    });
    const endSub = player.addListener('playToEnd', goNext);
    return () => {
      timeSub.remove();
      endSub.remove();
    };
  }, [player, isVideo, goNext, progress]);

  useEffect(() => {
    if (isVideo && status === 'error' && story) setFailedStoryId(story.id);
  }, [isVideo, status, story]);

  // --- Per-story setup: reset progress, mark as seen, warm up the next image ---
  useEffect(() => {
    if (!story) return;
    elapsedMs.current = 0;
    progress.value = 0;

    if (!story.viewed && !group.is_mine) {
      apiMarkStoryViewed(story.id).catch(() => {});
      setGroups((prev) =>
        prev.map((g, gi) =>
          gi !== groupIndex
            ? g
            : { ...g, stories: g.stories.map((s) => (s.id === story.id ? { ...s, viewed: true } : s)) }
        )
      );
    }

    const next = group.stories[storyIndex + 1] ?? groups[groupIndex + 1]?.stories[0];
    if (next?.media_type === 'image') Image.prefetch(next.media_url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  // --- Photo timer (playing videos are driven by the player) ---
  useEffect(() => {
    // Photos run on this timer; so does a video that failed to load, so the viewer doesn't get stuck on it.
    if (!story || paused) return;
    if (!mediaFailed && (isVideo || !imageReady)) return;
    const id = setInterval(() => {
      elapsedMs.current += TICK_MS;
      progress.value = Math.min(1, elapsedMs.current / IMAGE_DURATION_MS);
      if (elapsedMs.current >= IMAGE_DURATION_MS) {
        clearInterval(id);
        goNext();
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [story, isVideo, paused, imageReady, mediaFailed, goNext, progress]);

  if (!group || !story) return <View style={styles.container} />;

  const author = group.user;
  const canDelete = group.is_mine || !!me?.is_admin;

  const removeCurrentStory = () => {
    const remaining = groups
      .map((g, gi) => (gi === groupIndex ? { ...g, stories: g.stories.filter((s) => s.id !== story.id) } : g))
      .filter((g) => g.stories.length > 0);
    if (remaining.length === 0) {
      close();
      return;
    }
    const groupStillThere = remaining.some((g) => g.user.id === author.id);
    const nextGroupIndex = groupStillThere ? groupIndex : Math.min(groupIndex, remaining.length - 1);
    setGroups(remaining);
    setGroupIndex(nextGroupIndex);
    setStoryIndex(groupStillThere ? Math.min(storyIndex, remaining[nextGroupIndex].stories.length - 1) : 0);
  };

  const openMenu = () => {
    setMenuOpen(true);
    const done = () => setMenuOpen(false);
    const options: { text: string; style?: 'destructive' | 'cancel'; onPress: () => void }[] = [];

    if (canDelete) {
      options.push({
        text: group.is_mine ? 'Delete Story' : 'Delete Story (Admin)',
        style: 'destructive',
        onPress: async () => {
          done();
          try {
            await apiDeleteStory(story.id);
            removeCurrentStory();
          } catch (error) {
            Alert.alert('Could not delete story', toApiError(error).message);
          }
        },
      });
    }
    if (!group.is_mine) {
      options.push({
        text: 'Report Story',
        onPress: () => {
          done();
          promptReport('story', story.id, 'Story');
        },
      });
      options.push({
        text: `Block ${author.first_name}`,
        style: 'destructive',
        onPress: () => {
          done();
          promptBlock(author.id, author.first_name, close);
        },
      });
    }
    options.push({ text: 'Cancel', style: 'cancel', onPress: done });

    Alert.alert(group.is_mine ? 'Your story' : `${author.first_name}'s story`, undefined, options, {
      cancelable: true,
      onDismiss: done,
    });
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!text) return;
    setSending(true);
    try {
      await apiSendMessage(author.id, `Replied to your story: ${text}`);
      setReply('');
      Alert.alert('Sent', `Your reply was sent to ${author.first_name}.`);
    } catch (error) {
      Alert.alert('Could not send reply', toApiError(error).message);
    } finally {
      setSending(false);
    }
  };

  const viewers = story.viewers ?? [];

  return (
    <View style={styles.container}>
      {/* Media */}
      {mediaFailed ? (
        <View style={styles.failed}>
          <Ionicons name="cloud-offline-outline" size={48} color="rgba(255,255,255,0.7)" />
          <Text style={styles.failedText}>This story couldn't be loaded</Text>
        </View>
      ) : isVideo ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsPictureInPicture={false}
        />
      ) : (
        <Image
          key={story.id}
          source={{ uri: story.media_url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onLoad={() => setLoadedStoryId(story.id)}
          onError={() => setFailedStoryId(story.id)}
        />
      )}

      {/* Tap zones: left third goes back, the rest goes forward; hold to pause */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(e) => (e.nativeEvent.locationX < width / 3 ? goPrev() : goNext())}
        onLongPress={() => setHolding(true)}
        onPressOut={() => setHolding(false)}
        delayLongPress={200}
      />

      {/* Top: progress + author */}
      <View style={[styles.top, { paddingTop: insets.top + spacing.xs }]} pointerEvents="box-none">
        <View style={styles.bars}>
          {group.stories.map((s, i) => (
            <ProgressBar key={s.id} state={i < storyIndex ? 'done' : i > storyIndex ? 'todo' : 'active'} progress={progress} />
          ))}
        </View>
        <View style={styles.header} pointerEvents="box-none">
          {author.images.image_1 ? (
            <Image source={{ uri: author.images.image_1 }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <Text style={styles.name}>{group.is_mine ? 'Your story' : author.first_name}</Text>
          <Text style={styles.time}>{timeAgo(story.created_at)}</Text>
          <View style={{ flex: 1 }} />
          {isVideo && (
            <TouchableOpacity style={styles.iconButton} onPress={() => setMuted((m) => !m)} accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={22} color={colors.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconButton} onPress={openMenu} accessibilityLabel="Story options">
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={close} accessibilityLabel="Close stories">
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom: caption + viewers or reply */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottomWrap}
        pointerEvents="box-none"
      >
        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.sm }]} pointerEvents="box-none">
          {!!story.caption && <Text style={styles.caption}>{story.caption}</Text>}
          {group.is_mine ? (
            <TouchableOpacity style={styles.viewersButton} onPress={() => setViewersOpen(true)}>
              <Ionicons name="eye-outline" size={20} color={colors.white} />
              <Text style={styles.viewersText}>
                {viewers.length} {viewers.length === 1 ? 'viewer' : 'viewers'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.replyRow}>
              <TextInput
                style={styles.replyInput}
                placeholder={`Reply to ${author.first_name}...`}
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={reply}
                onChangeText={setReply}
                onFocus={() => setReplyFocused(true)}
                onBlur={() => setReplyFocused(false)}
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={sendReply}
                editable={!sending}
              />
              {reply.trim().length > 0 && (
                <TouchableOpacity style={styles.sendButton} onPress={sendReply} disabled={sending} accessibilityLabel="Send reply">
                  <Ionicons name="send" size={18} color={colors.white} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Viewers sheet (own stories) */}
      <Modal visible={viewersOpen} transparent animationType="slide" onRequestClose={() => setViewersOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setViewersOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.sheetTitle}>Viewed by {viewers.length}</Text>
          {viewers.length === 0 ? (
            <Text style={styles.sheetEmpty}>No one has viewed this story yet.</Text>
          ) : (
            <FlatList
              data={viewers}
              keyExtractor={(v) => String(v.user.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.viewerRow}
                  onPress={() => {
                    setViewersOpen(false);
                    navigation.navigate('UserProfile', {
                      userId: item.user.id,
                      firstName: item.user.first_name,
                      image: item.user.images.image_1,
                    });
                  }}
                >
                  {item.user.images.image_1 ? (
                    <Image source={{ uri: item.user.images.image_1 }} style={styles.viewerAvatar} />
                  ) : (
                    <View style={[styles.viewerAvatar, styles.avatarPlaceholder]} />
                  )}
                  <Text style={styles.viewerName}>
                    {item.user.first_name} {item.user.last_name}
                  </Text>
                  <Text style={styles.viewerTime}>{timeAgo(item.viewed_at)}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const ProgressBar = ({ state, progress }: { state: 'done' | 'active' | 'todo'; progress: SharedValue<number> }) => {
  const fillStyle = useAnimatedStyle(() => ({
    width: `${(state === 'done' ? 1 : state === 'todo' ? 0 : progress.value) * 100}%`,
  }));
  return (
    <View style={styles.bar}>
      <Animated.View style={[styles.barFill, fillStyle]} />
    </View>
  );
};

const shadow = { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  failed: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  failedText: { ...typography.body, color: 'rgba(255,255,255,0.8)' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: spacing.sm },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.border },
  avatarPlaceholder: { backgroundColor: colors.slate },
  name: { ...typography.body, color: colors.white, fontWeight: '700', ...shadow },
  time: { ...typography.caption, color: 'rgba(255,255,255,0.8)', ...shadow },
  iconButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottom: { paddingHorizontal: spacing.md, gap: spacing.sm },
  caption: { ...typography.body, color: colors.white, fontSize: 16, ...shadow },
  viewersButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingVertical: spacing.sm },
  viewersText: { ...typography.body, color: colors.white, fontWeight: '600', ...shadow },
  replyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  replyInput: {
    flex: 1,
    ...typography.body,
    color: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: '60%',
    backgroundColor: colors.sand,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.md,
  },
  sheetTitle: { ...typography.heading, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  sheetEmpty: { ...typography.caption, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  viewerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border },
  viewerName: { ...typography.body, fontWeight: '600', flex: 1 },
  viewerTime: { ...typography.caption },
});
