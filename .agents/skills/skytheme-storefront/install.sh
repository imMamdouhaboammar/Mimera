#!/usr/bin/env bash
# Universal Multi-Agent Installer for skytheme-storefront
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_NAME="skytheme-storefront"

echo "📦 Installing ${TARGET_NAME} across AI agent harnesses..."

# 1. Claude Code (~/.claude/skills)
if [ -d "$HOME/.claude" ] || command -v claude >/dev/null 2>&1; then
  mkdir -p "$HOME/.claude/skills"
  rm -rf "$HOME/.claude/skills/${TARGET_NAME}"
  cp -r "$SCRIPT_DIR" "$HOME/.claude/skills/${TARGET_NAME}"
  echo "  ✅ Installed for Claude Code -> $HOME/.claude/skills/${TARGET_NAME}"
fi

# 2. Antigravity / Gemini CLI (~/.gemini/config/skills)
if [ -d "$HOME/.gemini" ]; then
  mkdir -p "$HOME/.gemini/config/skills"
  ln -sfn "$SCRIPT_DIR" "$HOME/.gemini/config/skills/${TARGET_NAME}"
  echo "  ✅ Linked for Antigravity / Gemini CLI -> $HOME/.gemini/config/skills/${TARGET_NAME}"
fi

# 3. Cursor (.cursor/skills in current directory or user home)
if [ -d ".cursor" ]; then
  mkdir -p ".cursor/skills"
  ln -sfn "$SCRIPT_DIR" ".cursor/skills/${TARGET_NAME}"
  echo "  ✅ Linked for Cursor -> .cursor/skills/${TARGET_NAME}"
fi

# 4. Codex / OpenCode (~/.codex/skills)
if [ -d "$HOME/.codex" ]; then
  mkdir -p "$HOME/.codex/skills"
  rm -rf "$HOME/.codex/skills/${TARGET_NAME}"
  cp -r "$SCRIPT_DIR" "$HOME/.codex/skills/${TARGET_NAME}"
  echo "  ✅ Installed for Codex / OpenCode -> $HOME/.codex/skills/${TARGET_NAME}"
fi

# 5. Global Agent Kernel (~/.agents/skills)
mkdir -p "$HOME/.agents/skills"
if [ "$SCRIPT_DIR" != "$HOME/.agents/skills/${TARGET_NAME}" ]; then
  ln -sfn "$SCRIPT_DIR" "$HOME/.agents/skills/${TARGET_NAME}"
fi
echo "  ✅ Linked for Universal Agent Kernel -> $HOME/.agents/skills/${TARGET_NAME}"

echo "🎉 Installation complete! You can now use /skytheme-storefront across all agents."
