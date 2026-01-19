import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSDK } from '@metamask/sdk-react-native';

export default function HomeScreen() {
  const { account, chainId, sdk, connected } = useSDK();

  const connectWallet = async () => {
    try {
      await sdk?.connect();
      Alert.alert('Success', 'Wallet connected!');
    } catch (error) {
      console.error('Failed to connect:', error);
      Alert.alert('Error', 'Failed to connect wallet');
    }
  };

  const disconnectWallet = async () => {
    try {
      await sdk?.terminate(); // Changed from disconnect() to terminate()
      Alert.alert('Success', 'Wallet disconnected!');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  useEffect(() => {
    if (account && chainId) {
      console.log('Connected account:', account);
      console.log('Chain ID:', chainId);
    }
  }, [account, chainId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verity Voting DApp</Text>
      
      {!connected ? (
        <TouchableOpacity style={styles.button} onPress={connectWallet}>
          <Text style={styles.buttonText}>Connect MetaMask</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.connectedContainer}>
          <Text style={styles.label}>Connected Account:</Text>
          <Text style={styles.address}>
            {account?.substring(0, 6)}...{account?.substring(38)}
          </Text>
          <Text style={styles.label}>Network ID: {chainId}</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.disconnectButton]} 
            onPress={disconnectWallet}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  button: {
    backgroundColor: '#f6851b',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disconnectButton: {
    backgroundColor: '#dc2626',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  connectedContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    width: '100%',
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 15,
  },
  address: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 5,
  },
});