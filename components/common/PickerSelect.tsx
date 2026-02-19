import { View, Text, Pressable, Modal, FlatList } from "react-native";
import { useState } from "react";

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
      <Text className="text-sm text-gray-500 mb-1">{label}</Text>
      <Pressable
        className="border border-gray-300 rounded-xl px-4 py-3 bg-white"
        onPress={() => setOpen(true)}
      >
        <Text className="text-tablet-sm text-secondary">
          {selected?.label ?? "선택"}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40 justify-center items-center"
          onPress={() => setOpen(false)}
        >
          <View className="bg-white rounded-2xl w-[300px] max-h-[400px] p-4">
            <Text className="text-tablet-md font-bold text-secondary mb-3">
              {label}
            </Text>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <Pressable
                  className={`py-3 px-4 rounded-xl mb-1 ${
                    item.value === value ? "bg-primary/20" : ""
                  }`}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    className={`text-tablet-sm ${
                      item.value === value
                        ? "text-primary font-bold"
                        : "text-secondary"
                    }`}
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
