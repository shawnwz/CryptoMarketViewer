import React from 'react';
import { render } from '@testing-library/react-native';
import { CoinRow } from '../CoinRow';
import { lightColors } from '../../lib/theme';
import type { CmcCoin } from '../../lib/coinmarketcap';

jest.mock('expo-router', () => {
  const { Text: RNText } = require('react-native');
  return {
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <RNText testID="link" accessibilityHint={href}>
        {children}
      </RNText>
    ),
  };
});

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ currency: 'USD' }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: require('../../lib/theme').lightColors }),
}));

jest.mock('../FavoriteButton', () => ({
  FavoriteButton: () => {
    const { Text: RNText } = require('react-native');
    return <RNText testID="favorite-button">star</RNText>;
  },
}));

function coinWithQuote(overrides: Partial<CmcCoin['quote'][number]> = {}): CmcCoin {
  return {
    id: 1,
    name: 'Bitcoin',
    symbol: 'BTC',
    slug: 'bitcoin',
    cmc_rank: 1,
    circulating_supply: 0,
    total_supply: 0,
    max_supply: null,
    quote: [
      {
        symbol: 'USD',
        price: 63000,
        volume_24h: 0,
        volume_change_24h: 0,
        percent_change_1h: 0,
        percent_change_24h: 2.5,
        percent_change_7d: 0,
        percent_change_30d: 0,
        percent_change_60d: 0,
        percent_change_90d: 0,
        market_cap: 0,
        market_cap_dominance: 0,
        fully_diluted_market_cap: 0,
        last_updated: '',
        ...overrides,
      },
    ],
  };
}

describe('CoinRow', () => {
  it('renders the coin name, symbol, price, and 24h change', async () => {
    const { getByText } = await render(<CoinRow coin={coinWithQuote()} />);

    expect(getByText('Bitcoin')).toBeTruthy();
    expect(getByText('BTC')).toBeTruthy();
    expect(getByText('$63,000.00')).toBeTruthy();
    expect(getByText('+2.50%')).toBeTruthy();
  });

  it('shows a placeholder price and no change when the coin has no quote for the active currency', async () => {
    const coin = coinWithQuote();
    coin.quote[0].symbol = 'EUR'; // no USD quote, and useLanguage() is mocked to 'USD'
    const { getByText, queryByText } = await render(<CoinRow coin={coin} />);

    expect(getByText('—')).toBeTruthy();
    expect(queryByText('+2.50%')).toBeNull();
  });

  it('colors a negative 24h change with the danger color, not the success color', async () => {
    const coin = coinWithQuote({ percent_change_24h: -1.2 });
    const { getByText } = await render(<CoinRow coin={coin} />);

    const change = getByText('-1.20%');
    const flatStyle = [change.props.style].flat();
    expect(flatStyle).toContainEqual({ color: lightColors.danger });
    expect(flatStyle).not.toContainEqual({ color: lightColors.success });
  });

  it('links to the coin detail page for this coin', async () => {
    const { getByTestId } = await render(<CoinRow coin={coinWithQuote()} />);

    expect(getByTestId('link').props.accessibilityHint).toBe('/coin/1');
  });

  it('renders the favorite star for this coin', async () => {
    const { getByTestId } = await render(<CoinRow coin={coinWithQuote()} />);

    expect(getByTestId('favorite-button')).toBeTruthy();
  });
});
