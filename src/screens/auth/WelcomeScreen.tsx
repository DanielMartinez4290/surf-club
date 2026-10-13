import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { colors, radii, spacing } from '../../theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

// welcome-bg.png has no @2x/@3x variant, so RN reports its intrinsic size in
// raw pixels treated as points (scale 1) — much wider than a phone's actual
// width. Sizing the Image with explicit numeric width/height from
// useWindowDimensions (rather than '%'/aspectRatio) avoids that intrinsic
// size ever winning the layout. The asset is now shot close to a phone's own
// aspect ratio, so a full-bleed "cover" crops only a sliver on most devices.
const bgSource = require('../../../assets/welcome-bg.png');

// Scales the photo up slightly and pins its bottom edge to the screen's
// bottom edge, so the extra crop comes entirely off the top (empty sky)
// instead of the bottom — this pushes the surfer up above the buttons
// without leaving a gap underneath. (`transform: scale` + `transformOrigin`
// wasn't reliably honored here, so the anchor is done with explicit
// position/size math instead.)
const HERO_ZOOM = 1.06;

export const WelcomeScreen = ({ navigation }: Props) => {
  const { width, height } = useWindowDimensions();
  const zoomedWidth = width * HERO_ZOOM;
  const zoomedHeight = height * HERO_ZOOM;
  const [agreed, setAgreed] = useState(false);

  // Nobody gets to sign-in or sign-up without accepting the Terms of Use (EULA) first.
  const continueTo = (screen: 'SignIn' | 'Register') => {
    if (!agreed) {
      Alert.alert('Terms of Use', 'Please read and agree to the Terms of Use to continue.');
      return;
    }
    navigation.navigate(screen);
  };

  return (
    <View style={styles.container}>
      <Image
        source={bgSource}
        style={{
          position: 'absolute',
          top: -(zoomedHeight - height),
          left: -(zoomedWidth - width) / 2,
          width: zoomedWidth,
          height: zoomedHeight,
        }}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(8,38,43,0.85)']}
        locations={[0, 0.6]}
        style={styles.overlay}
      />

      <SafeAreaView edges={['bottom']} style={styles.content}>
        <View style={styles.actions}>
          <View style={styles.termsRow}>
            <TouchableOpacity
              onPress={() => setAgreed((prev) => !prev)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              accessibilityLabel="I agree to the Terms of Use"
            >
              <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={26} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink} onPress={() => navigation.navigate('Terms')}>
                Terms of Use (EULA)
              </Text>
              , including no tolerance for objectionable content or abusive behavior.
            </Text>
          </View>
          <Button
            title="Sign In"
            icon="log-in-outline"
            style={styles.pill}
            onPress={() => continueTo('SignIn')}
          />
          <Button
            title="Create an account"
            variant="outline"
            icon="add-circle-outline"
            style={[styles.pill, styles.spaced]}
            onPress={() => continueTo('Register')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.oceanDark },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  content: { flex: 1, justifyContent: 'flex-end' },
  actions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm + 9, alignItems: 'center' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, width: '100%' },
  termsText: { flex: 1, color: colors.white, fontSize: 14, lineHeight: 20 },
  termsLink: { fontWeight: '700', textDecorationLine: 'underline' },
  pill: { width: '100%', borderRadius: radii.pill },
  spaced: { marginTop: spacing.md },
});
