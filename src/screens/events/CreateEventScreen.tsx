import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { apiCreateEvent, apiUploadEventPhoto } from '../../api/events';
import { toApiError } from '../../api/client';
import { colors, radii, spacing, typography } from '../../theme';

// This app is wake surfing only, so every outing gets this type.
const EVENT_TYPE = 'Wake Surfing';

export const CreateEventScreen = ({ navigation }: { navigation: any }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [numberOfSpots, setNumberOfSpots] = useState('');
  const [price, setPrice] = useState('0');
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const { url } = await apiUploadEventPhoto(result.assets[0].uri);
      setPictureUrl(url);
    } catch (error) {
      Alert.alert('Upload failed', toApiError(error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const spots = parseInt(numberOfSpots, 10);
    if (!title || !description || !location || !spots) {
      Alert.alert('Missing info', 'Fill in title, description, location, and number of spots.');
      return;
    }
    setSaving(true);
    try {
      await apiCreateEvent({
        title,
        description,
        event_type: EVENT_TYPE,
        location,
        picture_url: pictureUrl,
        start_time: dayjs(startTime).format('YYYY-MM-DD HH:mm:ss'),
        end_time: null,
        number_of_spots: spots,
        price: parseFloat(price) || 0,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not create outing', toApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>New Outing</Text>

          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
            {pictureUrl ? (
              <Image source={{ uri: pictureUrl }} style={styles.image} contentFit="cover" />
            ) : (
              <Text style={styles.imagePickerText}>{uploading ? 'Uploading...' : 'Add a photo'}</Text>
            )}
          </TouchableOpacity>

          <TextField label="Title" value={title} onChangeText={setTitle} />
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: 'top' }}
          />
          <TextField label="Location" value={location} onChangeText={setLocation} />

          <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
            <Text style={styles.dateLabel}>Date &amp; Time</Text>
            <Text style={styles.dateValue}>{dayjs(startTime).format('MMM D, YYYY · h:mm A')}</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={startTime}
              mode="datetime"
              onChange={(_, date) => {
                setShowPicker(Platform.OS === 'ios');
                if (date) setStartTime(date);
              }}
            />
          )}

          <TextField
            label="Number of Spots"
            keyboardType="number-pad"
            value={numberOfSpots}
            onChangeText={setNumberOfSpots}
          />
          <TextField
            label="Price per person ($, 0 for free)"
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
          />

          <Button title="Create Outing" onPress={handleSave} loading={saving} style={styles.spaced} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  content: { padding: spacing.lg },
  heading: { ...typography.title, marginBottom: spacing.lg },
  imagePicker: {
    height: 160,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imagePickerText: { color: colors.slate },
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
  spaced: { marginTop: spacing.sm },
});
