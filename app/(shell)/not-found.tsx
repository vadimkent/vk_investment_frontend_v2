import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <FileQuestion className="size-16 text-content-muted" strokeWidth={1.5} />
      <h1 className="text-2xl font-bold text-content-primary">
        Page not found
      </h1>
      <p className="text-sm text-content-muted max-w-md">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-2 rounded bg-accent-primary px-4 py-2 text-base text-content-on-accent"
      >
        Go to home
      </Link>
    </div>
  );
}
