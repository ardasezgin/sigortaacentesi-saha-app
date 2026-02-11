import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

interface ScreenHeaderProps {
  title: string;
}

/**
 * Ekran başlığı ve hamburger menü butonu içeren header component
 */
export function ScreenHeader({ title }: ScreenHeaderProps) {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const colors = useColors();

  return (
    <View
      className="flex-row items-center px-4 py-3 border-b"
      style={{ borderBottomColor: colors.border }}
    >
      <Pressable
        onPress={() => navigation.openDrawer()}
        style={({ pressed }) => ([
          {
            marginRight: 12,
            padding: 8,
            marginLeft: -8,
            opacity: pressed ? 0.6 : 1,
          }
        ])}
      >
        <Ionicons name="menu" size={28} color={colors.foreground} />
      </Pressable>

      <Text className="text-xl font-bold text-foreground flex-1">
        {title}
      </Text>
    </View>
  );
}
