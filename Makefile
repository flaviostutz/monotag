build: install
	rm -rf dist
	# lib build
	pnpm exec esbuild src/index.ts --bundle --platform=node --minify --outfile=dist/index.js
	# cli build
	pnpm exec esbuild src/main.ts --bundle --platform=node --minify --outfile=dist/main.js
	pnpm exec tsc --emitDeclarationOnly --outDir dist

run:
	npx ts-node src/main.ts tag --repo-dir=. --changelog-file=CHANGELOG.md --verbose
	# npx ts-node src/main.ts list --repo-dir=. --verbose

lint:
	pnpm exec eslint ./src --ext .ts
	pnpm tsc -noEmit --skipLibCheck
	pnpm audit --audit-level high

lint-fix:
	pnpm exec eslint . --ext .ts --fix

test:
	-rm -rf testcases
	pnpm exec jest -i --verbose

publish:
	@if [ "$${NPM_ACCESS_TOKEN}" == "" ]; then \
		echo "env NPM_ACCESS_TOKEN is required"; \
		exit 1; \
	fi

	# check if tag is current and bump version in package.json to latest tag
	npx -y monotag@1.20.0 current --bump-action=latest

	echo "" >> .npmrc
	echo "//registry.npmjs.org/:_authToken=$${NPM_ACCESS_TOKEN}" >> .npmrc
	pnpm publish --no-git-checks

clean:
	rm -rf node_modules

all: build lint test

install:
	corepack enable pnpm
	corepack use pnpm@8.9.0
	# https://github.com/nodejs/corepack/issues/612
	COREPACK_INTEGRITY_KEYS=0 pnpm --version
	pnpm install --frozen-lockfile --config.dedupe-peer-dependents=false

upgrade-deps:
	npx npm-check-updates -u

