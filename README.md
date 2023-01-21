# monotag

Semantic versioning for monorepos based on tag prefix, path prefix, affected files and conventional commit

## Usage

```sh
npx monotag [command - tag, notes, tag-git, tag-push, tag-packagejson]
  --verbose=true (show details in output)
  --path=/services/mymodule1 (file path inside repo to consider when analysing changes. Commits that dont touch files in this path will be ignored)
  --prefix=mymodule1 (tag prefix added to generated tags. if not defined will be derived from last path part)
  --from-ref=auto|tags/mymodule1/1.4.5 (if not defined, will be last version with this same tag prefix)
  --to-ref=auto|branches/head (if not defined, defaults to HEAD)
  --semver-level=auto|1|2|3 (if not defined, detect automatically based on semantic commit - if not semantic commit, then level=3)
  --conventional-commit=true (use only conventional commit styled commits during release notes creation)
```

Commands:
  tag - calculate and show next tag
  notes - calculate and show release notes
  tag-git - calculate and git-tag next tag
  tag-push - calculate, git-tag and git-push next tag to remote
  tag-packagejson - calculate and change packagejson version with the semver part of the tag (the “1.2.3” part, without tag prefix)
