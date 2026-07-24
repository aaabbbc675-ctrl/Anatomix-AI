// دیالوگ بومی ذخیره‌ی فایل — برای ابزار ورودی دستی (تست موتورها قبل از آماده
// شدن دستگاه واقعی). طبق تصمیم صریح: کاربر خودش مسیر/اسم فایل را با دیالوگ
// بومی الکترون انتخاب می‌کند؛ اینجا هیچ فرضی درباره‌ی مسیر ثابت زیر userData
// یا اتصال به رکورد Students.device_json_ref گرفته نشده — این ابزار مستقل
// از آن جدول است، فقط الگوی shape خروجی‌اش را دنبال می‌کند.
const { ipcMain, dialog } = require("electron");
const fs = require("fs");

function registerFileDialogHandlers() {
  ipcMain.handle("dialog:saveJsonFile", async (event, { defaultFileName, data }) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultFileName,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true, filePath: null };
    }

    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), "utf8");
    return { canceled: false, filePath: result.filePath };
  });
}

module.exports = { registerFileDialogHandlers };
