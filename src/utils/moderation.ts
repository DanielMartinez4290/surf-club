import { Alert } from 'react-native';
import { apiBlockUser, apiReportContent } from '../api/moderation';
import { toApiError } from '../api/client';
import type { ReportContentType } from '../types';

const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate speech or threats',
  'Sexual or inappropriate content',
  'Spam or scam',
];

// Asks why, then files the report. `label` names what's being reported, e.g. "Message" or "Outing".
export const promptReport = (contentType: ReportContentType, contentId: number, label: string) => {
  const submit = async (reason: string) => {
    try {
      await apiReportContent({ content_type: contentType, content_id: contentId, reason });
      Alert.alert('Report sent', 'Thanks for letting us know. Our team reviews every report within 24 hours.');
    } catch (error) {
      Alert.alert('Could not send report', toApiError(error).message);
    }
  };

  Alert.alert(`Report ${label}`, 'Why are you reporting this?', [
    ...REPORT_REASONS.map((reason) => ({ text: reason, onPress: () => submit(reason) })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
};

// Confirms, blocks, then calls onBlocked so the screen can drop the member's content right away.
export const promptBlock = (userId: number, name: string, onBlocked: () => void) => {
  Alert.alert(
    `Block ${name}?`,
    "You won't see each other's outings, messages, or profiles, and our team will be notified. You can unblock them later from Edit Profile.",
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiBlockUser(userId);
            onBlocked();
          } catch (error) {
            Alert.alert('Could not block member', toApiError(error).message);
          }
        },
      },
    ]
  );
};
