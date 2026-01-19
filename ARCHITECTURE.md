# Verity - Architektura systemu

Zdecentralizowany system głosowania oparty na blockchain Ethereum.

## Przegląd projektu

```
verity/
├── server/               # Backend (Rust)
├── contracts/            # Smart contracts (Solidity)
└── ARCHITECTURE.md       # Ten plik
```

## Architektura wielowarstwowa

### 1. Warstwa Blockchain (Smart Contracts)

**Technologie:** Solidity 0.8.20, Foundry

**Lokalizacja:** `contracts/`

**Kontrakt główny:** `VotingSystem.sol`

#### Funkcjonalności:
- Tworzenie propozycji głosowania
- Oddawanie głosów
- Zarządzanie cyklem życia propozycji
- Weryfikacja uprawnień (jeden adres = jeden głos)
- Emisja wydarzeń (events) dla indexera

#### Kluczowe cechy:
- **Niezmienność**: Wszystkie głosy są trwale zapisane w blockchain
- **Transparentność**: Każdy może zweryfikować wyniki
- **Decentralizacja**: Brak single point of failure
- **Bezpieczeństwo**: Audyt zgodnie z best practices Solidity

### 2. Warstwa Backend (Server)

**Technologie:** Rust, Axum, Alloy-rs, SurrealDB

**Lokalizacja:** `server/`

#### Moduły:

##### a) API Layer (`src/api/`)
- **Framework**: Axum 0.7
- **Funkcja**: REST API dla aplikacji mobilnej
- **Endpointy**:
  - `GET /health` - health check
  - `GET /api/blockchain` - info o blockchain
  - `GET /api/proposals` - lista propozycji
  - `GET /api/proposals/:id` - szczegóły propozycji
  - `GET /api/proposals/:id/votes` - głosy
  - `GET /api/proposals/:id/results` - wyniki

##### b) Blockchain Layer (`src/blockchain/`)
- **Biblioteka**: Alloy-rs 0.6
- **Funkcja**: Komunikacja z Ethereum
- **Operacje**:
  - Odczyt danych z kontraktu
  - Nasłuchiwanie wydarzeń
  - Weryfikacja transakcji

##### c) Database Layer (`src/db/`)
- **Baza**: SurrealDB 2.0
- **Funkcja**: Cache i indeksowanie
- **Przechowuje**:
  - Zaindeksowane propozycje
  - Zaindeksowane głosy
  - Metadane i cache

##### d) Indexer (`src/indexer/`)
- **Funkcja**: Indeksowanie blockchain
- **Proces**:
  1. Nasłuchuje wydarzeń `ProposalCreated`, `VoteCast`
  2. Pobiera dane z bloków
  3. Zapisuje do SurrealDB
  4. Umożliwia szybkie odpytywanie bez skanowania blockchain

#### Przepływ danych:

```
Blockchain → Indexer → SurrealDB → API → Aplikacja Mobilna
                ↑                   ↓
                └─────Alloy-rs──────┘
```

### 3. Warstwa Aplikacji (Mobile App)

**Technologie:** Swift, SwiftUI, web3swift

**Status:** Do implementacji

#### Planowane funkcjonalności:
- Przeglądanie propozycji
- Tworzenie nowych propozycji
- Oddawanie głosów
- Przeglądanie wyników
- Integracja z MetaMask/WalletConnect
- Zarządzanie kluczami (Keychain)

## Przepływ tworzenia propozycji

```
1. Użytkownik (Aplikacja)
   ↓ createProposal(title, desc, options, duration)
2. Podpisanie transakcji (MetaMask)
   ↓ signed transaction
3. Smart Contract
   ↓ emit ProposalCreated(...)
4. Indexer (Backend)
   ↓ store in database
5. SurrealDB
   ↓ fetch via API
6. Aplikacja (wyświetlenie propozycji)
```

## Przepływ głosowania

