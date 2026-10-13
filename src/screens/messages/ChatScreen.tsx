import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { Ionicons } from '@expo/vector-icons';
import { apiGetConversation, apiMarkConversationRead, apiSendMessage } from '../../api/messages';
import { toApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { promptBlock, promptReport } from '../../utils/moderation';
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
      try {
        await apiSendMessage(userId, text);
      } catch (error) {
        // Not delivered (e.g. it tripped the language filter), so take it back out of the thread.
        setMessages((prev) => prev.filter((m) => m._id !== newMessages[0]._id));
        Alert.alert('Message not sent', toApiError(error).message);
      }
    },
    [userId]
  );

  const firstName = name.split(' ')[0];

  // Report / block menu in the header.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() =>
            Alert.alert(firstName, undefined, [
              { text: `Report ${firstName}`, onPress: () => promptReport('user', userId, firstName) },
              {
                text: `Block ${firstName}`,
                style: 'destructive',
                onPress: () => promptBlock(userId, firstName, () => navigation.popToTop()),
              },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Report or block"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.ocean} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, userId, firstName]);

  // Long-press a message they sent to report it.
  const onLongPressMessage = useCallback(
    (_context: unknown, message: IMessage) => {
      if (!user || message.user._id === user.id) return;
      Alert.alert('Message', message.text, [
        { text: 'Report Message', onPress: () => promptReport('direct_message', Number(message._id), 'Message') },
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
        onPressAvatar={() => navigation.navigate('UserProfile', { userId, firstName, image })}
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
