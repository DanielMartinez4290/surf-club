import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { BackButton } from '../../components/BackButton';
import { apiGetBlockedUsers, apiUnblockUser, BlockedUser } from '../../api/moderation';
import { toApiError } from '../../api/client';
import { colors, spacing, typography } from '../../theme';

export const BlockedUsersScreen = () => {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      apiGetBlockedUsers()
        .then(setBlocked)
        .catch(() => {})
        .finally(() => setLoaded(true));
    }, [])
  );

  const handleUnblock = async (member: BlockedUser) => {
    try {
      await apiUnblockUser(member.id);
      setBlocked((prev) => prev.filter((m) => m.id !== member.id));
    } catch (error) {
      Alert.alert('Could not unblock', toApiError(error).message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <FlatList
        data={blocked}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<Text style={styles.heading}>Blocked Members</Text>}
        ListEmptyComponent={loaded ? <Text style={styles.empty}>You haven't blocked anyone.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.images.image_1 ? (
              <Image source={{ uri: item.images.image_1 }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar} />
            )}
            <Text style={styles.name} numberOfLines={1}>
              {item.first_name}
            </Text>
            <TouchableOpacity onPress={() => handleUnblock(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.unblock}>Unblock</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  content: { padding: spacing.lg, paddingTop: spacing.md },
  heading: { ...typography.title, marginBottom: spacing.lg },
  empty: { ...typography.caption },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  name: { ...typography.body, fontWeight: '600', flex: 1 },
  unblock: { color: colors.ocean, fontWeight: '600' },
});
