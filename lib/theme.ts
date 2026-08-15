export type ThemeColors = {
  background: string;
  card: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentMuted: string;
  accentOnMuted: string;
  danger: string;
  success: string;
  overlay: string;
  onAccent: string;
};

export const lightColors: ThemeColors = {
  background: '#ffffff',
  card: '#ffffff',
  surface: '#f2f2f2',
  border: '#e5e5e5',
  text: '#111111',
  textMuted: '#888888',
  textFaint: '#cccccc',
  accent: '#2563eb',
  accentMuted: '#eef2ff',
  accentOnMuted: '#4338ca',
  danger: '#dc2626',
  success: '#16a34a',
  overlay: 'rgba(0,0,0,0.4)',
  onAccent: '#ffffff',
};

export const darkColors: ThemeColors = {
  background: '#000000',
  card: '#161618',
  surface: '#1f1f22',
  border: '#2e2e31',
  text: '#f5f5f7',
  textMuted: '#9a9aa0',
  textFaint: '#55555a',
  accent: '#3b82f6',
  accentMuted: 'rgba(59,130,246,0.18)',
  accentOnMuted: '#93c5fd',
  danger: '#ef4444',
  success: '#22c55e',
  overlay: 'rgba(0,0,0,0.6)',
  onAccent: '#ffffff',
};
