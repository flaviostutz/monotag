build: install
	rm -rf dist
	npx esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js
	npx tsc --emitDeclarationOnly --outDir dist

run:
	npx ts-node src/main.ts

lint:
	npx prettier --loglevel warn --check .
	npx eslint . --ext .ts
	npx tsc -noEmit --skipLibCheck
	yarn audit; [[ $? -ge 16 ]] && exit 1 || exit 0

lint-fix:
	npx prettier --loglevel warn --write .
	npx eslint . --ext .ts --fix

test: unit-tests

unit-tests:
	npx jest --verbose

publish:
	git config --global user.email "flaviostutz@gmail.com"
	git config --global user.name "Flávio Stutz"
	npm version from-git --no-git-tag-version
	echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
	yarn publish

all: build lint unit-tests

install:
	yarn install --frozen-lockfile

rules-doc:
	npx ts-node src/rules-doc.ts

upgrade-deps:
	npx npm-check-updates -u

