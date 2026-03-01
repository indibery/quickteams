import Animated, { FadeInDown } from "react-native-reanimated";
import type { PropsWithChildren } from "react";
import type { ViewStyle, StyleProp } from "react-native";

type Props = PropsWithChildren<{
  index: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
}>;

export default function AnimatedCard({ index, style, className, children }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(350).springify()}
      style={style}
      className={className}
    >
      {children}
    </Animated.View>
  );
}
