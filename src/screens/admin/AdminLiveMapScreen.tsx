import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { apiAdminListLiveLocations, type AdminLiveLocation } from '../../api/admin';
import { toApiError } from '../../api/client';
import { distanceMiles, formatMiles, hasCoords } from '../../location/geo';
import { AvatarMarker, ago } from '../events/LiveMapScreen';
import { colors, radii, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

const POLL_MS = 15_000;

type Props = NativeStackScreenProps<RootStackParamList, 'AdminLiveMap'>;

/** Admin-only: everyone currently sharing "On my way", across all outings. */
export const AdminLiveMapScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const fitted = useRef(false);
  const [shares, setShares] = useState<AdminLiveLocation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiAdminListLiveLocations();
      setShares(data);
      setError(null);
      if (!fitted.current && data.length > 0) {
        mapRef.current?.fitToCoordinates(
          data.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
          { edgePadding: { top: 80, right: 60, bottom: 320, left: 60 }, animated: false }
        );
        fitted.current = true;
      }
    } catch (e) {
      setError(toApiError(e).message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, POLL_MS);
      return () => clearInterval(id);
    }, [load])
  );

  // One pin per outing that has sharers and a map pin.
  const outings = [...new Map(shares.filter((s) => hasCoords(s.event)).map((s) => [s.event.id, s.event])).values()];

  const focusOn = (s: AdminLiveLocation) =>
    mapRef.current?.animateToRegion({ latitude: s.latitude, longitude: s.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);

  const openOuting = (eventId: number) => navigation.navigate('EventSignup', { eventId });

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: 30.2672, longitude: -97.7431, latitudeDelta: 0.6, longitudeDelta: 0.6 }}
      >
        {outings.map((e) => (
          <Marker
            key={`event-${e.id}`}
            coordinate={{ latitude: e.latitude!, longitude: e.longitude! }}
            title={e.title}
            description={e.location}
            pinColor={colors.coral}
            onCalloutPress={() => openOuting(e.id)}
          />
        ))}
        {shares.map((s) => (
          <AvatarMarker
            key={`${s.event.id}-${s.user.id}`}
            member={s}
            subtitle={`${s.event.title} · updated ${ago(s.located_at)}`}
            onCalloutPress={() => openOuting(s.event.id)}
          />
        ))}
      </MapView>

      <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.heading}>
          {shares.length === 0 ? 'No one is sharing right now' : `${shares.length} sharing "On my way"`}
        </Text>
        <Text style={styles.note}>Only members who turned on "On my way" for an outing appear here, until it ends.</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.sm }}>
          {shares.map((s) => (
            <TouchableOpacity key={`${s.event.id}-${s.user.id}`} style={styles.row} onPress={() => focusOn(s)}>
              {s.user.images.image_1 ? (
                <Image source={{ uri: s.user.images.image_1 }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.placeholder]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {s.user.first_name} {s.user.last_name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {s.event.title}
                  {hasCoords(s.event) ? ` · ${formatMiles(distanceMiles(s, s.event))} away` : ''} · {ago(s.located_at)}
                </Text>
              </View>
              <Ionicons name="locate-outline" size={18} color={colors.ocean} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '45%',
    backgroundColor: colors.sand,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
  },
  heading: { ...typography.heading },
  note: { ...typography.caption, marginTop: 2, marginBottom: spacing.sm },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border },
  placeholder: { backgroundColor: colors.slate },
  name: { ...typography.body, fontWeight: '600' },
  meta: { ...typography.caption },
});
