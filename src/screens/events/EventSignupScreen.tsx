import React, { useCallback, useEffect, useState } from 'react';
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
import { colors, radii, spacing, typography } from '../../theme';
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
      //     merchantDisplayName: 'Surf Club ATX',
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
      await load();
    } catch (error) {
      Alert.alert('Could not cancel', toApiError(error).message);
    }
  };

  if (!event) return null;

  const isFull = signups.length >= event.number_of_spots;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        {event.picture_url && (
          <Image
            source={{ uri: event.picture_url }}
            style={[styles.image, { aspectRatio: imageAspectRatio }]}
            contentFit="cover"
            onLoad={(e) => {
              const { width, height } = e.source;
              if (width && height) setImageAspectRatio(width / height);
            }}
          />
        )}
        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>

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

          <Text style={styles.description}>{event.description}</Text>

          {isOrganizer ? (
            <Button
              title="Edit Outing"
              variant="secondary"
              onPress={() => navigation.navigate('EditEvent', { eventId: event.id })}
              style={styles.spaced}
            />
          ) : mySignup ? (
            <Button title="Cancel My Spot" variant="danger" onPress={handleLeave} style={styles.spaced} />
          ) : (
            <>
              <Button
                title={isFull ? 'Outing Full' : 'Interested'}
                onPress={handleJoin}
                loading={joining}
                disabled={isFull}
                style={styles.spaced}
              />
              {!isFull && <Text style={styles.notCharged}>You will not be charged at this time.</Text>}
            </>
          )}

          {(mySignup || isOrganizer) && (
            <Button
              title="Group Chat"
              variant="secondary"
              onPress={() => navigation.navigate('GroupChat', { eventId: event.id, title: event.title })}
              style={styles.spaced}
            />
          )}

          <Text style={styles.rosterHeading}>Who's interested</Text>
          <FlatList
            data={signups}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.rosterRow}>
                {item.user?.images.image_1 ? (
                  <Image source={{ uri: item.user.images.image_1 }} style={styles.rosterAvatar} />
                ) : (
                  <View style={[styles.rosterAvatar, styles.rosterAvatarPlaceholder]} />
                )}
                <Text style={styles.rosterName}>{item.user?.first_name}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyRoster}>No one is interested yet.</Text>}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  image: { width: '100%', backgroundColor: colors.border },
  content: { padding: spacing.lg },
  title: { ...typography.title, fontSize: 24 },
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
  rosterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.sm },
  rosterAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.border },
  rosterAvatarPlaceholder: {},
  rosterName: { ...typography.body },
  emptyRoster: { ...typography.caption },
});
