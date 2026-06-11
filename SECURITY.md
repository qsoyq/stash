# Security Policy

## Reporting a Vulnerability

If you find a security issue in this repository, do not disclose sensitive details in a public Issue.

Please report it privately to the repository owner through GitHub private vulnerability reporting if it is enabled, or contact the maintainer directly through the GitHub profile listed for `@qsoyq`.

Include:

- A short description of the issue.
- Affected files, domains, or rules, if known.
- Reproduction steps or a proof of concept, if safe to share.
- Potential impact.
- Suggested mitigation, if available.

Do not include real credentials, tokens, private keys, or private user data in reports.

## Supported Scope

This repository contains Stash proxy configuration, override rules, scripts, and routing rulesets. Security-sensitive changes commonly include:

- MITM domain configuration.
- Request or response body rewrites.
- Header rewrites.
- Scripts that inspect request or response bodies.
- Scheduled scripts that call external services.
- DNS, proxy, reject, and direct routing rules.

## Maintainer Response

The maintainer will triage reports as soon as practical. Confirmed issues should be fixed through a focused PR and validated with repository checks before release.

## Secret Handling

Never commit API keys, tokens, passwords, cookies, private keys, certificates, or production environment files. If a secret is committed accidentally, revoke and rotate it immediately, then remove it from history if necessary.
