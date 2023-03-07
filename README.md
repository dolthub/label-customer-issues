# GitHub Action: Label Customer Issues

A GitHub action that applies custom labels to issues and prs opened by authors outside of the repository's ownership (an individual or an organization). Custom accounts not part of the repository's ownership can also be excluded from labeling. Labels must already exist in the repository.

# Usage

See [action.yml](action.yml) for a more detailed description of the inputs and outputs.

See [.github/workflows/label-customer-issues.yml](.github/workflows/label-customer-issues.yml) for a working example. Note that the action must be triggered from the pull_request_target event in order to have permission to label pull requests. 

```yaml
steps:
- uses: dolthub/label-customer-issues@main
  with:
    repo-token: ${{ secrets.GITHUB_TOKEN }}
    issue-label: 'customer-issue'
    pr-label: 'contribution'
    exclude: 'dependabot,rependabot'
```
