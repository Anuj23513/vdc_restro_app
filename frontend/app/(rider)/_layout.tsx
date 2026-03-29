import { Stack } from 'expo-router';
import { COLORS } from '../../constants/theme';

export default function RiderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.text,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'Rider Dashboard' }} />
    </Stack>
  );
}