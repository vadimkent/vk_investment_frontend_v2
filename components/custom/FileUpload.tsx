"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import type { SDUIComponent } from "@/lib/types/sdui";
import { getIcon } from "@/lib/icon-registry";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const v = bytes / (1024 * 1024);
    return `${v % 1 === 0 ? v.toString() : v.toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    const v = bytes / 1024;
    return `${v % 1 === 0 ? v.toString() : v.toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function matchesAccept(file: File, accept: string): boolean {
  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();
  for (const t of tokens) {
    if (t.startsWith(".")) {
      if (name.endsWith(t)) return true;
    } else if (t.endsWith("/*")) {
      const prefix = t.slice(0, -1);
      if (mime.startsWith(prefix)) return true;
    } else if (mime === t) {
      return true;
    }
  }
  return false;
}

export function FileUploadComponent({
  component,
}: {
  component: SDUIComponent;
}) {
  const name = String(component.props.name);
  const label = component.props.label as string | undefined;
  const placeholder = component.props.placeholder as string | undefined;
  const hint = component.props.hint as string | undefined;
  const accept = component.props.accept as string | undefined;
  const maxSize = component.props.max_size_bytes as number | undefined;
  const errSize = component.props.error_message_size as string | undefined;
  const errFormat = component.props.error_message_format as string | undefined;
  const prefill = component.props.prefill_filename as string | undefined;
  const reattach = component.props.reattach_hint as string | undefined;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const [filename, setFilename] = useState<string | null>(prefill ?? null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setHasFile(false);
    setFilename(prefill ?? null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [prefill]);

  const Icon = getIcon("upload");

  function validate(file: File): string | null {
    if (accept && !matchesAccept(file, accept)) {
      return errFormat ?? "Unsupported file format.";
    }
    if (maxSize != null && file.size > maxSize) {
      const limit = formatBytes(maxSize);
      return (errSize ?? "File exceeds the {limit} limit.").replace(
        "{limit}",
        limit,
      );
    }
    return null;
  }

  function clearInputFiles() {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    inputRef.current.files = dt.files;
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const err = validate(file);
    if (err) {
      clearInputFiles();
      setHasFile(false);
      setFilename(prefill ?? null);
      setError(err);
      return;
    }
    if (inputRef.current && inputRef.current.files !== files) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
    }
    setHasFile(true);
    setFilename(file.name);
    setError(null);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }
  function onClick() {
    inputRef.current?.click();
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  const showSelected = hasFile || (!!prefill && !hasFile);
  const showReattach = !!prefill && !hasFile && !!reattach;

  const borderClass = error
    ? "border-status-error"
    : dragOver
      ? "border-accent-primary"
      : "border-border-input";

  return (
    <div data-sdui-id={component.id}>
      {label && (
        <label className="block text-sm font-medium text-content-secondary mb-1">
          {label}
        </label>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 h-40 px-4 border-2 border-dashed ${borderClass} rounded cursor-pointer hover:bg-surface-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 transition-colors`}
      >
        {Icon && <Icon className="w-6 h-6 text-content-muted" />}
        <div className="text-sm text-center max-w-full px-2 min-w-0">
          {showSelected ? (
            <span
              className="font-mono text-content-primary truncate block max-w-full"
              title={filename ?? undefined}
            >
              {filename}
            </span>
          ) : (
            <span className="text-content-secondary">{placeholder}</span>
          )}
        </div>
        {showReattach && (
          <span className="text-xs text-content-muted">{reattach}</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.currentTarget.files)}
      />
      {error ? (
        <p className="mt-1 text-xs text-status-error">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-content-muted">{hint}</p>
      ) : null}
    </div>
  );
}
