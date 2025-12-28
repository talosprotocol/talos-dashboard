.PHONY: install build start lint clean

install:
	npm install

build:
	npm run build

start:
	./start.sh

lint:
	npm run lint

clean:
	rm -rf node_modules .next out
