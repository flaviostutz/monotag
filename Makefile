build: install
	rm -rf dist
	# lib build
	npx esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js
	# cli build
	npx esbuild src/cli.ts --bundle --platform=node --outfile=dist/cli.js
	npx tsc --emitDeclarationOnly --outDir dist

run:
	npx ts-node src/main.ts tag

lint:
	npx eslint . --ext .ts
	npx tsc -noEmit --skipLibCheck
	yarn audit; [[ $? -ge 16 ]] && exit 1 || exit 0

lint-fix:
	npx eslint . --ext .ts --fix

test: unit-tests

unit-tests:
	npx jest --verbose

publish:
	git config --global user.email "flaviostutz@gmail.com"
	git config --global user.name "Flávio Stutz"
	npm version from-git --no-git-tag-version
	echo "//registry.npmjs.org/:_authToken=${NPM_ACCESS_TOKEN}" > .npmrc
	yarn publish

clean:
	rm -rf node_modules

all: build lint unit-tests

install:
	yarn install --frozen-lockfile

upgrade-deps:
	npx npm-check-updates -u

