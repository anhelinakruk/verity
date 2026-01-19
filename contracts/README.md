# Verity Smart Contracts

Smart kontrakty dla zdecentralizowanego systemu głosowania.

## Struktura projektu

```
contracts/
├── src/
│   └── VotingSystem.sol      # Główny kontrakt systemu głosowania
├── test/
│   └── VotingSystem.t.sol    # Testy jednostkowe
├── script/
│   └── DeployVotingSystem.s.sol  # Script deploymentu
└── foundry.toml              # Konfiguracja Foundry
```

## Kontrakt VotingSystem

### Główne funkcje

#### `createProposal(title, description, options, durationDays)`
Tworzy nową propozycję głosowania.
- **title**: Tytuł propozycji
- **description**: Opis propozycji
- **options**: Tablica opcji (2-10 opcji)
- **durationDays**: Czas trwania w dniach (1-90 dni)

#### `vote(proposalId, optionIndex)`
Oddaje głos na wybraną opcję.
- **proposalId**: ID propozycji
- **optionIndex**: Indeks wybranej opcji (0-indexed)

#### `endProposal(proposalId)`
Kończy głosowanie (może wywołać każdy po upływie deadline).

### View Functions

- `getProposal(proposalId)` - zwraca szczegóły propozycji
- `getProposalOptions(proposalId)` - zwraca opcje głosowania
- `getProposalVotesCount(proposalId)` - zwraca liczniki głosów
- `getTotalVotes(proposalId)` - zwraca całkowitą liczbę głosów
- `getWinningOption(proposalId)` - zwraca zwycięską opcję
- `hasUserVoted(proposalId, voter)` - sprawdza czy użytkownik zagłosował
- `getUserVote(proposalId, voter)` - zwraca głos użytkownika
- `isProposalActive(proposalId)` - sprawdza czy propozycja jest aktywna

### Events

- `ProposalCreated(proposalId, creator, title, deadline, optionsCount)`
- `VoteCast(proposalId, voter, optionIndex, timestamp)`
- `ProposalEnded(proposalId, timestamp)`

## Development

### Instalacja

```bash
# Foundry jest już zainstalowane
cd contracts
forge install
```

### Kompilacja

```bash
forge build
```

### Testy

```bash
# Uruchom wszystkie testy
forge test

# Testy z logami
forge test -vv

# Testy z bardzo szczegółowymi logami
forge test -vvvv

# Coverage
forge coverage
```

### Gas Report

```bash
forge test --gas-report
```

## Deployment

### Lokalny node (Anvil)

```bash
# Terminal 1: Uruchom lokalny node
anvil

# Terminal 2: Deploy kontrakt
forge script script/DeployVotingSystem.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key <PRIVATE_KEY>
```

### Testnet (np. Sepolia)

```bash
# Ustaw zmienne środowiskowe
export SEPOLIA_RPC_URL=<your_rpc_url>
export PRIVATE_KEY=<your_private_key>

# Deploy
forge script script/DeployVotingSystem.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --private-key $PRIVATE_KEY
```

### Interakcja z kontraktem (Cast)

```bash
# Odczyt danych
cast call <CONTRACT_ADDRESS> "proposalCount()" --rpc-url <RPC_URL>

# Utworzenie propozycji
cast send <CONTRACT_ADDRESS> \
  "createProposal(string,string,string[],uint256)" \
  "Proposal Title" \
  "Description" \
  '["Option A","Option B","Option C"]' \
  7 \
  --rpc-url <RPC_URL> \
  --private-key <PRIVATE_KEY>

# Głosowanie
cast send <CONTRACT_ADDRESS> \
  "vote(uint256,uint256)" \
  0 \
  1 \
  --rpc-url <RPC_URL> \
  --private-key <PRIVATE_KEY>

# Sprawdzenie wyników
cast call <CONTRACT_ADDRESS> "getProposalVotesCount(uint256)" 0 --rpc-url <RPC_URL>
```

## Bezpieczeństwo

### Audyt i best practices

- ✅ Używa Solidity 0.8.20 (wbudowana ochrona przed overflow/underflow)
- ✅ Custom errors dla oszczędności gazu
- ✅ Events dla wszystkich ważnych akcji
- ✅ Walidacja wszystkich inputów
- ✅ Reentrancy protection (brak external calls w środku transakcji)
- ✅ Comprehensive test coverage

### Znane ograniczenia

1. **Brak anonimowości**: Głosy są publiczne i powiązane z adresami
2. **Brak weight voting**: Każdy adres = 1 głos
3. **Brak delegacji**: Nie można delegować głosu
4. **Brak mechanizmu quorum**: Propozycja kończy się niezależnie od frekwencji

## Generowanie ABI dla backendu

```bash
# Generuj ABI
forge build

# ABI znajduje się w:
cat out/VotingSystem.sol/VotingSystem.json | jq .abi > ../server/abi/VotingSystem.json
```

## Gas Optimization

Contract został zoptymalizowany pod kątem kosztów gazu:
- Użycie `calldata` zamiast `memory` gdzie możliwe
- Custom errors zamiast `require` z stringami
- Packed storage variables
- Batch operations gdzie możliwe

## Licencja

MIT
