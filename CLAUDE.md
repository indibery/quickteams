# QuickTeams — Claude 작업 가이드

## 프로젝트 개요
한국 초등학교 체육 교사를 위한 스포츠 팀 관리 앱.
학생 달리기 기록 기반 능력 점수 계산 → 균형잡힌 팀 자동 배정 → 경기 점수판 운영.

**타깃 기기**: iPad Pro 13인치 (기본) + iPhone 대응
**현재 버전**: 2.0.3
**앱 이름**: 바로팀 (slug: QuickTeams — EAS 연결용이라 변경 불가)
**배포**: `eas submit -p ios` (TestFlight → App Store 심사 제출 완료)
**Apple ID (ASC)**: 6751106037

---

## 기술 스택

| 항목 | 버전 |
|------|------|
| Expo SDK | ~54.0.33 |
| React Native | 0.81.5 |
| React | 19.1.0 |
| Expo Router | ~6.0.23 |
| expo-sqlite | ~16.0.10 |
| Zustand | ^5.0.11 |
| NativeWind | ^4.2.1 |
| TypeScript | ~5.9.2 |

---

## 프로젝트 구조

```
QuickTeams/
├── app/                        # Expo Router 파일 기반 라우팅
│   ├── _layout.tsx             # 루트 레이아웃 (DB 초기화, 스택 설정)
│   ├── index.tsx               # 메인 홈 화면 (메뉴 그리드)
│   ├── students/
│   │   ├── index.tsx           # 학생 목록 (학년/반 필터, CRUD)
│   │   └── [id].tsx            # 학생 상세/편집
│   ├── teams/
│   │   ├── new.tsx             # 팀 관리 (생성/보기/편집/소폭교체) ← 핵심 파일
│   │   ├── index.tsx           # 경기 시작 (팀 선택)
│   │   └── [id].tsx            # 팀 상세 명단
│   ├── game/
│   │   └── scoreboard/[teamId].tsx  # 경기 점수판 (headerShown: false)
│   ├── records/index.tsx       # 경기 기록
│   └── settings/index.tsx      # 설정 및 데이터 관리
│
├── components/
│   ├── common/PickerSelect.tsx  # 드롭다운 공통 컴포넌트
│   └── students/StudentForm.tsx # 학생 입력 폼
│
├── lib/
│   ├── types.ts                # 전역 TypeScript 타입
│   ├── db/
│   │   ├── database.ts         # DB 마이그레이션 (현재 user_version: 5)
│   │   ├── schema.ts           # 스키마 정의
│   │   └── repositories/
│   │       ├── studentRepository.ts
│   │       ├── teamRepository.ts
│   │       └── gameRepository.ts
│   └── algorithms/
│       ├── abilityScore.ts     # 달리기→능력점수 변환
│       ├── zigzagAssignment.ts # 지그재그 팀 배정
│       └── partialSwap.ts      # 소폭 교체 (1-2명 스왑)
│
├── stores/
│   ├── studentStore.ts
│   ├── teamStore.ts
│   └── gameStore.ts
│
├── tailwind.config.js
├── app.json
└── CLAUDE.md                   # 이 파일
```

---

## 커스텀 Tailwind 설정

### 색상
```js
primary: "#3B82F6"      // 메인 파랑 (버튼, 헤더)
sky: "#BFDBFE"          // 밝은 파랑 (남학생 배경)
sunny: "#FCD34D"        // 노랑 (여학생 배경, 강조)
secondary: "#1E293B"    // 진한 슬레이트 (텍스트)
```

### 디자인 패턴 (v2.0.3 리프레시)
- **카드**: `border` 제거, `shadow-sm` 소프트 그림자 사용
- **모서리**: `rounded-2xl` ~ `rounded-3xl` (기존 rounded-xl보다 더 둥글게)
- **빈 상태**: 큰 아이콘 박스 (bg-gray-100 w-20 h-20 rounded-3xl) + 텍스트
- **PickerSelect**: `bg-gray-50 rounded-2xl` (테두리 없음)
- **필터 영역**: `shadow-sm` (border-b 대신)
- **메인 메뉴**: 카드별 다른 배경색 (blue-50, indigo-50, amber-50, emerald-50)
- **메인 화면**: `headerShown: false`, 앱 타이틀 직접 표시
- **버튼 반응**: `active:scale-95` (메인) / `active:opacity-80` (기타)

