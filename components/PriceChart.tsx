import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { CmcHistoricalPoint } from '../lib/coinmarketcap';
import { formatPrice } from '../lib/format';

const CHART_HEIGHT = 180;

export function PriceChart({ data }: { data: CmcHistoricalPoint[] }) {
  const [width, setWidth] = useState(0);

  if (data.length < 2) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Not enough data to chart</Text>
      </View>
    );
  }

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const isPositive = prices[prices.length - 1] >= prices[0];
  const color = isPositive ? '#16a34a' : '#dc2626';

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: CHART_HEIGHT - ((d.price - min) / range) * CHART_HEIGHT,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${width} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;

  return (
    <View>
      <View style={styles.chartWrapper} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            <Path d={areaPath} fill={color} fillOpacity={0.12} stroke="none" />
            <Path d={linePath} stroke={color} strokeWidth={2} fill="none" />
          </Svg>
        ) : null}
      </View>
      <View style={styles.labelsRow}>
        <Text style={styles.labelText}>Low {formatPrice(min)}</Text>
        <Text style={styles.labelText}>High {formatPrice(max)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: { height: CHART_HEIGHT, width: '100%' },
  placeholder: { height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: '#999' },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  labelText: { fontSize: 12, color: '#888' },
});