```
1. Użytkownik (Aplikacja)
   ↓ vote(proposalId, optionIndex)
2. Podpisanie transakcji (MetaMask)
   ↓ signed transaction
3. Smart Contract
   ├─ sprawdza czy nie głosował
   ├─ sprawdza czy propozycja aktywna
   ├─ zapisuje głos
   └─ emit VoteCast(...)
4. Indexer (Backend)
   ├─ aktualizuje liczniki w DB
   └─ zapisuje historię głosu
5. Aplikacja (wyświetlenie zaktualizowanych wyników)
```

## Bezpieczeństwo

### Smart Contract
- ✅ Solidity 0.8.20 (overflow protection)
- ✅ Custom errors (gas optimization)
- ✅ Comprehensive validation
- ✅ No reentrancy vectors
- ✅ 21/21 tests passing
- ⚠️ Brak anonimowości głosów (publiczne adresy)

### Backend
- ✅ Rust (memory safety)
- ✅ Type-safe blockchain interaction (Alloy)
- ✅ Environment-based configuration
- ✅ Structured logging
- ⚠️ Wymaga HTTPS w produkcji

### Aplikacja mobilna
- 🔄 Planowane: Keychain dla kluczy prywatnych
- 🔄 Planowane: Biometric authentication
- 🔄 Planowane: Secure enclave

## Skalowalność

### Aktualne ograniczenia
- Gas costs za każdą transakcję
- Ethereum throughput (~15 TPS)
- Storage costs w blockchain

### Możliwe optymalizacje
1. **Layer 2**: Wdrożenie na Polygon/Arbitrum
2. **Batch operations**: Grupowanie głosów
3. **IPFS**: Przechowywanie opisów propozycji off-chain
4. **State channels**: Dla czasu rzeczywistego updates

## Deployment

### Środowisko deweloperskie

```bash
# 1. Uruchom lokalny blockchain
anvil

# 2. Deploy kontrakt
cd contracts
forge script script/DeployVotingSystem.s.sol --broadcast

# 3. Uruchom SurrealDB
cd ../server
docker-compose up -d

# 4. Zaktualizuj .env z adresem kontraktu
# 5. Uruchom backend
cargo run
```

### Środowisko produkcyjne

1. **Smart Contract**: Deploy na Ethereum mainnet/L2
2. **Backend**: Deploy na VPS/Cloud (Docker)
3. **SurrealDB**: Managed instance lub self-hosted
4. **Monitoring**: Prometheus + Grafana
5. **Aplikacja**: App Store/Google Play

## Koszty operacyjne

### Gas costs (Ethereum mainnet, ~30 gwei)
- Deploy kontraktu: ~2-3M gas (~$50-75)
- Utworzenie propozycji: ~300k gas (~$9)
- Głosowanie: ~80k gas (~$2.4)

### Alternatywne sieci
- **Polygon**: ~100x tańsze
- **Arbitrum**: ~10x tańsze
- **Optimism**: ~10x tańsze

## Roadmap

### Faza 1: MVP ✅
- [x] Smart contract z podstawową funkcjonalnością
- [x] Backend z REST API
- [x] Integracja blockchain <-> backend
- [ ] Aplikacja mobilna (podstawowa)

### Faza 2: Rozszerzenia
- [ ] Delegacja głosów
- [ ] Quorum i thresholdy
- [ ] Token-weighted voting
- [ ] Multi-signature proposals

### Faza 3: Prywatność
- [ ] Zero-knowledge proofs dla anonimowych głosów
- [ ] Ring signatures
- [ ] Homomorphic encryption

### Faza 4: Governance
- [ ] DAO structure
- [ ] Treasury management
- [ ] Proposal templates
- [ ] Voting strategies

## Monitorowanie i logi

### Backend
- **Tracing**: Strukturowane logi z kontekstem
- **Metrics**: Liczba propozycji, głosów, API requests
- **Health checks**: `/health` endpoint

### Smart Contract
- **Events**: Wszystkie ważne akcje emitują eventy
- **Etherscan**: Weryfikacja kontraktu
- **Gas reporting**: forge test --gas-report

## Testowanie

### Smart Contract
```bash
cd contracts
forge test -vv
forge coverage
```

### Backend
```bash
cd server
cargo test
cargo clippy
```

## Licencja

MIT
