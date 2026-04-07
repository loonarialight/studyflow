#!/usr/bin/env bash
# ============================================================
# StudyFlow — GitHub Repository Setup Script
# Usage: bash scripts/setup-github.sh
# Requires: git, gh (GitHub CLI) — install: https://cli.github.com
# ============================================================

set -e

REPO_NAME="studyflow"
DESCRIPTION="StudyFlow — Educational platform with AI assistant, focus tracking and study groups"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   StudyFlow — GitHub Setup               ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─── Check prerequisites ──────────────────────────────────────
if ! command -v git &> /dev/null; then
  echo "❌ git is not installed. Please install git first."
  exit 1
fi

if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) not found."
  echo "   Install: https://cli.github.com"
  echo ""
  echo "   Mac:   brew install gh"
  echo "   Linux: sudo apt install gh"
  exit 1
fi

# ─── Check gh auth ────────────────────────────────────────────
if ! gh auth status &> /dev/null; then
  echo "🔐 You need to authenticate with GitHub..."
  gh auth login
fi

GH_USER=$(gh api user --jq .login)
echo "✅ Logged in as: $GH_USER"
echo ""

# ─── Init git if needed ───────────────────────────────────────
cd "$(dirname "$0")/.."

if [ ! -d ".git" ]; then
  echo "📁 Initializing git repository..."
  git init
  git branch -M main
fi

# ─── Create .env files from examples ─────────────────────────
echo "📝 Creating .env files from examples..."

if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo "   ✅ backend/.env created — please fill in your API keys"
else
  echo "   ⏭  backend/.env already exists"
fi

if [ ! -f "frontend/.env" ]; then
  cp frontend/.env.example frontend/.env
  echo "   ✅ frontend/.env created"
else
  echo "   ⏭  frontend/.env already exists"
fi

# ─── Create GitHub repo ───────────────────────────────────────
echo ""
echo "📦 Creating GitHub repository: $GH_USER/$REPO_NAME"

if gh repo view "$GH_USER/$REPO_NAME" &> /dev/null; then
  echo "   ⏭  Repository already exists — skipping creation"
else
  gh repo create "$REPO_NAME" \
    --public \
    --description "$DESCRIPTION" \
    --source=. \
    --remote=origin

  echo "   ✅ Repository created: https://github.com/$GH_USER/$REPO_NAME"
fi

# ─── Initial commit & push ────────────────────────────────────
echo ""
echo "🚀 Committing and pushing code..."

git add .

if git diff --cached --quiet; then
  echo "   ⏭  Nothing to commit"
else
  git commit -m "feat: initial project setup

- Full monorepo structure (backend + frontend)
- Node.js + Express + TypeScript backend
- Prisma ORM with PostgreSQL schema (20+ models)
- React + Vite + TailwindCSS frontend
- Gemini AI chatbot integration
- Google OAuth 2.0 + Calendar API
- Socket.io for realtime focus sessions and group chat
- Swagger/OpenAPI documentation at /api/docs
- Docker Compose for local development
- GitHub Actions CI/CD pipeline"
fi

git push -u origin main 2>/dev/null || git push origin main

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅ Done! Your project is on GitHub                      ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  🔗 Repo:   https://github.com/$GH_USER/$REPO_NAME"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Next steps:                                             ║"
echo "║  1. Fill in backend/.env with your API keys             ║"
echo "║  2. Run: docker-compose up -d  (start DB + Redis)       ║"
echo "║  3. Run: npm run install:all   (install all deps)       ║"
echo "║  4. Run: npm run db:migrate    (run migrations)         ║"
echo "║  5. Run: npm run db:seed       (seed sample data)       ║"
echo "║  6. Run: npm run dev           (start dev servers)      ║"
echo "║  7. Open: http://localhost:5173 (frontend)              ║"
echo "║  8. Open: http://localhost:4000/api/docs (Swagger)      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
