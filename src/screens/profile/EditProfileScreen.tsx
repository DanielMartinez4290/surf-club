import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { Button } from '../../components/Button';
import { SortablePhotoGrid } from '../../components/SortablePhotoGrid';
import { TextField } from '../../components/TextField';
import { apiDeleteAccount, apiReorderImages, apiUpdateProfile, apiUploadImage } from '../../api/user';
import { toApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, spacing, typography } from '../../theme';
import type { UserImages } from '../../types';

export const EditProfileScreen = ({ navigation }: { navigation: any }) => {
  const { user, refreshUser, signOut } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [birthday, setBirthday] = useState<Date | null>(user?.birthday ? dayjs(user.birthday).toDate() : null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [images, setImages] = useState<UserImages>(
    user?.images ?? {
      image_1: null,
      image_2: null,
      image_3: null,
      image_4: null,
      image_5: null,
      image_6: null,
    }
  );
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggingPhoto, setDraggingPhoto] = useState(false);

  const handlePickImage = async (slot: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploadingSlot(slot);
    try {
      const updated = await apiUploadImage(result.assets[0].uri, slot);
      setImages(updated.images);
    } catch (error) {
      Alert.alert('Upload failed', toApiError(error).message);
    } finally {
      setUploadingSlot(null);
    }
  };

  // Apply the new order right away so the grid doesn't snap back, then persist it.
  const handleReorder = async (order: number[]) => {
    const previous = images;
    const reordered = Object.fromEntries(
      order.map((fromSlot, i) => [`image_${i + 1}`, previous[`image_${fromSlot}` as keyof UserImages]])
    ) as unknown as UserImages;
    setImages(reordered);
    try {
      const updated = await apiReorderImages(order);
      setImages(updated.images);
      await refreshUser();
    } catch (error) {
      setImages(previous);
      Alert.alert('Could not reorder photos', toApiError(error).message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiUpdateProfile({
        first_name: firstName,
        last_name: lastName,
        bio,
        birthday: birthday ? dayjs(birthday).format('YYYY-MM-DD') : null,
      });
      await refreshUser();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not save', toApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account, profile, photos, outings, and messages. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await apiDeleteAccount();
              await signOut();
            } catch (error) {
              Alert.alert('Could not delete account', toApiError(error).message);
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} scrollEnabled={!draggingPhoto}>
          <Text style={styles.heading}>Edit Profile</Text>

          <SortablePhotoGrid
            images={images}
            uploadingSlot={uploadingSlot}
            onPickImage={handlePickImage}
            onReorder={handleReorder}
            onDragActiveChange={setDraggingPhoto}
          />
          <Text style={styles.gridHint}>Tap to add a photo. Hold and drag to reorder.</Text>

          <TextField
            label="Email"
            value={user?.email ?? ''}
            editable={false}
            selectTextOnFocus={false}
            style={styles.readOnlyInput}
          />
          <TextField label="First Name" value={firstName} onChangeText={setFirstName} />
          <TextField label="Last Name" value={lastName} onChangeText={setLastName} />
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowBirthdayPicker(true)}>
            <Text style={styles.dateLabel}>Birthday</Text>
            <Text style={[styles.dateValue, !birthday && styles.datePlaceholder]}>
              {birthday ? dayjs(birthday).format('MMM D, YYYY') : 'Add your birthday'}
            </Text>
          </TouchableOpacity>
          {showBirthdayPicker && (
            <DateTimePicker
              value={birthday ?? dayjs().subtract(25, 'year').toDate()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, date) => {
                setShowBirthdayPicker(Platform.OS === 'ios');
                if (date) setBirthday(date);
              }}
            />
          )}
          <TextField
            label="About Me"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: 'top' }}
          />

          <Button title="Save" onPress={handleSave} loading={saving} style={styles.spaced} />
          {user?.is_admin && (
            <Button
              title="Admin Dashboard"
              variant="secondary"
              onPress={() => navigation.navigate('AdminDashboard')}
              style={styles.spaced}
            />
          )}
          <Button
            title="Blocked Members"
            variant="secondary"
            onPress={() => navigation.navigate('BlockedUsers')}
            style={styles.spaced}
          />
          <Button
            title="Terms of Use"
            variant="secondary"
            onPress={() => navigation.navigate('Terms')}
            style={styles.spaced}
          />
          <Button title="Sign Out" variant="danger" onPress={handleSignOut} style={styles.spaced} />
          <TouchableOpacity
            style={styles.deleteLink}
            onPress={handleDeleteAccount}
            disabled={deleting}
            accessibilityRole="button"
          >
            <Text style={styles.deleteLinkText}>{deleting ? 'Deleting account…' : 'Delete Account'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  readOnlyInput: { backgroundColor: colors.sand, color: colors.slate },
  container: { flex: 1, backgroundColor: colors.sand },
  content: { padding: spacing.lg },
  heading: { ...typography.title, marginBottom: spacing.lg },
  deleteLink: { alignSelf: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  deleteLinkText: { ...typography.body, color: colors.danger, fontWeight: '600' },
  gridHint: { ...typography.caption, marginTop: spacing.sm, marginBottom: spacing.lg },
  dateButton: {
    height: 50,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  dateLabel: { ...typography.caption },
  dateValue: { ...typography.body, marginTop: 2 },
  datePlaceholder: { color: colors.slate },
  spaced: { marginTop: spacing.sm },
});
