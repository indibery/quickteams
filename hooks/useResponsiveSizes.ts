import { useWindowDimensions } from "react-native";
import { useMemo } from "react";

export type ResponsiveSizes = {
  /** 본문 텍스트, 버튼 레이블 (iPad 18px / Phone 14px) */
  sm: number;
  /** 섹션 헤더 (iPad 20px / Phone 16px) */
  md: number;
  /** 대형 헤더 (iPad 24px / Phone 20px) */
  lg: number;
  /** 캡션, 보조 텍스트 (iPad 14px / Phone 12px) */
  xs: number;
  /** 필터바 버튼 높이 (iPad 50px / Phone 44px) */
  buttonH: number;
  /** TextInput fontSize — 16 미만 시 iOS 자동 줌 방지 (iPad 18px / Phone 16px) */
  inputFs: number;
  /** width >= 768 */
  isTablet: boolean;
};

export function useResponsiveSizes(): ResponsiveSizes {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return useMemo(
    () => ({
      sm: isTablet ? 18 : 14,
      md: isTablet ? 20 : 16,
      lg: isTablet ? 24 : 20,
      xs: isTablet ? 14 : 12,
      buttonH: isTablet ? 50 : 44,
      inputFs: isTablet ? 18 : 16,
      isTablet,
    }),
    [isTablet]
  );
}
