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

export const ago = (iso: string | null) => {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return minutes < 1 ? 'just now' : minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
};

/** Map of outing members who turned on "On my way", plus your own sharing switch. */
export const LiveMapScreen = ({ route }: Props) => {
  const { event } = route.params;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  // Positions the map was last framed around, so it only re-frames when someone actually moves.
  const framedFor = useRef('');
  // Once you pan/zoom yourself, stop auto-framing until you tap "Show everyone".
  const [userMoved, setUserMoved] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [panelHeight, setPanelHeight] = useState(320);

  const [members, setMembers] = useState<LiveMemberLocation[]>([]);
  const [sharing, setSharing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meetingPoint = hasCoords(event) ? { latitude: event.latitude, longitude: event.longitude } : null;
  const shareTimes = shareWindow(event);
  const me = members.find((m) => m.is_me);
  const others = members.filter((m) => !m.is_me);

  const load = useCallback(async () => {
    try {
      const data = await apiGetLiveLocations(event.id);
      setMembers(data);
      setError(null);
    } catch (e) {
      setError(toApiError(e).message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  /** Zooms the map to fit everyone sharing plus the outing's spot, above the bottom panel. */
  const frameAll = useCallback(
    (animated: boolean) => {
      const points = [...members.map((m) => ({ latitude: m.latitude, longitude: m.longitude })), ...(meetingPoint ? [meetingPoint] : [])];
      if (points.length > 1) {
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: insets.top + 60, right: 60, bottom: panelHeight + 40, left: 60 },
          animated,
        });
      } else if (points.length === 1) {
        mapRef.current?.animateToRegion({ ...points[0], latitudeDelta: 0.05, longitudeDelta: 0.05 }, animated ? 400 : 0);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, event.latitude, event.longitude, insets.top, panelHeight]
  );

  // Keep everyone in view as positions update, unless you've moved the map yourself.
  useEffect(() => {
    if (!mapReady || userMoved) return;
    const key = [
      ...members.map((m) => `${m.user.id}:${m.latitude.toFixed(4)},${m.longitude.toFixed(4)}`).sort(),
      `panel:${panelHeight}`,
    ].join('|');
    if (key === framedFor.current) return;
    const first = framedFor.current === '';
    framedFor.current = key;
    frameAll(!first);
  }, [mapReady, userMoved, members, panelHeight, frameAll]);

  const showEveryone = () => {
    setUserMoved(false);
    framedFor.current = 'refit';
    frameAll(true);
  };

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

  const focusOn = (m: LiveMemberLocation) => {
    setUserMoved(true);
    mapRef.current?.animateToRegion({ latitude: m.latitude, longitude: m.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);
  };

  const initialRegion = meetingPoint
    ? { ...meetingPoint, latitudeDelta: 0.3, longitudeDelta: 0.3 }
    : { latitude: 30.2672, longitude: -97.7431, latitudeDelta: 0.5, longitudeDelta: 0.5 };

  return (
    <View style={styles.container}>
      {/* Hide the plain blue dot while your photo pin is showing, so you don't appear twice. */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={!me}
        onMapReady={() => setMapReady(true)}
        onRegionChangeComplete={(_region, details) => {
          if (details?.isGesture) setUserMoved(true);
        }}
      >
        {meetingPoint && <Marker coordinate={meetingPoint} title={event.title} description={event.address || event.location} pinColor={colors.coral} />}
        {members.map((m) => (
          <AvatarMarker key={m.user.id} member={m} />
        ))}
      </MapView>

      {userMoved && (
        <TouchableOpacity style={[styles.fitButton, { bottom: panelHeight + spacing.md }]} onPress={showEveryone}>
          <Ionicons name="scan-outline" size={16} color={colors.ocean} />
          <Text style={styles.fitButtonText}>Show everyone</Text>
        </TouchableOpacity>
      )}

      <View
        style={[styles.panel, { paddingBottom: insets.bottom + spacing.md }]}
        onLayout={(e) => setPanelHeight(Math.round(e.nativeEvent.layout.height))}
      >
        <View style={styles.shareRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareTitle}>On my way</Text>
            <Text style={styles.shareSubtitle}>
              {sharing
                ? `Members of this outing and club admins can see you until ${dayjs(shareTimes.closesAt).format('h:mm A')}.`
                : shareTimes.isOpen
                  ? 'Let members of this outing and club admins see where you are while you head there.'
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

        <Text style={styles.listHeading}>{others.length === 0 ? 'No one else is sharing yet' : `${others.length} on the way`}</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.sm }}>
          {(event.address || meetingPoint) && (
            <TouchableOpacity
              style={styles.memberRow}
              disabled={!meetingPoint}
              onPress={() => {
                if (!meetingPoint) return;
                setUserMoved(true);
                mapRef.current?.animateToRegion({ ...meetingPoint, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 400);
              }}
            >
              <View style={[styles.memberAvatar, styles.destinationIcon]}>
                <Ionicons name="location" size={20} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{event.location}</Text>
                {!!event.address && <Text style={styles.memberMeta}>{event.address}</Text>}
              </View>
              {meetingPoint && <Ionicons name="locate-outline" size={18} color={colors.ocean} />}
            </TouchableOpacity>
          )}
          {[...(me ? [me] : []), ...others].map((m) => (
            <TouchableOpacity key={m.user.id} style={styles.memberRow} onPress={() => focusOn(m)}>
              {m.user.images.image_1 ? (
                <Image source={{ uri: m.user.images.image_1 }} style={styles.memberAvatar} />
              ) : (
                <View style={[styles.memberAvatar, styles.placeholder]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.is_me ? `${m.user.first_name} (you)` : m.user.first_name}</Text>
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
export const AvatarMarker = ({
  member,
  subtitle,
  onCalloutPress,
}: {
  member: Pick<LiveMemberLocation, 'user' | 'latitude' | 'longitude' | 'located_at'> & { is_me?: boolean };
  subtitle?: string;
  onCalloutPress?: () => void;
}) => {
  const [loaded, setLoaded] = useState(!member.user.images.image_1);
  const name = member.is_me ? 'You' : member.user.first_name;
  return (
    <Marker
      coordinate={{ latitude: member.latitude, longitude: member.longitude }}
      title={member.is_me ? `${member.user.first_name} (you)` : member.user.first_name}
      description={subtitle ?? `Updated ${ago(member.located_at)}`}
      onCalloutPress={onCalloutPress}
      tracksViewChanges={!loaded}
      // Point at the centre of the photo, not the name label under it.
      anchor={{ x: 0.5, y: 0.33 }}
    >
      <View style={styles.pinWrap}>
        <View style={[styles.pin, member.is_me && styles.pinMe]}>
          {member.user.images.image_1 ? (
            <Image source={{ uri: member.user.images.image_1 }} style={styles.pinImage} onLoad={() => setLoaded(true)} />
          ) : (
            <View style={[styles.pinImage, styles.placeholder]}>
              <Text style={styles.pinInitial}>{member.user.first_name.charAt(0)}</Text>
            </View>
          )}
        </View>
        <View style={[styles.pinLabel, member.is_me && styles.pinLabelMe]}>
          <Text style={[styles.pinLabelText, member.is_me && styles.pinLabelTextMe]} numberOfLines={1}>
            {name}
          </Text>
        </View>
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
  fitButton: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fitButtonText: { ...typography.caption, color: colors.ocean, fontWeight: '600' },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  shareTitle: { ...typography.heading },
  shareSubtitle: { ...typography.caption, marginTop: 2 },
  listHeading: { ...typography.caption, textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.sm },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.sm },
  list: { flexGrow: 0 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border },
  destinationIcon: { backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
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
  pinMe: { borderColor: colors.ocean },
  pinImage: { width: 38, height: 38, borderRadius: 19 },
  pinWrap: { alignItems: 'center', width: 96, paddingTop: 2 },
  pinLabel: {
    marginTop: 4,
    maxWidth: 96,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  pinLabelMe: { backgroundColor: colors.ocean },
  pinLabelText: { fontSize: 12, fontWeight: '600', color: colors.slate },
  pinLabelTextMe: { color: colors.white },
  pinInitial: { color: colors.white, fontWeight: '700' },
});
