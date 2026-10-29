import { Tabs } from "expo-router/js-tabs";

import { CareTabBar } from "@/components/CareTabBar";

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <CareTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Calendar" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
      <Tabs.Screen name="meds" options={{ title: "Meds" }} />
      <Tabs.Screen name="updates" options={{ title: "Updates" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
