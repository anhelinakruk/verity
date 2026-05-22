import { useAuth } from '@/contexts/AuthContext';
import { HDNodeWallet, Mnemonic } from 'ethers';
import { JsonRpcProvider } from 'ethers';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { SiweMessage } from 'siwe';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.20.10.8:3000';
const RPC_URL = process.env.EXPO_PUBLIC_RPC_URL || 'http://172.20.10.8:8545';

const STORAGE_KEYS = {
  MNEMONIC: 'wallet_mnemonic',
  ACCESS_TOKEN: 'access_token',
  ADDRESS: 'wallet_address',
};

export function useWallet() {
  const { setIsAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string>('');
  const [mnemonic, setMnemonic] = useState<string>('');
  const [wallet, setWallet] = useState<HDNodeWallet | null>(null);
  const [address, setAddress] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.00');
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const saveWalletData = async (mnemonic: any, address: any, token: string) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.MNEMONIC, mnemonic);
      await SecureStore.setItemAsync(STORAGE_KEYS.ADDRESS, address);
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const requestFaucet = async (walletAddress: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${API_URL}/api/faucet/${walletAddress}`, {
        method: 'POST',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        if (walletAddress) {
          await fetchWalletData(walletAddress);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Faucet error:', error);
      return false;
    }
  };

  const loadWalletData = async () => {
    try {
      const m = await SecureStore.getItemAsync(STORAGE_KEYS.MNEMONIC);
      const address = await SecureStore.getItemAsync(STORAGE_KEYS.ADDRESS);
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);

      if (m && address && token) {
        const mnemonicObj = Mnemonic.fromPhrase(m);
        const w = HDNodeWallet.fromMnemonic(mnemonicObj);
        
        setMnemonic(m);
        setWallet(w);
        setAddress(address);
        setAccessToken(token);
        setIsAuthenticated(true);

        await fetchWalletData(address, token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading wallet data:', error);
      return false;
    }
  };

  const clearWalletData = async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.MNEMONIC);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ADDRESS);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    
    setMnemonic('');
    setWallet(null);
    setAddress('');
    setAccessToken('');
    setIsAuthenticated(false);
    setBalance('0.00');
  };

  const fetchWalletData = async (walletAddress: string, token?: string) => {
    setLoadingBalance(true);
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );
      
      const provider = new JsonRpcProvider(RPC_URL, undefined, {
        staticNetwork: true,
      });
      
      const balanceWei = await Promise.race([
        provider.getBalance(walletAddress),
        timeoutPromise
      ]);
      
      const balanceEth = parseFloat(balanceWei.toString()) / 1e18;
      setBalance(balanceEth.toFixed(4));
      
      if (balanceEth === 0) {
        await requestFaucet(walletAddress);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const createWallet = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('creating wallet');
      const randomBytes = await Crypto.getRandomBytesAsync(16);
      const entropy = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const mnemonic = Mnemonic.fromEntropy('0x' + entropy);
      const generatedMnemonic = mnemonic.phrase;
      setMnemonic(generatedMnemonic);

      const wallet = HDNodeWallet.fromMnemonic(mnemonic);
      const walletAddress = wallet.address;
      setAddress(walletAddress);
      setWallet(wallet);

      console.log('wallet created');

      const nonceResponse = await fetch(`${API_URL}/api/auth/nonce`);
      const nonceData = await nonceResponse.json();

      const siweMessage = new SiweMessage({
        domain: 'localhost',
        address: walletAddress,
        statement: 'Sign in to Verity Wallet',
        uri: 'http://localhost:3000',
        version: '1',
        chainId: 11155111,
        nonce: nonceData.nonce,
      });

      const message = siweMessage.prepareMessage();
      const signature = await wallet.signMessage(message);

      console.log('verifying');
      const verifyResponse = await fetch(`${API_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature,
          address: walletAddress,
        }),
      });

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        console.error('Verify failed:', verifyResponse.status, errorText);
        throw new Error(`Verification failed: ${errorText}`);
      }

      const verifyData = await verifyResponse.json();

      if (verifyResponse.ok) {
        setAccessToken(verifyData.access_token);
        setIsAuthenticated(true);
        await saveWalletData(generatedMnemonic, walletAddress, verifyData.access_token);
        console.log('User Id:', verifyData.user_id);
        
        // Request faucet funds for new wallet
        await requestFaucet(walletAddress);
        
        return true;
      } else {
        setError('Auth failed');
        return false;
      }
    } catch (err) {
      setError('Backend error');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const importWallet = async (seedPhrase: string) => {
    setLoading(true);
    setError('');

    try {
      const trimmedPhrase = seedPhrase.trim();
      const words = trimmedPhrase.split(/\s+/);
      console.log('Validating seed phrase, got', words.length, 'words');
      
      if (words.length !== 12 && words.length !== 24) {
        setError('Wrong seed length');
        setLoading(false);
        return false;
      }

      const mnemonicObj = Mnemonic.fromPhrase(trimmedPhrase);

      const restoredWallet = HDNodeWallet.fromMnemonic(mnemonicObj);
      const walletAddress = restoredWallet.address;

      setMnemonic(trimmedPhrase);
      setAddress(walletAddress);
      setWallet(restoredWallet);

      console.log('Wallet restored from seed phrase');

      const nonceResponse = await fetch(`${API_URL}/api/auth/nonce`);
      const nonceData = await nonceResponse.json();

      const siweMessage = new SiweMessage({
        domain: 'localhost',
        address: walletAddress,
        statement: 'Sign in to Verity Wallet',
        uri: 'http://localhost:3000',
        version: '1',
        chainId: 11155111,
        nonce: nonceData.nonce,
      });

      const message = siweMessage.prepareMessage();
      const signature = await restoredWallet.signMessage(message);

      const verifyResponse = await fetch(`${API_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature,
          address: walletAddress,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyResponse.ok) {
        setAccessToken(verifyData.access_token);
        setIsAuthenticated(true);
        await saveWalletData(trimmedPhrase, walletAddress, verifyData.access_token);
        console.log('Wallet imported');
        
        // Request faucet funds for imported wallet (in case it's empty)
        await requestFaucet(walletAddress);
        
        return true;
      } else {
        setError('Auth failed');
        return false;
      }
    } catch (err) {
      setError('Import error');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshWalletData = async () => {
    if (!address || loadingBalance) return;
    setRefreshing(true);
    try {
      await fetchWalletData(address);
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      setInitializing(true);
      const loaded = await loadWalletData();
      if (!loaded) {
        console.log('No saved wallet found');
      }
      setInitializing(false);
    };

    initializeApp();
  }, []);

  return {
    loading,
    initializing,
    error,
    mnemonic,
    wallet,
    address,
    accessToken,
    balance,
    loadingBalance,
    refreshing,
    
    createWallet,
    importWallet,
    clearWalletData,
    refreshWalletData,
    setError,
  };
}
