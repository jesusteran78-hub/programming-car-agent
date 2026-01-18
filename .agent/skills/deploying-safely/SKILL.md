---
name: deploying-safely
description: Orchestrates a safe deployment process to the repository. Use when the user mentions deploying, pushing code, uploading changes, or "subir cambios".
---

# Deploying Safely

## When to use this skill
- User says "sube los cambios" (upload changes).
- User says "haz un push" (do a push).
- User says "deploy this" or "release version".
- User wants to sync local changes with the remote repository.

## Workflow
1.  **Safety Check**: Verify the current branch (usually `main`).
2.  **Test (Optional)**: If critical files changed (like `video_engine.js`), run their specific test script.
    - *Example*: `node test_watermark.js` if video engine touched.
3.  **Stage & Commit**:
    - Add all changes: `git add .`
    - Commit with a meaningful Conventional Commits message: `git commit -m "feat/fix: description"`
4.  **Push**: Execute `git push`.
5.  **Verify**: Check `git status` or command output to ensure cleanliness.
6.  **Notify**: Inform user of success.

## Instructions
- **ALWAYS** try to combine `git add .` and `git commit` if the shell allows, BUT fall back to sequential commands if `&&` fails (common in PowerShell).
- **NEVER** push broken code. If a test fails, abort the push and notify the user.
- **Check `.gitignore`** before adding all files to ensure no secrets or huge temp files are committed.

## Resources
- [Conventional Commits Guide](https://www.conventionalcommits.org/en/v1.0.0/)

---

### Example Command Sequence (PowerShell Safe)
```powershell
git status
git add .
git commit -m "fix: resolve critical bug in video engine"
git push
```
