# monotag

Semantic versioning for monorepos based on tag prefix, path prefix, affected files and conventional commit.

Run 'npx monotag --help' or 'npx monotag tag --help' for info on specific commands

You can use this as a library also. [Check documentation here](lib.md)

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
