"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type DropdownOption = {
  value: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export type CustomDropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: Array<DropdownOption | string>;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "filter";
  align?: "left" | "right";
  ariaLabel?: string;
};

export function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  style,
  className = "",
  id,
  size = "md",
  variant = "default",
  align = "left",
  ariaLabel,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownId = useId();
  const elementId = id || dropdownId;

  // Normalize options to DropdownOption
  const normalizedOptions: DropdownOption[] = useMemo(() => {
    return options.map((opt) =>
      typeof opt === "string" ? { value: opt, label: opt } : opt
    );
  }, [options]);

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optVal: string) => {
    onChange(optVal);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const paddingMap = {
    sm: "5px 9px",
    md: "8px 11px",
    lg: "10px 14px",
  };
  const fontSizeMap = {
    sm: "12px",
    md: "13px",
    lg: "14px",
  };
  const chevronSizeMap = {
    sm: 13,
    md: 15,
    lg: 16,
  };

  return (
    <div
      ref={containerRef}
      className={`custom-dropdown-container ${className}`}
      style={{
        position: "relative",
        display: "inline-block",
        width: style?.width || "100%",
        ...style,
      }}
    >
      <button
        ref={buttonRef}
        id={elementId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || selectedOption?.label || placeholder}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: paddingMap[size],
          fontSize: fontSizeMap[size],
          fontWeight: variant === "filter" ? 700 : 500,
          color: disabled ? "var(--muted)" : "var(--text)",
          background: "var(--surface)",
          border: isOpen
            ? "1px solid var(--primary)"
            : "1px solid var(--border)",
          borderRadius: "7px",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: isOpen ? "2px solid var(--tint)" : "none",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          textAlign: "left",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {selectedOption?.icon}
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0,
          }}
        >
          {selectedOption?.badge && (
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: "4px",
                background: selectedOption.badgeColor || "var(--tint)",
                color: selectedOption.badgeColor ? "#fff" : "var(--primary)",
              }}
            >
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            size={chevronSizeMap[size]}
            style={{
              color: "var(--muted)",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.18s ease",
            }}
          />
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            [align === "right" ? "right" : "left"]: 0,
            minWidth: "100%",
            zIndex: 1050,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow:
              "0 8px 24px rgba(15, 46, 41, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)",
            maxHeight: "240px",
            overflowY: "auto",
            padding: "4px",
          }}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                onClick={() => !opt.disabled && handleSelect(opt.value)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  padding: "7px 10px",
                  fontSize: fontSizeMap[size],
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected
                    ? "var(--primary)"
                    : opt.disabled
                    ? "var(--muted)"
                    : "var(--text)",
                  background: isSelected ? "var(--tint)" : "transparent",
                  border: "none",
                  borderRadius: "5px",
                  cursor: opt.disabled ? "not-allowed" : "pointer",
                  textAlign: "left",
                  transition: "background 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected && !opt.disabled) {
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(31, 77, 70, 0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected && !opt.disabled) {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                  }}
                >
                  {opt.badge && (
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: "4px",
                        background: opt.badgeColor || "var(--tint)",
                        color: opt.badgeColor ? "#fff" : "var(--primary)",
                      }}
                    >
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && (
                    <Check
                      size={14}
                      style={{ color: "var(--primary)", flexShrink: 0 }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
