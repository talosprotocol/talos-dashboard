# talos-dashboard Makefile
# Next.js Security Console

.PHONY: install build test lint clean start stop status db-generate db-migrate db-push db-studio

SERVICE_NAME := talos-dashboard
PID_FILE := /tmp/$(SERVICE_NAME).pid
PORT := 3000

all: install build

install:
	@echo "Installing dependencies..."
	npm ci

build:
	@echo "Building..."
	npm run build

test:
	@echo "Running tests..."
	npm test -- --run

lint:
	@echo "Running lint..."
	npm run lint
	npm run typecheck

db-generate:
	@echo "Generating Drizzle migration files..."
	npm run db:generate

db-migrate:
	@echo "Applying Drizzle migrations..."
	npm run db:migrate

db-push:
	@echo "Pushing schema directly with Drizzle..."
	npm run db:push

db-studio:
	@echo "Starting Drizzle Studio..."
	npm run db:studio

start:
	@echo "Starting $(SERVICE_NAME)..."
	@bash scripts/start.sh

stop:
	@echo "Stopping $(SERVICE_NAME)..."
	@if [ -f $(PID_FILE) ]; then \
		kill $$(cat $(PID_FILE)) 2>/dev/null || true; \
		rm -f $(PID_FILE); \
	fi
	@pkill -f "next dev" 2>/dev/null || true

status:
	@if [ -f $(PID_FILE) ] && kill -0 $$(cat $(PID_FILE)) 2>/dev/null; then echo "running"; else echo "stopped"; fi

clean:
	@echo "Cleaning..."
	rm -rf node_modules
	rm -rf .next out dist build
	rm -rf coverage
	rm -rf .eslintcache .turbo
	@echo "Clean complete."
