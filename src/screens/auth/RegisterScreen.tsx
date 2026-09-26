import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { apiRegister } from '../../api/auth';
import { toApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen = ({ navigation, route }: Props) => {
  const { signIn } = useAuth();
  const verifiedPhoneNumber = route.params?.verifiedPhoneNumber;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || password.length < 6) {
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
      await signIn(access_token, user);
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
          <TextField label="First Name" value={firstName} onChangeText={setFirstName} />
          <TextField label="Last Name" value={lastName} onChangeText={setLastName} />
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
  spaced: { marginTop: spacing.sm },
});
