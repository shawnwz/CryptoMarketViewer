import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import type { CmcHistoricalPoint } from '../lib/coinmarketcap';
import { formatPrice } from '../lib/format';
import { ThemeColors } from '../lib/theme';

const CHART_HEIGHT = 180;

export function PriceChart({ data }: { data: CmcHistoricalPoint[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [width, setWidth] = useState(0);

  if (data.length < 2) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>{t('coin.notEnoughData')}</Text>
      </View>
    );
  }

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const isPositive = prices[prices.length - 1] >= prices[0];
  const color = isPositive ? colors.success : colors.danger;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: CHART_HEIGHT - ((d.price - min) / range) * CHART_HEIGHT,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${width} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;

  return (
    <View>
      <View
        testID="price-chart-wrapper"
        style={styles.chartWrapper}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            <Path d={areaPath} fill={color} fillOpacity={0.12} stroke="none" />
            <Path testID="price-chart-line" d={linePath} stroke={color} strokeWidth={2} fill="none" />
          </Svg>
        ) : null}
      </View>
      <View style={styles.labelsRow}>
        <Text style={styles.labelText}>
          {t('coin.low')} {formatPrice(min)}
        </Text>
        <Text style={styles.labelText}>
          {t('coin.high')} {formatPrice(max)}
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    chartWrapper: { height: CHART_HEIGHT, width: '100%' },
    placeholder: { height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' },
    placeholderText: { color: colors.textMuted },
    labelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    labelText: { fontSize: 12, color: colors.textMuted },
  });
}
