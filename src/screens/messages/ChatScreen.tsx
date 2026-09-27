import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { apiGetConversation, apiMarkConversationRead, apiSendMessage } from '../../api/messages';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import { renderChatMessage } from './chatMessage';
import type { DirectMessage } from '../../types';

const toGiftedMessage = (
  m: DirectMessage,
  myId: number,
  partnerImage?: string | null,
  partnerFirstName?: string
): IMessage => ({
  _id: m.id,
  text: m.message,
  createdAt: new Date(m.created_at),
  user:
    m.user_id_from === myId
      ? { _id: myId }
      : { _id: m.user_id_from, name: partnerFirstName, avatar: partnerImage ?? undefined },
});

export const ChatScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { userId, name, image } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<IMessage[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const conversation = await apiGetConversation(userId);
    setMessages(conversation.map((m) => toGiftedMessage(m, user.id, image, name.split(' ')[0])).reverse());
    apiMarkConversationRead(userId).catch(() => {});
  }, [userId, user, image, name]);

  useEffect(() => {
    load();
  }, [load]);

  const onSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      const text = newMessages[0]?.text;
      if (!text) return;
      setMessages((prev) => GiftedChat.append(prev, newMessages));
      await apiSendMessage(userId, text);
    },
    [userId]
  );

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        renderMessage={renderChatMessage}
        onPressAvatar={() =>
          navigation.navigate('UserProfile', { userId, firstName: name.split(' ')[0], image })
        }
        user={{ _id: user.id, name: `${user.first_name}` }}
        textInputProps={{ placeholder: 'Message...' }}
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
