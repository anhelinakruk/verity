import { ProposalsList } from '@/components/ProposalsList';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ErrorRetry } from '../../components/ErrorRetry';
import { EmptyState } from '../../components/EmptyState';
import { ProposalsListSkeleton } from '../../components/LoadingSkeleton';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface Proposal {
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

export default function ProposalsScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadProposals();
    }
  }, [isAuthenticated]);

  // Refresh proposals if coming back from create-proposal
  useEffect(() => {
    if (params.refresh === '1') {
      loadProposals();
      // Remove refresh param from URL
      router.replace('/proposals');
    }
  }, [params.refresh]);

  const loadProposals = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/proposals`);
      
      if (!response.ok) {
        throw new Error('Failed to load proposals');
      }

      const data = await response.json();
      setProposals(data);
    } catch (err) {
      console.error('Error loading proposals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load proposals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProposals();
  };

  const handleCreateProposal = () => {
    router.push('/create-proposal');
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="🔐"
          title="Login Required"
          message="Please create or import a wallet to view and vote on proposals"
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Proposals</Text>
        </View>
        <ProposalsListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Proposals</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateProposal}>
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <ErrorRetry message={error} onRetry={loadProposals} />
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
          {proposals.length === 0 ? (
            <EmptyState
              icon="📝"
              title="No Proposals Yet"
              message="Be the first to create a proposal and start a discussion!"
              actionText="Create Proposal"
              onAction={handleCreateProposal}
            />
          ) : (
            <ProposalsList proposals={proposals} onRefresh={loadProposals} />
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFF',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    color: '#888',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
  },
});
