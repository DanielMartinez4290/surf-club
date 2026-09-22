import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { apiGetGroupConversation, apiSendGroupMessage } from '../../api/messages';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import type { GroupMessage } from '../../types';

const toGiftedMessage = (m: GroupMessage): IMessage => ({
  _id: m.id,
  text: m.message,
  createdAt: new Date(m.created_at),
  user: { _id: m.user_id_from, name: m.user_from?.first_name },
});

export const GroupChatScreen = ({ route }: { route: any }) => {
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
      await apiSendGroupMessage(eventId, text);
    },
    [eventId]
  );

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={{ _id: user.id, name: user.first_name }}
        textInputProps={{ placeholder: 'Message the group...' }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
});
