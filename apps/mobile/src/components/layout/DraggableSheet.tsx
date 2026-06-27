import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '@/theme/colors';

const SNAP_POINTS = [0.58, 0.34, 0.08] as const;
const SPRING_CONFIG = { damping: 24, stiffness: 220 };

type DraggableSheetProps = {
  children: ReactNode;
  header?: ReactNode;
  backgroundColor?: string;
  initialSnapIndex?: number;
};

function snapOffset(screenHeight: number, visibleFraction: number) {
  return screenHeight * (1 - visibleFraction);
}

function nearestSnapIndex(screenHeight: number, translateY: number) {
  'worklet';
  const offsets = [
    screenHeight * (1 - SNAP_POINTS[0]),
    screenHeight * (1 - SNAP_POINTS[1]),
    screenHeight * (1 - SNAP_POINTS[2]),
  ];
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < offsets.length; index += 1) {
    const distance = Math.abs(translateY - offsets[index]);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

export function DraggableSheet({
  children,
  header,
  backgroundColor = colors.background,
  initialSnapIndex = 0,
}: DraggableSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const snapOffsets = useMemo(
    () => SNAP_POINTS.map((point) => snapOffset(screenHeight, point)),
    [screenHeight]
  );
  const minOffset = snapOffset(screenHeight, SNAP_POINTS[SNAP_POINTS.length - 1]);
  const maxOffset = snapOffset(screenHeight, SNAP_POINTS[0]);
  const translateY = useSharedValue(snapOffsets[initialSnapIndex] ?? snapOffsets[0]);
  const dragStartY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = dragStartY.value + event.translationY;
      const rubberBandMin = minOffset - 24;
      const rubberBandMax = maxOffset + 24;
      translateY.value = Math.min(Math.max(next, rubberBandMin), rubberBandMax);
    })
    .onEnd(() => {
      const index = nearestSnapIndex(screenHeight, translateY.value);
      translateY.value = withSpring(snapOffsets[index], SPRING_CONFIG);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.sheetHost, { height: screenHeight }, sheetStyle]}>
      <View style={[styles.sheet, { backgroundColor }]}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
        </GestureDetector>
        {header ? <View style={styles.header}>{header}</View> : null}
        <View style={styles.content}>{children}</View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheetHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: -16 },
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.outline,
  },
  header: {
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
  },
});
