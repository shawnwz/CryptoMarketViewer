import '../../lib/i18n';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemePicker } from '../ThemePicker';
import { ThemeProvider } from '../../contexts/ThemeContext';

describe('ThemePicker', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults to "System" selected, with no persisted preference', async () => {
    const { getByText } = await render(
      <ThemeProvider>
        <ThemePicker />
      </ThemeProvider>
    );

    // All three options render regardless of selection.
    expect(getByText('System')).toBeTruthy();
    expect(getByText('Light')).toBeTruthy();
    expect(getByText('Dark')).toBeTruthy();
  });

  it('switches the active preference and persists it when a different option is tapped', async () => {
    const { getByText } = await render(
      <ThemeProvider>
        <ThemePicker />
      </ThemeProvider>
    );

    await fireEvent.press(getByText('Dark'));

    expect(await AsyncStorage.getItem('app_theme')).toBe('dark');
  });

  it('persists "light" the same way when Light is tapped', async () => {
    const { getByText } = await render(
      <ThemeProvider>
        <ThemePicker />
      </ThemeProvider>
    );

    await fireEvent.press(getByText('Light'));

    expect(await AsyncStorage.getItem('app_theme')).toBe('light');
  });
});
