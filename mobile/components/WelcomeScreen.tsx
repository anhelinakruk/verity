import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function WelcomeScreen({ loading, error, onCreateWallet, onImportWallet }: any) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logoContainer}>
        <Text style={styles.logo}>V</Text>
      </LinearGradient>
      
      <Text style={styles.title}>Verity Wallet</Text>
      <Text style={styles.subtitle}>Your Ethereum wallet</Text>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.buttonDisabled]}
          onPress={onCreateWallet}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Create New Wallet</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onImportWallet}
          disabled={loading}>
          <Text style={styles.secondaryBtnText}>Import Wallet</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.securityNote}>
        <Text style={styles.securityNoteText}>
          Your keys are encrypted and stored only on your device
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    fontSize: 52,
    fontWeight: '800',
    color: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 48,
    textAlign: 'center',
  },
  actionsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  primaryBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.5)',
  },
  secondaryBtnText: {
    color: '#818CF8',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorBox: {
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  securityNote: {
    backgroundColor: 'rgba(31, 41, 55, 0.6)',
    padding: 18,
    borderRadius: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  securityNoteText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
    textAlign: 'center',
  },
});
