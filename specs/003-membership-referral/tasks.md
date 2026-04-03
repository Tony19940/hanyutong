# Tasks: Membership Referral

**Input**: Design documents from `/specs/003-membership-referral/`  
**Prerequisites**: `spec.md`, `plan.md`  
**Status Note**: This task list reflects the implemented delivery slice for feature `003-membership-referral`.

## Phase 1: Backend Foundation

- [x] T001 Extend `D:\CodeX\hanyutong-main\server\db.js` with membership, referral, entitlement-event, and dated-key schema changes
- [x] T002 Add membership helpers in `D:\CodeX\hanyutong-main\server\services\membershipService.js`
- [x] T003 Add invite/referral helpers in `D:\CodeX\hanyutong-main\server\services\referralService.js`
- [x] T004 Update `D:\CodeX\hanyutong-main\server\middleware\auth.js` to attach membership and enforce Premium-only access

## Phase 2: API Contracts

- [x] T005 Add trial, verify, and month-card redemption behavior in `D:\CodeX\hanyutong-main\server\routes\auth.js`
- [x] T006 Add membership and invite payloads to `D:\CodeX\hanyutong-main\server\routes\user.js`
- [x] T007 Gate quiz and dialogue in `D:\CodeX\hanyutong-main\server\routes\words.js` and `D:\CodeX\hanyutong-main\server\routes\dialogue.js`
- [x] T008 Replace permanent-key admin operations with dated-key lifecycle support in `D:\CodeX\hanyutong-main\server\routes\admin.js`

## Phase 3: Frontend Entry & Membership UX

- [x] T009 Extend `D:\CodeX\hanyutong-main\src\utils\api.js` with trial, invite, and key-extension calls
- [x] T010 Refactor auth/bootstrap state in `D:\CodeX\hanyutong-main\src\App.jsx`
- [x] T011 Replace the old login gate with trial-first entry UI in `D:\CodeX\hanyutong-main\src\components\LoginPage.jsx`
- [x] T012 Add Premium lock screen UX in `D:\CodeX\hanyutong-main\src\components\MembershipGate.jsx`
- [x] T013 Update `D:\CodeX\hanyutong-main\src\components\TabBar.jsx` to indicate locked Premium tabs

## Phase 4: Me / Invite / Share UX

- [x] T014 Update `D:\CodeX\hanyutong-main\src\components\ProfilePage.jsx` with membership validity, invite card, and invite-first CTA
- [x] T015 Replace invite/share modal behavior in `D:\CodeX\hanyutong-main\src\components\ShareModal.jsx`
- [x] T016 Keep word-card access free while routing quiz requests through Premium mode in `D:\CodeX\hanyutong-main\src\components\HomePage.jsx` and `D:\CodeX\hanyutong-main\src\components\LegacyQuizPage.jsx`

## Phase 5: Admin Frontend

- [x] T017 Update `D:\CodeX\hanyutong-main\src\components\AdminPage.jsx` for dated-key generation, filtering, extending, expiring, and deleting

## Phase 6: Localization & Regression Coverage

- [x] T018 Add membership/invite/share copy to:
  - `D:\CodeX\hanyutong-main\src\i18n\dictionaries\zh-CN.json`
  - `D:\CodeX\hanyutong-main\src\i18n\dictionaries\en.json`
  - `D:\CodeX\hanyutong-main\src\i18n\dictionaries\km.json`
- [x] T019 Update server regression coverage in `D:\CodeX\hanyutong-main\tests\server.spec.js`
- [x] T020 Update entry/admin UI coverage in:
  - `D:\CodeX\hanyutong-main\tests\LoginPage.spec.jsx`
  - `D:\CodeX\hanyutong-main\tests\AdminPage.spec.jsx`
- [x] T021 Run verification:
  - `npm test`
  - `npm run build`
