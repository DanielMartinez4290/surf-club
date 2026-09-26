import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { Image } from 'expo-image';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { apiAdminDeleteUser, apiAdminListUsers, apiAdminSendMassPush } from '../../api/admin';
import { toApiError } from '../../api/client';
import { colors, spacing, typography } from '../../theme';
import type { User } from '../../types';

export const AdminDashboardScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pushMessage, setPushMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    apiAdminListUsers().then(setUsers);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = (targetUser: User) => {
    Alert.alert('Remove User', `Remove ${targetUser.first_name} ${targetUser.last_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await apiAdminDeleteUser(targetUser.id);
          load();
        },
      },
    ]);
  };

  const handleSendPush = async () => {
    if (!pushMessage.trim()) return;
    setSending(true);
    try {
      await apiAdminSendMassPush(pushMessage.trim());
      setPushMessage('');
      Alert.alert('Sent', 'Push notification sent to all members.');
    } catch (error) {
      Alert.alert('Could not send', toApiError(error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <View style={styles.header}>
        <Text style={styles.heading}>Admin Dashboard</Text>
      </View>

      <View style={styles.pushSection}>
        <Text style={styles.sectionTitle}>Send Announcement</Text>
        <TextField
          label="Message"
          value={pushMessage}
          onChangeText={setPushMessage}
          multiline
          numberOfLines={2}
        />
        <Button title="Send to All Members" onPress={handleSendPush} loading={sending} />
      </View>

      <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.lg }]}>
        Members ({users.length})
      </Text>
      <FlatList
        data={users}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.images.image_1 ? (
              <Image source={{ uri: item.images.image_1 }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>
                {item.first_name} {item.last_name}
              </Text>
              <Text style={styles.rowSubtitle}>{item.email}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)}>
              <Text style={styles.remove}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
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
  heading: { ...typography.title, fontSize: 22 },
  pushSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border },
  avatarPlaceholder: {},
  rowBody: { flex: 1 },
  rowTitle: { ...typography.body, fontWeight: '600' },
  rowSubtitle: { ...typography.caption },
  remove: { color: colors.danger, fontWeight: '600' },
});
