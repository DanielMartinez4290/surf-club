import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton } from '../../components/BackButton';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { apiGetEventSignups } from '../../api/events';
import {
  apiAdminAddEventSignup,
  apiAdminChangeEventOwner,
  apiAdminDeleteEvent,
  apiAdminListEvents,
  apiAdminListLiveLocations,
  apiAdminListUsers,
  apiAdminSendMassPush,
  apiAdminUpdateEventDate,
} from '../../api/admin';
import { apiAdminListReports, apiAdminResolveReport } from '../../api/moderation';
import { toApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { parseEventTime } from '../../utils/eventTime';
import { colors, radii, spacing, typography } from '../../theme';
import type { Report, SurfEvent, User } from '../../types';

const REPORT_TYPE_LABELS: Record<Report['content_type'], string> = {
  user: 'Profile',
  event: 'Outing',
  direct_message: 'Direct message',
  group_message: 'Group chat message',
  story: 'Story',
};

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
  // One member picker, used both for Change Owner and Add Going.
  const [ownerEvent, setOwnerEvent] = useState<SurfEvent | null>(null);
  const [pickerMode, setPickerMode] = useState<'owner' | 'going'>('owner');
  const [goingIds, setGoingIds] = useState<number[] | null>(null);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [busyReportId, setBusyReportId] = useState<number | null>(null);

  const loadReports = useCallback(() => {
    apiAdminListReports()
      .then((list) => {
        setReports(list);
        setReportsError(null);
      })
      .catch((error) => setReportsError(toApiError(error).message));
  }, []);

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
      loadReports();
      apiAdminListLiveLocations()
        .then((list) => setLiveCount(list.length))
        .catch(() => setLiveCount(null));
    }, [loadEvents, loadReports])
  );

  const resolveReport = async (report: Report, action: 'dismiss' | 'remove_content' | 'remove_user') => {
    setBusyReportId(report.id);
    try {
      await apiAdminResolveReport(report.id, action);
      loadReports();
      // Removing content or a member changes the lists below too.
      if (action !== 'dismiss') {
        loadEvents();
        apiAdminListUsers().then(setUsers).catch(() => {});
      }
    } catch (error) {
      Alert.alert('Could not update report', toApiError(error).message);
    } finally {
      setBusyReportId(null);
    }
  };

  const confirmRemoveContent = (report: Report) => {
    Alert.alert('Remove Content', `Delete this ${REPORT_TYPE_LABELS[report.content_type].toLowerCase()} for everyone?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => resolveReport(report, 'remove_content') },
    ]);
  };

  const confirmRemoveMember = (report: Report) => {
    Alert.alert(
      'Remove Member',
      `Remove ${report.reported_user?.first_name ?? 'this member'} from Wakesurf Club? This deletes their account and everything they posted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => resolveReport(report, 'remove_user') },
      ]
    );
  };

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

  const openOwnerPicker = (event: SurfEvent) => {
    setPickerMode('owner');
    setOwnerSearch('');
    setOwnerEvent(event);
  };

  const openGoingPicker = (event: SurfEvent) => {
    setPickerMode('going');
    setOwnerSearch('');
    setGoingIds(null);
    setOwnerEvent(event);
    // Leave out people who are already going.
    apiGetEventSignups(event.id)
      .then((list) => setGoingIds(list.map((s) => s.user_id)))
      .catch(() => setGoingIds([]));
  };

  const handlePickGoing = (member: User) => {
    const event = ownerEvent;
    if (!event) return;
    const name = member.id === user?.id ? 'yourself' : `${member.first_name} ${member.last_name ?? ''}`.trim();
    Alert.alert('Add Going', `Add ${name} as going to "${event.title}"? They'll get a notification.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add',
        onPress: () => {
          setOwnerEvent(null);
          runEventAction(event.id, () => apiAdminAddEventSignup(event.id, member.id), 'Could not add member');
        },
      },
    ]);
  };

  const handlePickOwner = (member: User) => {
    const event = ownerEvent;
    if (!event) return;
    if (pickerMode === 'going') return handlePickGoing(member);
    const isMe = member.id === user?.id;
    const name = isMe ? 'you' : `${member.first_name} ${member.last_name ?? ''}`.trim();
    Alert.alert(
      'Change Owner',
      `Make ${name} the owner of "${event.title}"? ${isMe ? 'You' : member.first_name} will be able to edit and cancel it, and ${event.organizer?.first_name ?? 'the current owner'} won't.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change Owner',
          onPress: () => {
            setOwnerEvent(null);
            runEventAction(event.id, () => apiAdminChangeEventOwner(event.id, member.id), 'Could not change owner');
          },
        },
      ]
    );
  };

  // Members to choose from: you first, then everyone else, filtered by the search box. The current owner is left out.
  const ownerCandidates = (() => {
    const q = ownerSearch.trim().toLowerCase();
    return users
      .filter((u) => (pickerMode === 'owner' ? u.id !== ownerEvent?.user_id : !goingIds?.includes(u.id)))
      .filter((u) => !q || `${u.first_name} ${u.last_name ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => (a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0));
  })();

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

        <Text style={styles.sectionTitle}>Live Locations{liveCount !== null ? ` (${liveCount})` : ''}</Text>
        <Text style={styles.liveNote}>
          Members who turned on "On my way" for an outing, while it's on. Only admins can see this map.
        </Text>
        <Button title="Open Live Map" variant="secondary" icon="map-outline" onPress={() => navigation.navigate('AdminLiveMap')} />

        <Text style={styles.sectionTitle}>Reports ({reports.length})</Text>
        {reportsError ? (
          <Text style={styles.error}>Couldn't load reports: {reportsError}</Text>
        ) : reports.length === 0 ? (
          <Text style={styles.empty}>No open reports.</Text>
        ) : null}
        {reports.map((report) => {
          const busy = busyReportId === report.id;
          const reported = report.reported_user;
          return (
            <View key={report.id} style={styles.eventCard}>
              <Text style={styles.eventTitle}>
                {REPORT_TYPE_LABELS[report.content_type]} · {report.reason}
              </Text>
              <Text style={styles.eventMeta}>
                {report.reporter?.first_name ?? 'A former member'} reported{' '}
                {reported ? `${reported.first_name} ${reported.last_name}` : 'a former member'} ·{' '}
                {dayjs(report.created_at).format('MMM D, h:mm A')}
              </Text>
              {report.content_snapshot ? (
                <Text style={styles.reportQuote} numberOfLines={6}>
                  {report.content_snapshot}
                </Text>
              ) : null}
              {report.details ? <Text style={styles.eventMeta}>Note: {report.details}</Text> : null}
              <View style={styles.eventActions}>
                {reported && (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('UserProfile', {
                        userId: reported.id,
                        firstName: reported.first_name,
                        image: reported.images.image_1,
                      })
                    }
                  >
                    <Text style={styles.action}>Profile</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => resolveReport(report, 'dismiss')} disabled={busy}>
                  <Text style={[styles.action, busy && styles.actionBusy]}>Dismiss</Text>
                </TouchableOpacity>
                {report.content_type !== 'user' && (
                  <TouchableOpacity onPress={() => confirmRemoveContent(report)} disabled={busy}>
                    <Text style={[styles.action, styles.actionDanger, busy && styles.actionBusy]}>Remove Content</Text>
                  </TouchableOpacity>
                )}
                {reported && reported.id !== user?.id && (
                  <TouchableOpacity onPress={() => confirmRemoveMember(report)} disabled={busy}>
                    <Text style={[styles.action, styles.actionDanger, busy && styles.actionBusy]}>Remove Member</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

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
                <TouchableOpacity onPress={() => openOwnerPicker(event)} disabled={busy}>
                  <Text style={[styles.action, busy && styles.actionBusy]}>Change Owner</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openGoingPicker(event)} disabled={busy}>
                  <Text style={[styles.action, busy && styles.actionBusy]}>Add Going</Text>
                </TouchableOpacity>
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

      <Modal visible={!!ownerEvent} transparent animationType="fade" onRequestClose={() => setOwnerEvent(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.ownerCard]}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {pickerMode === 'owner' ? 'New owner for' : 'Add going to'} {ownerEvent?.title}
            </Text>
            <TextField label="Search members" value={ownerSearch} onChangeText={setOwnerSearch} autoCorrect={false} />
            <FlatList
              data={pickerMode === 'going' && goingIds === null ? [] : ownerCandidates}
              keyExtractor={(m) => String(m.id)}
              keyboardShouldPersistTaps="handled"
              style={styles.ownerList}
              ListEmptyComponent={
                <Text style={styles.empty}>{pickerMode === 'going' && goingIds === null ? 'Loading…' : 'No members match.'}</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.ownerRow} onPress={() => handlePickOwner(item)}>
                  {item.images.image_1 ? (
                    <Image source={{ uri: item.images.image_1 }} style={styles.ownerAvatar} />
                  ) : (
                    <View style={[styles.ownerAvatar, styles.eventImagePlaceholder]}>
                      <Ionicons name="person" size={18} color={colors.slate} />
                    </View>
                  )}
                  <Text style={styles.ownerName} numberOfLines={1}>
                    {item.first_name} {item.last_name ?? ''}
                    {item.id === user?.id ? ' (you)' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Button title="Cancel" variant="secondary" onPress={() => setOwnerEvent(null)} style={{ marginTop: spacing.md }} />
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
  liveNote: { ...typography.caption, marginBottom: spacing.sm },
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
  reportQuote: {
    ...typography.body,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.md, // four actions, keep them on one line
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
  ownerCard: { maxHeight: '80%' },
  ownerList: { flexGrow: 0 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  ownerAvatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  ownerName: { ...typography.body, flex: 1 },
  memberGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  member: { width: '33.33%', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.xs },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.border },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 32, color: colors.ocean, fontWeight: '700' },
  memberName: { ...typography.body, textAlign: 'center' },
});
