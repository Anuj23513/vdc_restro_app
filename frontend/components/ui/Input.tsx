import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { COLORS, SIZES } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  style,
  ...props
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={[styles.input, icon && styles.inputWithIcon, style]}
          placeholderTextColor={COLORS.textMuted}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: SIZES.fontMd,
    color: COLORS.text,
    marginBottom: SIZES.sm,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  iconContainer: {
    paddingLeft: SIZES.md,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.fontMd,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
  },
  inputWithIcon: {
    paddingLeft: SIZES.sm,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.fontSm,
    marginTop: SIZES.xs,
  },
});