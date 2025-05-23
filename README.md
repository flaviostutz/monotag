# monotag

Semantic versioning for monorepos based on tag prefix, path prefix, affected files and conventional commits.

This lib can help you tag changes in specific parts of the monorepo using tag prefixes or publishing libs or deploying services independently, even though they reside in a single monorepo.

<img src="diagram.png" with="600">

Normally this is not easy because the monorepo shares the entire commit history and to identify which commits touched a specific dir requires some sort of filtering.


## Quick start

* Open a terminal and cd to a git repository folder with commits
* Run `npx -y monotag tag`
* Sample output:
```md
1.20.0 <-- calculad version
1.20.0 <-- calculated tag
## 1.20.0 (2025-03-11) <-- release notes

### Features

* add note links config to cli args [[bad440f](https://github.com/flaviostutz/monotag/commit/bad440fff0cb15012ae2512588253bcbf6195ee6)]
* add pr, issues and commit links to release notes [[a298550](https://github.com/flaviostutz/monotag/commit/a2985502ca25f35d4cf63fe7761ac6bda495ef2d)]

### Bug Fixes

* current dir resolver fixed [[05333e5](https://github.com/flaviostutz/monotag/commit/05333e50b9601992b7823b8bbbca2f5791b071b5)]

### Info

* Authors: Flávio Stutz <flaviostutz@gmail.com>
```

## Main features

* Calculation of next tag and version based on conv commits on log history taking into account only commits that touches a certain path in a monorepo
* Tagging of calculated tag to git repo and pushing to remote
* Generation of changelog files markdown containing the list of changes along with links to commits, prs etc
* Bump of package.json to the latest calculated version to help with publishing of libraries
* Pre-release version calculation for experimental or beta version releases
* Save tag, version and notes to specific files so other processes can use it

Run 'npx monotag --help' or 'npx monotag tag --help' for info on specific commands

The automatic versioning feature can be used for non-monorepos too and you can use this as a library also. Check examples below.

## Basic operation

Monotag analyses commits that touched the current dir and then calculates:
- Tag: a release tag that identifies uniquelly this module in the monorepo (e.g.: mymodule/1.0.1-beta.1)
- Version: Version of the package, such as "1.0.1-beta.1"
- Notes: changelog with release notes of what changed for this new version in comparison to the previous one

After calculating it, it can perform actions such as:
  - "tag": display tag/version/notes on console (dry run)
  - "tag-git": tag the repo with the calculated version. I will push any files or tags created during the process to the repo
  - "tag-push": pushes all tags and changes to the remote repo
  - "current": verifies if current tag is really the latest one. Useful to make sure that HEAD is tagged and up to date with what you want to release.

Run `npx monotag --help` for a list of actions you can use
Run `npx monotag tag --help` for specific options related to tag

See below more options, such as changelog generation and automatic bumping.

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

The team will commit and merge things to the "main" branch changing files in all those modules, so your commit log might be:

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
# (if latest tag was my-service2/1.2.9 and a minor change was detected, for example)

npx monotag tag --path=services/my-service2 --prerelease=true
# will return "my-service2/1.3.0-beta.0" as tag along with "Features: -new interface to lib2; Fixes: -bug fix according to #43"
# (if latest tag was my-service2/1.2.9 and a minor change was detected, for example)

```

See a complete github actions workflow that publishes libs to NPM with automatic versioning and release notes generation in a monorepo using monotag [here](https://github.com/flaviostutz/monotag/blob/1.0.14/.github/workflows/create-next-tag.yml)

## Pre-releases

Pre-releases are versions (e.g: 1.4.0-beta.1) that preceeds the final version (e.g: 1.4.0) so that it's possible for beta or alpha users to test a certain release candidate before releasing it to the broader audience. Package managers normally only automatically upgrade to "final" versions, so it's a good practice to use pre-releases to avoid clients to upgrade to a version that wasn't tested by any users and might contain bugs.

For example, during a release you might have the following flow:
  - "The team finished implementing a feature and wants to release a new package version"
  - Version `1.4.0-beta.0` is published (`npx monotag tag-git --pre`)
  - "Lib users reports some errors, and the team fixes it"
  - Version `1.4.0-beta.1` is published with fixes (`npx monotag tag-git --pre`)
  - "After a week being used, it seems that the pre-release is stable"
  - Version `1.4.0` is published (`npx monotag tag-git`)

## Usage

### CLI

```text
npx monotag [command]

Commands:
  monotag current   Show the latest tag for the path and fail if it's not up to
                    date
  monotag latest    Show the latest tag for the path
  monotag tag       Calculate and show next tag, incrementing semver according
                    to detected changes on path
  monotag tag-git   Calculate next tag and tag it in local git repo
  monotag tag-push  Calculate next tag, git-tag and git-push it to remote

