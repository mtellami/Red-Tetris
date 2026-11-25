COMPOSE = docker compose --project-directory . -f config/compose.yaml

.PHONY: help install dev build start test up down

help:
	@printf '%s\n' \
		'make install  Install pnpm dependencies' \
		'make dev      Start the client and API development servers' \
		'make build    Build the production app' \
		'make start    Run the production build' \
		'make test     Run the test suite with coverage' \
		'make up       Build and start the Docker app' \
		'make down     Stop the Docker app'

install:
	pnpm install --frozen-lockfile --ignore-scripts

dev:
	pnpm dev

build:
	pnpm build

start:
	pnpm start

test:
	pnpm test:coverage

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down
