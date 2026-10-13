import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../../components/BackButton';
import { colors, layout, spacing, typography } from '../../theme';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Agreeing to these terms',
    body:
      'These Terms of Use are an End User License Agreement (EULA) between you and Wakesurf Club. By creating an account or signing in, you agree to them. If you do not agree, do not use the app.',
  },
  {
    title: '2. Who can use Wakesurf Club',
    body:
      'You must be at least 18 years old. Your profile must be about you: use your real first name and photos of yourself, and keep your account to yourself.',
  },
  {
    title: '3. No tolerance for objectionable content or abusive members',
    body:
      'Wakesurf Club has zero tolerance for objectionable content or abusive behavior. In your profile, photos, outings, and messages you may not post or send anything that:\n\n' +
      '•  harasses, bullies, threatens, or intimidates anyone\n' +
      '•  is hateful or discriminatory toward any person or group\n' +
      '•  is sexually explicit, pornographic, or obscene\n' +
      '•  promotes violence, self-harm, or illegal activity\n' +
      '•  is spam, a scam, or impersonates someone else\n' +
      "•  shares someone else's private information without their consent\n\n" +
      'Text is automatically screened for prohibited language, and anything that breaks these rules may be removed without notice.',
  },
  {
    title: '4. Reporting and blocking',
    body:
      'You can report any profile, outing, or message, and you can block any member, from inside the app. Blocking immediately removes that member and their content from what you see and notifies our team. We review every report within 24 hours, remove content that breaks these terms, and remove the member who posted it.',
  },
  {
    title: '5. Removal of accounts',
    body:
      'We may suspend or permanently remove any account that breaks these terms, with or without warning. You can delete your own account at any time from Edit Profile.',
  },
  {
    title: '6. Your content',
    body:
      'You keep ownership of what you post. You give Wakesurf Club permission to store and display it to other members so the app can work. You are responsible for everything you post.',
  },
  {
    title: '7. Outings and safety',
    body:
      'Outings are organized by members, not by Wakesurf Club. Boating and water sports carry real risk. You take part at your own risk and are responsible for your own safety, equipment, and conduct, and for following all applicable laws.',
  },
  {
    title: '8. Disclaimer',
    body:
      'The app is provided "as is" without warranties of any kind. To the fullest extent the law allows, Wakesurf Club is not liable for the conduct of members, on or off the water, or for any loss arising from your use of the app.',
  },
  {
    title: '9. Contact',
    body: 'Questions about these terms, or need to reach us about a report? Email support@wakesurfclub.net.',
  },
];

export const TermsScreen = () => (
  <SafeAreaView style={styles.container}>
    <BackButton />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Terms of Use</Text>
      <Text style={styles.subheading}>End User License Agreement</Text>
      {SECTIONS.map((section) => (
        <React.Fragment key={section.title}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </React.Fragment>
      ))}
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.sand },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  heading: { ...typography.title },
  subheading: { ...typography.caption, marginTop: spacing.xs },
  sectionTitle: { ...typography.heading, fontSize: 17, marginTop: spacing.lg, marginBottom: spacing.xs },
  body: { ...typography.body, color: colors.slate, lineHeight: 22 },
});
