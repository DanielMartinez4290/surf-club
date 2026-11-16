import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Callout, Marker } from 'react-native-maps';
import { type Coords, distanceMiles, formatMiles, getCurrentCoords, hasCoords } from '../../location/geo';
import { parseEventTime } from '../../utils/eventTime';
import { apiGetEvents } from '../../api/events';
import { colors, layout, radii, spacing, typography } from '../../theme';
import type { SurfEvent } from '../../types';

export const EventsScreen = ({ navigation }: { navigation: any }) => {
  const [events, setEvents] = useState<SurfEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<'soonest' | 'nearest'>('soonest');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [myCoords, setMyCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);

  const hasLoaded = useRef(false);

  // 'quiet' reloads without a spinner and keeps the current list if the request fails.
  const load = useCallback(async (mode: 'initial' | 'refresh' | 'quiet' = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'initial') setLoading(true);
    try {
      const data = await apiGetEvents();
      setEvents(data);
    } catch {
      if (mode !== 'quiet') setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload whenever the tab comes back into view, so a new outing shows up and a
  // blocked member's outings are gone as soon as you return here.
  useFocusEffect(
    useCallback(() => {
      load(hasLoaded.current ? 'quiet' : 'initial');
      hasLoaded.current = true;
    }, [load])
  );

  const locate = async () => {
    setLocating(true);
    const coords = await getCurrentCoords();
    setLocating(false);
    if (!coords) {
      Alert.alert('Location needed', 'Allow location access for Wakesurf Club in Settings to see outings near you.');
      return null;
    }
    setMyCoords(coords);
    return coords;
  };

  const chooseNearest = async () => {
    if (myCoords || (await locate())) setSort('nearest');
  };

  const distanceTo = (event: SurfEvent) =>
    myCoords && hasCoords(event) ? distanceMiles(myCoords, event) : null;

  // Nearest first; outings without a map pin go last, soonest first.
  const sorted = useMemo(() => {
    if (sort !== 'nearest' || !myCoords) return events;
    return [...events].sort((a, b) => {
      const da = hasCoords(a) ? distanceMiles(myCoords, a) : Infinity;
      const db = hasCoords(b) ? distanceMiles(myCoords, b) : Infinity;
      return da - db;
    });
  }, [events, sort, myCoords]);

  const pinned = events.filter(hasCoords);

  const renderItem = ({ item }: { item: SurfEvent }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('EventSignup', { eventId: item.id })}
    >
      {item.picture_url ? (
        <Image source={{ uri: item.picture_url }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Ionicons name="boat-outline" size={40} color={colors.slate} />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.cardRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.ocean} />
          <Text style={styles.cardMeta}>{parseEventTime(item.start_time).format('ddd, MMM D · h:mm A')}</Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="location-outline" size={14} color={colors.ocean} />
          <Text style={[styles.cardMeta, { flex: 1 }]} numberOfLines={1}>
            {item.location}
          </Text>
          {distanceTo(item) !== null && <Text style={styles.distance}>{formatMiles(distanceTo(item)!)}</Text>}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.price}>{item.price > 0 ? `$${item.price}` : 'Free'}</Text>
          <Text style={styles.spots}>
            {item.spots_taken}/{item.number_of_spots} spots
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Outings</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => setView(view === 'list' ? 'map' : 'list')}
            style={[styles.addButton, styles.secondaryButton]}
            accessibilityLabel={view === 'list' ? 'Show map' : 'Show list'}
          >
            <Ionicons name={view === 'list' ? 'map-outline' : 'list'} size={20} color={colors.ocean} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CreateEvent')} style={styles.addButton}>
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {view === 'list' && (
        <View style={styles.chips}>
          <Chip label="Soonest" active={sort === 'soonest'} onPress={() => setSort('soonest')} />
          <Chip
            label={locating ? 'Locating…' : 'Near me'}
            icon="navigate"
            active={sort === 'nearest'}
            onPress={chooseNearest}
          />
        </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ocean} />
      ) : view === 'map' ? (
        <View style={styles.mapWrap}>
          <MapView
            style={StyleSheet.absoluteFill}
            showsUserLocation
            initialRegion={
              pinned[0]
                ? { latitude: pinned[0].latitude!, longitude: pinned[0].longitude!, latitudeDelta: 0.6, longitudeDelta: 0.6 }
                : // Austin
                  { latitude: 30.2672, longitude: -97.7431, latitudeDelta: 0.8, longitudeDelta: 0.8 }
            }
            onMapReady={() => {
              if (!myCoords) getCurrentCoords().then((c) => c && setMyCoords(c));
            }}
          >
            {pinned.map((e) => (
              <Marker key={e.id} coordinate={{ latitude: e.latitude!, longitude: e.longitude! }} pinColor={colors.coral}>
                <Callout onPress={() => navigation.navigate('EventSignup', { eventId: e.id })}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>
                      {e.title}
                    </Text>
                    <Text style={styles.cardMeta}>{parseEventTime(e.start_time).format('ddd, MMM D · h:mm A')}</Text>
                    <Text style={styles.calloutLink}>
                      View outing{distanceTo(e) !== null ? ` · ${formatMiles(distanceTo(e)!)} away` : ''}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
          {pinned.length < events.length && (
            <View style={styles.mapNote} pointerEvents="none">
              <Text style={styles.mapNoteText}>
                {events.length - pinned.length} outing{events.length - pinned.length === 1 ? '' : 's'} without a map pin
                {pinned.length === 0 ? '' : ' not shown'}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="boat-outline" size={56} color={colors.border} />
              <Text style={styles.emptyText}>No outings yet. Be the first to create one.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const Chip = ({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
    {icon && <Ionicons name={icon} size={13} color={active ? colors.white : colors.ocean} />}
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerTitle: { ...typography.title, fontSize: 24 },
  headerButtons: { flexDirection: 'row', gap: spacing.sm },
  secondaryButton: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.ocean, borderColor: colors.ocean },
  chipText: { ...typography.caption, color: colors.ocean, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  distance: { ...typography.caption, color: colors.ocean, fontWeight: '700' },
  mapWrap: { flex: 1, marginTop: spacing.md },
  callout: { width: 200, padding: 4, gap: 2 },
  calloutTitle: { ...typography.body, fontWeight: '700' },
  calloutLink: { ...typography.caption, color: colors.lake, fontWeight: '600', marginTop: 2 },
  mapNote: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    backgroundColor: 'rgba(18,36,42,0.75)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  mapNoteText: { ...typography.caption, color: colors.white },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ocean,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  card: {
    borderRadius: radii.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Proportional rather than a fixed height so wide screens don't crop it to a strip (~290px tall on phones)
  cardImage: { width: '100%', aspectRatio: 1.2, backgroundColor: colors.border },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: spacing.md },
  cardTitle: { ...typography.heading },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: 6 },
  cardMeta: { ...typography.caption },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  price: { color: colors.coral, fontWeight: '700' },
  spots: { color: colors.slate, fontSize: 13 },
  empty: { alignItems: 'center', marginTop: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyText: { ...typography.body, color: colors.slate, textAlign: 'center', marginTop: spacing.md },
});
