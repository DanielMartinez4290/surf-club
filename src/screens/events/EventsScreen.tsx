import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { parseEventTime } from '../../utils/eventTime';
import { apiGetEvents } from '../../api/events';
import { colors, radii, spacing, typography } from '../../theme';
import type { SurfEvent } from '../../types';

export const EventsScreen = ({ navigation }: { navigation: any }) => {
  const [events, setEvents] = useState<SurfEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const data = await apiGetEvents();
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          <Text style={styles.cardMeta} numberOfLines={1}>
            {item.location}
          </Text>
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
        <TouchableOpacity onPress={() => navigation.navigate('CreateEvent')} style={styles.addButton}>
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ocean} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.ocean,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  card: {
    borderRadius: radii.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImage: { width: '100%', height: 290, backgroundColor: colors.border },
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
