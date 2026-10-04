# EZEE VISION CHAMPUA — Phase 3

Premium app-first Attendance Pro module built on the Phase 2 Student Management foundation.

## Phase 3 scope
- Official EZEE VISION logo used throughout the app and reports
- Class → Batch → Active Students workflow
- One attendance status per student per day
- Present / Absent / Late statuses with clear status icons
- Teacher + Admin attendance area (current demo session)
- Date-based daily attendance with editable past records
- Explicit Save flow with unsaved/saved state
- Daily summary: Students, Present, Absent, Late, Not marked
- Professional daily attendance export as phone-friendly PNG
- A4 portrait Print / Save PDF report
- Share report using the device share sheet when supported
- Dedicated WhatsApp summary action with recognizable WhatsApp icon
- Monthly attendance report with class + batch + month selection
- Monthly totals: total classes, present, absent, late, average attendance
- Student-wise monthly attendance table
- Date-wise monthly attendance calendar
- Attendance-only monthly export for class/batch parent groups
- All attendance data saved in localStorage under `ezee_attendance`
- Existing Student Management retained; attendance percentage is now calculated from real attendance records
- Sunday is never auto-blocked or auto-excluded; it can be recorded when a doubt session/test is held
- App-first responsive UI designed for later APK conversion
- Dark mode preserved

## Attendance data rules
- A record is keyed by `date + class + batch` and maps each student ID to exactly one status.
- A monthly class session is counted only when attendance has been saved for that selected class and batch on that date.
- Attendance percentage is calculated as `(Present + Late) / Total recorded attendance`.

## Export
Daily and monthly reports can be exported as PNG. Print uses A4 portrait settings and can be saved as PDF from the Android/browser print dialog.

## Data
The project currently uses localStorage intentionally while the UI and workflows are being polished. Firebase/cloud sync can be introduced after the core modules are complete.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

> Note: dependency installation could not be completed in the build environment during this phase, so a local `npm run build` should be run after installing dependencies.
