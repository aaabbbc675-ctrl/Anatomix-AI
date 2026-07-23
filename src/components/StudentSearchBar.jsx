import React, { useEffect, useRef, useState } from "react";

export default function StudentSearchBar({ onSearch }) {
  const [query, setQuery] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(query.trim());
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, onSearch]);

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="جستجو بر اساس نام یا کد ملی..."
      style={{
        flex: 1,
        padding: "0.6rem 0.9rem",
        borderRadius: 8,
        border: "1px solid #ccc",
        fontSize: "1rem",
      }}
    />
  );
}
