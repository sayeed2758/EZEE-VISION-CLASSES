# EZEE VISION CHAMPUA — Phase 2

Premium app-first Student Management module built on the Phase 1 foundation.

## Phase 2 scope
- Official EZEE VISION logo integrated
- Student dashboard/list with search and filters
- Add student flow with generated Student ID
- Edit student flow
- Delete student flow with confirmation
- Student detail/profile screen
- Class and batch assignment
- Fee status + attendance snapshot
- Active/inactive records
- Local persistence via localStorage
- Dashboard stats linked to student records
- Mobile-first app UI designed for later APK conversion
- Dark mode preserved

## Data
The student module currently uses localStorage (`ezee_students`) intentionally. Firebase/cloud sync can be introduced after the core modules are polished.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
