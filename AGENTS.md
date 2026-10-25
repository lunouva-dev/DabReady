# AGENTS.md

## Organization-wide infrastructure and agent policy

This repository is governed by the lunouva-dev organization policy. Read this file before changing code or workflows, and update it when infrastructure changes materially. Existing project-specific guidance in this file remains authoritative unless it conflicts with this policy’s safety requirements.

### Project profile and verified state

- **Observed stack:** vinext application with Vitest and Drizzle configuration
- **Install, test, build, and deployment verification:** `npm install`; use `npm test` and `npm run build`; use database generation only with approved local credentials.
- **Observed CI/deployment:** No GitHub Actions workflow was present.
- These observations describe established configuration only. Proposed runner or deployment changes require separate review and approval.

### Organization runner boundaries

- Known organization infrastructure includes Windows `shiftway-store` for approved private repositories, macOS `mac-ios-01` for authorized Apple/iOS and TestFlight work, and Linux `lunouva-linux-01` in runner group `lunouva-linux-private` for trusted workloads and Shiftway draft deployments.
- Do not assign this repository to any runner based on another project’s usage. Inspect this repository’s workflows, repository access, runner-group permissions, and recent Actions results first.
- Do not expose private network addresses, machine usernames, secrets, SSH keys, tokens, signing credentials, or local filesystem paths in public repositories.

### Required GitHub Actions, security, billing, and deployment rules

- Inspect existing workflow YAML and recent Actions results before editing CI. Preserve working self-hosted runner labels, groups, permissions, branch filters, signing credentials, TestFlight/App Store approval gates, and deployment environments.
- Do not casually replace self-hosted jobs with `ubuntu-latest`, `windows-latest`, or `macos-latest`; do not disable tests or repeatedly rerun failures without investigating. Validate syntax and runner compatibility, then check the actual Actions result.
- Never run untrusted pull-request code on persistent self-hosted runners or expose secrets to untrusted code. Preserve private runner-group restrictions; use GitHub-hosted or properly isolated ephemeral runners for untrusted jobs.
- Prefer existing self-hosted runners for trusted workloads and minimize unnecessary GitHub-hosted usage, but do not increase GitHub Actions budgets, enable unrestricted spending, change payment methods, or purchase infrastructure/subscriptions. Preserve configured spending limits; never set the Actions budget to `$0` without approval.
- Preserve draft, staging, and production distinctions. Do not introduce automatic production publication. Preserve Apple signing and release safeguards. Verify deployments and never report a build or deployment as successful without checking the actual result.
- Do not rebuild, deregister, or reinstall functioning runners without demonstrated need and approval. Preserve automatic startup/recovery, keep workspaces clean without deleting needed files/backups, and avoid unnecessary concurrent heavy Linux/macOS jobs on shared physical hardware.
- Never commit `.env`, credentials, signing material, private network addresses, usernames, SSH keys, tokens, or other secrets. Preserve branch protection, permissions, and deployment approvals.

### Normal agent workflow

1. Read this file and inspect the relevant code, workflow, deployment configuration, and current Git state.
2. Keep changes small and run the narrowest relevant checks, followed by the repository verification commands above.
3. For workflow or deployment changes, inspect the resulting GitHub Actions/deployment run before reporting completion.
4. Use a dedicated branch and pull request; do not push documentation or code directly to protected production branches or merge without authorization.
5. If infrastructure is intentionally changed, document the affected route, security boundary, approval gate, and verification result here.
