import React, { useState } from "react";
import { db } from "../store/db";
import "./Modal.css";

export default function NewStudentModal({ onClose, onCreated }) {
  const [fullName, setFullName] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("نام و نام خانوادگی الزامی است.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const student = await db.students.create({
        full_name: fullName.trim(),
        national_code: nationalCode.trim() || null,
        phone: phone.trim() || null,
      });
      onCreated(student);
    } catch (err) {
      setError(err.message || "خطا در ثبت شاگرد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>افزودن شاگرد جدید</h2>
        <form onSubmit={handleSubmit}>
          <label>
            نام و نام خانوادگی *
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
          </label>
          <label>
            کد ملی
            <input value={nationalCode} onChange={(e) => setNationalCode(e.target.value)} />
          </label>
          <label>
            تلفن
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          {error && <div className="modal-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={saving}>
              انصراف
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "در حال ثبت..." : "ثبت شاگرد"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
