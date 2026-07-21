import React from "react";

export default function App() {
  const isElectron = typeof window !== "undefined" && window.anatomixEnv?.isElectron === true;

  return (
    <div style={{ fontFamily: "Tahoma, sans-serif", padding: "2rem" }}>
      <h1>Anatomix AI — اسکلت پروژه</h1>
      <p>
        محیط اجرا: <strong>{isElectron ? "Electron" : "مرورگر (npm run dev)"}</strong>
      </p>
      <p>این صفحه فقط برای تأیید صحت اسکلت پروژه است؛ داشبورد واقعی در مرحله‌ی بعد ساخته می‌شود.</p>
    </div>
  );
}
