# Verity 

## 1. Start Database

```bash
podman compose up surrealdb
```

## 2. Start Local Blockchain

In a new terminal:
```bash
cd contracts
anvil --host 0.0.0.0
# runs on 0.0.0.0:8545
```

## 3. Deploy Smart Contract

```bash
cd contracts
forge script script/DeployVotingSystem.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

Copy the contract address from output.

## 4. Start Backend Server

```bash
cd server
cargo run
# runs on http://0.0.0.0:3000
```

## 5. Start Mobile App

```bash
cd mobile
npm run ios
```

## On Hotspot?

If you're on hotspot, update these files with your hotspot IP (run `ifconfig` to find it):
- `mobile/.env` → `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_RPC_URL`
- `server/.env` → `ETH_RPC_URL` (stays 127.0.0.1, backend uses localhost)

Example hotspot IP: `172.20.10.8`

```
# mobile/.env
EXPO_PUBLIC_API_URL=http://172.20.10.8:3000
EXPO_PUBLIC_RPC_URL=http://172.20.10.8:8545
```

## Default Wallet

When you create a wallet in the app, it automatically gets 10 ETH from the faucet.
