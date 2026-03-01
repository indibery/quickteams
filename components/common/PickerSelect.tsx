import { View, Text, Pressable, Modal, FlatList } from "react-native";
import { useState } from "react";
import { Colors } from "@/constants/theme";

type Option = { label: string; value: string | number };

type Props = {
  label: string;
  value: string | number;
  options: Option[];
  onSelect: (value: string | number) => void;
};

export default function PickerSelect({ label, value, options, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      <Text style={{ color: Colors.text3 }} className="text-sm mb-1">{label}</Text>
      <Pressable
        className="rounded-2xl px-4 py-3 active:opacity-80"
        style={{ backgroundColor: Colors.surface }}
        onPress={() => setOpen(true)}
      >
        <Text className="text-tablet-sm font-medium" style={{ color: Colors.text1 }}>
          {selected?.label ?? "선택"}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade">
        <Pressable
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: Colors.overlay }}
          onPress={() => setOpen(false)}
        >
          <View
            className="rounded-3xl w-[300px] max-h-[400px] p-5"
            style={{
              backgroundColor: Colors.card,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <Text className="text-tablet-md font-bold mb-4" style={{ color: Colors.text1 }}>
              {label}
            </Text>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  className="py-3 px-4 rounded-2xl mb-1"
                  style={item.value === value ? { backgroundColor: Colors.primarySoft } : undefined}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    className={`text-tablet-sm ${
                      item.value === value ? "font-bold" : ""
                    }`}
                    style={{ color: item.value === value ? Colors.primary : Colors.text1 }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
