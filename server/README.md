# Verity Server

Backend dla zdecentralizowanego systemu głosowania opartego na blockchain Ethereum.

## Architektura

Backend składa się z następujących modułów:

- **API** (`src/api`) - REST API zbudowane z Axum
- **Blockchain** (`src/blockchain`) - Interakcja z Ethereum przez Alloy-rs
- **Database** (`src/db`) - Połączenie z SurrealDB
- **Indexer** (`src/indexer`) - Indeksowanie wydarzeń blockchain
- **Models** (`src/models`) - Modele danych i struktury
- **Config** (`src/config`) - Konfiguracja aplikacji

## Technologie

- **Rust** - Język programowania
- **Axum** - Web framework
- **Alloy-rs** - Interakcja z Ethereum
- **SurrealDB** - Multi-model database
- **Tokio** - Async runtime

## Wymagania

- Rust 1.75+
- Docker lub Podman (dla SurrealDB)
- Node Ethereum (lokalny lub remote)

## Instalacja i uruchomienie

### 1. Uruchom SurrealDB

```bash
# Używając docker-compose
docker-compose up -d

# Lub używając podman
podman-compose up -d

# Lub ręcznie z podman
podman run -d \
  --name verity-surrealdb \
  -p 8000:8000 \
  surrealdb/surrealdb:latest \
  start --log trace --user root --pass root memory
```

### 2. Skonfiguruj zmienne środowiskowe

```bash
cp .env.example .env
# Edytuj .env i ustaw odpowiednie wartości
```

### 3. Uruchom serwer

```bash
cargo run
```

Server będzie dostępny na `http://127.0.0.1:3000`

## API Endpoints

### Health Check
```
GET /health
```

### Blockchain Info
```
GET /api/blockchain
```

### Proposals
```
GET /api/proposals              # Lista wszystkich propozycji
GET /api/proposals/:id          # Szczegóły propozycji
GET /api/proposals/:id/votes    # Głosy dla propozycji
GET /api/proposals/:id/results  # Wyniki głosowania
```

## Development

### Build
```bash
cargo build
```

### Run tests
```bash
cargo test
```

### Run with logs
```bash
RUST_LOG=debug cargo run
```

## TODO

Po utworzeniu smart kontraktu:
- [ ] Dodać generowanie bindingów kontraktu z Alloy
- [ ] Zaimplementować funkcje interakcji z kontraktem
- [ ] Dodać obsługę wydarzeń (ProposalCreated, VoteCast)
- [ ] Uzupełnić indexer o pełną logikę indeksowania

## Struktura projektu

```
server/
├── src/
│   ├── api/              # REST API
│   │   ├── handlers.rs   # Request handlers
│   │   ├── routes.rs     # Route definitions
│   │   └── state.rs      # Application state
│   ├── blockchain/       # Blockchain client
│   ├── config/           # Configuration
│   ├── db/               # Database operations
│   ├── indexer/          # Event indexer
│   ├── models/           # Data models
│   └── main.rs           # Application entry point
├── Cargo.toml
├── docker-compose.yml
├── .env.example
└── README.md
```
