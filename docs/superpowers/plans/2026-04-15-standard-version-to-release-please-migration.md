# Migration Plan: Replace standard-version with release-please

**Date**: 2026-04-15  
**Status**: Planned  
**Priority**: Medium  
**Effort**: ~2 hours

## Overview

Migrate from the deprecated `standard-version` package to Google's actively-maintained `release-please` tool for automated version management and GitHub releases.

## Why Migrate

- **standard-version**: Last updated 2021, officially deprecated
- **release-please**: Actively maintained by Google, modern approach
- **Benefits**: Better automation, review workflow, actively supported
- **Risk**: Low - both use conventional commits, similar versioning logic

## Current Workflow vs. Proposed

### Current (standard-version)
```
1. Run: npm run release
2. Tool bumps version, updates CHANGELOG.md, creates tag
3. Pushes tag to GitHub
4. CI workflow triggers on tag push
5. Tests, builds Docker, creates release
```

### Proposed (release-please)
```
1. Push commits with feat:/fix: prefixes
2. Release-please creates Release PR automatically
3. Review & merge the PR
4. Release-please tags the release automatically
5. CI workflow triggers on tag push
6. Tests, builds Docker, creates release
```

## Implementation Steps

### Phase 1: Setup release-please Action

1. **Create GitHub Action workflow** at `.github/workflows/release-please.yml`:
   ```yaml
   on:
     push:
       branches: [master]

   permissions:
     contents: write
     pull-requests: write

   name: release-please

   jobs:
     release-please:
       runs-on: ubuntu-latest
       steps:
         - uses: googleapis/release-please-action@v4
           with:
             token: ${{ secrets.GITHUB_TOKEN }}
             release-type: simple
   ```

2. **Test on a development branch** to verify PR creation
3. **Verify integration** with existing CI workflow (should still work on tag push)

### Phase 2: Remove standard-version

1. **Remove npm scripts** from `package.json`:
   - Delete: `release`, `release:patch`, `release:minor`, `release:major`

2. **Remove dependency**:
   ```bash
   npm uninstall standard-version
   ```

3. **Update documentation** in README if it mentions `npm run release`

### Phase 3: Test the Full Flow

1. **Create a feature commit** with `feat: test feature`
2. **Push to master**
3. **Verify release PR is created** on GitHub
4. **Review & merge the PR**
5. **Verify tag is created** and CI workflow runs
6. **Verify GitHub release is created** with changelog

## Key Configuration Details

### Release Type
Using `release-type: simple` - best for single-package projects like this

### Conventional Commits Recognition
Release-please automatically recognizes:
- `fix:` → patch version bump
- `feat:` → minor version bump
- `feat!:`, `fix!:` → major version bump (breaking change)

**Note**: Your current commits already follow this pattern!

### Token Requirements
- Uses `${{ secrets.GITHUB_TOKEN }}` (automatically available)
- No additional secrets needed
- Permissions in workflow already defined

## Benefits

✅ **No deprecated dependencies** - Release-please is actively maintained  
✅ **Better visibility** - Release PR shows exactly what's changing  
✅ **Review step** - Team can review before releasing  
✅ **Automation** - No manual CLI commands to remember  
✅ **Same output** - Still creates tags, CHANGELOG.md, releases  
✅ **Integrates seamlessly** - Works with existing CI workflow  

## Potential Concerns & Mitigations

| Concern | Mitigation |
|---------|-----------|
| Loses manual control over release timing | Release PR can be drafted/delayed if needed |
| New tool to learn | Similar concepts to standard-version |
| PR-based flow different | More transparent, easier to review |

## Advanced Options (Future)

If needed later:
- **Monorepo support**: Use `release-please-config.json` + `.release-please-manifest.json`
- **Custom formatting**: `release-please-config.json` allows extensive customization
- **Pre-release versions**: Can be configured for beta/alpha releases

## Success Criteria

- [ ] Release-please action deployed and working
- [ ] Automatic Release PR created on commits
- [ ] Release PR merges successfully
- [ ] Git tag created automatically
- [ ] GitHub release created with correct changelog
- [ ] CI/CD pipeline triggers normally
- [ ] Docker image built and pushed
- [ ] standard-version removed from package.json
- [ ] No breaking changes to release workflow

## Rollback Plan

If issues occur:
1. Disable release-please workflow (comment out)
2. Restore `package.json` with standard-version
3. `npm install`
4. `npm run release` still works as before

## Next Steps

1. Schedule implementation when convenient
2. Test on feature branch first
3. Deploy to master
4. Monitor first release to verify
5. Document any custom behavior needed

## Related Files

- `.github/workflows/ci.yaml` - Existing build/deploy workflow (no changes needed)
- `package.json` - Scripts to be removed
- `CHANGELOG.md` - Will continue to be automatically updated
- `.github/workflows/release-please.yml` - New file to create
