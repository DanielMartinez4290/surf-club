import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import dayjs from 'dayjs';
import { apiGetEventThreads, apiGetMessageThreads, EventThread, MessageThread } from '../../api/messages';
import { colors, spacing, typography } from '../../theme';

export const MessagesScreen = ({ navigation }: { navigation: any }) => {
  const [directThreads, setDirectThreads] = useState<MessageThread[]>([]);
  const [eventThreads, setEventThreads] = useState<EventThread[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // The spinner only shows for pull-to-refresh; tab and focus refreshes update quietly.
  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [direct, events] = await Promise.all([apiGetMessageThreads(), apiGetEventThreads()]);
      setDirectThreads(direct);
      setEventThreads(events);
    } catch {
      // Keep showing the last loaded threads; the next refresh will try again.
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  // Refresh whenever the tab comes into view, e.g. switching tabs or backing out of a chat...
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // ...and when the Messages tab is tapped while already on it.
  useEffect(
    () =>
      navigation.addListener('tabPress', () => {
        if (navigation.isFocused()) load();
      }),
    [navigation, load]
  );

  const sections = [
    { title: 'Outing Chats', key: 'events' },
    { title: 'Direct Messages', key: 'direct' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Messages</Text>
      <FlatList
        data={sections}
        keyExtractor={(s) => s.key}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        renderItem={({ item }) => (
          <View>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            {item.key === 'events' ? (
              eventThreads.length === 0 ? (
                <Text style={styles.empty}>Join an outing to start chatting with the group.</Text>
              ) : (
                eventThreads.map((t) => (
                  <TouchableOpacity
                    key={t.event.id}
                    style={styles.row}
                    onPress={() =>
                      navigation.navigate('GroupChat', {
                        eventId: t.event.id,
                        title: t.event.title,
                        image: t.event.picture_url,
                      })
                    }
                  >
                    {t.event.picture_url ? (
                      <Image source={{ uri: t.event.picture_url }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]} />
                    )}
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>{t.event.title}</Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {t.last_message ? t.last_message.message : 'No messages yet'}
                      </Text>
                    </View>
                    {t.last_message && (
                      <Text style={styles.time}>{dayjs(t.last_message.created_at).format('h:mm A')}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )
            ) : directThreads.length === 0 ? (
              <Text style={styles.empty}>No conversations yet.</Text>
            ) : (
              directThreads.map((t) => (
                <TouchableOpacity
                  key={t.user.id}
                  style={styles.row}
                  onPress={() =>
                    navigation.navigate('Chat', {
                      userId: t.user.id,
                      name: `${t.user.first_name} ${t.user.last_name}`,
                      image: t.user.images.image_1,
                    })
                  }
                >
                  {t.user.images.image_1 ? (
                    <Image source={{ uri: t.user.images.image_1 }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]} />
                  )}
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>
                      {t.user.first_name} {t.user.last_name}
                    </Text>
                    <Text style={styles.rowSubtitle} numberOfLines={1}>
                      {t.last_message.message}
                    </Text>
                  </View>
                  <Text style={styles.time}>{dayjs(t.last_message.created_at).format('h:mm A')}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  header: { ...typography.title, fontSize: 24, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  empty: { ...typography.caption, paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  avatarPlaceholder: {},
  rowBody: { flex: 1 },
  rowTitle: { ...typography.body, fontWeight: '600' },
  rowSubtitle: { ...typography.caption },
  time: { ...typography.caption },
});
