import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme';

// Navigates into RootStack screens (EditProfile, AdminDashboard) even though this
// screen itself lives in the nested tab navigator — kept loosely typed rather than
// wiring a full CompositeScreenProps chain for a one-field navigation prop.
export const ProfileScreen = ({ navigation }: { navigation: any }) => {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarWrap}>
          {user.images.image_1 ? (
            <Image source={{ uri: user.images.image_1 }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{user.first_name?.[0] ?? '?'}</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>
          {user.first_name} {user.last_name}
        </Text>
        <Text style={styles.email}>{user.email}</Text>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

        <Button title="Edit Profile" onPress={() => navigation.navigate('EditProfile')} style={styles.spaced} />

        {user.is_admin && (
          <Button
            title="Admin Dashboard"
            variant="secondary"
            onPress={() => navigation.navigate('AdminDashboard')}
            style={styles.spaced}
          />
        )}

        <Button title="Sign Out" variant="danger" onPress={handleSignOut} style={styles.spaced} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  content: { padding: spacing.lg, alignItems: 'center', paddingTop: spacing.xl },
  avatarWrap: { marginBottom: spacing.md },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.border },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 40, color: colors.ocean, fontWeight: '700' },
  name: { ...typography.heading, fontSize: 22 },
  email: { ...typography.caption, marginTop: spacing.xs },
  bio: { ...typography.body, textAlign: 'center', marginTop: spacing.md, color: colors.slate },
  spaced: { marginTop: spacing.md, width: '100%' },
});
