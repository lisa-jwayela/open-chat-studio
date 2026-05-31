# Maintaining Claude Code Agent Workflows

For engineers responsible for extending, debugging, or operating the Claude workflows. For day-to-day usage, see [docs/developer_guides/Claude-Code-Agent.md](../../docs/developer_guides/Claude-Code-Agent.md).

## Overview

These three GitHub Actions workflows automate code generation and review tasks using Claude Code:

| File | Actions UI name | Trigger |
|---|---|---|
| `.github/workflows/claude.yml` | Claude Code | Issue labelled `claude`, `@claude` mention, daily schedule, manual dispatch |
| `.github/workflows/claude-followup.yml` | Claude Followup | CI completes on any `claude/**` branch |
| `.github/workflows/claude-dependabot.yml` | Claude Dependabot PR Review | Dependabot PR opened or updated, manual dispatch |

The workflows depend on [`anthropics/claude-code-action`](https://github.com/anthropics/claude-code-action), an official Anthropic action that provides Claude Code access within GitHub Actions.

## Setup

The `ANTHROPIC_API_KEY` secret must be set under **Settings > Secrets and variables > Actions** in the repository. All three Claude workflows require it.

### Important Security Considerations

- **Never commit API keys directly to your repository.** Always use GitHub Actions secrets to store and pass sensitive credentials to workflows.
- API key usage contributes to your Claude API costs, which scale with the number of workflow runs. Monitor usage and costs regularly.
- The `ANTHROPIC_API_KEY` should have sufficient permissions for the workflows' intended use, but consider using a dedicated key with minimal necessary scope if your organization supports granular API keys.

## Risks Specific to These Claude Workflows

Understanding and mitigating the specific risks of these workflows is critical for safe operation:

### 1. Agentic Workflow Injection (AWI)

**What it is:** If Claude treats repository content, issue descriptions, logs, or comments as executable instructions without proper validation, an attacker can inject malicious prompts to cause unintended actions.

**Examples of injection vectors:**
- Malicious issue descriptions that trick Claude into committing secrets or making unauthorized changes
- Crafted PR review comments that instruct Claude to bypass security checks
- Tampered log output that causes Claude to run unintended commands

**Mitigation:**
- Carefully review all issues and comments that trigger Claude workflows, especially from external contributors
- Restrict `claude` label application to trusted team members
- Use the `claude_args` tool allowlist (see [Tool allowlist](#tool-allowlist)) to strictly limit what Claude can execute
- Consider requiring PR review before applying the `claude` label to external contributions

### 2. YAML Workflow Complexity and Maintenance

**What it is:** GitHub Actions workflows can become "genuinely awful" and sprawling as they grow. Complex YAML configuration is hard to read, maintain, test, and reason about, increasing the risk of errors or unintended behavior.

**Risks in Claude workflows:**
- Prompts embedded in YAML become difficult to version control and modify
- Conditional logic (if statements, matrix builds) can cause unexpected execution paths
- Changes to workflow structure can break Claude's behavior without obvious indicators

**Mitigation:**
- Keep workflows as simple and readable as possible
- Document the purpose of each workflow section with comments
- Test workflow changes in a development branch before merging to main
- Consider extracting complex prompts into separate files for better readability

### 3. Governance Through Prompts

**What it is:** The behavior and constraints of Claude are defined by prompts embedded in the workflow files. These prompts control what Claude will and won't do, making them critical for governance.

**Why it matters:**
- Prompts are the primary mechanism for enforcing security policies and preventing misuse
- Changes to prompts directly affect Claude's decision-making and capabilities
- Vague or permissive prompts can lead to unintended actions or scope creep

**Best practices:**
- Treat prompt changes with the same care as code changes — require review and approval
- Document the intention behind each constraint in the prompt
- Periodically audit prompts to ensure they still match your organization's policies
- Version control all prompt changes in git history

### 4. GitHub Actions Workload Costs

**What it is:** Each Claude workflow run consumes GitHub Actions runner minutes and makes API calls to Claude, both of which incur costs.

**Potential cost drivers:**
- Frequent workflow triggers (e.g., daily scheduled runs, multiple issues labeled at once)
- Long-running Claude tasks that retry multiple times
- Parallelized workflow runs on multiple issues

**Mitigation:**
- Monitor workflow run frequency and duration via the **Actions** tab
- Consider using manual dispatch or scheduled runs (e.g., once-per-day) instead of always-on triggers
- Set reasonable timeout limits for workflow steps
- Review Claude's API usage regularly through your Anthropic dashboard

## Tool Allowlist

Each run is restricted to an explicit allowlist of tools defined in the `claude_args` field of the workflow file. Claude cannot call anything outside that list. If it needs a tool that isn't permitted, the run fails rather than silently taking an unintended action.

For more information on `claude_args` see [GitHub for claude-code-action usage guide](https://github.com/anthropics/claude-code-action/blob/main/docs/usage.md).

## Concurrency

Runs on the same issue queue instead of cancelling each other (`cancel-in-progress: false`). If a second trigger fires while a run is in progress for the same issue, it waits. Runs for different issues execute in parallel.

## Branch and Label Conventions

- **Branches** — all Claude-created branches are namespaced under `claude/` (e.g. `claude/123-20240518-143022` — issue number, date, time). Easy to target with branch protection rules.
- **`claude` label** — apply to an issue to trigger the one-shot or incremental workflow. Claude also applies it to PRs it opens.
- **`claude-followup-done` label** — applied by the follow-up workflow after it runs. Prevents a second round. Remove it manually if you need Claude to re-run follow-up on a PR.

## Debugging and Troubleshooting

### Common Issues

**Workflow times out:**
- Claude may have taken too long to complete the task. Check the workflow run logs for where it stalled.
- Consider breaking the issue into smaller, more focused tasks.

**API key not found:**
- Verify `ANTHROPIC_API_KEY` is set in **Settings > Secrets and variables > Actions**.
- Ensure the secret is accessible to the repository's workflows.

**Claude fails with "tool not allowed":**
- The tool Claude is trying to use is not in the `claude_args` allowlist. Review what Claude was trying to do and update the allowlist if the request was legitimate.

For more detailed debugging, check the workflow run logs in the **Actions** tab and review Claude's execution transcript.
