"use client";

import { useState } from "react";

/* 1,000 단위 쉼표를 자동으로 넣는 숫자 입력창.
   서버 액션의 num()이 쉼표를 제거하고 파싱하므로 그대로 제출해도 안전하다. */
function addCommas(s: string): string {
  const raw = s.replace(/[^\d.-]/g, "");
  if (raw === "" || raw === "-") return raw;
  const neg = raw.startsWith("-");
  const [intPart, ...decParts] = raw.replace("-", "").split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const dec = decParts.length ? "." + decParts.join("") : "";
  return (neg ? "-" : "") + grouped + dec;
}

export function NumberInput({
  name,
  defaultValue,
  className = "",
  placeholder,
  required = false,
}: {
  name: string;
  defaultValue?: number | string | null;
  className?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(
    defaultValue != null && defaultValue !== "" ? addCommas(String(defaultValue)) : ""
  );
  return (
    <input
      name={name}
      value={value}
      onChange={(e) => setValue(addCommas(e.target.value))}
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      required={required}
    />
  );
}
