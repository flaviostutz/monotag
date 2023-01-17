# monotag

Semantic versioning for monorepos based on tag prefix, path prefix, affected files and conventional commit

## Usage

```sh
npx monotag
  --prefix=mymodule1 (if not defined will be derived from filter-path)
  --path=/services/mymodule1 (if not defined, use *)
  --semver=[auto,1,2,3] (if not defined, detect automatically based on semantic commit)
  --release-notes=true (calculate and store release notes as tag message)
  --conventional-commit=true (use only conventional commit styled commits for release notes creation)
  --from-ref=auto|tags/mymodule1/1.4.5 (if not defined, will be last version with this tag prefix)
  --to-ref=auto|branches/head (if not defined, use HEAD)
  --git-tag=true (creates the tag on git)
  --git-push=false (pushes tag to remote origin)
  --update-packagejson=false (update packagejson version with next version only with the “1.2.3” part)
```
