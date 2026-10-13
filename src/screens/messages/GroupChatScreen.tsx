import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { apiGetGroupConversation, apiSendGroupMessage } from '../../api/messages';
import { toApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { promptBlock, promptReport } from '../../utils/moderation';
import { colors } from '../../theme';
import { renderChatMessage } from './chatMessage';
import type { GroupMessage } from '../../types';

const toGiftedMessage = (m: GroupMessage): IMessage => ({
  _id: m.id,
  text: m.message,
  createdAt: new Date(m.created_at),
  user: {
    _id: m.user_id_from,
    name: m.user_from?.first_name,
    avatar: m.user_from?.images.image_1 ?? undefined,
  },
});

export const GroupChatScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { eventId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<IMessage[]>([]);

  const load = useCallback(async () => {
    const conversation = await apiGetGroupConversation(eventId);
    setMessages(conversation.map(toGiftedMessage).reverse());
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const onSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      const text = newMessages[0]?.text;
      if (!text) return;
      setMessages((prev) => GiftedChat.append(prev, newMessages));
      try {
        await apiSendGroupMessage(eventId, text);
      } catch (error) {
        // Not delivered (e.g. it tripped the language filter), so take it back out of the thread.
        setMessages((prev) => prev.filter((m) => m._id !== newMessages[0]._id));
        Alert.alert('Message not sent', toApiError(error).message);
      }
    },
    [eventId]
  );

  // Long-press someone else's message to report it or block the sender.
  const onLongPressMessage = useCallback(
    (_context: unknown, message: IMessage) => {
      if (!user || message.user._id === user.id) return;
      const senderId = Number(message.user._id);
      const senderName = message.user.name || 'this member';
      Alert.alert('Message', message.text, [
        { text: 'Report Message', onPress: () => promptReport('group_message', Number(message._id), 'Message') },
        {
          text: `Block ${senderName}`,
          style: 'destructive',
          // Drop everything they've said from the thread right away.
          onPress: () =>
            promptBlock(senderId, senderName, () =>
              setMessages((prev) => prev.filter((m) => m.user._id !== senderId))
            ),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [user]
  );

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        renderMessage={renderChatMessage}
        onLongPressMessage={onLongPressMessage}
        onPressAvatar={(sender) =>
          navigation.navigate('UserProfile', {
            userId: Number(sender._id),
            firstName: sender.name ?? '',
            image: typeof sender.avatar === 'string' ? sender.avatar : null,
          })
        }
        user={{ _id: user.id, name: user.first_name }}
        textInputProps={{ placeholder: 'Message the group...' }}
        // Shrink the message list above the keyboard (instead of translating the whole
        // view up under the header) and measure the real on-screen position so the
        // nav header and bottom safe area are accounted for.
        keyboardAvoidingViewProps={{ behavior: 'padding', automaticOffset: true, keyboardVerticalOffset: 0 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
});
