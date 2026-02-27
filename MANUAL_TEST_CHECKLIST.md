# Manual Testing Checklist — GTM OS

**App URL:** http://localhost:3001  
**Gateway:** http://127.0.0.1:18789  
**Date:** 2026-02-26

---

## Test M1: App Loads

**Steps:**
1. Open browser: http://localhost:3001
2. Wait for login page

**Expected:**
- [ ] Login page appears
- [ ] No console errors (F12 → Console)
- [ ] No network errors (F12 → Network)

**Result:** ⬜ PASS / ⬜ FAIL

---

## Test M2: Login Works

**Steps:**
1. Username: `admin`
2. Password: `admin123`
3. Click Login

**Expected:**
- [ ] Login succeeds
- [ ] Chat UI appears
- [ ] Sidebar visible on right

**Result:** ⬜ PASS / ⬜ FAIL

---

## Test M3: Local Skill Execution

**Steps:**
1. Type in chat: `help`
2. Press Enter

**Expected:**
- [ ] Message sent immediately
- [ ] Response appears quickly (< 500ms)
- [ ] Shows list of available skills
- [ ] No "Zetty" or "Connecting" messages (local only)

**Result:** ⬜ PASS / ⬜ FAIL

---

## Test M4: Zetty Connection

**Steps:**
1. Type: `Hello Zetty`
2. Press Enter
3. Watch status messages

**Expected Sequence:**
1. [ ] Your message appears
2. [ ] Status: "Understanding your request..."
3. [ ] Status: "Connecting to AI agent..."
4. [ ] Status: "AI agent is analyzing..."
5. [ ] Response from Zetty appears

**Result:** ⬜ PASS / ⬜ FAIL

**If FAIL:**
- Check console for errors
- Verify `OPENCLAW_GATEWAY_URL` in `.env.local`
- Check Gateway status: `openclaw gateway status`

---

## Test M5: Zetty Responds with Identity

**Steps:**
1. Type: `Who are you?`
2. Press Enter

**Expected:**
- [ ] Zetty responds
- [ ] Response includes "Zetty" or "GTM Lead"
- [ ] No system prompt/details revealed

**Result:** ⬜ PASS / ⬜ FAIL

---

## Test M6: Research Intent (High Confidence)

**Steps:**
1. Type: `Find CMOs at fintech companies`
2. Press Enter

**Expected:**
- [ ] Zetty acknowledges research request
- [ ] Intent classification: "research"
- [ ] May spawn prospect-researcher
- [ ] Response includes next steps or questions

**Result:** ⬜ PASS / ⬜ FAIL

---

## Test M7: Execution Intent

**Steps:**
1. Type: `Create an email sequence for outreach`
2. Press Enter

**Expected:**
- [ ] Zetty acknowledges creation request
- [ ] Intent classification: "execution"
- [ ] May ask clarifying questions

**Result:** ⬜ PASS / ⬜ FAIL

---

## Test M8: Multi-Turn Conversation

**Steps:**
1. First message: `Research AI companies in healthcare`
2. Wait for response
3. Follow-up: `Which ones have Series B funding?`

**Expected:**
- [ ] First response received
- [ ] Follow-up understood
- [ ] Context maintained (references prior research)
- [ ] No repeated introductions

**Result:** ⬜ PASS / ⬜ FAIL

---

## Test M9: Thread Persistence

**Steps:**
1. Have active conversation with Zetty
2. Refresh browser (F5)
3. Log back in

**Expected:**
- [ ] Conversation history preserved
- [ ] Zetty remembers context
- [ ] Can continue where left off

**Result:** ⬜ PASS / ⬜ FAIL

---

## Test M10: Local Skill + Zetty Fallback

**Steps:**
1. Type: `research prospects` (should use local skill)
2. Type: `What should I prioritize?` (should escalate)

**Expected:**
- Step 1: Fast local response
- Step 2: Status messages appear, Zetty responds

**Result:** ⬜ PASS / ⬜ FAIL

---

## Test M11: Sidebar Navigation

**Steps:**
1. Click each sidebar item:
   - [ ] Dashboard
   - [ ] Insights
   - [ ] Relationships
   - [ ] Outreach
   - [ ] Pilot
   - [ ] Polish
   - [ ] Settings

**Expected:**
- [ ] All pages load
- [ ] No 404 errors
- [ ] Data loads where applicable

**Result:** ⬜ PASS / ⬜ FAIL

---

## Test M12: Error Handling

**Steps:**
1. Type: `testerror` (or invalid skill)
2. Or disconnect network temporarily

**Expected:**
- [ ] Graceful error message
- [ ] "Zetty unavailable" if Gateway down
- [ ] Retry option shown
- [ ] App doesn't crash

**Result:** ⬜ PASS / ⬜ FAIL

---

## Test M13: Concurrent Sessions

**Steps:**
1. Open app in Tab 1
2. Open app in Tab 2 (same user)
3. Send message in Tab 1
4. Check Tab 2

**Expected:**
- [ ] Both tabs show same conversation
- [ ] Or separate sessions maintained

**Result:** ⬜ PASS / ⬜ FAIL

---

## Test M14: Long-Running Conversation

**Steps:**
1. Send 10+ messages to Zetty
2. Monitor browser memory (Activity Monitor)

**Expected:**
- [ ] No memory leaks
- [ ] UI remains responsive
- [ ] All messages preserved

**Result:** ⬜ PASS / ⬜ FAIL

---

## Summary

| Category | Tests | Passed |
|----------|-------|--------|
| App Basics | M1-M2 | ?/2 |
| Local Skills | M3 | ?/1 |
| Zetty Integration | M4-M7 | ?/4 |
| Conversation | M8-M10 | ?/3 |
| Navigation | M11 | ?/1 |
| Edge Cases | M12-M14 | ?/3 |
| **TOTAL** | **14** | **?/14** |

**Overall:** ⬜ ALL PASS / ⬜ ISSUES FOUND

**Notes:**

---

*Document: `~/projects/gtm-os/MANUAL_TEST_CHECKLIST.md`*
