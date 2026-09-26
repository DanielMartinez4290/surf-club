import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { apiUpdateProfile, apiUploadImage } from '../../api/user';
import { toApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, spacing, typography } from '../../theme';
import type { UserImages } from '../../types';

const IMAGE_SLOTS = [1, 2, 3, 4, 5, 6] as const;

export const EditProfileScreen = ({ navigation }: { navigation: any }) => {
  const { user, refreshUser, signOut } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [birthday, setBirthday] = useState<Date | null>(user?.birthday ? dayjs(user.birthday).toDate() : null);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Edit Profile</Text>

          <Text style={styles.label}>Photos</Text>
          <View style={styles.grid}>
            {IMAGE_SLOTS.map((slot) => {
              const key = `image_${slot}` as keyof UserImages;
              const uri = images[key];
              return (
                <TouchableOpacity
                  key={slot}
                  style={styles.slot}
                  onPress={() => handlePickImage(slot)}
                  disabled={uploadingSlot === slot}
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.slotImage} contentFit="cover" />
                  ) : (
                    <Ionicons name="add" size={28} color={colors.slate} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

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
          <Button title="Sign Out" variant="danger" onPress={handleSignOut} style={styles.spaced} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const SLOT_SIZE = 100;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  content: { padding: spacing.lg },
  heading: { ...typography.title, marginBottom: spacing.lg },
  label: { ...typography.caption, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotImage: { width: '100%', height: '100%' },
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
