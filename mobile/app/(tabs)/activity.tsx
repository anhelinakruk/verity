import { useRouter } from 'expo-router';
import { Contract, JsonRpcProvider } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import VotingSystemABI from '../../abi/VotingSystem.json';
import { ErrorRetry } from '../../components/ErrorRetry';
import { EmptyState } from '../../components/EmptyState';
import { ProposalsListSkeleton } from '../../components/LoadingSkeleton';

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

interface VoteActivity {
  proposal: Proposal;
  votedOption: number;
  timestamp: number;
}

const STORAGE_KEYS = {
  ADDRESS: 'wallet_address',
};

export default function ActivityScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<VoteActivity[]>([]);
  const [address, setAddress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAddress();
  }, []);

  useEffect(() => {
    if (address) {
      loadVoteHistory();
    }
  }, [address]);

  const loadAddress = async () => {
    try {
      const savedAddress = await SecureStore.getItemAsync(STORAGE_KEYS.ADDRESS);
      if (savedAddress) {
        setAddress(savedAddress);
      }
    } catch (error) {
      console.error('Error loading address:', error);
    } finally {
      if (!address) {
        setLoading(false);
      }
    }
  };

  const loadVoteHistory = async () => {
    if (!address) return;
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/proposals`);
      if (!response.ok) {
        throw new Error('Failed to fetch proposals');
      }

      const proposals: Proposal[] = await response.json();
      const provider = new JsonRpcProvider(RPC_URL);
      const contract = new Contract(CONTRACT_ADDRESS, VotingSystemABI, provider);

      const voteChecks = await Promise.allSettled(
        proposals.map(proposal =>
          contract.hasUserVoted(proposal.proposal_id, address)
            .then(hasVoted => ({ proposal, hasVoted }))
        )
      );

      const votedProposals = voteChecks
        .filter((result): result is PromiseFulfilledResult<{proposal: Proposal, hasVoted: boolean}> => 
          result.status === 'fulfilled' && result.value.hasVoted
        )
        .map(result => result.value.proposal);

      const voteOptions = await Promise.allSettled(
        votedProposals.map(proposal =>
          contract.getUserVote(proposal.proposal_id, address)
            .then(votedOption => ({ proposal, votedOption: Number(votedOption) }))
        )
      );

      const votedActivities: VoteActivity[] = voteOptions
        .filter((result): result is PromiseFulfilledResult<{proposal: Proposal, votedOption: number}> =>
          result.status === 'fulfilled'
        )
        .map(result => ({
          proposal: result.value.proposal,
          votedOption: result.value.votedOption,
          timestamp: Date.now(),
        }));

      votedActivities.sort((a, b) => b.proposal.proposal_id - a.proposal.proposal_id);

      setActivities(votedActivities);
      setError(null);
    } catch (err) {
      console.error('Error loading vote history:', err);
      setError('Failed to load vote history. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadVoteHistory();
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getProposalStatus = (proposal: Proposal) => {
    const now = new Date();
    const deadline = new Date(proposal.deadline * 1000);
    
    if (!proposal.is_active || now > deadline) {
      return { text: 'Ended', color: '#6B7280' };
    }
    return { text: 'Active', color: '#10B981' };
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Activity</Text>
        </View>
        <ProposalsListSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Activity</Text>
        </View>
        <ErrorRetry message={error} onRetry={loadVoteHistory} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Activity</Text>
      </View>

      {!address ? (
        <EmptyState
          icon="🔑"
          title="Sign In Required"
          message="Please create or import a wallet to view your voting activity"
        />
      ) : activities.length === 0 ? (
        <EmptyState
          icon="🗳️"
          title="No Votes Yet"
          message="Start voting on proposals to build your activity history"
          actionText="View Proposals"
          onAction={() => router.push('/(tabs)')}
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#6366F1"
              colors={['#6366F1']}
            />
          }
        >
          <Text style={styles.sectionTitle}>
            {activities.length} {activities.length === 1 ? 'Vote' : 'Votes'}
          </Text>

          {activities.map((activity, index) => {
            const status = getProposalStatus(activity.proposal);
            const votedOptionText = activity.proposal.options[activity.votedOption];
            const votedOptionVotes = activity.proposal.votes_count[activity.votedOption] || 0;
            const percentage = activity.proposal.total_votes > 0
              ? ((votedOptionVotes / activity.proposal.total_votes) * 100).toFixed(1)
              : '0.0';

            return (
              <TouchableOpacity
                key={`${activity.proposal.proposal_id}-${index}`}
                style={styles.activityCard}
                onPress={() =>
                  router.push({
                    pathname: '/vote',
                    params: { proposalId: activity.proposal.proposal_id },
                  })
                }
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                    <Text style={styles.statusText}>{status.text}</Text>
                  </View>
                  <Text style={styles.dateText}>
                    Deadline: {formatDate(activity.proposal.deadline)}
                  </Text>
                </View>

                <Text style={styles.proposalTitle}>{activity.proposal.title}</Text>

                <View style={styles.voteInfo}>
                  <Text style={styles.voteLabel}>Your vote:</Text>
                  <View style={styles.votedOption}>
                    <Text style={styles.votedOptionText}>{votedOptionText}</Text>
                    <Text style={styles.votedPercentage}>{percentage}%</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.footerText}>
                    {activity.proposal.total_votes} total votes
                  </Text>
                  <Text style={styles.footerText}>→</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFF',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  activityCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    color: '#6B7280',
    fontSize: 12,
  },
  proposalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  voteInfo: {
    backgroundColor: '#0F1419',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  voteLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  votedOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  votedOptionText: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '600',
    flex: 1,
  },
  votedPercentage: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
