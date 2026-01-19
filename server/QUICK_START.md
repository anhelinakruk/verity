# Quick Start Guide

## 1. Uruchom SurrealDB

### Opcja A: Docker Compose (zalecane)
```bash
docker-compose up -d
```

### Opcja B: Podman Compose
```bash
podman-compose up -d
```

### Opcja C: Ręcznie z Podman
```bash
podman run -d \
  --name verity-surrealdb \
  -p 8000:8000 \
  surrealdb/surrealdb:latest \
  start --log trace --user root --pass root memory
```

## 2. Sprawdź czy SurrealDB działa

```bash
curl http://localhost:8000/health
```

Powinno zwrócić status OK.

## 3. Skonfiguruj zmienne środowiskowe

Plik `.env` jest już utworzony z domyślnymi wartościami. Jeśli potrzebujesz zmienić konfigurację:

```bash
nano .env
```

## 4. Uruchom backend

```bash
cargo run
```

Backend uruchomi się na `http://127.0.0.1:3000`

## 5. Testuj API

### Health check
```bash
curl http://localhost:3000/health
```

### Blockchain info
```bash
curl http://localhost:3000/api/blockchain
```

### Propozycje (obecnie puste, bo nie ma smart kontraktu)
```bash
curl http://localhost:3000/api/proposals
```

## Zatrzymanie środowiska

```bash
# Zatrzymaj backend: Ctrl+C

# Zatrzymaj SurrealDB
docker-compose down
# lub
podman-compose down
# lub
podman stop verity-surrealdb
```

## Logi i debugging

Backend używa `tracing` do logowania. Możesz kontrolować poziom logów przez zmienną środowiskową:

```bash
RUST_LOG=debug cargo run
```

Dostępne poziomy:
- `error` - tylko błędy
- `warn` - ostrzeżenia i błędy
- `info` - informacje, ostrzeżenia i błędy
- `debug` - szczegółowe logi (zalecane podczas development)
- `trace` - bardzo szczegółowe logi

## Następne kroki

Po utworzeniu smart kontraktu:
1. Zaktualizuj adres kontraktu w `.env`
2. Dodaj generowanie bindingów w `src/blockchain/mod.rs`
3. Zaimplementuj funkcje interakcji z kontraktem
4. Uzupełnij indexer o obsługę wydarzeń
