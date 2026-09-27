import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AvatarProps, GiftedAvatar, IMessage, Message, MessageProps } from 'react-native-gifted-chat';
import { colors } from '../../theme';

const AVATAR_SIZE = 60;
const avatarImage = { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 };

// Sender photo with their first name underneath. Fixed to the photo's width so bubbles line up
// with the empty spacer GiftedChat leaves under a sender's earlier messages in a run.
const renderAvatarWithName = ({ currentMessage, onPressAvatar }: Omit<AvatarProps<IMessage>, 'renderAvatar'>) => (
  <View style={styles.avatarColumn}>
    <GiftedAvatar
      user={currentMessage.user}
      avatarStyle={avatarImage}
      onPress={() => onPressAvatar?.(currentMessage.user)}
    />
    {currentMessage.user.name ? (
      <Text style={styles.name} numberOfLines={1}>
        {currentMessage.user.name}
      </Text>
    ) : null}
  </View>
);

// Larger sender photos and more breathing room between messages than GiftedChat's defaults
// (36px avatars, 2px/10px gaps). Passed as GiftedChat's renderMessage.
export const renderChatMessage = (props: MessageProps<IMessage>) => {
  const sameSender = props.nextMessage?.user?._id === props.currentMessage.user._id;
  const spacing = { marginBottom: sameSender ? 10 : 24 };
  // Message forwards extra props to its Avatar, which reads imageStyle/renderAvatar;
  // MessageProps doesn't declare them.
  const avatarProps = {
    imageStyle: { left: avatarImage, right: avatarImage },
    renderAvatar: renderAvatarWithName,
  } as object;
  return <Message {...props} {...avatarProps} containerStyle={{ left: spacing, right: spacing }} />;
};

const styles = StyleSheet.create({
  avatarColumn: { width: AVATAR_SIZE, alignItems: 'center' },
  name: { fontSize: 12, color: colors.slate, marginTop: 2, maxWidth: AVATAR_SIZE },
});
