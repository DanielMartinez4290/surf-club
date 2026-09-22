export const colors = {
  ocean: '#0B5D66',
  oceanDark: '#08444B',
  coral: '#FF6B4A',
  sand: '#F6F1E7',
  ink: '#12242A',
  slate: '#5C6B6E',
  border: '#E3DCCB',
  white: '#FFFFFF',
  danger: '#D64545',
  success: '#2E8B57',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.ink },
  heading: { fontSize: 20, fontWeight: '600' as const, color: colors.ink },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.ink },
  caption: { fontSize: 13, fontWeight: '400' as const, color: colors.slate },
};
