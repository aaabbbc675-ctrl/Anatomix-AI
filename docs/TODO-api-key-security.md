# TODO — امنیت کلید API (Claude/Anthropic) در Commit 9

## ⚠️ ریسک

`engine/talentId/file8_psychProfileExtractor.js` (بخش ۹.۳ سند معماری استعدادیابی) نیاز به
فراخوانی Claude API دارد. اگر کد فراخوانی واقعی (`fetch` + کلید API) داخل `engine/talentId/`
یا هر مسیری که ممکن است Vite برای renderer بسته‌بندی کند نوشته شود، کلید API به‌صورت بالقوه
از طریق DevTools/inspect در دسترس کاربر نهایی (مربی/باشگاه که به این اپ دسترسی فیزیکی دارد)
قرار می‌گیرد — یک ریسک امنیتی واقعی، نه نظری.

## راه‌حل تاییدشده در Commit 9

`extractPsychProfile(chatConversation, { apiCaller })` در `file8_psychProfileExtractor.js`
**هیچ پیاده‌سازی واقعی fetch ندارد** — `apiCaller` یک پارامتر اجباری تزریق‌شده است (بدون آن
`TalentIdError('MISSING_API_CALLER')` می‌دهد). این با اصل بخش ۱.۴ سند («DB access و file IO
فقط در لایه‌ی Repository، خارج از engine») سازگار است — API call هم همان قاعده را می‌گیرد.

## الگوی موجود که باید دنبال شود

پروژه از قبل دقیقاً همین الگو را برای `better-sqlite3` دارد (که حساسیت مشابهی دارد):

- `electron/main.js`: `webPreferences: { contextIsolation: true, nodeIntegration: false }` +
  `registerIpcHandlers(db)` در main process.
- `electron/preload.js`: `contextBridge.exposeInMainWorld("anatomixDB", { students: { create:
  (input) => ipcRenderer.invoke("db:students:create", input), ... } })`.

## نقشه‌ی راه پیاده‌سازی واقعی (خارج از scope Commit 9)

1. یک فایل جدید در main-process context (مثلاً `electron/services/claudeApiClient.js`) که
   `fetch` واقعی به `https://api.anthropic.com/v1/messages` می‌زند و `process.env.ANTHROPIC_API_KEY`
   را فقط همان‌جا می‌خواند.
2. یک IPC handler جدید (مثلاً `talentId:extractPsychProfile`) در `electron/main.js`، هم‌الگوی
   `registerIpcHandlers`.
3. Expose کردن آن در `electron/preload.js`:
   `contextBridge.exposeInMainWorld("anatomixTalentId", { extractPsychProfile: (conversation) =>
   ipcRenderer.invoke("talentId:extractPsychProfile", conversation) })`.
4. کد renderer (React UI) در Commit 21 (کامپوننت‌های UI) باید `window.anatomixTalentId.extractPsychProfile`
   را صدا بزند، نه مستقیم `engine/talentId/file8`.

## تا این کار انجام نشود

- `engine/talentId/file8_psychProfileExtractor.js` بدون یک `apiCaller` واقعی که خارج از این
  Commit تأمین شود (مثلاً دستی در یک اسکریپت توسعه) عملاً غیرقابل‌اجراست — که عمدی است.
- تست‌های `scripts/test-engine-talentid-file8-psych.js` فقط با `apiCaller` جعلی (mock) اجرا
  می‌شوند؛ هیچ فراخوانی API واقعی در مسیر تست خودکار پروژه وجود ندارد.
- یک اسکریپت manual-test زنده (با کلید واقعی، برای smoke test دستی طبق قانون
  `electron:dev` بخش ۲۴.۳ سند) عمداً در این Commit نوشته نشد، چون بدون IPC واقعی جای امنی
  برایش نداریم — بعد از پیاده‌سازی بندهای بالا اضافه می‌شود.
