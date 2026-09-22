import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { apiGetConversation, apiMarkConversationRead, apiSendMessage } from '../../api/messages';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import type { DirectMessage } from '../../types';

const toGiftedMessage = (m: DirectMessage, myId: number): IMessage => ({
  _id: m.id,
  text: m.message,
  createdAt: new Date(m.created_at),
  user: { _id: m.user_id_from === myId ? myId : m.user_id_from },
});

export const ChatScreen = ({ route }: { route: any }) => {
  const { userId, name } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<IMessage[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const conversation = await apiGetConversation(userId);
    setMessages(conversation.map((m) => toGiftedMessage(m, user.id)).reverse());
    apiMarkConversationRead(userId).catch(() => {});
  }, [userId, user]);

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
        user={{ _id: user.id, name: `${user.first_name}` }}
        textInputProps={{ placeholder: 'Message...' }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
});
