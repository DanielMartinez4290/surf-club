import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useStripe } from '@stripe/stripe-react-native';
import { Button } from '../../components/Button';
import {
  apiCancelSignup,
  apiCreatePaymentIntent,
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
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [event, setEvent] = useState<SurfEvent | null>(null);
  const [signups, setSignups] = useState<EventSignup[]>([]);
  const [joining, setJoining] = useState(false);

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
      let paymentIntentId: string | undefined;

      if (event.price > 0) {
        const { client_secret } = await apiCreatePaymentIntent(event.id);
        paymentIntentId = client_secret.split('_secret_')[0];

        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: client_secret,
          merchantDisplayName: 'Surf Club ATX',
        });
        if (initError) throw new Error(initError.message);

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code !== 'Canceled') {
            Alert.alert('Payment failed', presentError.message);
          }
          return;
        }
      }

      await apiCreateSignup(event.id, paymentIntentId);
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
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {event.picture_url && (
          <Image source={{ uri: event.picture_url }} style={styles.image} contentFit="cover" />
        )}
        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.ocean} />
            <Text style={styles.metaText}>{dayjs(event.start_time).format('dddd, MMM D · h:mm A')}</Text>
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
            <Button
              title={isFull ? 'Outing Full' : event.price > 0 ? `Join — $${event.price}` : 'Join for Free'}
              onPress={handleJoin}
              loading={joining}
              disabled={isFull}
              style={styles.spaced}
            />
          )}

          {(mySignup || isOrganizer) && (
            <Button
              title="Group Chat"
              variant="secondary"
              onPress={() => navigation.navigate('GroupChat', { eventId: event.id, title: event.title })}
              style={styles.spaced}
            />
          )}

          <Text style={styles.rosterHeading}>Who's going</Text>
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
                <Text style={styles.rosterName}>
                  {item.user?.first_name} {item.user?.last_name}
                </Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyRoster}>No one has joined yet.</Text>}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  image: { width: '100%', height: 220, backgroundColor: colors.border },
  content: { padding: spacing.lg },
  title: { ...typography.title, fontSize: 24 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  metaText: { ...typography.body, color: colors.slate },
  description: { ...typography.body, marginTop: spacing.md },
  spaced: { marginTop: spacing.md },
  rosterHeading: { ...typography.heading, marginTop: spacing.lg, marginBottom: spacing.sm },
  rosterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.sm },
  rosterAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.border },
  rosterAvatarPlaceholder: {},
  rosterName: { ...typography.body },
  emptyRoster: { ...typography.caption },
});
