import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { OtpCodeInput } from '../../components/OtpCodeInput';
import { apiPhoneLogin } from '../../api/auth';
import { toApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyCode'>;

export const VerifyCodeScreen = ({ navigation, route }: Props) => {
  const { countryCode, phoneNumber } = route.params;
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const result = await apiPhoneLogin(countryCode, phoneNumber, code);

      if ('access_token' in result) {
        await signIn(result.access_token, result.user);
        return;
      }

      if (result.verification_status === 'Verified') {
        // Phone confirmed but no account exists yet — finish signup with it pre-filled.
        navigation.replace('Register', { verifiedPhoneNumber: phoneNumber });
        return;
      }

      Alert.alert('Invalid code', 'That code did not match. Please try again.');
    } catch (error) {
      Alert.alert('Verification failed', toApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Enter the code</Text>
        <Text style={styles.subtext}>
          Sent to {countryCode} {phoneNumber}
        </Text>
        <OtpCodeInput value={code} onChange={setCode} />
        <Button title="Verify" onPress={handleVerify} loading={loading} style={styles.spaced} />
        <Button
          title="Back"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.spaced}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  content: { padding: spacing.lg, paddingTop: spacing.xxl },
  heading: { ...typography.title },
  subtext: { ...typography.body, color: colors.slate, marginBottom: spacing.xl },
  spaced: { marginTop: spacing.md },
});
