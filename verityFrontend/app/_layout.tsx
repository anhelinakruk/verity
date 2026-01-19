import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { Stack } from 'expo-router';
import { MetaMaskProvider } from '@metamask/sdk-react-native';

export default function RootLayout() {
  return (
    <MetaMaskProvider
      sdkOptions={{
        dappMetadata: {
          name: 'Verity Voting App',
          url: 'https://verity-voting.com',
          iconUrl: 'https://verity-voting.com/icon.png',
          scheme: 'verity',
        },
      }}
    >
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </MetaMaskProvider>
  );
}