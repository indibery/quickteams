import {
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState, useCallback } from "react";
import { useStudentStore } from "@/stores/studentStore";
import type { Student, StudentInput } from "@/lib/types";
import StudentForm from "@/components/students/StudentForm";
import PickerSelect from "@/components/common/PickerSelect";

const gradeOptions = Array.from({ length: 6 }, (_, i) => ({
  label: `${i + 1}학년`,
  value: i + 1,
}));
const classOptions = Array.from({ length: 20 }, (_, i) => ({
  label: `${i + 1}반`,
  value: i + 1,
}));

export default function StudentsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const {
    students,
    selectedGrade,
    selectedClass,
    isLoading,
    setFilter,
    loadStudents,
    addStudent,
    editStudent,
    removeStudent,
    removeStudentsByClass,
    recalculateScores,
  } = useStudentStore();

  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    loadStudents(db);
  }, [selectedGrade, selectedClass]);

  const handleFilterChange = useCallback(
    (grade: number, classNum: number) => {
      setFilter(grade, classNum);
    },
    [setFilter]
  );

  const handleAdd = async (input: StudentInput) => {
    await addStudent(db, input);
    await recalculateScores(db);
    setShowForm(false);
  };

  const handleEdit = async (input: StudentInput) => {
    if (!editingStudent) return;
    await editStudent(db, editingStudent.id, input);
    await recalculateScores(db);
    setEditingStudent(null);
  };

  const handleDelete = (student: Student) => {
    Alert.alert("학생 삭제", `${student.name} 학생을 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          await removeStudent(db, student.id);
          await recalculateScores(db);
        },
      },
    ]);
  };

  const handleDeleteClass = () => {
    if (students.length === 0) {
      Alert.alert("알림", "삭제할 학생이 없습니다.");
      return;
    }
    Alert.alert(
      "학급 전체 삭제",
      `${selectedGrade}학년 ${selectedClass}반 학생 ${students.length}명을 모두 삭제합니다.\n이 작업은 되돌릴 수 없습니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "최종 확인",
              `정말로 ${students.length}명 전체를 삭제하시겠습니까?`,
              [
                { text: "취소", style: "cancel" },
                {
                  text: "전체 삭제",
                  style: "destructive",
                  onPress: async () => {
                    await removeStudentsByClass(db);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <Pressable
      className="bg-white rounded-2xl p-4 mb-2.5 flex-row items-center active:opacity-80"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
      }}
      onPress={() => setEditingStudent(item)}
    >
      {/* 성별 아이콘 */}
      <View
        className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${
          item.gender === "M" ? "bg-blue-50" : "bg-amber-50"
        }`}
      >
        <Text style={{ fontSize: 22 }}>
          {item.gender === "M" ? "👦" : "👧"}
        </Text>
      </View>

      {/* 학생 정보 */}
      <View className="flex-1">
        <Text className="text-tablet-sm font-bold text-secondary">
          {item.studentNumber}번 {item.name}
        </Text>
        <View className="flex-row gap-2 mt-1">
          {item.runningRecord && (
            <Text className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg">
              🏃 {item.runningRecord}초
            </Text>
          )}
          {item.adjustment !== 0 && (
            <Text
              className={`text-xs px-2 py-0.5 rounded-lg font-bold ${
                item.adjustment > 0
                  ? "text-primary bg-blue-50"
                  : "text-amber-600 bg-amber-50"
              }`}
            >
              능력 보정 {item.adjustment > 0 ? `+${item.adjustment}` : item.adjustment}
            </Text>
          )}
        </View>
      </View>

      {/* 능력 점수 */}
      {item.abilityScore != null && (
        <View className="bg-blue-50 rounded-xl px-3 py-1.5 mr-2">
          <Text className="text-xs text-gray-400">능력</Text>
          <Text className="text-tablet-sm font-bold text-primary">
            {item.abilityScore.toFixed(1)}
          </Text>
        </View>
      )}

      {/* 개별 삭제 버튼 */}
      <Pressable
        className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center active:bg-red-100"
        onPress={() => handleDelete(item)}
        hitSlop={8}
      >
        <Text style={{ fontSize: 16 }}>🗑️</Text>
      </Pressable>
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
      {/* 필터 영역 */}
      <View
        className="bg-white px-6 py-3 flex-row gap-3"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
          elevation: 1,
        }}
      >
        <View className="flex-1">
          <PickerSelect
            label="학년"
            value={selectedGrade}
            options={gradeOptions}
            onSelect={(v) => handleFilterChange(v as number, selectedClass)}
          />
        </View>
        <View className="flex-1">
          <PickerSelect
            label="반"
            value={selectedClass}
            options={classOptions}
            onSelect={(v) => handleFilterChange(selectedGrade, v as number)}
          />
        </View>
        {/* 학생 추가 */}
        <Pressable
          className="bg-primary rounded-2xl px-5 items-center justify-center self-end active:opacity-80"
          style={{ height: 50 }}
          onPress={() => setShowForm(true)}
        >
          <Text className="text-white text-tablet-sm font-bold">+ 추가</Text>
        </Pressable>
        {/* 학급 전체 삭제 */}
        <Pressable
          className="bg-red-50 rounded-2xl px-4 items-center justify-center self-end active:opacity-80"
          style={{ height: 50 }}
          onPress={handleDeleteClass}
        >
          <Text className="text-red-500 text-tablet-sm font-bold">학급 삭제</Text>
        </Pressable>
      </View>

      {/* 학생 수 */}
      <View className="px-6 py-2.5">
        <Text className="text-sm text-gray-400">
          {selectedGrade}학년 {selectedClass}반 · {students.length}명
        </Text>
      </View>

      {/* 목록 */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : students.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <View className="bg-gray-100 w-20 h-20 rounded-3xl items-center justify-center mb-4">
            <Text style={{ fontSize: 36 }}>📝</Text>
          </View>
          <Text className="text-tablet-sm text-gray-400">
            학생을 추가해주세요
          </Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStudent}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8 }}
        />
      )}

      {/* 추가 모달 */}
      <Modal visible={showForm} animationType="slide">
        <View className="flex-1" style={{ paddingTop: insets.top }}>
          <View className="bg-primary px-6 py-4">
            <Text className="text-xl font-bold text-white">학생 추가</Text>
          </View>
          <StudentForm
            defaultGrade={selectedGrade}
            defaultClass={selectedClass}
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
          />
        </View>
      </Modal>

      {/* 편집 모달 */}
      <Modal visible={editingStudent != null} animationType="slide">
        <View className="flex-1" style={{ paddingTop: insets.top }}>
          <View className="bg-primary px-6 py-4">
            <Text className="text-xl font-bold text-white">학생 편집</Text>
          </View>
          {editingStudent && (
            <StudentForm
              initial={editingStudent}
              onSubmit={handleEdit}
              onCancel={() => setEditingStudent(null)}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
