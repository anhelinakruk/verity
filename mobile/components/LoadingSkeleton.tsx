import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export function ProposalSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.header}>
        <View style={styles.badge} />
        <View style={styles.date} />
      </View>
      <View style={styles.title} />
      <View style={styles.description} />
      <View style={styles.footer}>
        <View style={styles.stat} />
        <View style={styles.stat} />
      </View>
    </Animated.View>
  );
}

export function ProposalsListSkeleton() {
  return (
    <View style={styles.container}>
      <ProposalSkeleton />
      <ProposalSkeleton />
      <ProposalSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    width: 60,
    height: 24,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
  },
  date: {
    width: 80,
    height: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
  },
  title: {
    width: '80%',
    height: 24,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 8,
  },
  description: {
    width: '100%',
    height: 40,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    width: 60,
    height: 20,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
  },
});