Options:
      --version                       Show version number              [boolean]
      --help                          Show help                        [boolean]
  -v, --verbose                       Run with verbose logging
                                                      [boolean] [default: false]
  -d, --path                          File path inside repo to consider when
                                      analysing changes. Can be a list separated
                                      by ','. Commits that don't touch files in
                                      this path will be ignored. Defaults to
                                      current dir. E.g.:
                                      services/service1,shared/libs                                                      [string] [default: "auto"]
  -f, --from-ref                      Starting point ref for analysing changes
                                      in commits. Defaults to auto, which will
                                      be last version with this same tag prefix
                                                      [string] [default: "auto"]
  -t, --to-ref                        Ending point ref for analysing changes in
                                      commits. Defaults to HEAD
                                                      [string] [default: "HEAD"]
  -c, --conv-commit                   Use only conventional commit styled
                                      commits during release notes creation
                                                      [boolean] [default: false]
  -g, --repo-dir                      Git repo dir to run command on. Defaults
                                      to current process dir
                                                          [string] [default: ""]
  -l, --semver-level                  Level to increment tag. One of "major",
                                      "minor", "patch" or "auto". "auto" will
                                      increment according to semantic commit
                                      messages        [string] [default: "auto"]
  -p, --prefix                        Tag prefix to look for latest versions and
                                      to use on generated tags. If not defined
                                      will be derived from last path part
                                                      [string] [default: "auto"]
  -j, --separator                     When prefix is "auto", append this
                                      separator to last working dir path to
                                      define the tag prefix to use. e.g.: dir
                                      "services/myservice" with separator "/v"
                                      leads to tag prefix "myservice/v"
                                                         [string] [default: "/"]
  -s, --suffix                        Tag suffix to be added to generated tags
                                                          [string] [default: ""]
      --prerelease, --pre             Create tags as pre-release versions. E.g.:
                                      2.1.0-beta.0    [boolean] [default: false]
      --prerelease-identifier, --pid  Pre-release identifier. E.g.: beta
                                                      [string] [default: "beta"]
      --prerelease-increment, --pai   Increment pre-release number even if no
                                      changes are detected
                                                      [boolean] [default: false]
      --tag-file, --ft                File to save the release tag      [string]
      --version-file, --fv            File to save version              [string]
      --notes-file, --fn              File to save the notes with a changelog
                                                                        [string]
      --changelog-file, --fc          Changelog file that will be appended with
                                      new version/release notes. Disabled for
                                      prerelease versions               [string]
      --min-version, --lv             Minimum version to be considered when
                                      calculating next version. If calculated
                                      version is lower, this value will be used
                                      instead                           [string]
      --max-version, --uv             Maximum version to be considered when
                                      calculating next version. If calculated
                                      version is higher, the process will fail
                                                                        [string]
      --bump-action, --ba             Bump action. Can be "latest" (bump to
                                      latest tag), "zero" (set version to 0.0.0)
                                      or "none        [string] [default: "none"]
      --bump-files, --bf              Comma separated list of file names to bump
                                      version [string] [default: "package.json"]
      --git-username, --gu            Git username config when commiting and
                                      tagging resources                 [string]
      --git-email, --ge               Git email config when commiting and
                                      tagging resources                 [string]
      --no-links, --nl                Disable rendering links in release notes
                                      for issues, prs and commits
                                                      [boolean] [default: false]
      --url-commit, --uc              Base commit URL used to generate links to
                                      commits in release notes. Defaults to git
                                      origin when possible. E.g.:
                                      http://mygit.com/myrepo/commit/   [string]
      --url-pr, --up                  Base pr URL used to generate links to pr
                                      in release notes. Defaults to git origin
                                      when possible. E.g.:
                                      http://mygit.com/myrepo/prs/      [string]
      --url-issue, --ui               Base issue URL used to generate links to
                                      issues in release notes. Defaults to git
                                      origin when possible. E.g.:
                                      http://mygit.com/myrepo/issues/   [string]
