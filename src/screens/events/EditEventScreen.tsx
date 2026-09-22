import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import dayjs from 'dayjs';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { apiDeleteEvent, apiGetEvent, apiUpdateEvent, apiUploadEventPhoto } from '../../api/events';
import { toApiError } from '../../api/client';
import { colors, radii, spacing, typography } from '../../theme';

const EVENT_TYPES = ['Wake Surfing', 'Wakeboarding', 'Fishing', 'Social'];

export const EditEventScreen = ({ navigation, route }: { navigation: any; route: any }) => {
  const { eventId } = route.params;
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [location, setLocation] = useState('');
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [numberOfSpots, setNumberOfSpots] = useState('');
  const [price, setPrice] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGetEvent(eventId).then((event) => {
      setTitle(event.title);
      setDescription(event.description);
      setEventType(event.event_type);
      setLocation(event.location);
      setPictureUrl(event.picture_url);
      setStartTime(new Date(event.start_time));
      setNumberOfSpots(String(event.number_of_spots));
      setPrice(String(event.price));
      setLoaded(true);
    });
  }, [eventId]);

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
    setSaving(true);
    try {
      await apiUpdateEvent(eventId, {
        title,
        description,
        event_type: eventType,
        location,
        picture_url: pictureUrl,
        start_time: dayjs(startTime).format('YYYY-MM-DD HH:mm:ss'),
        number_of_spots: parseInt(numberOfSpots, 10),
        price: parseFloat(price) || 0,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not save changes', toApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Cancel Outing', 'This removes the outing for everyone signed up. Continue?', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel Outing',
        style: 'destructive',
        onPress: async () => {
          await apiDeleteEvent(eventId);
          navigation.popToTop();
        },
      },
    ]);
  };

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Edit Outing</Text>

          <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
            {pictureUrl ? (
              <Image source={{ uri: pictureUrl }} style={styles.image} contentFit="cover" />
            ) : (
              <Text style={styles.imagePickerText}>{uploading ? 'Uploading...' : 'Add a photo'}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.pickerWrap}>
            <Picker selectedValue={eventType} onValueChange={setEventType}>
              {EVENT_TYPES.map((t) => (
                <Picker.Item key={t} label={t} value={t} />
              ))}
            </Picker>
          </View>

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

          <Button title="Save Changes" onPress={handleSave} loading={saving} style={styles.spaced} />
          <Button title="Cancel Outing" variant="danger" onPress={handleDelete} style={styles.spaced} />
          <Button
            title="Back"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.spaced}
          />
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
  pickerWrap: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
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
