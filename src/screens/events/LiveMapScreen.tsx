import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { apiGetLiveLocations, type LiveMemberLocation } from '../../api/liveLocation';
import { toApiError } from '../../api/client';
import { distanceMiles, formatMiles, hasCoords } from '../../location/geo';
import { getActiveShare, shareWindow, startLiveShare, stopLiveShare, SHARE_OPENS_BEFORE_HOURS } from '../../location/liveShare';
import { colors, radii, spacing, typography } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

const POLL_MS = 10_000;

type Props = NativeStackScreenProps<RootStackParamList, 'LiveMap'>;

const ago = (iso: string | null) => {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return minutes < 1 ? 'just now' : minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
};

/** Map of outing members who turned on "On my way", plus your own sharing switch. */
export const LiveMapScreen = ({ route }: Props) => {
  const { event } = route.params;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const fitted = useRef(false);

  const [members, setMembers] = useState<LiveMemberLocation[]>([]);
  const [sharing, setSharing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meetingPoint = hasCoords(event) ? { latitude: event.latitude, longitude: event.longitude } : null;
  const shareTimes = shareWindow(event);
  const others = members.filter((m) => !m.is_me);

  const load = useCallback(async () => {
    try {
      const data = await apiGetLiveLocations(event.id);
      setMembers(data);
      setError(null);

      // Frame everyone once, on the first load.
      if (!fitted.current) {
        const points = [...data.map((m) => ({ latitude: m.latitude, longitude: m.longitude })), ...(meetingPoint ? [meetingPoint] : [])];
        if (points.length > 1) {
          mapRef.current?.fitToCoordinates(points, {
            edgePadding: { top: 80, right: 60, bottom: 320, left: 60 },
            animated: false,
          });
        }
        fitted.current = true;
      }
    } catch (e) {
      setError(toApiError(e).message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  useEffect(() => {
    getActiveShare().then((share) => setSharing(share?.eventId === event.id));
  }, [event.id]);

  // Poll while this screen is visible.
  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, POLL_MS);
      return () => clearInterval(id);
    }, [load])
  );

  const toggleSharing = async (on: boolean) => {
    setToggling(true);
    try {
      if (!on) {
        await stopLiveShare();
        setSharing(false);
      } else {
        const result = await startLiveShare(event);
        if (result.ok) {
          setSharing(true);
        } else if (result.reason === 'permission') {
          Alert.alert('Location access needed', 'Allow location access for Wakesurf Club to share where you are.', [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]);
        } else {
          Alert.alert('Could not start sharing', result.message ?? 'Please try again.');
        }
      }
      await load();
    } finally {
      setToggling(false);
    }
  };

  const focusOn = (m: LiveMemberLocation) =>
    mapRef.current?.animateToRegion({ latitude: m.latitude, longitude: m.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);

  const initialRegion = meetingPoint
    ? { ...meetingPoint, latitudeDelta: 0.3, longitudeDelta: 0.3 }
    : { latitude: 30.2672, longitude: -97.7431, latitudeDelta: 0.5, longitudeDelta: 0.5 };

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={initialRegion} showsUserLocation>
        {meetingPoint && (
          <Marker coordinate={meetingPoint} title={event.title} description={event.location} pinColor={colors.coral} />
        )}
        {others.map((m) => (
          <AvatarMarker key={m.user.id} member={m} />
        ))}
      </MapView>

      <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.shareRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareTitle}>On my way</Text>
            <Text style={styles.shareSubtitle}>
              {sharing
                ? `Members of this outing can see you until ${dayjs(shareTimes.closesAt).format('h:mm A')}.`
                : shareTimes.isOpen
                  ? 'Let members of this outing see where you are while you head there.'
                  : `Opens ${SHARE_OPENS_BEFORE_HOURS} hours before the outing (${dayjs(shareTimes.opensAt).format('ddd h:mm A')}).`}
            </Text>
          </View>
          <Switch
            value={sharing}
            onValueChange={toggleSharing}
            disabled={toggling || (!sharing && !shareTimes.isOpen)}
            trackColor={{ true: colors.ocean }}
          />
        </View>

        <Text style={styles.listHeading}>
          {others.length === 0 ? 'No one else is sharing yet' : `${others.length} on the way`}
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.sm }}>
          {others.map((m) => (
            <TouchableOpacity key={m.user.id} style={styles.memberRow} onPress={() => focusOn(m)}>
              {m.user.images.image_1 ? (
                <Image source={{ uri: m.user.images.image_1 }} style={styles.memberAvatar} />
              ) : (
                <View style={[styles.memberAvatar, styles.placeholder]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.user.first_name}</Text>
                <Text style={styles.memberMeta}>
                  {meetingPoint ? `${formatMiles(distanceMiles(m, meetingPoint))} from the outing · ` : ''}
                  updated {ago(m.located_at)}
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

/** A member's profile photo as a map pin. Re-renders until the photo loads, then freezes for performance. */
const AvatarMarker = ({ member }: { member: LiveMemberLocation }) => {
  const [loaded, setLoaded] = useState(!member.user.images.image_1);
  return (
    <Marker
      coordinate={{ latitude: member.latitude, longitude: member.longitude }}
      title={member.user.first_name}
      description={`Updated ${ago(member.located_at)}`}
      tracksViewChanges={!loaded}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.pin}>
        {member.user.images.image_1 ? (
          <Image source={{ uri: member.user.images.image_1 }} style={styles.pinImage} onLoad={() => setLoaded(true)} />
        ) : (
          <View style={[styles.pinImage, styles.placeholder]}>
            <Text style={styles.pinInitial}>{member.user.first_name.charAt(0)}</Text>
          </View>
        )}
      </View>
    </Marker>
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
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  shareTitle: { ...typography.heading },
  shareSubtitle: { ...typography.caption, marginTop: 2 },
  listHeading: { ...typography.caption, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.sm },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
  list: { flexGrow: 0 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border },
  placeholder: { backgroundColor: colors.slate, alignItems: 'center', justifyContent: 'center' },
  memberName: { ...typography.body, fontWeight: '600' },
  memberMeta: { ...typography.caption },
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  pinImage: { width: 38, height: 38, borderRadius: 19 },
  pinInitial: { color: colors.white, fontWeight: '700' },
});
