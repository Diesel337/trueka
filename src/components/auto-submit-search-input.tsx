"use client";

import { useRef } from "react";

type AutoSubmitSearchInputProps = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
};

export function AutoSubmitSearchInput({
  name,
  defaultValue,
  placeholder,
  className,
}: AutoSubmitSearchInputProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <input
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={className}
      onChange={(event) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        const form = event.currentTarget.form;

        timeoutRef.current = setTimeout(() => {
          form?.requestSubmit();
        }, 350);
      }}
    />
  );
}
