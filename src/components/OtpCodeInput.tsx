import React, { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, radii } from '../theme';

interface Props {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}

// Small self-built OTP box grid — avoids pulling in an unmaintained,
// GitHub-sourced third-party OTP input dependency for a handful of TextInputs.
export const OtpCodeInput = ({ length = 6, value, onChange }: Props) => {
  const inputs = useRef<Array<TextInput | null>>([]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) {
      const next = value.slice(0, index) + value.slice(index + 1);
      onChange(next);
      return;
    }

    // Handles pasted codes that land in a single box.
    if (cleaned.length > 1) {
      onChange(cleaned.slice(0, length));
      inputs.current[Math.min(cleaned.length, length - 1)]?.focus();
      return;
    }

    const next = value.slice(0, index) + cleaned + value.slice(index + 1);
    onChange(next.slice(0, length));
    if (index < length - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputs.current[index] = ref;
          }}
          style={styles.box}
          keyboardType="number-pad"
          maxLength={length}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  box: {
    width: 46,
    height: 56,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    textAlign: 'center',
    fontSize: 22,
    color: colors.ink,
  },
});