```

### Lib

```ts
import { nextTag, releaseNotes, lastTagForPrefix, filterCommits, summarizeCommits } from 'monotag';
```

- nextTag - calculates next tag
- releaseNotes - calculates only release notes based on a commit range on a prefix
- lastTagForPrefix - find latest tag for a certain tag prefix name
- filterCommits - find commits that touches a certain path in a range
- summarizeCommits - gets a list of commits and summarize them according to the conventional commit classification

Check http://github.com/flaviostutz/monotag/src/ for more details.

The library exposes its ts types, so you can use VSCode for auto completing and seeing jsdoc for types.

## Examples

### CLI example

- `monotag tag`
  - Will use current dir as repo and tag prefix name, try to find the latest tag in this repo with this prefix, look for changes since the last tag to HEAD and output a newer version according to conventional commit changes. If
  there are not changes since the last tag, the latest tag will be returned.

- `monotag tag --version-file=dist/version.txt --notes-file=dist/notes.md --tag-file=dist/versiontag.txt`
  - Same as previous, but saves the version part of the tag in version.txt, the full tag name in versiontag.txt and the version change notes in dist/notes.md

- `monotag tag --changelog-file=docs/changelog.md`
  - Calculates next tag and add the release notes of the version to the existing docs/changelog.md file by appending the contents of the version notes to the top of the file so that this file will contain a history of versions.

- `monotag tag --changelog-file=docs/changelog.md`
  - Same as above, but will also commit, tag with latest generated version and push changes to remote git repo, including changelog.md

- `monotag tag --bump-action=latest --bump-files=package.json`
  - Will calculate next tag/version and change the field "version" of the file "package.json" to the latest version

- `monotag tag --min-version=2.0.0 --max-version=2.999.999`
  - Limit the generated versions to 1.x. If the calculated version is lower than 2.x, force to 2.0.0. If the generated version is higher than 2.x (due to a major change), fail. Useful when controlling versioning on specific major release branches (e.g.: branch 2.x).

- `monotag current`
  - Will get the latest tag for current path and check if it's the latest possible tag in the repo. It will fail if there are changes in the repo that would lead to the creation of a new tag. If the latest tag is the latest possible (current), then it will be returned.
  
- `monotag tag --from-ref=HEAD~3 --to-ref=HEAD --path services/myservice`
  - Generate release notes according to changes made in the last 3 commits for changes in dir services/myservice of the repo

- `monotag tag --path services/myservice`
  - Generate tag "myservice/1.3.0" if previous tag was "myservice/1.2.8" and one commit with comment "feat: adding something new" is found between commits from the latest tag and HEAD

- `monotag tag --path services/myservice --separator=/v`
  - Generate tag "myservice/v1.3.0" if previous tag was "myservice/v1.2.8" and one commit with comment "feat: adding something new" is found between commits from the latest tag and HEAD

- `monotag tag --path services/myservice --prerelease`
  - Generate tag "myservice/1.3.0-beta.0" if previous tag was "myservice/1.2.8" (and one commit with comment "feat: adding something new" is found between commits from the latest tag and HEAD)

- `monotag tag-push`
  - Generate tag "myservice/1.3.0" if previous tag was "myservice/1.2.8", tag repo and push tag to remote repo

- `monotag tag-push --changelog-file=docs/changelog.md`
  - Calculate next tag, add latest change notes to existing changelog.md file, add to repo, commit with "chore(release): myservice/1.3.0", tag git with "myservice/1.3.0" and push newly created commit (with changelog.md) and new tag to remote git repo.


- `monotag list`
  - Lists tags in the monorepo related to current dir/tag prefix.

### Github actions workflow

- Create file .github/workflows/create-next-tag.yml in your repo

```yml
name: create-next-tag

on:
  workflow_dispatch:

jobs:
  create-tag:
    runs-on: ubuntu-latest
    permissions:
      # needed for pushing new tag
      contents: write
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          # this is needed if you want the tag push to trigger another workflow
          # create a personal token and set a secret with name GH_PERSONAL_TOKEN
          # https://github.com/orgs/community/discussions/27028
          token: ${{ secrets.GH_PERSONAL_TOKEN }}
      - name: Create tag and push to repo
        run: |
          git config --global user.email "flaviostutz@gmail.com"
          git config --global user.name "Flávio Stutz"
          npx -y monotag@latest tag-push
```

- Push this file to the repo. A new action will be available to be triggered manually on GH

- When you have a release candidate and want to tag it, go to Github -> repository -> Actions -> (on the left) "create-next-tag" -> Hit "Run workflow"

- It will get the last tag, create release notes, increment semantic version, tag repo and push it automatically

### Lib example

- Having a repo with structure

```text
/modules
   /mymodule
   /another-one
```

- Existing tags:
  - mymodule/1.6.2,
  - mymodule/2.4.7,
  - another-one/0.3.5
- Existing commits after latest tag:
  - feat(ui): Cache capability <-- changed mymodule/ files
  - feat!: Upgrading API interfaces <-- changed another-one/ files

```ts
import { nextTag } from 'monotag';

const nt = nextTag({
  repoDir: 'repos/myrepo',
  toRef: 'HEAD',
  path: 'modules/mymodule',
});

console.log(nt.tagName);
// shows "2.5.0"
console.log(nt.releaseNotes)
// shows "Features: -ui: Cache capability"
```

- What happened:
  - default tag prefix is the name of the path: 'mymodule'
  - find latest tag with prefix 'mymodule/': 'mymodule/2.4.7'
  - find commits from the latest tag to HEAD
  - filter out commits that didn't touch files in path 'modules/mymodule', only one commit touched
  - check the commit message and look for conventional commit patterns. It found prefix 'feat', which is related to a new feature, so semver will be incremented in minor level
  - Latest tag was mymodule/2.4.7, incrementing minor gives 'mymodule/2.5.0'

