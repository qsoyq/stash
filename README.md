# stash

Stash resource repository for the [Stash](https://stash.ws) proxy client. It contains Clash-compatible proxy configuration, HTTP override rules, JavaScript scripts, and domain/IP routing rulesets.

## Project Structure

- `config/` - Stash proxy configuration, including proxy groups, DNS, and routing rules.
- `override/` - `.stoverride` files grouped by category, such as ad blocking, bypass, enhancement, signing, DNS, debug, outbound, subscribe, and tiles.
- `script/` - JavaScript scripts executed by the Stash runtime.
- `ruleset/` - YAML domain and IP rulesets used by routing rules.
- `docs/` - Longer-form decisions, release notes, and postmortems.

## Tooling

This repository uses:

- `uv` for Python tool execution and dependency locking.
- `pre-commit` for YAML, TOML, JSON, whitespace, line-ending, large-file, and Stash override format checks.
- `ghi`, a GitHub CLI wrapper from <https://github.com/qsoyq/ghi.git>, for release operations.

## Local Setup

Install the pre-commit hooks:

```bash
uv run pre-commit install
```

## Validation

Run all repository checks before opening a PR:

```bash
uv run pre-commit run -a
```

The custom `check-stash-override-format` hook validates `.stoverride` files and may rewrite formatting in place.

## Release

Create or delete releases with `ghi`:

```bash
uv run ghi release create
uv run ghi release delete
```

Before releasing, ensure validation passes and record any release notes or rollback notes in `docs/release/` or the release PR.

## Branch and PR Flow

- Use `main` as the default branch.
- Create focused branches from `main`, preferably named `type/<issue-id>-<short-desc>`.
- Track work with GitHub Issues.
- Open a PR for every repository change and fill in the PR template.
- Use Conventional Commit messages, for example `feat: add example override` or `fix: correct routing rule`.

## Contribution

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, validation, commit, and review expectations.

## Security

Do not commit secrets, cookies, tokens, passwords, private keys, certificates, logs with private data, or production environment files. See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## AI Tooling

- [CLAUDE.md](CLAUDE.md) provides Claude Code project context.
- [.github/copilot-instructions.md](.github/copilot-instructions.md) provides GitHub Copilot context.
- PRs should state whether AI assistance was used and which parts were AI-assisted.

## Maintainer

Primary maintainer: [@qsoyq](https://github.com/qsoyq)
