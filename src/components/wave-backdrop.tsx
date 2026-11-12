import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { c } from '@/theme';

export function WaveBackdrop({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[styles.wrap, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 260" preserveAspectRatio="none">
        <Path
          d="M0 148 C 52 120 96 98 148 74 C 196 52 244 30 300 36 C 324 39 344 46 360 52 L 360 260 L 0 260 Z"
          fill={c.mint600}
        />
        <Path
          d="M0 188 C 58 170 104 148 162 126 C 222 103 268 92 360 102 L 360 260 L 0 260 Z"
          fill={c.mint300}
          fillOpacity={0.28}
        />
        <Path
          d="M0 212 C 64 202 118 186 176 170 C 236 154 296 148 360 158 L 360 260 L 0 260 Z"
          fill={c.mint200}
          fillOpacity={0.18}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
