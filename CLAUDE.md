# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stash resource repository containing proxy configuration, HTTP override rules (`.stoverride`), JavaScript scripts, and domain/IP routing rulesets for the [Stash](https://stash.ws) proxy client (Clash-compatible).

## Commands

```bash
# Install pre-commit hooks
uv run pre-commit install

# Run formatting/linting checks (YAML, TOML, JSON validation + stoverride format check)
uv run pre-commit run -a

# Version release
uv run ghi release create
uv run ghi release delete
```

`ghi` is a custom GitHub CLI wrapper from <https://github.com/qsoyq/ghi.git>.

## Architecture

### Directory Layout

- `config/` - Stash proxy configuration (`default.yaml`: proxy groups, DNS, routing rules)
- `override/` - `.stoverride` files organized by category:
    - `ad/` - Ad blocking (MITM body-rewrite with jq, script injection, header-rewrite)
    - `bypass/` - Traffic routing overrides (direct/proxy/reject)
    - `enhance/` - Site enhancements (translation, redirects)
    - `sign/` - Request signing
    - `dns/`, `debug/`, `outbound/`, `subscribe/`, `tile/` - Other overrides
- `script/` - JavaScript scripts executed by Stash runtime
    - `base.js` - Shared utility library (HTTP helpers, cookie parsing, notifications, `$httpClient`/`$done` wrappers)
    - `ad/` - Ad removal scripts (DOM manipulation, API response filtering)
    - `cron/` - Scheduled tasks (traffic monitoring, live subscriptions, site watchers)
    - `enhance/`, `sign/`, `tile/`, `debug/` - Other scripts
- `ruleset/` - YAML rulesets (`domain.*.yaml`, `ip.*.yaml`) for proxy routing decisions

### Override File Format (`.stoverride`)

YAML files with a specific structure validated by the `check-stash-override-format` pre-commit hook:

```yaml
name: <identifier>
desc: <description>
category: <ad|bypass|enhance|sign|dns|debug|outbound|subscribe|tile>
icon: <url>
http:
    mitm: [<domains>]
    force-http-engine: [<domains>]
    body-rewrite: [<regex> <response-jq|request-jq> <jq-expression>]
    header-rewrite: [<url-regex> <response-del|request-del> <header-name>]
    script:
        - name: <script-name>
          match: <url-pattern>
          type: <request|response>
          require-body: <bool>
          ...
script-providers:
    <name>:
        url: https://raw.githubusercontent.com/qsoyq/stash/main/script/<path>.js
        interval: 86400
```

### Script Runtime

Scripts run in the Stash JavaScript environment with these globals:

- `$httpClient` - HTTP client (`get`/`post`/`put`/`delete`)
- `$request` / `$response` - Current request/response objects
- `$done` - Signal script completion
- `$notification` - Push notifications
- `$persistentStore` - Persistent key-value storage
- `$argument` - Override argument string

`script/base.js` wraps `$httpClient` callbacks into async/await via `request()` and provides utility functions (cookie parsing, notifications, etc.).

### Script-to-Override Binding

Each override's `script-providers` section references scripts via raw GitHub URLs pointing to `main` branch. When adding a new script, update the corresponding `.stoverride` file's `script-providers` URL.
