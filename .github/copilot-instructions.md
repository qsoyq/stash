# Copilot Instructions

This repository stores Stash proxy configuration, HTTP override rules, JavaScript scripts, and routing rulesets.

## Project Layout

- `config/` contains Stash proxy configuration.
- `override/` contains `.stoverride` files grouped by category.
- `script/` contains JavaScript executed by the Stash runtime.
- `ruleset/` contains YAML domain and IP routing rulesets.

## Validation

Run repository validation with:

```bash
uv run pre-commit run -a
```

## Contribution Notes

- Match existing YAML indentation and JavaScript style.
- Keep override match rules as narrow as practical.
- Do not log or commit cookies, tokens, passwords, private keys, or private request/response data.
- When adding a script under `script/`, update the matching `.stoverride` `script-providers` raw GitHub URL.
- Avoid unrelated refactors in resource or ruleset changes.
