/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",    // 메인 파랑 (밝고 선명)
        "primary-dark": "#2563EB", // 진한 파랑 (헤더/강조)
        sky: "#BFDBFE",        // 밝은 파랑 (배경/카드)
        sunny: "#FCD34D",      // 포인트 노랑 (배지/강조)
        "sunny-dark": "#F59E0B", // 진한 노랑 (버튼)
        secondary: "#1E293B",  // 슬레이트 (텍스트)
        team1: "#3B82F6",      // 팀1 - 파랑
        team2: "#EF4444",      // 팀2 - 빨강
        team3: "#10B981",      // 팀3 - 초록
        team4: "#F59E0B",      // 팀4 - 앰버
        team5: "#8B5CF6",      // 팀5 - 보라
        team6: "#EC4899",      // 팀6 - 핑크
      },
      fontSize: {
        "score-xl": ["120px", { lineHeight: "1" }],
        "team-name": ["72px", { lineHeight: "1.1" }],
        "tablet-lg": ["24px", { lineHeight: "1.4" }],
        "tablet-md": ["20px", { lineHeight: "1.4" }],
        "tablet-sm": ["18px", { lineHeight: "1.4" }],
      },
    },
  },
  plugins: [],
};
