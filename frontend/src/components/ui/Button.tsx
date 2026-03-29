import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  size = 'medium',
  disabled,
  style,
  ...props
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondary;
      case 'outline':
        return styles.outline;
      default:
        return styles.primary;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        getSizeStyle(),
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? COLORS.primary : COLORS.black}
        />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'outline' && styles.outlineText,
            size === 'small' && styles.smallText,
            size === 'large' && styles.largeText,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.secondaryLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  small: {
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
  },
  medium: {
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
  },
  large: {
    paddingVertical: SIZES.lg,
    paddingHorizontal: SIZES.xl,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: COLORS.black,
    fontSize: SIZES.fontMd,
    fontWeight: '600',
  },
  outlineText: {
    color: COLORS.primary,
  },
  smallText: {
    fontSize: SIZES.fontSm,
  },
  largeText: {
    fontSize: SIZES.fontLg,
  },
});