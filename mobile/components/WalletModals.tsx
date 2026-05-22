import * as Clipboard from 'expo-clipboard';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function RecoveryPhraseModal({ visible, mnemonic, onClose }: any) {
  const mnemonicWords = mnemonic ? mnemonic.split(' ').filter((word: string) => word.length > 0) : [];

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(mnemonic);
    Alert.alert('Copied', 'Recovery phrase copied');
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Recovery Phrase</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Write down these 12 words in order and store them safely
          </Text>

          <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {mnemonicWords.length > 0 ? (
              <>
                <View style={styles.wordsGrid}>
                  {mnemonicWords.map((word: any, index: number) => (
                    <View key={index} style={styles.wordCard}>
                      <Text style={styles.wordNumber}>{index + 1}</Text>
                      <Text style={styles.wordText}>{word}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.warningCard}>
                  <Text style={styles.warningTitle}>Important</Text>
                  <Text style={styles.warningText}>
                    Never share your recovery phrase{'\n'}
                    Store it in a secure location{'\n'}
                    You'll need it to restore your wallet
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.loadingText}>Loading words...</Text>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={copyToClipboard} style={styles.copyBtn}>
              <Text style={styles.copyBtnText}>Copy to Clipboard</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export function ImportWalletModal({ visible, onClose, onImport, loading }: any) {
  const [seedPhrase, setSeedPhrase] = React.useState('');

  const handleImport = async () => {
    const success = await onImport(seedPhrase);
    if (success) {
      setSeedPhrase('');
      onClose();
    }
  };

  const handleClose = () => {
    setSeedPhrase('');
    onClose();
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={handleClose}>
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <View style={styles.importModalContent}>
          <Text style={styles.importModalTitle}>Import Wallet</Text>
          <Text style={styles.importModalSubtitle}>Enter seed phrase</Text>

          <TextInput
            style={styles.seedPhraseInput}
            placeholder="Enter your seed phrase..."
            placeholderTextColor="#666"
            value={seedPhrase}
            onChangeText={setSeedPhrase}
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <View style={styles.warningBox}>
            <Text style={styles.warningBoxText}>Don't share this</Text>
          </View>

          <TouchableOpacity
            style={[styles.importBtn, (loading || !seedPhrase.trim()) && styles.buttonDisabled]}
            onPress={handleImport}
            disabled={loading || !seedPhrase.trim()}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.importBtnText}>Import Wallet</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.importCancelBtn} onPress={handleClose} disabled={loading}>
            <Text style={styles.importCancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  modalScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  modalContent: {
    paddingHorizontal: 24,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4B5563',
    width: '31.5%',
    minHeight: 44,
  },
  wordNumber: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    minWidth: 16,
    marginRight: 4,
    flexShrink: 0,
  },
  wordText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
    flexShrink: 1,
  },
  warningCard: {
    backgroundColor: '#451A03',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    color: '#FCD34D',
  },
  warningText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#FDE68A',
  },
  modalFooter: {
    padding: 24,
    paddingTop: 20,
    gap: 12,
  },
  copyBtn: {
    backgroundColor: '#374151',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  copyBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  doneBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    padding: 20,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
  },
  importModalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 500,
  },
  importModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  importModalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
    textAlign: 'center',
  },
  seedPhraseInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 14,
    minHeight: 120,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningBoxText: {
    flex: 1,
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '500',
  },
  importBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  importBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  importCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  importCancelBtnText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
});
