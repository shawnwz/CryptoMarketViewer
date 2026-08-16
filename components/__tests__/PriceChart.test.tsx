import '../../lib/i18n';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { processColor } from 'react-native';
import { PriceChart } from '../PriceChart';
import { lightColors } from '../../lib/theme';
import type { CmcHistoricalPoint } from '../../lib/coinmarketcap';


jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: require('../../lib/theme').lightColors, scheme: 'light' }),
}));

function point(timestamp: string, price: number): CmcHistoricalPoint {
  return { timestamp, price };
}

describe('PriceChart', () => {
  it('shows a placeholder instead of a chart when there are fewer than 2 points', async () => {
    const { getByText } = await render(<PriceChart data={[point('t1', 100)]} />);

    expect(getByText('Not enough data to chart')).toBeTruthy();
  });

  it('renders low/high labels from the price range once there is enough data', async () => {
    const data = [point('t1', 100), point('t2', 150), point('t3', 90)];
    const { getByText } = await render(<PriceChart data={data} />);

    expect(getByText(/Low/)).toBeTruthy();
    expect(getByText(/High/)).toBeTruthy();
  });

  it('draws the line in the success color when the price ended up, danger color when it ended down', async () => {
    const rising = [point('t1', 100), point('t2', 150)];
    const falling = [point('t1', 150), point('t2', 100)];

    const risingChart = await render(<PriceChart data={rising} />);
    await fireEvent(risingChart.getByTestId('price-chart-wrapper'), 'layout', {
      nativeEvent: { layout: { width: 300 } },
    });
    expect(risingChart.getByTestId('price-chart-line').props.stroke.payload).toBe(processColor(lightColors.success));

    const fallingChart = await render(<PriceChart data={falling} />);
    await fireEvent(fallingChart.getByTestId('price-chart-wrapper'), 'layout', {
      nativeEvent: { layout: { width: 300 } },
    });
    expect(fallingChart.getByTestId('price-chart-line').props.stroke.payload).toBe(processColor(lightColors.danger));
  });
});
