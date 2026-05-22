FROM surrealdb/surrealdb:latest

COPY ./fixtures /fixtures

CMD ["start", "--log", "info", "--user", "root", "--pass", "root", "memory"]
