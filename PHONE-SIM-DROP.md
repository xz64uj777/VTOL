# Phone sim drop handoff

**When to use:** Kyle (or his bots) hand you a phone/tablet flight or sim zip to upload to GitHub, polish, or continue — Helios, Copter, Osprey/VTOL, GPS, Ageis, or similar. Use this instead of inventing a new process each time.

**Do this:**

1. **Take the drop** — Prefer the crew’s `*-best.zip` (or named best). Unzip clean. Don’t commit `node_modules`, build junk, or secrets.

2. **Push to the named repo** — e.g. `xz64uj777/VTOL` or whatever Kyle names. Keep `KYLE-FEEDBACK.md` and a short README at the root.

3. **Feedback → changelog** — In plain English, list what Kyle disliked and what this build changed. Big-Grok and the crew should see that without digging code.

4. **Lock phone deck rules** (don’t “improve” these away):
   - Thin HUD (ALT · SPEED · HDG · bird-specific · MODE)
   - FL / high instruments only when they matter
   - Yaw as a left bar; throttle + mode/rotation on the right in cyclic mode
   - Hide the joystick when Tilt is on
   - Mid-flight Calibrate / Settings always reachable
   - Casual pitch = stick-up / nose-up unless Kyle says otherwise
   - Galaxy/night: glanceable, not tiny map chrome

5. **Flight feel first** — No new missions, scoring, career, or systems polish until Kyle says flight + controls + physics feel honest.

6. **Poke language** — If you review feel/input: CLEAR vs blockers vs softs. Notes only unless asked to fix. “Shout if X” in layman terms (Kyle is tech-savvy, doesn’t code).

7. **After upload — fly sheet** — Short checklist Kyle can run in minutes: what’s new, what good feels like, shout-if fails. Pass/fail by feel, not jargon. Night/Galaxy friendly.

8. **File path** — If chat download fails, say Share → Files/Drive. Don’t leave him hunting.

**Don’t:** Invent features past the locked list · rewrite physics without a clear bug · strip Casual/deck rules · stop at the git push with no fly sheet.
