build: install
	rm -rf dist
	# lib build
	pnpm exec esbuild src/index.ts --bundle --platform=node --minify --outfile=dist/index.js
	# cli build
	pnpm exec esbuild src/main.ts --bundle --platform=node --minify --outfile=dist/main.js
	pnpm exec tsc --emitDeclarationOnly --outDir dist

run:
	npx ts-node src/main.ts tag --repo-dir=. --prerelease

lint:
	pnpm exec eslint ./src --ext .ts
	pnpm tsc -noEmit --skipLibCheck
	pnpm audit --audit-level high

lint-fix:
	pnpm exec eslint . --ext .ts --fix

test:
	@# can't be in parallel because we use nock that has shared contexts
	pnpm exec jest -i --verbose

publish:
	@if [ "$${NPM_ACCESS_TOKEN}" == "" ]; then \
		echo "env NPM_ACCESS_TOKEN is required"; \
		exit 1; \
	fi

	git config --global user.email "flaviostutz@gmail.com"
	git config --global user.name "Flávio Stutz"
	npm version from-git --no-git-tag-version

	echo "" >> .npmrc
	echo "//registry.npmjs.org/:_authToken=$${NPM_ACCESS_TOKEN}" >> .npmrc
	pnpm publish --no-git-checks

clean:
	rm -rf node_modules

all: build lint unit-tests

install:
	corepack enable
	pnpm install --frozen-lockfile --config.dedupe-peer-dependents=false

upgrade-deps:
	npx npm-check-updates -u

