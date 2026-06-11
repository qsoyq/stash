# Contributing

Thanks for helping improve this Stash resource repository.

## Development Flow

1. Create or pick an Issue that describes the requested change.
2. Create a branch from `main` using a descriptive name, preferably `type/<issue-id>-<short-desc>`.
3. Keep changes focused on the Issue scope.
4. Run the repository checks before opening a PR.
5. Open a PR and fill in the template, including validation evidence and any risk or rollback notes.

## Local Setup

Install dependencies with `uv` and install the pre-commit hooks:

```bash
uv run pre-commit install
```

## Validation

Run all repository validation before pushing:

```bash
uv run pre-commit run -a
```

This validates YAML, TOML, JSON, line endings, large files, and the `.stoverride` format.

## Commit Messages

Use Conventional Commit style:

```text
<type>: <short summary>
```

Common types include `feat`, `fix`, `docs`, `ci`, `chore`, `refactor`, and `test`.

When possible, reference the related Issue in commits with `Refs #<issue-id>`. Use `Closes #<issue-id>` in the PR description when the PR should close the Issue after merge.

## Scope Guidelines

- Do not mix unrelated refactors with resource changes.
- Do not commit generated build artifacts, local IDE settings, logs, secrets, API keys, tokens, passwords, or private keys.
- When adding a new Stash script, update the matching `.stoverride` `script-providers` URL.
- Match existing YAML indentation, naming, and file organization.

## Review Expectations

Reviewers should focus on:

- Correct `.stoverride` format and category placement.
- Whether MITM, rewrite, or script matching rules are as narrow as possible.
- Whether scripts avoid logging sensitive request or response data.
- Whether routing rules match the intended domains or IP ranges.
- Whether validation evidence is included in the PR.
