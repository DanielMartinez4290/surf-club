import React, { useCallback, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton } from '../../components/BackButton';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import {
  apiAdminDeleteEvent,
  apiAdminListEvents,
  apiAdminListUsers,
  apiAdminSendMassPush,
  apiAdminTakeEventOwnership,
  apiAdminUpdateEventDate,
} from '../../api/admin';
import { toApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { parseEventTime } from '../../utils/eventTime';
import { colors, radii, spacing, typography } from '../../theme';
import type { SurfEvent, User } from '../../types';

export const AdminDashboardScreen = ({ navigation }: { navigation: any }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<SurfEvent[]>([]);
  const [pushMessage, setPushMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [busyEventId, setBusyEventId] = useState<number | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [dateEvent, setDateEvent] = useState<SurfEvent | null>(null);
  const [pickedDate, setPickedDate] = useState(new Date());

  const loadEvents = useCallback(() => {
    apiAdminListEvents()
      .then((list) => {
        setEvents(list);
        setEventsError(null);
      })
      .catch((error) => setEventsError(toApiError(error).message));
  }, []);

  // Reload on focus so changes made on a member's profile or an outing's page show up here.
  useFocusEffect(
    useCallback(() => {
      apiAdminListUsers().then(setUsers).catch(() => {});
      loadEvents();
    }, [loadEvents])
  );

  const handleSendPush = async () => {
    if (!pushMessage.trim()) return;
    setSending(true);
    try {
      await apiAdminSendMassPush(pushMessage.trim());
      setPushMessage('');
      Alert.alert('Sent', 'Push notification sent to all members.');
    } catch (error) {
      Alert.alert('Could not send', toApiError(error).message);
    } finally {
      setSending(false);
    }
  };

  const runEventAction = async (eventId: number, action: () => Promise<unknown>, failTitle: string) => {
    setBusyEventId(eventId);
    try {
      await action();
      loadEvents();
    } catch (error) {
      Alert.alert(failTitle, toApiError(error).message);
    } finally {
      setBusyEventId(null);
    }
  };

  const handleTakeOwnership = (event: SurfEvent) => {
    Alert.alert(
      'Make Me the Owner',
      `Take over "${event.title}" from ${event.organizer?.first_name ?? 'its organizer'}? You'll be able to edit it and they won't.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Make Me Owner',
          onPress: () =>
            runEventAction(event.id, () => apiAdminTakeEventOwnership(event.id), 'Could not change owner'),
        },
      ]
    );
  };

  const openDatePicker = (event: SurfEvent) => {
    setPickedDate(parseEventTime(event.start_time).toDate());
    setDateEvent(event);
  };

  const handleSaveDate = () => {
    if (!dateEvent) return;
    const { id } = dateEvent;
    setDateEvent(null);
    runEventAction(
      id,
      () => apiAdminUpdateEventDate(id, dayjs(pickedDate).format('YYYY-MM-DD HH:mm:ss')),
      'Could not change date'
    );
  };

  const handleRemoveEvent = (event: SurfEvent) => {
    Alert.alert('Remove Outing', `Remove "${event.title}"? This deletes it for everyone, including its group chat.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => runEventAction(event.id, () => apiAdminDeleteEvent(event.id), 'Could not remove outing'),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Admin Dashboard</Text>

        <Text style={styles.sectionTitle}>Send Announcement</Text>
        <TextField label="Message" value={pushMessage} onChangeText={setPushMessage} multiline numberOfLines={2} />
        <Button title="Send to All Members" onPress={handleSendPush} loading={sending} />

        <Text style={styles.sectionTitle}>Outings ({events.length})</Text>
        {eventsError ? (
          <Text style={styles.error}>Couldn't load outings: {eventsError}</Text>
        ) : events.length === 0 ? (
          <Text style={styles.empty}>No outings yet.</Text>
        ) : null}
        {events.map((event) => {
          const isMine = event.user_id === user?.id;
          const busy = busyEventId === event.id;
          return (
            <View key={event.id} style={styles.eventCard}>
              <TouchableOpacity
                style={styles.eventRow}
                onPress={() => navigation.navigate('EventSignup', { eventId: event.id })}
              >
                {event.picture_url ? (
                  <Image source={{ uri: event.picture_url }} style={styles.eventImage} contentFit="cover" />
                ) : (
                  <View style={[styles.eventImage, styles.eventImagePlaceholder]}>
                    <Ionicons name="boat-outline" size={24} color={colors.slate} />
                  </View>
                )}
                <View style={styles.eventBody}>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={styles.eventMeta}>{parseEventTime(event.start_time).format('ddd, MMM D · h:mm A')}</Text>
                  <Text style={styles.eventMeta}>
                    Owner: {isMine ? 'You' : event.organizer?.first_name ?? 'Unknown'}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.eventActions}>
                <TouchableOpacity onPress={() => openDatePicker(event)} disabled={busy}>
                  <Text style={[styles.action, busy && styles.actionBusy]}>Change Date</Text>
                </TouchableOpacity>
                {!isMine && (
                  <TouchableOpacity onPress={() => handleTakeOwnership(event)} disabled={busy}>
                    <Text style={[styles.action, busy && styles.actionBusy]}>Make Me Owner</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleRemoveEvent(event)} disabled={busy}>
                  <Text style={[styles.action, styles.actionDanger, busy && styles.actionBusy]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Members ({users.length})</Text>
        <View style={styles.memberGrid}>
          {users.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.member}
              onPress={() =>
                navigation.navigate('UserProfile', {
                  userId: item.id,
                  firstName: item.first_name,
                  image: item.images.image_1,
                })
              }
            >
              {item.images.image_1 ? (
                <Image source={{ uri: item.images.image_1 }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>{item.first_name?.[0] ?? '?'}</Text>
                </View>
              )}
              <Text style={styles.memberName} numberOfLines={1}>
                {item.first_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!dateEvent} transparent animationType="fade" onRequestClose={() => setDateEvent(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {dateEvent?.title}
            </Text>
            <DateTimePicker
              value={pickedDate}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, date) => date && setPickedDate(date)}
            />
            <Text style={styles.modalSummary}>{dayjs(pickedDate).format('ddd, MMM D, YYYY · h:mm A')}</Text>
            <View style={styles.modalButtons}>
              <Button title="Cancel" variant="secondary" onPress={() => setDateEvent(null)} style={styles.modalButton} />
              <Button title="Save" onPress={handleSaveDate} style={styles.modalButton} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  heading: { ...typography.title, fontSize: 22 },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  empty: { ...typography.caption },
  error: { ...typography.caption, color: colors.danger },
  eventCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eventImage: { width: 64, height: 64, borderRadius: radii.sm, backgroundColor: colors.border },
  eventImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  eventBody: { flex: 1 },
  eventTitle: { ...typography.body, fontWeight: '600' },
  eventMeta: { ...typography.caption },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { color: colors.ocean, fontWeight: '600' },
  actionDanger: { color: colors.danger },
  actionBusy: { opacity: 0.4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: { backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md },
  modalTitle: { ...typography.heading, marginBottom: spacing.sm },
  modalSummary: { ...typography.body, textAlign: 'center', marginTop: spacing.sm },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalButton: { flex: 1 },
  memberGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  member: { width: '33.33%', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.xs },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.border },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 32, color: colors.ocean, fontWeight: '700' },
  memberName: { ...typography.body, textAlign: 'center' },
});
