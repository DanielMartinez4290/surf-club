import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { parseEventTime } from '../../utils/eventTime';
// Stripe is temporarily disabled — see handleJoin below. Re-import when re-enabling:
// import { useStripe } from '@stripe/stripe-react-native';
import { Button } from '../../components/Button';
import {
  apiCancelSignup,
  // apiCreatePaymentIntent, // unused while Stripe is disabled
  apiCreateSignup,
  apiGetEvent,
  apiGetEventSignups,
} from '../../api/events';
import { toApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { promptReport } from '../../utils/moderation';
import { getActiveShare, shareWindow, stopLiveShare } from '../../location/liveShare';
import { colors, layout, radii, spacing, typography } from '../../theme';
import type { EventSignup, SurfEvent } from '../../types';

export const EventSignupScreen = ({ navigation, route }: { navigation: any; route: any }) => {
  const { eventId } = route.params;
  const { user } = useAuth();
  // const { initPaymentSheet, presentPaymentSheet } = useStripe(); // Stripe disabled — see handleJoin

  const [event, setEvent] = useState<SurfEvent | null>(null);
  const [signups, setSignups] = useState<EventSignup[]>([]);
  const [joining, setJoining] = useState(false);
  // Matches the box to the photo's own proportions once it loads, so "cover"
  // has nothing to crop — organizers upload photos of all shapes, and a
  // fixed height was cropping into them unpredictably.
  const [imageAspectRatio, setImageAspectRatio] = useState(16 / 9);

  const load = useCallback(async () => {
    const [eventData, signupData] = await Promise.all([
      apiGetEvent(eventId),
      apiGetEventSignups(eventId),
    ]);
    setEvent(eventData);
    setSignups(signupData);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  // Whether this phone is currently sharing "on my way" for this outing (refreshes when coming back from the map).
  const [sharingHere, setSharingHere] = useState(false);
  useEffect(() => {
    const check = () => getActiveShare().then((share) => setSharingHere(share?.eventId === eventId));
    check();
    return navigation.addListener('focus', check);
  }, [navigation, eventId]);

  const mySignup = signups.find((s) => s.user_id === user?.id);
  const isOrganizer = event?.user_id === user?.id;

  const handleJoin = async () => {
    if (!event) return;
    setJoining(true);
    try {
      // Stripe checkout is temporarily disabled — everyone is just marked
      // interested/confirmed without being charged. Re-enable by restoring
      // this block (and the payment_intent_id it passes to apiCreateSignup)
      // once Stripe is wired up in production.
      //
      // let paymentIntentId: string | undefined;
      //
      // if (event.price > 0) {
      //   const { client_secret } = await apiCreatePaymentIntent(event.id);
      //   paymentIntentId = client_secret.split('_secret_')[0];
      //
      //   const { error: initError } = await initPaymentSheet({
      //     paymentIntentClientSecret: client_secret,
      //     merchantDisplayName: 'Wakesurf Club',
      //   });
      //   if (initError) throw new Error(initError.message);
      //
      //   const { error: presentError } = await presentPaymentSheet();
      //   if (presentError) {
      //     if (presentError.code !== 'Canceled') {
      //       Alert.alert('Payment failed', presentError.message);
      //     }
      //     return;
      //   }
      // }
      //
      // await apiCreateSignup(event.id, paymentIntentId);

      await apiCreateSignup(event.id);
      await load();
    } catch (error) {
      Alert.alert('Could not join', toApiError(error).message);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!mySignup) return;
    try {
      await apiCancelSignup(mySignup.id);
      // No longer going, so stop sharing "on my way" for this outing.
      if (sharingHere) await stopLiveShare();
      await load();
    } catch (error) {
      Alert.alert('Could not cancel', toApiError(error).message);
    }
  };

  // Show the outing's title in the header, next to the back button. With no photo to put the
  // edit button on, the organizer's pencil goes on the right of the header instead.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: event?.title ?? '',
      headerRight:
        event && isOrganizer && !event.picture_url
          ? () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('EditEvent', { eventId: event.id })}
                accessibilityRole="button"
                accessibilityLabel="Edit outing"
                hitSlop={8}
              >
                <Ionicons name="pencil" size={22} color={colors.ocean} />
              </TouchableOpacity>
            )
          : undefined,
    });
  }, [navigation, event, isOrganizer]);

  if (!event) return null;

  const isFull = signups.length >= event.number_of_spots;
  const editOuting = () => navigation.navigate('EditEvent', { eventId: event.id });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {event.picture_url && (
          <View>
            <Image
              source={{ uri: event.picture_url }}
              style={[styles.image, { aspectRatio: imageAspectRatio }]}
              contentFit="cover"
              onLoad={(e) => {
                const { width, height } = e.source;
                if (width && height) setImageAspectRatio(width / height);
              }}
            />
            {isOrganizer && <EditButton onPress={editOuting} style={styles.editOnImage} />}
          </View>
        )}
        <View style={styles.content}>

          {event.organizer && (
            <TouchableOpacity
              style={styles.organizerRow}
              onPress={() =>
                navigation.navigate('UserProfile', {
                  userId: event.organizer!.id,
                  firstName: event.organizer!.first_name,
                  image: event.organizer!.images.image_1,
                })
              }
            >
              {event.organizer.images.image_1 ? (
                <Image source={{ uri: event.organizer.images.image_1 }} style={styles.organizerAvatar} />
              ) : (
                <View style={styles.organizerAvatar} />
              )}
              <Text style={styles.organizerText}>
                Hosted by{'\n'}
                <Text style={styles.organizerName}>{event.organizer.first_name}</Text>
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.ocean} />
            <Text style={styles.metaText}>{parseEventTime(event.start_time).format('dddd, MMM D · h:mm A')}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={colors.ocean} />
            <Text style={styles.metaText}>{event.location}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={16} color={colors.ocean} />
            <Text style={styles.metaText}>
              {signups.length}/{event.number_of_spots} spots taken
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="cash-outline" size={16} color={colors.ocean} />
            <Text style={styles.metaText}>{event.price > 0 ? `$${event.price} per person` : 'Free'}</Text>
          </View>

          <Text style={styles.description}>{event.description}</Text>

          {!isOrganizer && !mySignup && (
            <>
              <Button
                title={isFull ? 'Outing Full' : "I'm Going"}
                onPress={handleJoin}
                loading={joining}
                disabled={isFull}
                style={styles.spaced}
              />
              {!isFull && <Text style={styles.notCharged}>You will not be charged at this time.</Text>}
            </>
          )}

          <Text style={styles.rosterHeading}>Going</Text>
          <FlatList
            data={signups}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            numColumns={3}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.rosterRow}
                disabled={!item.user}
                onPress={() =>
                  item.user &&
                  navigation.navigate('UserProfile', {
                    userId: item.user.id,
                    firstName: item.user.first_name,
                    image: item.user.images.image_1,
                  })
                }
              >
                {item.user?.images.image_1 ? (
                  <Image source={{ uri: item.user.images.image_1 }} style={styles.rosterAvatar} />
                ) : (
                  <View style={[styles.rosterAvatar, styles.rosterAvatarPlaceholder]} />
                )}
                <Text style={styles.rosterName}>{item.user?.first_name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyRoster}>No one is going yet.</Text>}
          />

          {(mySignup || isOrganizer) && (sharingHere || shareWindow(event).isOpen) && (
            <TouchableOpacity
              style={styles.liveCard}
              onPress={() => navigation.navigate('LiveMap', { event })}
              accessibilityRole="button"
            >
              <View style={[styles.liveIcon, sharingHere && styles.liveIconOn]}>
                <Ionicons name="navigate" size={20} color={sharingHere ? colors.white : colors.ocean} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.liveTitle}>{sharingHere ? "You're sharing your location" : 'Live map'}</Text>
                <Text style={styles.liveSubtitle}>
                  {sharingHere ? 'Tap to see who else is on the way or stop sharing.' : 'See who is on the way, and share where you are.'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.slate} />
            </TouchableOpacity>
          )}

          {(mySignup || isOrganizer) && (
            <Button
              title="Group Chat"
              variant="secondary"
              onPress={() => navigation.navigate('GroupChat', { eventId: event.id, title: event.title, image: event.picture_url })}
              style={styles.spaced}
            />
          )}

          {mySignup && !isOrganizer && (
            <Button title="Cancel My Spot" variant="danger" onPress={handleLeave} style={styles.spaced} />
          )}

          {!isOrganizer && (
            <TouchableOpacity
              style={styles.reportLink}
              onPress={() => promptReport('event', event.id, 'Outing')}
              accessibilityRole="button"
            >
              <Ionicons name="flag-outline" size={16} color={colors.slate} />
              <Text style={styles.reportLinkText}>Report this outing</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/** Round pencil button for the organizer to edit the outing. */
const EditButton = ({ onPress, style }: { onPress: () => void; style?: object }) => (
  <TouchableOpacity
    style={[styles.editButton, style]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Edit outing"
    hitSlop={8}
  >
    <Ionicons name="pencil" size={18} color={colors.white} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  scroll: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  image: { width: '100%', backgroundColor: colors.border },
  content: { padding: spacing.lg },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editOnImage: { position: 'absolute', top: spacing.md, right: spacing.md },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm },
  organizerAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border },
  organizerText: { ...typography.caption },
  organizerName: { ...typography.heading },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  metaText: { ...typography.body, color: colors.slate },
  description: { ...typography.body, marginTop: spacing.md },
  spaced: { marginTop: spacing.md },
  notCharged: { ...typography.caption, textAlign: 'center', marginTop: spacing.xs },
  rosterHeading: { ...typography.heading, marginTop: spacing.lg, marginBottom: spacing.sm },
  rosterRow: { width: '33.33%', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.xs },
  rosterAvatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.border },
  rosterAvatarPlaceholder: {},
  rosterName: { ...typography.body, textAlign: 'center' },
  emptyRoster: { ...typography.caption },
  liveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  liveIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lakeTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveIconOn: { backgroundColor: colors.ocean },
  liveTitle: { ...typography.body, fontWeight: '700' },
  liveSubtitle: { ...typography.caption, marginTop: 2 },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  reportLinkText: { ...typography.caption, fontWeight: '600' },
});
