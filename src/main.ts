import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
  try {
    const issueLabel: string = core.getInput('issue-label')
    const prLabel: string = core.getInput('pr-label')
    const exclude: string = core.getInput('exclude')
    if (!issueLabel && !prLabel) {
      throw new Error('Action must have at least one of issue-label or pr-label set')
    }
    // Get client and context
    const client = github.getOctokit(
      core.getInput('repo-token', {required: true})
    );
    const context = github.context;

    if (context.payload.action !== 'opened') {
      console.log('No issue or PR was opened, skipping');
      return;
    }

    // Do nothing if it's not a pr or issue
    const isIssue: boolean = !!context.payload.issue;
    if (!isIssue && !context.payload.pull_request) {
      console.log(
        'The event that triggered this action was not a pull request or issue, skipping.'
      );
      return;
    }

    // Do nothing if the sender is from the project's org
    console.log("Checking if the user is from outside the project's org");
    if (!context.payload.sender) {
      throw new Error('Internal error, no sender provided by GitHub');
    }
    const sender: string = context.payload.sender!.login
    const issue: {owner: string; repo: string; number: number} = context.issue

    console.log("Checking if it's an external account... " )
    console.log("issue.owner: " + issue.owner )
    console.log("sender:      " + sender)

    // TODO: Extract to function
    if (exclude) {
      let excluded = false
      let excludedSenders = exclude.split(",");
      for (var excludedSender of excludedSenders) {
        if (excludedSender == sender) {
          excluded = true
          break
        }
      }

      if (excluded) {
        console.log('author is excluded: ' + sender)
        return
      } else {
        console.log('author is NOT excluded: ' + sender)
      }
    }

    let member: boolean = await isProjectMember(client, issue.owner, sender)
    if (member) {
      console.log('author is a project member: ' + sender)
      return
    } else {
      console.log('author is not a project member:  ' + sender)
    }

    // Do nothing if no message set for this type of contribution
    const label: string = isIssue ? issueLabel : prLabel;
    if (!label) {
      console.log('No label provided for this type of contribution');
      return;
    }

    const issueType: string = isIssue ? 'issue' : 'pull request';
    // Add a label to the issue or PR
    console.log(`Adding label: '${label}' to ${issueType} ${issue.number}`);
    // TODO: Set a better failed error message if the label doesn't exist
    await client.rest.issues.addLabels( {
      owner: issue.owner,
      repo: issue.repo,
      issue_number: issue.number,
      labels: [label],
    })
  } catch (error) {
    core.setFailed((error as any).message);
    return;
  }
}

// isProjectMember checks if the specified sender is a member of the team owning the current repository.
// If the current project is owned by an organization, then membership in that organization is checked.
// Otherwise, if the repository owner is an individual account, the sender is compared directly.
async function isProjectMember(
    client: ReturnType<typeof github.getOctokit>,
    owner: string,
    sender: string,
): Promise<boolean> {
  try {
    // This only works if the repo owner is an org and not an individual user.
    // TODO: Check if the repo owner is an org or an individual, instead of relying on the error response here.
    const res = await client.rest.orgs.checkMembershipForUser({
      org: owner,
      username: sender,
    })

    if (res.status as number == 204) {
      return true
    } else if (res.status as number == 404) {
      return false
    } else {
      console.log('Received unexpected API status code ${res.status}')
      core.setFailed('Received unexpected API status code ${res.status}');
      return false
    }
  } catch (error) {
    console.log('ERROR in isProjectMember: ' + error)
    console.log('The owner may not be an organization... checking individual account...')
    return owner == sender
  }
}

run();
