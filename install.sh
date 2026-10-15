#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SRC="$SCRIPT_DIR/.agents/skills"

echo "📦 Installing Mimera skills across AI agent environments..."

# Claude Code
if [ -d "$HOME/.claude" ] || command -v claude >/dev/null 2>&1; then
  mkdir -p "$HOME/.claude/skills"
  for skill_dir in "$SKILLS_SRC"/*; do
    if [ -d "$skill_dir" ]; then
      name="$(basename "$skill_dir")"
      rm -rf "$HOME/.claude/skills/$name"
      cp -r "$skill_dir" "$HOME/.claude/skills/$name"
      echo "  ✅ Installed for Claude Code -> $HOME/.claude/skills/$name"
    fi
  done
fi

# Antigravity / Gemini CLI
if [ -d "$HOME/.gemini" ]; then
  mkdir -p "$HOME/.gemini/config/skills"
  for skill_dir in "$SKILLS_SRC"/*; do
    if [ -d "$skill_dir" ]; then
      name="$(basename "$skill_dir")"
      rm -rf "$HOME/.gemini/config/skills/$name"
      cp -r "$skill_dir" "$HOME/.gemini/config/skills/$name"
      echo "  ✅ Installed for Antigravity / Gemini CLI -> $HOME/.gemini/config/skills/$name"
    fi
  done
fi

# Codex / OpenCode
if [ -d "$HOME/.codex" ]; then
  mkdir -p "$HOME/.codex/skills"
  for skill_dir in "$SKILLS_SRC"/*; do
    if [ -d "$skill_dir" ]; then
      name="$(basename "$skill_dir")"
      rm -rf "$HOME/.codex/skills/$name"
      cp -r "$skill_dir" "$HOME/.codex/skills/$name"
      echo "  ✅ Installed for Codex / OpenCode -> $HOME/.codex/skills/$name"
    fi
  done
fi

# Global Agent Skills (~/.agents/skills)
mkdir -p "$HOME/.agents/skills"
for skill_dir in "$SKILLS_SRC"/*; do
  if [ -d "$skill_dir" ]; then
    name="$(basename "$skill_dir")"
    rm -rf "$HOME/.agents/skills/$name"
    cp -r "$skill_dir" "$HOME/.agents/skills/$name"
    echo "  ✅ Installed for Universal Agent Kernel -> $HOME/.agents/skills/$name"
  fi
done

echo "🎉 Mimera skill suite installation complete!"
