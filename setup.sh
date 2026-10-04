#!/usr/bin/env bash
# ============================================================================
# AUTOMATA V1 — One-Command Setup
# ============================================================================
# Usage:
#   bash setup.sh            Full setup (install deps, build, start)
#   bash setup.sh --help     Show usage
#   bash setup.sh --check    Check prerequisites only
#   bash setup.sh --start    Start Automata (and Ollama if installed)
#   bash setup.sh --stop     Stop Automata
#   bash setup.sh --restart  Restart Automata
#   bash setup.sh --status   Show status of all services
# ============================================================================

set -Euo pipefail

# ---------------------------------------------------------------------------
# Color output (only if terminal supports it)
# ---------------------------------------------------------------------------
if [[ -t 1 ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
  RED=$(tput setaf 1); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3)
  BLUE=$(tput setaf 4); BOLD=$(tput bold); RESET=$(tput sgr0)
else
  RED=""; GREEN=""; YELLOW=""; BLUE=""; BOLD=""; RESET=""
fi

info()  { echo "${BLUE}[INFO]${RESET}  $*"; }
ok()    { echo "${GREEN}[OK]${RESET}    $*"; }
warn()  { echo "${YELLOW}[WARN]${RESET}  $*"; }
err()   { echo "${RED}[ERROR]${RESET} $*" >&2; }
fatal() { err "$@"; exit 1; }
step()  { echo ""; echo "${BOLD}▸ $*${RESET}"; }

# ---------------------------------------------------------------------------
# Resolve project root (directory containing this script)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Verify we are inside the Automata repo
if [[ ! -f "$PROJECT_ROOT/apps/web/package.json" ]] || [[ ! -f "$PROJECT_ROOT/apps/web/public/workflow-library/catalog.json" ]]; then
  fatal "This script must be run from the Automata project root."
fi

# ---------------------------------------------------------------------------
# Constants (verified from the repository)
# ---------------------------------------------------------------------------
WEB_PORT=3000
OLLAMA_DEFAULT_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="qwen2.5:3b"        # Hardcoded in apps/web/app/api/route/route.ts line 22
N8N_PORT=5678
PID_DIR="$PROJECT_ROOT/.pids"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
cmd_exists() { command -v "$1" &>/dev/null; }

port_in_use() {
  if cmd_exists ss; then
    ss -tlnp 2>/dev/null | grep -q ":$1 " && return 0
  elif cmd_exists lsof; then
    lsof -iTCP:"$1" -sTCP:LISTEN &>/dev/null && return 0
  elif cmd_exists netstat; then
    netstat -tlnp 2>/dev/null | grep -q ":$1 " && return 0
  fi
  return 1
}

detect_os() {
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    echo "$ID"
  elif [[ "$(uname)" == "Darwin" ]]; then
    echo "macos"
  else
    echo "unknown"
  fi
}

get_pid() {
  local name="$1"
  local pidfile="$PID_DIR/${name}.pid"
  if [[ -f "$pidfile" ]]; then
    local pid
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      echo "$pid"
      return 0
    fi
    rm -f "$pidfile"
  fi
  return 1
}

save_pid() {
  mkdir -p "$PID_DIR"
  echo "$2" > "$PID_DIR/$1.pid"
}

# ---------------------------------------------------------------------------
# --help
# ---------------------------------------------------------------------------
show_help() {
  cat <<EOF
${BOLD}AUTOMATA V1 — Setup & Management${RESET}

Usage:
  bash setup.sh              Full setup (prerequisites, install, build, start)
  bash setup.sh --help       Show this help
  bash setup.sh --check      Check prerequisites only
  bash setup.sh --start      Start Automata web app (+ Ollama if installed)
  bash setup.sh --stop       Stop Automata web app
  bash setup.sh --restart    Restart Automata web app
  bash setup.sh --status     Show status of all services

Services:
  Automata Web    http://localhost:${WEB_PORT}
  Ollama          ${OLLAMA_DEFAULT_URL} (optional, for AI workflow finder)
  n8n             http://localhost:${N8N_PORT} (separate, for running workflows)

EOF
}

# ---------------------------------------------------------------------------
# --check: Prerequisites
# ---------------------------------------------------------------------------
check_prerequisites() {
  step "Checking prerequisites"
  local missing=0

  # Git
  if cmd_exists git; then
    ok "git $(git --version | head -1 | sed 's/git version //')"
  else
    err "git is not installed"
    ((missing++))
  fi

  # Node.js
  if cmd_exists node; then
    local node_ver
    node_ver=$(node -v)
    local node_major
    node_major=$(echo "$node_ver" | sed 's/v//' | cut -d. -f1)
    if [[ "$node_major" -ge 18 ]]; then
      ok "Node.js $node_ver"
    else
      err "Node.js $node_ver is too old (need v18+, recommend v20+)"
      ((missing++))
    fi
  else
    err "Node.js is not installed (need v18+, recommend v20+)"
    ((missing++))
  fi

  # npm
  if cmd_exists npm; then
    ok "npm $(npm -v)"
  else
    err "npm is not installed"
    ((missing++))
  fi

  # Ollama (optional)
  if cmd_exists ollama; then
    ok "Ollama is installed"
    if curl -sf "${OLLAMA_DEFAULT_URL}/api/tags" &>/dev/null; then
      ok "Ollama is running at ${OLLAMA_DEFAULT_URL}"
      # Check for the required model
      if curl -sf "${OLLAMA_DEFAULT_URL}/api/tags" | grep -q "${OLLAMA_MODEL}"; then
        ok "Model '${OLLAMA_MODEL}' is available"
      else
        warn "Model '${OLLAMA_MODEL}' is not pulled yet"
        warn "  Run: ollama pull ${OLLAMA_MODEL}"
      fi
    else
      warn "Ollama is installed but not running"
      warn "  Run: ollama serve"
    fi
  else
    warn "Ollama is not installed (optional — needed for AI workflow finder)"
    warn "  Install from: https://ollama.com/download"
  fi

  # Docker (optional)
  if cmd_exists docker; then
    ok "Docker $(docker --version 2>/dev/null | sed 's/Docker version //' | cut -d, -f1)"
  else
    info "Docker is not installed (optional — only needed for containerized deployment)"
  fi

  # Ports
  if port_in_use "$WEB_PORT"; then
    warn "Port ${WEB_PORT} is already in use"
  else
    ok "Port ${WEB_PORT} is available"
  fi

  echo ""
  if [[ "$missing" -gt 0 ]]; then
    err "${missing} required prerequisite(s) missing"
    return 1
  else
    ok "All required prerequisites are met"
    return 0
  fi
}

# ---------------------------------------------------------------------------
# Setup environment
# ---------------------------------------------------------------------------
setup_env() {
  step "Configuring environment"

  local env_file="$PROJECT_ROOT/.env"
  local env_example="$PROJECT_ROOT/.env.example"

  if [[ -f "$env_file" ]]; then
    ok ".env already exists — preserving existing configuration"
  elif [[ -f "$env_example" ]]; then
    info "Creating .env from .env.example"
    cp "$env_example" "$env_file"
    ok ".env created with local defaults"
    info "Edit .env if you need to change Ollama URL, ports, or other settings"
  else
    warn "No .env.example found — creating minimal .env"
    cat > "$env_file" <<ENVEOF
NODE_ENV=development
PORT=${WEB_PORT}
OLLAMA_BASE_URL=${OLLAMA_DEFAULT_URL}
OLLAMA_MODEL=${OLLAMA_MODEL}
ENVEOF
    ok "Minimal .env created"
  fi
}

# ---------------------------------------------------------------------------
# Install dependencies
# ---------------------------------------------------------------------------
install_deps() {
  step "Installing dependencies"

  cd "$PROJECT_ROOT"

  if [[ -d "node_modules" ]] && [[ -d "apps/web/node_modules" ]]; then
    info "node_modules exists — running npm ci to ensure clean state"
  fi

  npm ci --loglevel=warn 2>&1 | tail -5
  ok "Dependencies installed"
}

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
build_app() {
  step "Building Automata web app"

  cd "$PROJECT_ROOT"
  npm run build --workspace=@automata/web 2>&1 | tail -20
  ok "Build complete"
}

# ---------------------------------------------------------------------------
# Ollama: ensure model is available
# ---------------------------------------------------------------------------
setup_ollama() {
  step "Checking Ollama"

  if ! cmd_exists ollama; then
    warn "Ollama is not installed — AI workflow finder will be unavailable"
    warn "You can still browse and download workflows manually"
    warn "Install Ollama from: https://ollama.com/download"
    return 0
  fi

  # Start Ollama if not running
  if ! curl -sf "${OLLAMA_DEFAULT_URL}/api/tags" &>/dev/null; then
    info "Starting Ollama..."
    ollama serve &>/dev/null &
    local ollama_bg_pid=$!
    save_pid "ollama" "$ollama_bg_pid"

    # Wait for Ollama to become ready (up to 15 seconds)
    local retries=15
    while ! curl -sf "${OLLAMA_DEFAULT_URL}/api/tags" &>/dev/null; do
      ((retries--))
      if [[ "$retries" -le 0 ]]; then
        warn "Ollama did not start within 15 seconds"
        warn "Try starting manually: ollama serve"
        return 0
      fi
      sleep 1
    done
    ok "Ollama started"
  else
    ok "Ollama is already running"
  fi

  # Check for the required model
  if curl -sf "${OLLAMA_DEFAULT_URL}/api/tags" | grep -q "${OLLAMA_MODEL}"; then
    ok "Model '${OLLAMA_MODEL}' is ready"
  else
    info "Model '${OLLAMA_MODEL}' is not available — pulling it now"
    info "This may take a few minutes on first run..."
    if ollama pull "${OLLAMA_MODEL}"; then
      ok "Model '${OLLAMA_MODEL}' pulled successfully"
    else
      warn "Failed to pull model '${OLLAMA_MODEL}'"
      warn "The AI workflow finder will not work until the model is available"
      warn "  Run manually: ollama pull ${OLLAMA_MODEL}"
    fi
  fi
}

# ---------------------------------------------------------------------------
# --start
# ---------------------------------------------------------------------------
start_app() {
  step "Starting Automata"

  cd "$PROJECT_ROOT"

  # Check if already running
  if get_pid "automata-web" &>/dev/null; then
    local existing_pid
    existing_pid=$(get_pid "automata-web")
    warn "Automata web app is already running (PID: ${existing_pid})"
    return 0
  fi

  # Check port
  if port_in_use "$WEB_PORT"; then
    err "Port ${WEB_PORT} is already in use by another process"
    err "Stop the other process or change PORT in .env"
    return 1
  fi

  # Check if built
  if [[ ! -d "apps/web/.next" ]]; then
    info "No build found — building first..."
    build_app
  fi

  # Start the Next.js production server
  info "Starting web app on port ${WEB_PORT}..."
  npm run start --workspace=@automata/web > "$PROJECT_ROOT/.pids/web.log" 2>&1 &
  local web_pid=$!
  save_pid "automata-web" "$web_pid"

  # Wait for it to be ready
  local retries=15
  while ! curl -sf "http://localhost:${WEB_PORT}" &>/dev/null; do
    if ! kill -0 "$web_pid" 2>/dev/null; then
      err "Web app process exited unexpectedly"
      err "Check logs: cat $PROJECT_ROOT/.pids/web.log"
      return 1
    fi
    ((retries--))
    if [[ "$retries" -le 0 ]]; then
      err "Web app did not become ready within 15 seconds"
      err "Check logs: cat $PROJECT_ROOT/.pids/web.log"
      return 1
    fi
    sleep 1
  done

  ok "Automata is running at http://localhost:${WEB_PORT} (PID: ${web_pid})"
}

# ---------------------------------------------------------------------------
# --stop
# ---------------------------------------------------------------------------
stop_app() {
  step "Stopping Automata"

  local stopped=0

  if get_pid "automata-web" &>/dev/null; then
    local pid
    pid=$(get_pid "automata-web")
    kill "$pid" 2>/dev/null && ok "Stopped web app (PID: ${pid})" || warn "Could not stop PID ${pid}"
    rm -f "$PID_DIR/automata-web.pid"
    ((stopped++))
  fi

  # Note: We don't stop Ollama here since the user may have started it independently
  # and other applications may depend on it.

  if [[ "$stopped" -eq 0 ]]; then
    info "No Automata processes are running"
  fi
}

# ---------------------------------------------------------------------------
# --restart
# ---------------------------------------------------------------------------
restart_app() {
  stop_app
  sleep 1
  start_app
}

# ---------------------------------------------------------------------------
# --status
# ---------------------------------------------------------------------------
show_status() {
  step "Automata Status"
  echo ""

  # Web app
  if get_pid "automata-web" &>/dev/null; then
    local pid
    pid=$(get_pid "automata-web")
    if curl -sf "http://localhost:${WEB_PORT}" &>/dev/null; then
      ok "Web App:  Running at http://localhost:${WEB_PORT} (PID: ${pid})"
    else
      warn "Web App:  Process running (PID: ${pid}) but not responding on port ${WEB_PORT}"
    fi
  elif port_in_use "$WEB_PORT"; then
    info "Web App:  Port ${WEB_PORT} is in use (not managed by setup.sh)"
  else
    info "Web App:  Not running"
  fi

  # Ollama
  if curl -sf "${OLLAMA_DEFAULT_URL}/api/tags" &>/dev/null; then
    ok "Ollama:   Running at ${OLLAMA_DEFAULT_URL}"
    if curl -sf "${OLLAMA_DEFAULT_URL}/api/tags" | grep -q "${OLLAMA_MODEL}"; then
      ok "Model:    ${OLLAMA_MODEL} (available)"
    else
      warn "Model:    ${OLLAMA_MODEL} (not pulled)"
    fi
  elif cmd_exists ollama; then
    warn "Ollama:   Installed but not running"
  else
    info "Ollama:   Not installed (optional)"
  fi

  # n8n (informational only — not managed by this script)
  if port_in_use "$N8N_PORT"; then
    ok "n8n:      Running at http://localhost:${N8N_PORT}"
  else
    info "n8n:      Not running (start separately if needed)"
  fi

  # Catalog
  local wf_count
  wf_count=$(node -e "console.log(require('./apps/web/public/workflow-library/catalog.json').length)" 2>/dev/null || echo "?")
  ok "Catalog:  ${wf_count} workflows"

  echo ""
}

# ---------------------------------------------------------------------------
# Health checks
# ---------------------------------------------------------------------------
run_health_checks() {
  step "Running health checks"
  local failures=0

  # Web app
  if curl -sf "http://localhost:${WEB_PORT}" &>/dev/null; then
    ok "Website is reachable at http://localhost:${WEB_PORT}"
  else
    err "Website is NOT reachable at http://localhost:${WEB_PORT}"
    ((failures++))
  fi

  # Catalog
  if curl -sf "http://localhost:${WEB_PORT}/workflow-library/catalog.json" | node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    if (Array.isArray(data) && data.length > 0) { process.exit(0); } else { process.exit(1); }
  " 2>/dev/null; then
    ok "Catalog is loadable"
  else
    err "Catalog is NOT loadable"
    ((failures++))
  fi

  # Ollama
  if curl -sf "${OLLAMA_DEFAULT_URL}/api/tags" &>/dev/null; then
    ok "Ollama is reachable"

    # Test the router
    local route_response
    route_response=$(curl -sf -X POST "http://localhost:${WEB_PORT}/api/route" \
      -H "Content-Type: application/json" \
      -d '{"prompt":"monitor prices"}' 2>/dev/null || echo "FAIL")

    if echo "$route_response" | grep -q '"success":true'; then
      ok "AI Router is functional"
    else
      warn "AI Router returned unexpected response (Ollama may need model: ${OLLAMA_MODEL})"
    fi
  else
    warn "Ollama is not running — AI router is unavailable (catalog browsing still works)"
  fi

  echo ""
  if [[ "$failures" -gt 0 ]]; then
    err "${failures} health check(s) failed"
    return 1
  fi
  return 0
}

# ---------------------------------------------------------------------------
# Print final summary
# ---------------------------------------------------------------------------
print_summary() {
  local ollama_status="Not running"
  local model_status="N/A"

  if curl -sf "${OLLAMA_DEFAULT_URL}/api/tags" &>/dev/null; then
    ollama_status="${OLLAMA_DEFAULT_URL}"
    if curl -sf "${OLLAMA_DEFAULT_URL}/api/tags" | grep -q "${OLLAMA_MODEL}"; then
      model_status="${OLLAMA_MODEL} (ready)"
    else
      model_status="${OLLAMA_MODEL} (not pulled — run: ollama pull ${OLLAMA_MODEL})"
    fi
  fi

  echo ""
  echo "${BOLD}========================================${RESET}"
  echo "${BOLD}${GREEN}  AUTOMATA SETUP COMPLETE${RESET}"
  echo "${BOLD}========================================${RESET}"
  echo ""
  echo "  Website:  ${BOLD}http://localhost:${WEB_PORT}${RESET}"
  echo "  Ollama:   ${ollama_status}"
  echo "  Model:    ${model_status}"
  echo "  n8n:      Start separately if needed (http://localhost:${N8N_PORT})"
  echo "  Catalog:  $(node -e "console.log(require('./apps/web/public/workflow-library/catalog.json').length)" 2>/dev/null || echo "?") curated workflows"
  echo ""
  echo "  ${BOLD}Next steps:${RESET}"
  echo "  1. Open ${BOLD}http://localhost:${WEB_PORT}${RESET}"
  echo "  2. Describe what you want to automate"
  echo "  3. Select a workflow → download JSON"
  echo "  4. Import into your self-hosted n8n"
  echo "  5. Configure credentials → activate the workflow"
  echo ""
  echo "  ${BOLD}Management:${RESET}"
  echo "  bash setup.sh --status    Show status"
  echo "  bash setup.sh --stop      Stop Automata"
  echo "  bash setup.sh --restart   Restart Automata"
  echo ""
}

# ---------------------------------------------------------------------------
# Full setup
# ---------------------------------------------------------------------------
full_setup() {
  echo ""
  echo "${BOLD}${BLUE}╔══════════════════════════════════════╗${RESET}"
  echo "${BOLD}${BLUE}║      AUTOMATA V1 — Setup             ║${RESET}"
  echo "${BOLD}${BLUE}╚══════════════════════════════════════╝${RESET}"
  echo ""

  check_prerequisites || fatal "Fix the missing prerequisites above and re-run setup.sh"
  setup_env
  install_deps
  build_app
  setup_ollama
  start_app
  run_health_checks || warn "Some health checks failed — see above"
  print_summary
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
cd "$PROJECT_ROOT"

case "${1:-}" in
  --help|-h)
    show_help
    ;;
  --check)
    check_prerequisites
    ;;
  --start)
    setup_ollama
    start_app
    ;;
  --stop)
    stop_app
    ;;
  --restart)
    restart_app
    ;;
  --status)
    show_status
    ;;
  "")
    full_setup
    ;;
  *)
    err "Unknown option: $1"
    show_help
    exit 1
    ;;
esac
