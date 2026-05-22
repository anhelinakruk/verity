import { useWallet } from '@/hooks/useWallet';
import { useRouter } from 'expo-router';
import { Contract, JsonRpcProvider } from 'ethers';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import VotingSystemABI from '../abi/VotingSystem.json';
import { ErrorRetry } from './ErrorRetry';
import { ProposalsListSkeleton } from './LoadingSkeleton';

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

interface ProposalsListProps {
  proposals: Proposal[];
  onRefresh?: () => void;
}

export function ProposalsList({ proposals }: ProposalsListProps) {
  const router = useRouter();
  const wallet = useWallet();
  const [votedProposals, setVotedProposals] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wallet.address && proposals.length > 0) {
      checkVotedProposals();
    } else {
      setLoading(false);
    }
  }, [wallet.address, proposals.length]);

  const checkVotedProposals = async () => {
    if (!wallet.address) return;

    setLoading(true);
    setError(null);

    try {
      const provider = new JsonRpcProvider(RPC_URL);
      const contract = new Contract(CONTRACT_ADDRESS, VotingSystemABI, provider);
      
      const voteChecks = await Promise.allSettled(
        proposals.map(proposal => 
          contract.hasUserVoted(proposal.proposal_id, wallet.address)
            .then(hasVoted => ({ proposalId: proposal.proposal_id, hasVoted }))
        )
      );
      
      const voted = new Set<number>();
      voteChecks.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.hasVoted) {
          voted.add(result.value.proposalId);
        } else if (result.status === 'rejected') {
          console.error(`Error checking vote for proposal ${proposals[index].proposal_id}:`, result.reason);
        }
      });
      
      setVotedProposals(voted);
      setError(null);
    } catch (err) {
      console.error('Error checking voted proposals:', err);
      setError('Failed to load vote status');
    } finally {
      setLoading(false);
    }
  };

  const handleProposalPress = (proposal: Proposal) => {
    router.push({
      pathname: '/vote',
      params: { proposalId: proposal.proposal_id },
    });
  };

  const formatDeadline = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Ended';
    if (diffDays === 0) return 'Ends today';
    if (diffDays === 1) return 'Ends tomorrow';
    return `${diffDays} days left`;
  };

  const getWinningOption = (proposal: Proposal) => {
    if (proposal.total_votes === 0) return null;
    
    const maxVotes = Math.max(...proposal.votes_count);
    const winningIndex = proposal.votes_count.indexOf(maxVotes);
    
    return {
      option: proposal.options[winningIndex],
      votes: maxVotes,
      percentage: (maxVotes / proposal.total_votes) * 100,
    };
  };

  if (loading && proposals.length > 0) {
    return <ProposalsListSkeleton />;
  }

  if (error) {
    return <ErrorRetry message={error} onRetry={checkVotedProposals} />;
  }

  return (
    <View style={styles.container}>
      {proposals.map((proposal, index) => {
        const winning = getWinningOption(proposal);
        const isActive = proposal.is_active && new Date(proposal.deadline * 1000) > new Date();
        const hasVoted = votedProposals.has(proposal.proposal_id);

        return (
          <TouchableOpacity
            key={`proposal-${proposal.proposal_id}-${index}`}
            style={styles.proposalCard}
            onPress={() => handleProposalPress(proposal)}
          >
            <View style={styles.statusRow}>
              <View style={styles.statusRowLeft}>
                <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={styles.statusText}>
                    {isActive ? 'Active' : 'Ended'}
                  </Text>
                </View>
                {hasVoted && (
                  <View style={styles.votedBadge}>
                    <Text style={styles.votedBadgeText}>✓ Voted</Text>
                  </View>
                )}
              </View>
              <Text style={styles.deadline}>{formatDeadline(proposal.deadline)}</Text>
            </View>

            <Text style={styles.title}>{proposal.title}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {proposal.description}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{proposal.total_votes}</Text>
                <Text style={styles.statLabel}>Votes</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{proposal.options.length}</Text>
                <Text style={styles.statLabel}>Options</Text>
              </View>
              {winning && typeof winning !== 'string' && (
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{winning.percentage.toFixed(0)}%</Text>
                  <Text style={styles.statLabel}>Leading</Text>
                </View>
              )}
            </View>

            {winning && typeof winning !== 'string' && (
              <View style={styles.leadingOption}>
                <Text style={styles.leadingLabel}>Leading:</Text>
                <Text style={styles.leadingText} numberOfLines={1}>
                  {winning.option}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  proposalCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusRowLeft: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  votedBadge: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  votedBadgeText: {
    color: '#007AFF',
    fontSize: 13,
  },
  activeBadge: {},
  inactiveBadge: {},
  statusText: {
    color: '#8E8E93',
    fontSize: 13,
  },
  deadline: {
    color: '#8E8E93',
    fontSize: 13,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 16,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
  },
  leadingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    gap: 8,
  },
  leadingLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  leadingText: {
    fontSize: 14,
    color: '#FFF',
    flex: 1,
  },
});
