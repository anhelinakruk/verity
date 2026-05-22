import { useWallet } from '@/hooks/useWallet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Contract, JsonRpcProvider } from 'ethers';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import VotingSystemABI from '../abi/VotingSystem.json';
import { ErrorRetry } from '../components/ErrorRetry';
import { ProposalSkeleton } from '../components/LoadingSkeleton';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const RPC_URL = process.env.EXPO_PUBLIC_RPC_URL || 'http://192.168.2.8:8545';
const CONTRACT_ADDRESS = process.env.EXPO_PUBLIC_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

interface Proposal {
  proposal_id: number;
  title: string;
  description: string;
  creator: string;
  options: string[];
  votes_count: number[];
  deadline: number;
  is_active: boolean;
  total_votes: number;
}

export default function VoteScreen() {
  const { proposalId } = useLocalSearchParams<{ proposalId: string }>();
  const router = useRouter();
  const wallet = useWallet();

  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [checkingVoteStatus, setCheckingVoteStatus] = useState(false);

  useEffect(() => {
    if (proposalId) {
      // Reset state when proposalId changes
      setProposal(null);
      setSelectedOption(null);
      setError(null);
      setHasVoted(false);
      
      loadProposal();
      checkIfUserVoted();
    }
  }, [proposalId, wallet.address]);

  const checkIfUserVoted = async () => {
    if (!wallet.address || !proposalId) return;

    setCheckingVoteStatus(true);
    try {
      const provider = new JsonRpcProvider(RPC_URL);
      const contract = new Contract(CONTRACT_ADDRESS, VotingSystemABI, provider);
      
      const voted = await contract.hasUserVoted(parseInt(proposalId), wallet.address);
      setHasVoted(voted);
    } catch (err) {
      console.error('Error checking vote status:', err);
    } finally {
      setCheckingVoteStatus(false);
    }
  };

  const loadProposal = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/proposals/${proposalId}`);

      if (!response.ok) {
        throw new Error('Failed to load proposal');
      }

      const data = await response.json();
      setProposal(data);
      setError(null);
    } catch (err) {
      console.error('Error loading proposal:', err);
      setError(err instanceof Error ? err.message : 'Failed to load proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (selectedOption === null || !proposal || !wallet.address) {
      Alert.alert('Error', 'Please select an option');
      return;
    }

    // Check if user already voted
    if (hasVoted) {
      Alert.alert(
        'Already Voted',
        'You have already cast your vote on this proposal. Each address can only vote once.',
        [{ text: 'OK' }]
      );
      return;
    }

    const now = new Date();
    const deadline = new Date(proposal.deadline * 1000);
    if (now > deadline || !proposal.is_active) {
      Alert.alert(
        'Proposal Closed',
        'This proposal is no longer accepting votes. The deadline has passed.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const provider = new JsonRpcProvider(RPC_URL);
      const balance = await provider.getBalance(wallet.address);
      const minBalance = BigInt('100000000000000');
      
      if (balance < minBalance) {
        Alert.alert(
          'Insufficient Balance',
          'You need some ETH to pay for gas fees. Please request funds from the faucet in settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (err) {
      console.error('Error checking balance:', err);
    }

    Alert.alert(
      'Confirm Vote',
      `Vote for "${proposal.options[selectedOption]}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Vote',
          onPress: () => executeVote(),
        },
      ]
    );
  };

  const executeVote = async () => {
    if (selectedOption === null || !proposal || !wallet.wallet) return;

    setVoting(true);

    try {
      const provider = new JsonRpcProvider(RPC_URL);
      const signer = wallet.wallet.connect(provider);
      const contract = new Contract(CONTRACT_ADDRESS, VotingSystemABI, signer);
      
      const tx = await contract.vote(proposal.proposal_id, selectedOption);
      
      Alert.alert('Transaction Sent', 'Waiting for confirmation...', [{ text: 'OK' }]);
      
      const receipt = await tx.wait();
      
      setHasVoted(true);
      
      Alert.alert(
        'Vote Confirmed!',
        `Your vote has been recorded on the blockchain.\n\nTransaction: ${receipt.hash.substring(0, 10)}...`,
        [
          {
            text: 'OK',
            onPress: () => {
              loadProposal();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error voting:', error);
      
      let errorMessage = 'Failed to cast vote';
      let errorTitle = 'Error';
      
      if (error.code === 'ACTION_REJECTED') {
        errorTitle = 'Transaction Rejected';
        errorMessage = 'You rejected the transaction in your wallet';
      } else if (error.message?.includes('insufficient funds')) {
        errorTitle = 'Insufficient Funds';
        errorMessage = 'You need more ETH to pay for gas fees. Please request funds from the faucet.';
      } else if (error.message?.includes('already voted') || error.message?.includes('AlreadyVoted')) {
        errorTitle = 'Already Voted';
        errorMessage = 'You have already voted on this proposal. Each address can only vote once.';
        setHasVoted(true); // Update state
      } else if (error.message?.includes('not active') || error.message?.includes('ProposalNotActive')) {
        errorTitle = 'Proposal Closed';
        errorMessage = 'This proposal is no longer accepting votes.';
      } else if (error.message?.includes('Invalid option')) {
        errorTitle = 'Invalid Option';
        errorMessage = 'The selected option is not valid for this proposal.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setVoting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return (votes / total) * 100;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <ProposalSkeleton />
      </View>
    );
  }

  if (error || !proposal) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <ErrorRetry 
          message={error || 'Proposal not found'} 
          onRetry={loadProposal} 
        />
      </View>
    );
  }

  const isActive = proposal.is_active && new Date() < new Date(proposal.deadline * 1000);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vote</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={styles.statusText}>{isActive ? 'Active' : 'Ended'}</Text>
        </View>

        <Text style={styles.title}>{proposal.title}</Text>
        <Text style={styles.description}>{proposal.description}</Text>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Total Votes</Text>
            <Text style={styles.infoValue}>{proposal.total_votes}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Deadline</Text>
            <Text style={styles.infoValue}>{formatDate(proposal.deadline)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Options</Text>

          {proposal.options.map((option, index) => {
            const votes = proposal.votes_count[index] || 0;
            const percentage = getPercentage(votes, proposal.total_votes);
            const isSelected = selectedOption === index;
            const isLeading = votes > 0 && votes === Math.max(...proposal.votes_count);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  !isActive && styles.optionCardDisabled,
                ]}
                onPress={() => isActive && setSelectedOption(index)}
                disabled={!isActive}
              >
                <View style={styles.optionHeader}>
                  <View style={styles.optionLeft}>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.optionText, !isActive && styles.optionTextDisabled]}>
                      {option}
                    </Text>
                  </View>
                  {isLeading && proposal.total_votes > 0 && (
                    <View style={styles.leadingBadge}>
                      <Text style={styles.leadingBadgeText}>Leading</Text>
                    </View>
                  )}
                </View>

                <View style={styles.voteStats}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
                  </View>
                  <Text style={styles.voteStatsText}>
                    {votes} votes ({percentage.toFixed(1)}%)
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {hasVoted && (
          <View style={styles.alreadyVotedNotice}>
            <Text style={styles.alreadyVotedIcon}>✓</Text>
            <Text style={styles.alreadyVotedText}>You have already voted on this proposal</Text>
          </View>
        )}

        {isActive && !hasVoted && (
          <TouchableOpacity
            style={[
              styles.voteButton,
              (selectedOption === null || voting || checkingVoteStatus) && styles.voteButtonDisabled,
            ]}
            onPress={handleVote}
            disabled={selectedOption === null || voting || checkingVoteStatus}
          >
            {voting || checkingVoteStatus ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.voteButtonText}>Cast Vote</Text>
            )}
          </TouchableOpacity>
        )}

        {!isActive && (
          <View style={styles.endedNotice}>
            <Text style={styles.endedNoticeText}>This proposal has ended</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#6366F1',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  activeBadge: {
    backgroundColor: '#10B981',
  },
  inactiveBadge: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#AAA',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  infoItem: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  optionCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#1E1E3F',
  },
  optionCardDisabled: {
    opacity: 0.7,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#6366F1',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366F1',
  },
  optionText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
    flex: 1,
  },
  optionTextDisabled: {
    color: '#888',
  },
  leadingBadge: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  leadingBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  voteStats: {
    gap: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  voteStatsText: {
    fontSize: 14,
    color: '#888',
  },
  voteButton: {
    backgroundColor: '#6366F1',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  voteButtonDisabled: {
    opacity: 0.5,
  },
  voteButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  alreadyVotedNotice: {
    backgroundColor: '#166534',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  alreadyVotedIcon: {
    color: '#86EFAC',
    fontSize: 20,
    fontWeight: 'bold',
  },
  alreadyVotedText: {
    color: '#86EFAC',
    fontSize: 16,
    fontWeight: '600',
  },
  endedNotice: {
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  endedNoticeText: {
    color: '#888',
    fontSize: 16,
  },
});
