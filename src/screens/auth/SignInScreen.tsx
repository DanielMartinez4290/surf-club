import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { colors, spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export const SignInScreen = ({ navigation }: Props) => (
  <SafeAreaView style={styles.container}>
    <BackButton />
    <View style={styles.content}>
      <Text style={styles.heading}>Sign in</Text>
      <Text style={styles.subtext}>Choose how you'd like to sign in.</Text>
      <Button title="Sign in with Phone" icon="person" onPress={() => navigation.navigate('PhoneSignIn')} />
      <Button
        title="Sign in with Email"
        variant="secondary"
        icon="mail-outline"
        onPress={() => navigation.navigate('Login')}
        style={styles.spaced}
      />
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  content: { padding: spacing.lg, paddingTop: spacing.md },
  heading: { ...typography.title, marginBottom: spacing.xs },
  subtext: { ...typography.body, color: colors.slate, marginBottom: spacing.lg },
  spaced: { marginTop: spacing.sm },
});
