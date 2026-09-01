# ADJUDICATIONS.md - Non-Accepted Terminal Dispositions

**Run ID:** REVIEW-20260830-001
**Snapshot ID:** 20260830-014553
**Review Context ID:** (computed from harness)

---

## Non-Accepted Terminal Dispositions

---

### F004: Snake drawing uses undefined model.tileToViewBoxCenter
- **Disposition:** REJECTED_FALSE_POSITIVE
- **Finding:** Snake drawing uses undefined model.tileToViewBoxCenter instead of view method
- **File:** src/js/gameView.js:377-378
- **Origin:** DEEPSEEK_CHUNK_REVIEW
- **Programmer Rationale:** The model DOES have a `tileToViewBoxCenter` method defined at lines 76-84 in gameModel.js. The method signature is `tileToViewBoxCenter(tile)` and it correctly converts tile numbers to viewBox coordinates. The reviewer confused the view's `getViewBoxCenter` method with the model's `tileToViewBoxCenter` method. Both exist and serve different purposes.
- **Evidence:** gameModel.js lines 76-84 define `tileToViewBoxCenter(tile)` method that converts tile numbers to viewBox coordinates.
- **Reviewer Challenge:** Reviewed and confirmed - the model method exists and is correctly used. No challenge needed.
- **Final Disposition:** REJECTED_FALSE_POSITIVE - Not a defect.

---

### F020: Direct use of document in Node.js-capable module
- **Disposition:** OUT_OF_SCOPE_NOT_A_DEFECT
- **Finding:** Direct use of document in Node.js-capable module
- **File:** src/js/gameView.js:2007-2053
- **Origin:** DEEPSEEK_CHUNK_REVIEW
- **Programmer Rationale:** This is a browser-only game application. The Node.js export (`module.exports`) is provided solely for testing purposes (e.g., with jsdom/happy-dom in test environments). The `_createHeadElement` and `_createTailElement` methods are only called in browser context where `document` is available. The module is not designed to run in a headless Node.js environment without a DOM. The `typeof window !== 'undefined'` guards protect the browser-specific initialization code.
- **Scope Boundary:** This codebase is a browser-based game; Node.js support is only for testing with a DOM emulator. The module is not intended to run head/tail methods in pure Node.js without a DOM.
- **Programmer Rationale:** This is a deliberate design choice for a browser-only application. The Node.js export enables testing with jsdom/happy-dom, not production use in Node.js.
- **Reviewer Challenge:** Reviewed and confirmed - this is a deliberate design choice for a browser-only application with testing support. Not a defect.
- **Final Disposition:** OUT_OF_SCOPE_NOT_A_DEFECT - Design choice for browser-only application with test support.

---

## Summary of Non-Accepted Dispositions

| Finding | Disposition | Reason |
|---------|-------------|--------|
| F004 | REJECTED_FALSE_POSITIVE | Model method exists; reviewer confused model vs view method |
| F020 | OUT_OF_SCOPE_NOT_A_DEFECT | Design choice for browser-only app with test support |

All other findings (28) were adjudicated as ACCEPTED_DEFECT and recorded in DEFECTS.md.