"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const issueLabel = core.getInput('issue-label');
            const prLabel = core.getInput('pr-label');
            const exclude = core.getInput('exclude');
            if (!issueLabel && !prLabel) {
                throw new Error('Action must have at least one of issue-label or pr-label set');
            }
            // Get client and context
            const client = github.getOctokit(core.getInput('repo-token', { required: true }));
            const context = github.context;
            if (context.payload.action !== 'opened') {
                console.log('No issue or PR was opened, skipping');
                return;
            }
            // Do nothing if it's not a pr or issue
            const isIssue = !!context.payload.issue;
            if (!isIssue && !context.payload.pull_request) {
                console.log('The event that triggered this action was not a pull request or issue, skipping.');
                return;
            }
            // Do nothing if the sender is from the project's org
            console.log("Checking if the user is from outside the project's org");
            if (!context.payload.sender) {
                throw new Error('Internal error, no sender provided by GitHub');
            }
            const sender = context.payload.sender.login;
            const issue = context.issue;
            console.log("Checking if it's an external account... ");
            console.log("issue.owner: " + issue.owner);
            console.log("sender:      " + sender);
            // TODO: Extract to function
            if (exclude) {
                let excluded = false;
                let excludedSenders = exclude.split(",");
                for (var excludedSender of excludedSenders) {
                    if (excludedSender == sender) {
                        excluded = true;
                        break;
                    }
                }
                if (excluded) {
                    console.log('author is excluded: ' + sender);
                    return;
                }
                else {
                    console.log('author is NOT excluded: ' + sender);
                }
            }
            let member = yield isProjectMember(client, issue.owner, sender);
            if (member) {
                console.log('author is a project member: ' + sender);
                return;
            }
            else {
                console.log('author is not a project member:  ' + sender);
            }
            // Do nothing if no message set for this type of contribution
            const label = isIssue ? issueLabel : prLabel;
            if (!label) {
                console.log('No label provided for this type of contribution');
                return;
            }
            const issueType = isIssue ? 'issue' : 'pull request';
            // Add a label to the issue or PR
            console.log(`Adding label: '${label}' to ${issueType} ${issue.number}`);
            // TODO: Set a better failed error message if the label doesn't exist
            yield client.rest.issues.addLabels({
                owner: issue.owner,
                repo: issue.repo,
                issue_number: issue.number,
                labels: [label],
            });
        }
        catch (error) {
            core.setFailed(error.message);
            return;
        }
    });
}
// isProjectMember checks if the specified sender is a member of the team owning the current repository.
// If the current project is owned by an organization, then membership in that organization is checked.
// Otherwise, if the repository owner is an individual account, the sender is compared directly.
function isProjectMember(client, owner, sender) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // This only works if the repo owner is an org and not an individual user.
            // TODO: Check if the repo owner is an org or an individual, instead of relying on the error response here.
            const res = yield client.rest.orgs.checkMembershipForUser({
                org: owner,
                username: sender,
            });
            if (res.status == 204) {
                return true;
            }
            else if (res.status == 404) {
                return false;
            }
            else {
                console.log('Received unexpected API status code ${res.status}');
                core.setFailed('Received unexpected API status code ${res.status}');
                return false;
            }
        }
        catch (error) {
            console.log('ERROR in isProjectMember: ' + error);
            console.log('The owner may not be an organization... checking individual account...');
            return owner == sender;
        }
    });
}
run();
