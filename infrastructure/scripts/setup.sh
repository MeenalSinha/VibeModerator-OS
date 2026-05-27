#!/bin/bash
# ============================================================
# VibeModerator OS — Setup Script
# Run this once after cloning the repo
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   VibeModerator OS — Setup${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}Error: Node.js 18+ is required. Current: $(node -v 2>/dev/null || echo 'not found')${NC}"
  exit 1
fi
echo -e "${GREEN}Node.js $(node -v) found${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Warning: Docker not found. You will need to run PostgreSQL and Redis manually.${NC}"
else
  echo -e "${GREEN}Docker found${NC}"
fi

# Copy env file
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${GREEN}Created .env from .env.example${NC}"
  echo -e "${YELLOW}Important: Add your OPENAI_API_KEY to .env before starting${NC}"
else
  echo -e "${GREEN}.env already exists${NC}"
fi

# Install dependencies
echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

# Generate Prisma client
echo ""
echo -e "${BLUE}Generating Prisma client...${NC}"
cd packages/db && npx prisma generate --schema=src/schema/schema.prisma && cd ../..

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}   Setup complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "  1. Add your OPENAI_API_KEY to .env"
echo "  2. Start databases:    npm run docker:up"
echo "  3. Run migrations:     npm run db:migrate"
echo "  4. Seed demo data:     npm run db:seed"
echo "  5. Start development:  npm run dev"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8080"
echo "  Health:   http://localhost:8080/health"
echo ""
echo "  Demo login: demo_mod_alex or demo_mod_sarah"
echo ""
