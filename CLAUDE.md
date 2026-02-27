# CLAUDE.md

This file provides context and conventions for AI assistants (Claude and others) working in this repository.

## Repository Overview

- **Repository**: YangChaorix/teamstest
- **Remote**: Configured via local proxy at `http://local_proxy@127.0.0.1:57745/git/YangChaorix/teamstest`
- **Status**: Freshly initialized — no application code exists yet

This file will be updated as the project evolves.

---

## Git Workflow

### Branch Naming

Feature branches for AI-assisted development follow this pattern:

```
claude/<task-slug>-<session-id>
```

Example: `claude/claude-md-mm4hbudwhv5lqi04-JSd3c`

**Rules:**
- Always develop on the designated feature branch — never directly on `main` or `master`
- Branch names must start with `claude/` for AI sessions; pushes to other branches will be rejected (HTTP 403)
- Create the branch locally if it does not exist: `git checkout -b <branch-name>`

### Commits

- Write clear, imperative commit messages (e.g., `Add user authentication module`)
- Keep commits focused — one logical change per commit
- Do not amend published commits; create a new commit instead

### Push

```bash
git push -u origin <branch-name>
```

If push fails due to a network error, retry with exponential backoff:
- Attempt 1 → wait 2 s → Attempt 2 → wait 4 s → Attempt 3 → wait 8 s → Attempt 4 → wait 16 s

### Pull / Fetch

Prefer fetching a specific branch:

```bash
git fetch origin <branch-name>
git pull origin <branch-name>
```

Apply the same exponential-backoff retry strategy on network failures.

---

## Development Conventions (to be refined as the project grows)

The following are sensible defaults until the project defines its own standards.

### General Principles

- **Minimal changes**: Only modify what is directly required by the task
- **No over-engineering**: Avoid premature abstractions, feature flags, or hypothetical future requirements
- **Security first**: Never introduce command injection, SQL injection, XSS, or other OWASP Top 10 vulnerabilities
- **No backwards-compat shims**: Remove dead code rather than leaving it commented out

### Code Style

Until a linter/formatter is configured, follow the dominant style already present in the codebase.

### Testing

- Write tests for new logic where a test framework is present
- Do not break existing passing tests
- Run tests before committing when a test command is available

### File Management

- Prefer editing existing files over creating new ones
- Do not create documentation or README files unless explicitly requested
- Do not commit secrets, `.env` files, or credentials

---

## Project Structure (placeholder)

This section will be updated once source code is added.

```
teamstest/
├── CLAUDE.md          ← this file
└── .git/
```

---

## How to Update This File

When the project gains real source code, tests, or tooling, update the relevant sections above:

1. **Repository Overview** — describe the project purpose and tech stack
2. **Project Structure** — add a real directory tree with brief descriptions
3. **Development Conventions** — add language/framework-specific style rules, linter configs, formatter commands
4. **Testing** — document how to run tests (`npm test`, `pytest`, `cargo test`, etc.)
5. **Build & Deployment** — document build commands, Docker usage, CI/CD pipelines

Keep this file accurate and concise. It is read by AI assistants at the start of every session to understand the codebase.
