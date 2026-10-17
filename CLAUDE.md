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

### Client-Configurable Override Parameters

When adding or modifying override functionality, consult the official [override parameter documentation](https://stash.wiki/configuration/override#覆写参数) and expose user-selectable behavior through Stash's native parameter form. Feature switches and values that vary by user should be configurable in the client rather than requiring source edits.

- Declare `arguments-version: 1` and top-level `arguments`. Choose `switch`, `select`, or `input` as appropriate, with clear Chinese titles/descriptions, correctly typed defaults, and input constraints where needed.
- Keep existing behavior as the default when extending an override. Use stable parameter names, since client settings persist across remote updates.
- Reference declared parameters in override values using `${args.parameter_name}`. Display metadata (`name`, `desc`, `category`, `icon`) and parameter declarations do not expand references.
- Script `argument` is a string. Pass structured arguments as JSON using `${args.parameter_name|json}` for each value, then parse `$argument` once per execution. Preserve explicit `false` and `0`; use defaults for missing or invalid values so updated scripts remain compatible with older overrides.
- Browser-injected scripts cannot access Stash's `$argument`. Explicitly serialize only the validated settings they need into the injected code.
- Ensure every affected path honors its parameter, including jq rewrites, CSS, injected page behavior, and request/response scripts. Keep independent controls from overriding one another through broad selectors or unconditional rules.
- Mention the client settings entry (override details → parameters) and required versions when introducing parameters: currently Beta, iOS/tvOS 3.7+ and macOS 4.4+. Recheck the official documentation as support changes.
- Verify defaults, individual controls, all controls disabled, and missing/invalid script arguments, in addition to normal repository checks. Parameter substitution and client UI behavior require validation in a supported Stash version.

Keep `AGENTS.md` and `CLAUDE.md` aligned when changing repository-wide instructions.

### Script Runtime

Scripts run in the Stash JavaScript environment with these globals:

- `$httpClient` - HTTP client (`get`/`post`/`put`/`delete`)
- `$request` / `$response` - Current request/response objects
- `$done` - Signal script completion
- `$notification` - Push notifications
- `$persistentStore` - Persistent key-value storage
- `$argument` - Override argument string

Stash executes each script as the body of an async function (same as Surge / Quantumult X / Loon), so top-level `return` and `await` are allowed. **Never declare these injected globals at the top level** (e.g. `var $httpClient`, `var $request, $response, ...`, `var $done`): inside a function body such `var`s become hoisted locals initialized to `undefined` and shadow the injected values, so the script crashes and never calls `$done`. Use `typeof $x === 'undefined'` to check for optional globals.

`script/base.js` wraps `$httpClient` callbacks into async/await via `request()` and provides utility functions (cookie parsing, notifications, etc.).

### Script-to-Override Binding

Each override's `script-providers` section references scripts via raw GitHub URLs pointing to `main` branch. When adding a new script, update the corresponding `.stoverride` file's `script-providers` URL.
