import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme';
import type { UserImages } from '../types';

const SLOT_COUNT = 6;
const COLUMNS = 3;
const ROWS = SLOT_COUNT / COLUMNS;
const SLOT_SIZE = 100;
const GAP = spacing.sm;
const CELL = SLOT_SIZE + GAP;
const LONG_PRESS_MS = 250;
const SPRING = { damping: 20, stiffness: 220 };

type Positions = Record<string, number>;

const toOffset = (index: number) => {
  'worklet';
  return { x: (index % COLUMNS) * CELL, y: Math.floor(index / COLUMNS) * CELL };
};

const indexAt = (x: number, y: number) => {
  'worklet';
  const col = Math.min(COLUMNS - 1, Math.max(0, Math.floor(x / CELL)));
  const row = Math.min(ROWS - 1, Math.max(0, Math.floor(y / CELL)));
  return row * COLUMNS + col;
};

interface Props {
  images: UserImages;
  /** Slot (1-6) currently uploading, if any. Dragging is paused while an upload runs. */
  uploadingSlot: number | null;
  onPickImage: (slot: number) => void;
  /** `order[i]` is the slot (1-6) whose photo should now sit in slot i + 1. */
  onReorder: (order: number[]) => void;
  onDragActiveChange?: (active: boolean) => void;
}

/**
 * 3x2 photo grid. Tap a tile to pick a photo; hold a photo and drag it to reorder.
 * Tiles are keyed by photo URL so a committed reorder doesn't remount or jump them.
 */
export const SortablePhotoGrid = ({
  images,
  uploadingSlot,
  onPickImage,
  onReorder,
  onDragActiveChange,
}: Props) => {
  const tiles = useMemo(() => {
    const seen = new Map<string, number>();
    return Array.from({ length: SLOT_COUNT }, (_, i) => {
      const slot = i + 1;
      const uri = images[`image_${slot}` as keyof UserImages];
      const base = uri ?? `empty-${slot}`;
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return { id: n ? `${base}#${n}` : base, slot, uri };
    });
  }, [images]);

  const positions = useSharedValue<Positions>(
    Object.fromEntries(tiles.map((t, i) => [t.id, i]))
  );

  useEffect(() => {
    positions.value = Object.fromEntries(tiles.map((t, i) => [t.id, i]));
  }, [tiles, positions]);

  const handleDragEnd = (finalPositions: Positions) => {
    onDragActiveChange?.(false);
    const order = new Array<number>(SLOT_COUNT);
    tiles.forEach((t, i) => {
      order[finalPositions[t.id] ?? i] = t.slot;
    });
    if (order.some((slot, i) => slot !== i + 1)) onReorder(order);
  };

  const handleDragStart = () => onDragActiveChange?.(true);

  return (
    <View style={styles.grid}>
      {tiles.map((tile, index) => (
        <Tile
          key={tile.id}
          id={tile.id}
          index={index}
          uri={tile.uri}
          positions={positions}
          draggable={!!tile.uri && uploadingSlot === null}
          tappable={uploadingSlot !== tile.slot}
          onTap={() => onPickImage(tile.slot)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      ))}
    </View>
  );
};

interface TileProps {
  id: string;
  index: number;
  uri: string | null;
  positions: SharedValue<Positions>;
  draggable: boolean;
  tappable: boolean;
  onTap: () => void;
  onDragStart: () => void;
  onDragEnd: (positions: Positions) => void;
}

const Tile = ({ id, index, uri, positions, draggable, tappable, onTap, onDragStart, onDragEnd }: TileProps) => {
  const dragging = useSharedValue(false);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(draggable)
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      const { x, y } = toOffset(positions.value[id] ?? index);
      startX.value = x;
      startY.value = y;
      dragX.value = x;
      dragY.value = y;
      dragging.value = true;
      scheduleOnRN(onDragStart);
    })
    .onUpdate((e) => {
      dragX.value = startX.value + e.translationX;
      dragY.value = startY.value + e.translationY;

      const from = positions.value[id] ?? index;
      const to = indexAt(dragX.value + SLOT_SIZE / 2, dragY.value + SLOT_SIZE / 2);
      if (to === from) return;

      // Shift the tiles between `from` and `to` one step toward the gap.
      const next: Positions = {};
      for (const key of Object.keys(positions.value)) {
        const p = positions.value[key];
        if (key === id) next[key] = to;
        else if (from < to && p > from && p <= to) next[key] = p - 1;
        else if (from > to && p >= to && p < from) next[key] = p + 1;
        else next[key] = p;
      }
      positions.value = next;
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      dragging.value = false;
      scheduleOnRN(onDragEnd, positions.value);
    });

  const tap = Gesture.Tap()
    .enabled(tappable)
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(onTap);
    });

  const gesture = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => {
    if (dragging.value) {
      return {
        zIndex: 10,
        transform: [
          { translateX: dragX.value },
          { translateY: dragY.value },
          { scale: withTiming(1.08, { duration: 120 }) },
        ],
        shadowOpacity: withTiming(0.25, { duration: 120 }),
      };
    }
    const { x, y } = toOffset(positions.value[id] ?? index);
    return {
      zIndex: 0,
      transform: [
        { translateX: withSpring(x, SPRING) },
        { translateY: withSpring(y, SPRING) },
        { scale: withTiming(1, { duration: 120 }) },
      ],
      shadowOpacity: withTiming(0, { duration: 120 }),
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.tile, animatedStyle]}>
        <View style={styles.slot}>
          {uri ? (
            <Image source={{ uri }} style={styles.slotImage} contentFit="cover" />
          ) : (
            <Ionicons name="add" size={28} color={colors.slate} />
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  grid: {
    width: COLUMNS * SLOT_SIZE + (COLUMNS - 1) * GAP,
    height: ROWS * SLOT_SIZE + (ROWS - 1) * GAP,
  },
  tile: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    shadowOpacity: 0,
  },
  slot: {
    flex: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotImage: { width: '100%', height: '100%' },
});
