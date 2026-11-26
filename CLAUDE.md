# Project rules for Claude

This repo is part of the maintainer's (GitHub `yushengzhou`) hobby research workflow.
When triggered on GitHub with @claude:

- Work from the linked issue's spec. If there is no approved spec, write one as
  an issue comment and stop.
- Code on a branch `feat/<issue#>-<slug>`, open a PR with `Closes #<issue>`, make CI pass.
- Tests for every acceptance criterion; pin dependencies (renv.lock / uv.lock).
- Update README / docs and `CHANGELOG.md` under `[Unreleased]`.
- Never merge, tag, release, change settings or touch secrets. The maintainer does that.
- Reply to the maintainer in Chinese; code, commits and PRs in English.
