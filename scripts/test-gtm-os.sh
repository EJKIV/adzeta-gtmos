#!/bin/bash
#
# GTM OS Test Runner
# Usage: ./scripts/test-gtm-os.sh [local|gateway|integration|e2e|all]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
APP_PORT=3001
GATEWAY_URL=${OPENCLAW_GATEWAY_URL:-""}
GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN:-""}
AGENT_ID=${OPENCLAW_AGENT_ID:-"adzeta-gtm"}

# Track results
PASSED=0
FAILED=0

print_header() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Test A1: Local app health
test_a1_local_health() {
    print_header "Test A1: Local App Health"
    
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT/api/agent/command \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"text": "help"}' 2>/dev/null || echo "000")
    
    if [ "$RESPONSE" == "200" ]; then
        print_success "Local app responds on port $APP_PORT"
    else
        print_fail "Local app not responding (HTTP $RESPONSE)"
        print_info "Make sure to run: npm run dev"
    fi
}

# Test A2: Local skill execution
test_a2_local_skill() {
    print_header "Test A2: Local Skill Execution"
    
    RESPONSE=$(curl -s http://localhost:$APP_PORT/api/agent/command \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"text": "help"}' 2>/dev/null)
    
    if echo "$RESPONSE" | grep -q "skillId"; then
        print_success "Local skill executed successfully"
    else
        print_fail "Local skill execution failed"
        print_info "Response: $RESPONSE"
    fi
}

# Test B1: Gateway health
test_b1_gateway_health() {
    print_header "Test B1: OpenClaw Gateway Health"
    
    if [ -z "$GATEWAY_URL" ]; then
        print_fail "OPENCLAW_GATEWAY_URL not set"
        print_info "Add to .env.local: OPENCLAW_GATEWAY_URL=http://localhost:PORT"
        return
    fi
    
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL/health" 2>/dev/null || echo "000")
    
    if [ "$RESPONSE" == "200" ]; then
        print_success "Gateway reachable at $GATEWAY_URL"
    else
        print_fail "Gateway not responding (HTTP $RESPONSE)"
        print_info "Make sure OpenClaw Gateway is running"
    fi
}

# Test B2: Gateway auth
test_b2_gateway_auth() {
    print_header "Test B2: Gateway Authentication"
    
    if [ -z "$GATEWAY_TOKEN" ]; then
        print_fail "OPENCLAW_GATEWAY_TOKEN not set"
        return
    fi
    
    RESPONSE=$(curl -s "$GATEWAY_URL/v1/tools/invoke" \
        -X POST \
        -H "Authorization: Bearer $GATEWAY_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"tool": "test.echo", "params": {"message": "test"}}' 2>/dev/null)
    
    if echo "$RESPONSE" | grep -q "success\|error"; then
        print_success "Gateway auth working"
    else
        print_fail "Gateway auth failed"
        print_info "Check OPENCLAW_GATEWAY_TOKEN"
    fi
}

# Test C1: Agent listed
test_c1_agent_listed() {
    print_header "Test C1: Zetty Agent Listed"
    
    # Check if agent exists in config
    if [ -f "$HOME/.openclaw/openclaw.json" ]; then
        if grep -q "adzeta-gtm" "$HOME/.openclaw/openclaw.json" 2>/dev/null; then
            print_success "Agent 'adzeta-gtm' found in config"
        else
            print_fail "Agent 'adzeta-gtm' not in config"
            print_info "Run: openclaw agents list"
        fi
    else
        print_fail "OpenClaw config not found"
    fi
}

# Test C2: Direct agent query
test_c2_agent_query() {
    print_header "Test C2: Direct Agent Query"
    
    if [ -z "$GATEWAY_URL" ] || [ -z "$GATEWAY_TOKEN" ]; then
        print_fail "Missing gateway config"
        return
    fi
    
    RESPONSE=$(curl -s "$GATEWAY_URL/v1/chat/completions" \
        -X POST \
        -H "Authorization: Bearer $GATEWAY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"model\": \"openclaw:$AGENT_ID\", \"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}], \"max_tokens\": 50}" 2>/dev/null)
    
    if echo "$RESPONSE" | grep -q "content\|choices"; then
        print_success "Agent responds to queries"
    else
        print_fail "Agent query failed"
        print_info "Response: ${RESPONSE:0:200}"
    fi
}

# Test D1: Integration - SSE connection
test_d1_integration() {
    print_header "Test D1: Integration (App → Zetty)"
    
    print_warn "This test requires manual verification via browser UI"
    print_info "1. Start your app: npm run dev"
    print_info "2. Open: http://localhost:$APP_PORT"
    print_info "3. Send message: 'Hello Zetty'"
    print_info "4. Check if Zetty responds"
}

# Run all tests for a category
run_local_tests() {
    print_header "LOCAL TESTS (Category A)"
    test_a1_local_health
    test_a2_local_skill
}

run_gateway_tests() {
    print_header "GATEWAY TESTS (Category B)"
    test_b1_gateway_health
    test_b2_gateway_auth
}

run_agent_tests() {
    print_header "AGENT TESTS (Category C)"
    test_c1_agent_listed
    test_c2_agent_query
}

run_integration_tests() {
    print_header "INTEGRATION TESTS (Category D)"
    test_d1_integration
}

# Main
case "${1:-all}" in
    local)
        run_local_tests
        ;;
    gateway)
        run_gateway_tests
        ;;
    agent)
        run_agent_tests
        ;;
    integration)
        run_integration_tests
        ;;
    all)
        run_local_tests
        run_gateway_tests
        run_agent_tests
        run_integration_tests
        ;;
    *)
        echo "Usage: $0 [local|gateway|agent|integration|all]"
        exit 1
        ;;
esac

# Summary
print_header "Test Summary"
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
