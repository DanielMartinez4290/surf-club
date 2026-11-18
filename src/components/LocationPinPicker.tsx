import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { type Coords, geocodePlace, getCurrentCoords } from '../location/geo';
import { colors, radii, spacing, typography } from '../theme';

interface Props {
  /** The typed address (or location name if there's no address), used for "Find on map". */
  place: string;
  value: Coords | null;
  onChange: (coords: Coords | null) => void;
}

const ZOOM = { latitudeDelta: 0.02, longitudeDelta: 0.02 };

/** Lets an organizer drop a map pin where the outing meets (find by name, use current location, drag to adjust). */
export const LocationPinPicker = ({ place, value, onChange }: Props) => {
  const [busy, setBusy] = useState<'find' | 'here' | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (value) mapRef.current?.animateToRegion({ ...value, ...ZOOM }, 300);
  }, [value]);

  const find = async () => {
    if (!place.trim()) {
      Alert.alert('Add a location first', 'Type the address or location where the outing meets, then find it on the map.');
      return;
    }
    setBusy('find');
    const coords = await geocodePlace(place);
    setBusy(null);
    if (coords) onChange(coords);
    else Alert.alert('Not found', `Couldn't find "${place}" on the map. Try a nearby address, or use your current location.`);
  };

  const useHere = async () => {
    setBusy('here');
    const coords = await getCurrentCoords();
    setBusy(null);
    if (coords) onChange(coords);
    else Alert.alert('Location unavailable', 'Allow location access in Settings, or find the place by name instead.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Map pin</Text>
      {value ? (
        <>
          <MapView ref={mapRef} style={styles.map} initialRegion={{ ...value, ...ZOOM }}>
            <Marker
              coordinate={value}
              draggable
              onDragEnd={(e) => onChange(e.nativeEvent.coordinate)}
              pinColor={colors.coral}
            />
          </MapView>
          <Text style={styles.hint}>Hold and drag the pin to the exact meeting spot.</Text>
        </>
      ) : (
        <Text style={styles.hint}>Add a pin so members can find this outing near them.</Text>
      )}
      <View style={styles.actions}>
        <PinButton icon="search" label="Find on map" loading={busy === 'find'} onPress={find} disabled={!!busy} />
        <PinButton icon="navigate" label="Use my location" loading={busy === 'here'} onPress={useHere} disabled={!!busy} />
        {value && <PinButton icon="close" label="Remove" onPress={() => onChange(null)} disabled={!!busy} />}
      </View>
    </View>
  );
};

const PinButton = ({
  icon,
  label,
  loading,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  loading?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <TouchableOpacity style={styles.button} onPress={onPress} disabled={disabled}>
    {loading ? <ActivityIndicator size="small" color={colors.ocean} /> : <Ionicons name={icon} size={15} color={colors.ocean} />}
    <Text style={styles.buttonText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...typography.caption, marginBottom: spacing.xs },
  map: { height: 180, borderRadius: radii.sm, overflow: 'hidden' },
  hint: { ...typography.caption, marginTop: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  buttonText: { ...typography.caption, color: colors.ocean, fontWeight: '600' },
});
