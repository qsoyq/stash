# Release Notes

Use this directory for release plans, release notes, validation evidence, and rollback notes.

Current release command reference:

```bash
uv run ghi release create
uv run ghi release delete
```

Before releasing, confirm:

- `uv run pre-commit run -a` passes.
- The intended tag or release target is correct.
- Risk and rollback notes are documented in the PR or release note.