### 폰트 크기 (iPad 최적화)
```js
text-tablet-sm: 18px   // 일반 텍스트, 버튼 레이블
text-tablet-md: 20px   // 섹션 헤더, 강조
text-tablet-lg: 24px   // 대형 헤더
text-score-xl: 120px   // 점수판 숫자
```

---

## 데이터베이스

### 마이그레이션 히스토리 (user_version: 5)
| 버전 | 변경 내용 |
|------|---------|
| v1 | 초기 스키마 생성 (5개 테이블) |
| v2 | `adjustment` 컬럼 추가 (-5~+5 능력 보정) |
| v3 | team_count 2~6으로 확장, FK 재구성 |
| v4 | v3에서 깨진 FK 참조 수정 |
| v5 | `teams.label` 컬럼 추가 (팀 이름/용도) |

### 주요 테이블
- **students**: id, name, grade, class, student_number, gender, running_record, adjustment, ability_score
- **teams**: id, name, label, grade, class, team_type, team_count, is_active
- **team_members**: id, team_id(FK), student_id(FK), team_name
- **game_records**: id, team_id(FK), game_type, result_type, winner_team, scores(JSON)
- **individual_records**: id, game_record_id(FK), student_id(FK), record_type, description

### 마이그레이션 작성 시 주의사항
- 컬럼 추가 전 항상 `PRAGMA table_info(테이블명)` 으로 존재 확인 (멱등성)
- WAL 모드 + 외래 키 제약 활성화 상태

---

## 핵심 알고리즘

### 능력 점수 계산 (abilityScore.ts)
1. 달리기 기록 파싱: "SS.ss" 형식 (예: "12.15"), 하위호환 "MM:SS"
2. 학급 내 상대 순위 → 1.0~5.0점 변환
3. adjustment 적용: `점수 + adjustment × 0.2`
4. 최종 클램핑: 1.0~5.0

### 지그재그 배정 (zigzagAssignment.ts)
- 능력 순서대로 팀에 순환 배정하여 균형 맞춤
- 균형 점수: `100 - (표준편차 × 50)`, 0~100
- **혼성 모드**: "1팀", "2팀"... 팀 이름
- **성별분리 모드**: "1팀 남자", "2팀 남자", "1팀 여자", "2팀 여자"
  - 균형 점수: 같은 성별끼리만 비교 후 평균

### 소폭 교체 (partialSwap.ts)
- 기존 팀 유지, 가장 강한 팀↔가장 약한 팀 간 능력 가장 비슷한 1-2쌍 교체
- `BALANCE_TOLERANCE = 5`: 균형 점수 소폭 하락도 허용 (달리기 측정 오차 감안)
- 100점이어도 교체 가능 — `tolerableCandidates` 중 랜덤 선택
- **성별분리 팀**: `swapWithinGroup()`으로 같은 성별 팀끼리만 교체
  - `getGenderGroup()`: 팀 이름 끝 "남자"/"여자" 감지
  - `isSeparateGenderTeams()`: 성별분리 여부 자동 판단
- `swappedIds[]` 로 교체된 학생 강조 표시 (주황 테두리 + ★)

### 학생 일괄 입력 (studentRepository.ts)
- `insertStudentsBatch()`: upsert 방식 (`ON CONFLICT DO UPDATE`)
- UNIQUE(grade, class, student_number) 충돌 시 이름/성별/기록 갱신
- `COALESCE(excluded.running_record, running_record)` — 새 기록 없으면 기존값 유지

---

## 주요 UI 패턴

### 반응형 레이아웃 (iPad / iPhone)
```tsx
const { width } = useWindowDimensions();
const isTablet = width >= 768;
```
- iPad: 큰 폰트, 5열 그리드
- iPhone: 작은 폰트, 4열 그리드, `adjustsFontSizeToFit` 사용

### Modal에서 Safe Area 처리
```tsx
// SafeAreaView edges는 Modal 내부에서 동작 안 함 (RN 이슈)
// 대신 useSafeAreaInsets() + paddingTop 사용
const insets = useSafeAreaInsets();
<View style={{ paddingTop: insets.top }}>
```
- 적용 파일: `teams/new.tsx`(3), `students/index.tsx`(2), `settings/index.tsx`(1)

