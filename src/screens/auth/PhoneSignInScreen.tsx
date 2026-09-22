import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { apiPhoneCheck } from '../../api/auth';
import { toApiError } from '../../api/client';
import { colors, spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneSignIn'>;

// US numbers only for now, matching the backend's Twilio Verify restriction.
const COUNTRY_CODE = '+1';

export const PhoneSignInScreen = ({ navigation }: Props) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    const digits = phoneNumber.replace(/[^0-9]/g, '');
    if (digits.length !== 10) {
      Alert.alert('Enter a valid phone number', 'Use a 10-digit US phone number.');
      return;
    }
    setLoading(true);
    try {
      await apiPhoneCheck(COUNTRY_CODE, digits);
      navigation.navigate('VerifyCode', { countryCode: COUNTRY_CODE, phoneNumber: digits });
    } catch (error) {
      Alert.alert('Could not send code', toApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.heading}>Sign in with your phone</Text>
          <Text style={styles.subtext}>We'll text you a 6-digit code.</Text>
          <View style={styles.row}>
            <View style={styles.prefix}>
              <Text style={styles.prefixText}>{COUNTRY_CODE}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Phone Number"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                maxLength={14}
              />
            </View>
          </View>
          <Button title="Send Code" onPress={handleSendCode} loading={loading} />
          <Button
            title="Back"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.spaced}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  content: { padding: spacing.lg, paddingTop: spacing.xxl },
  heading: { ...typography.title },
  subtext: { ...typography.body, color: colors.slate, marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  prefix: {
    height: 50,
    marginTop: 20,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  prefixText: { fontSize: 16, color: colors.ink },
  spaced: { marginTop: spacing.sm },
});
