import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme';

interface Props extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

export const Button = ({
  title,
  loading,
  variant = 'primary',
  icon,
  style,
  disabled,
  ...rest
}: Props) => {
  const textColor = variant === 'secondary' ? colors.ocean : colors.white;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        variant === 'danger' && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={textColor} style={styles.icon} />}
          <Text style={[styles.label, { color: textColor }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.ocean },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.ocean,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  icon: { marginRight: spacing.sm },
  label: { fontSize: 16, fontWeight: '600' },
});
