COMPOSE = docker compose --project-directory . -f config/compose.yaml
.DEFAULT_GOAL := up

.PHONY: help install dev build start test up down clean

help:
	@printf '%s\n' \
		'make          Build and start the Docker app (same as make up)' \
		'make install  Install pnpm dependencies' \
		'make dev      Start the client and API development servers' \
		'make build    Build the production app' \
		'make start    Run the production build' \
		'make test     Run the test suite with coverage' \
		'make up       Build and start the Docker app' \
		'make down     Stop the Docker app' \
		'make clean    Remove containers, network, app image, and leaderboard volume'

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
	$(COMPOSE) stop

clean:
	$(COMPOSE) down --rmi all --volumes --remove-orphans
