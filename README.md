# monotag

Semantic versioning for monorepos based on tag prefix, path prefix, affected files and conventional commit.

This lib can help you if you want to tag changes in specific parts of the monorepo using tag prefixes or publishing libs or deploying services independently, even though they reside in a single monorepo.

Normally this is not easy because the monorepo shares the entire commit history and to identify which commits touched a specific dir requires some sort of filtering.

Monotag does the commit filtering by path prefix, looks for the latest tag in a specific part of the repo (by tag prefix), creates release notes per prefix/path and increments the tag according to semantic versioning and conventional commits.

Run 'npx monotag --help' or 'npx monotag tag --help' for info on specific commands

You can use this as a library also. [Check documentation here](lib.md)

## Example

A monorepo has the following structure:

```
/services
   /my-service1
   /my-service2
/libs
   /my-lib1
   /my-lib2
```

The team will commit and merge things to "main" branch changing files in all those modules, so your commit log might be:

```
2023-01-01: feat: adding new API call to google <-- this touched service1 and lib2
2023-01-01: feat: new interface to lib2         <-- this touched lib2 and service2
2023-01-03: fix: bug fix according to #43       <-- this touched service2
2023-01-04: feat!(lib1): upgrading interface    <-- this touched lib1
```

We want to tag and create a release notes for lib1 before publishing to NPM and a release notes to service2 before deploying it to production. All commits are mixed together because the team was working with things integrated (which is an advantage of using a monorepo actually).

For creating the tags and release notes you can run:

```
npx monotag tag --path=libs/my-lib1
# will return "my-lib1/2.0.0" as tag along with "Features: -upgrading interface"
# (if latest tag was my-lib1/1.4.3, for example)

npx monotag tag --path=services/my-service2
# will return "my-service2/1.3.0" as tag along with "Features: -new interface to lib2; Fixes: -bug fix according to #43"
# (if latest tag was my-service2/1.2.9, for example)

```

See a complete github actions workflow that publishes libs to NPM with automatic versioning and release notes generation in a monorepo using monotag [here](https://github.com/flaviostutz/idempotender/tree/main/.github/workflows)

## Usage

```text
monotag [command]

Commands:
  monotag tag       Calculate and show next tag, incrementing semver according
                    to detected changes on path
  monotag notes     Calculate and show release notes according to detected
                    commits in path
  monotag tag-git   Calculate next tag and tag it in local git repo
  monotag tag-push  Calculate next tag, git-tag and git-push it to remote

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]

```

## Examples

- 'monotag tag'
  - Will use current dir as repo and tag prefix name, try to find the latest tag in this repo with this prefix, look for changes since the last tag to HEAD and output a newer version according to conventional commit changes
  
- 'monotag notes --from-ref=HEAD~3 --to-ref=HEAD --path services/myservice'
  - Generate release notes according to changes made in the last 3 commits for changes in dir services/myservice of the repo

- 'monotag tag --path services/myservice'
  - Generate tag "myservice/1.3.0" if previous tag was "myservice/1.2.8" and one commit with comment "feat: adding something new" is found between commits from the latest tag and HEAD