### 점수판 컨트롤 바 (scoreboard)
- `absolute` 오버레이 대신 상단 고정 바 (`bg-black/80`) 사용
- `paddingTop: insets.top + 4`로 Dynamic Island 회피
- 숨김 시 우측 상단 ☰ 토글 버튼만 표시

### 버튼 표준 크기 (iPad)
```jsx
// 필터 행 버튼 (PickerSelect 옆에 나란히)
<Pressable
  className="bg-primary rounded-xl px-5 items-center justify-center self-end"
  style={{ height: 50 }}
>
```
- `justify-end pb-1` 금지 → PickerSelect 라벨 높이 때문에 빈 공간 생김
- 항상 `items-center justify-center self-end` + `style={{ height: 50 }}`

### 성별 표시
- 남학생: 👦 이모지 + `bg-sky` 배경
- 여학생: 👧 이모지 + `bg-sunny/30` 배경

### 팀원 칩 (보기/편집 공통)
```jsx
// 배경: 남=DBEAFE(하늘), 여=FEF3C7(노랑), 교체됨=FFF7ED(주황)
<View className="px-4 py-2 rounded-xl items-center">
  <Text className="text-tablet-sm font-bold text-secondary">이름</Text>
  <Text className="text-xs text-gray-400">🏃 기록초</Text>  // 달리기 기록
</View>
```

---

## 앱 설정 (app.json)
- **name**: 바로팀
- **slug**: QuickTeams (EAS 프로젝트 ID 연결, 변경 불가)
- **bundleIdentifier (iOS)**: `com.quickteams.app`
- **package (Android)**: `com.quickteams.app`
- **orientation**: default
- **supportsTablet**: true
- **newArchEnabled**: true (New Architecture 사용)

---

## 경로 별칭
`@/` = 프로젝트 루트 (tsconfig.json paths 설정)

---

## 자주 하는 실수 / 주의사항
1. **SQLite 마이그레이션**: `ALTER TABLE ADD COLUMN` 전 항상 `PRAGMA table_info` 체크
2. **PickerSelect 옆 버튼**: `justify-end` 사용 금지, `height: 50` 고정
3. **FlatList renderItem**: `useCallback` 사용, deps 정확히 명시
4. **팀원 정보 조회**: `getTeamMembers()`는 `running_record`도 함께 SELECT함
5. **소폭 교체 후**: `editMembers` state를 새 배치로 즉시 교체해야 UI 반영됨
6. **Modal Safe Area**: `SafeAreaView edges` 방식은 Modal 내부에서 동작 안 함 → `useSafeAreaInsets()` + `paddingTop` 사용
7. **점수판 scores 배열**: `currentTeam.teamCount`(DB값) 대신 `teamNames.length`(실제 팀 수)로 초기화 — 성별분리 시 실제 팀 수가 다름
8. **성별분리 팀 교체**: 남자팀↔여자팀 교체 불가, 반드시 같은 성별 그룹 내에서만
9. **일괄 입력 중복**: `INSERT` 대신 `ON CONFLICT DO UPDATE` (upsert) — 같은 번호 학생 재입력 시 갱신
10. **기록 보기 teamName**: `teams.name`에 타임스탬프 저장됨 → `gameRepository.ts`에서 `t.grade`, `t.class`, `t.label`을 JOIN해서 "N학년 N반" 형식으로 재구성
11. **app.json slug**: "QuickTeams" 유지 필수 — EAS 프로젝트 ID와 연결되어 변경하면 빌드 실패
12. **App Store 스크린샷 해상도**: iPhone 6.5" = 1284x2778, iPad 12.9" = 2732x2048 (가로). iPhone 6.7"(1290x2796)은 ASC에서 거부됨
13. **eas submit**: `ascAppId`를 eas.json에 설정해야 non-interactive 모드 동작. Apple ID 인증 필요 시 터미널에서 직접 실행

## App Store 정보
- **지원 URL**: https://indibery.github.io/quickteams/
- **개인정보 처리방침 URL**: https://indibery.github.io/quickteams/privacy.html
- **GitHub 저장소**: https://github.com/indibery/quickteams (public)
- **GitHub Pages**: docs/ 폴더에서 호스팅
