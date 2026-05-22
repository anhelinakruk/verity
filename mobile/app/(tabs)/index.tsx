import { ImportWalletModal, RecoveryPhraseModal } from '@/components/WalletModals';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function HomeScreen() {
  const { isAuthenticated } = useAuth();
  const wallet = useWallet();
  const router = useRouter();

  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleCreateWallet = async () => {
    const success = await wallet.createWallet();
    if (success) {
      setShowRecoveryModal(true);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? Make sure you have saved your recovery phrase!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: wallet.clearWalletData },
      ]
    );
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied`);
  };

  if (wallet.initializing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>Verity</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.logo}>Verity</Text>
          {isAuthenticated && (
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>⋯</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={wallet.refreshing}
            onRefresh={wallet.refreshWalletData}
            tintColor="#6366F1"
            colors={['#6366F1']}
          />
        }
      >
        {!isAuthenticated ? (
          <WelcomeScreen
            loading={wallet.loading}
            error={wallet.error}
            onCreateWallet={handleCreateWallet}
            onImportWallet={() => setShowImportModal(true)}
          />
        ) : (
          <View style={styles.dashboard}>
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Your Balance</Text>
              {wallet.loadingBalance ? (
                <ActivityIndicator color="#6366F1" size="large" />
              ) : (
                <Text style={styles.balanceAmount}>{wallet.balance} ETH</Text>
              )}
              <Text style={styles.balanceHint}>For gas fees only</Text>
            </View>

            <View style={styles.addressCard}>
              <Text style={styles.cardTitle}>Your Address</Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(wallet.address, 'Address')}
                style={styles.addressBox}>
                <Text style={styles.addressText} numberOfLines={1}>
                  {wallet.address}
                </Text>
                <Text style={styles.copyIcon}>📋</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recoveryCard}>
              <Text style={styles.cardTitle}>Recovery Phrase</Text>
              <Text style={styles.recoveryWarning}>
                Keep your recovery phrase safe. You'll need it to restore your wallet.
              </Text>
              <TouchableOpacity
                onPress={() => setShowRecoveryModal(true)}
                style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>View Recovery Phrase</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <RecoveryPhraseModal
        visible={showRecoveryModal}
        mnemonic={wallet.mnemonic}
        onClose={() => setShowRecoveryModal(false)}
      />

      <ImportWalletModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={wallet.importWallet}
        loading={wallet.loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#000',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtnText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 20,
    fontWeight: '700',
    marginTop: -2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
  },
  dashboard: {
    gap: 20,
  },
  balanceCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  balanceHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  addressCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  recoveryCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
  },
  recoveryWarning: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 20,
  },
  secondaryBtn: {
    backgroundColor: '#374151',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
