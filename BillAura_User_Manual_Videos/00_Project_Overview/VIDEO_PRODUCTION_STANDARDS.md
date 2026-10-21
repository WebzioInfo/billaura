# Bill Aura ERP — Video Production & Quality Standards

## 1. Video Specifications
- **Resolution**: Full HD 1920 × 1080p (Native 1080p)
- **Aspect Ratio**: 16:9 Widescreen
- **Frame Rate**: 60 fps (for ultra-smooth mouse movements and UI animations) or 30 fps
- **Format**: MP4 (H.264 video codec, AAC audio codec at 320 kbps) / WebM for web previews
- **Color Space**: Rec.709 sRGB

---

## 2. Visual & Director Guidelines
1. **Real Software Only**:
   - Every single shot MUST be captured directly from the actual running Bill Aura application.
   - Strictly NO simulated mockups, AI-generated fake screenshots, or generic third-party illustrations.
2. **Cursor Choreography**:
   - Cursor movement must be deliberate, smooth, and predictable.
   - Hover momentarily over interactive targets (buttons, inputs, dropdown triggers) for 0.5–1.0s before clicking so the viewer registers the UI element.
   - Use subtle yellow/gold ring highlight (`#D97706` / `#F59E0B`) with 30% opacity on click events.
3. **Smart Framing & Zoom**:
   - **Wide View (100% zoom)**: When introducing the page, showing full-table views, KPI card sets, or overall layouts.
   - **Focused Detail Zoom (125%–140%)**: When interacting with complex multi-field forms (e.g., Line item table, GST calculation breakups, Chart of Accounts tree nodes, Journal Entry debit/credit grids).
   - Pan smoothly with an ease-in-out transition; avoid abrupt jump-cuts inside the same form.
4. **On-Screen Callouts**:
   - Use clean, semi-translucent callout banners with dark navy background (`#0F172A`) and gold/amber accents (`#F59E0B`).
   - Highlight required fields, statutory warnings (e.g. "HSN Code is mandatory for B2B GST Invoices"), and keyboard shortcuts (e.g. `Ctrl + /` for Command Palette, `Alt + N` for New Record).

---

## 3. Audio & Narration Standards
- **Tone**: Calm, authoritative, crisp, professional, friendly, and instructive.
- **Audience**: Indian business owners, CFOs, chartered accountants, billing clerks, store managers, and system administrators.
- **Pacing**: 135–150 words per minute. Never rush through complex accounting concepts.
- **Terminology Accuracy**:
  - Always pronounce Indian financial terms accurately (e.g., *GSTIN* as "G-S-T-I-N", *HSN* as "H-S-N", *CGST/SGST/IGST*, *TDS*, *E-Way Bill*, *Inward/Outward Supply*).
  - Use exact terminology matching the Bill Aura UI buttons (e.g., "Save as Draft", "Approve & Send", "Record Payment", "Allocate Vouchers", "Reconcile Statement").
- **Audio Mix**:
  - Voiceover normalized to -16 LUFS (industry standard for instructional/educational video).
  - Clean noise gate, de-esser, and subtle parametric EQ for clarity.
  - No loud or distracting background music during operational demonstrations.

---

## 4. Subtitle (SRT) Standards
- Subtitles are formatted according to the standard SubRip (.srt) protocol:
  ```
  1
  00:00:01,000 --> 00:00:04,500
  Welcome to Bill Aura ERP. In this session, we will configure your organization.
  ```
- Maximum 37 characters per line, maximum 2 lines per subtitle card.
- Synchronized with voiceover speech onset with +/- 100ms precision.

---

## 5. Instructional Sequence Framework (5-Step Pedagogical Method)
Every module and page follows the strict 5-step operational training sequence:
1. **A. Introduce**: Page title, purpose, business problem solved, and exact route/navigation steps.
2. **B. Explain the Screen**: Key layout regions, KPI cards, table columns, default filters, and status tags.
3. **C. Demonstrate Every Control**: Walk through buttons, dropdown options, modal drawers, and form inputs.
4. **D. Explain the Outcome**: Show persisted record, voucher numbering, audit log, ledger impact, and downstream updates (e.g. stock, customer balance, P&L).
5. **E. Teach Recovery**: Explain common user mistakes, form validation errors, duplicate detection, and safe correction workflows.
