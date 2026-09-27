import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { apiRegister } from '../../api/auth';
import { apiUpdateProfile, apiUploadImage } from '../../api/user';
import { toApiError, tokenStore } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, radii, spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const REQUIRED_PHOTOS = 3;
const BIO_MAX_LENGTH = 1000; // matches the API's bio validation

export const RegisterScreen = ({ navigation, route }: Props) => {
  const { signIn } = useAuth();
  const verifiedPhoneNumber = route.params?.verifiedPhoneNumber;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [photos, setPhotos] = useState<(string | null)[]>(Array(REQUIRED_PHOTOS).fill(null));
  const [loading, setLoading] = useState(false);

  const handlePickPhoto = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setPhotos((prev) => prev.map((p, i) => (i === index ? uri : p)));
  };

  const handleRegister = async () => {
    if (photos.some((p) => !p)) {
      Alert.alert('Add your photos', `Add ${REQUIRED_PHOTOS} photos of yourself to continue.`);
      return;
    }
    if (!firstName || !lastName || !bio.trim() || !email || password.length < 6) {
      Alert.alert('Missing info', 'Fill in every field. Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { access_token, user } = await apiRegister({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        phone_number: verifiedPhoneNumber,
      });

      // Photo uploads need the new account's token. Store it now but hold off on signIn,
      // which swaps to the main app and unmounts this screen.
      await tokenStore.set(access_token);
      let signedInUser = user;
      try {
        // The register endpoint doesn't take a bio, so save it as a profile update.
        signedInUser = await apiUpdateProfile({ bio: bio.trim() });
        // One at a time: the server creates the user's photo row on the first upload.
        for (const [index, uri] of photos.entries()) {
          signedInUser = await apiUploadImage(uri!, index + 1);
        }
      } catch (error) {
        // The account exists at this point, so sign in anyway rather than stranding them.
        Alert.alert(
          'Some of your profile did not save',
          `${toApiError(error).message}\n\nYou can finish it from Edit Profile.`
        );
      }
      await signIn(access_token, signedInUser);
    } catch (error) {
      Alert.alert('Could not create account', toApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackButton />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Create your account</Text>

          <Text style={styles.label}>Add {REQUIRED_PHOTOS} photos of yourself</Text>
          <View style={styles.photoRow}>
            {photos.map((uri, index) => (
              <TouchableOpacity
                key={index}
                style={styles.photoSlot}
                onPress={() => handlePickPhoto(index)}
                disabled={loading}
                accessibilityLabel={`Photo ${index + 1}`}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.photoImage} contentFit="cover" />
                ) : (
                  <Ionicons name="add" size={28} color={colors.slate} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TextField label="First Name" value={firstName} onChangeText={setFirstName} />
          <TextField label="Last Name" value={lastName} onChangeText={setLastName} />
          <TextField
            label="About Me"
            placeholder="Riding experience, favorite spots, what you're looking for in the club..."
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={BIO_MAX_LENGTH}
            style={styles.bioInput}
          />
          <Text style={styles.bioCount}>
            {bio.length}/{BIO_MAX_LENGTH}
          </Text>
          <TextField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <Button title="Create Account" onPress={handleRegister} loading={loading} style={styles.spaced} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  content: { padding: spacing.lg, paddingTop: spacing.md },
  heading: { ...typography.title, marginBottom: spacing.lg },
  label: { ...typography.body, fontWeight: '600', marginBottom: spacing.sm },
  photoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  photoSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.slate,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  bioInput: { height: 160, paddingTop: spacing.sm, textAlignVertical: 'top' },
  bioCount: { ...typography.caption, textAlign: 'right', marginTop: -spacing.sm, marginBottom: spacing.md },
  spaced: { marginTop: spacing.sm },
});
