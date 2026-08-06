import React from 'react';
import { Check, Upload } from 'lucide-react';
import { Button } from '@/src/components/controls';
import type { UploadStatus } from '@/src/features/products/types/registration';
import { Text } from '@/src/components/data';

/**
 * One KYC document slot.
 *
 * Lived at the bottom of the 724-line form file. It is a genuine component
 * with its own state machine (not uploaded / selected / uploading / failed /
 * uploaded), so it belongs in its own file.
 */
export function DocumentUploadSlot({
  label,
  pending,
  existing,
  onFileSelect,
  accept = 'image/*,application/pdf',
}: {
  docKey: string;
  label: string;
  pending?: { fileName: string; fileSize: string; status: UploadStatus; error?: string };
  // `status` is optional here: the Zod `.default('Pending')` only applies when
  // the form is parsed on submit, and this reads the in-progress value.
  /**
   * A document already on the account.
   *
   * `hasFile` is what decides, not `fileUrl`. The server stopped sending object
   * paths — they published the private bucket's layout — so a slot that looked
   * for a URL reported "Not uploaded" for every certificate a supplier had
   * already provided, and told the operator to upload all four again.
   *
   * `fileUrl` remains for the LOCAL case: a file uploaded in this session,
   * before any save.
   */
  existing?: { name: string; fileUrl?: string; hasFile?: boolean; status?: string };
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * What the file picker offers. Defaults to images and PDFs, because scanned
   * paperwork is usually a PDF.
   *
   * A shop PHOTO passes `image/*`: the server refuses a PDF for that purpose,
   * and offering one in the picker only sets up a rejection the operator could
   * not have predicted.
   */
  accept?: string;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  // `mock-gcs://` is the local emulator's placeholder — a path that exists in
  // dev and addresses nothing, so it must not read as a stored file.
  const hasServerFile =
    existing?.hasFile === true ||
    Boolean(existing?.fileUrl && !existing.fileUrl.startsWith('mock-gcs://'));

  return (
    <div className="p-4 rounded-xl border border-rule-subtle bg-sheet-2 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-ink">{label}</h4>
          <Text as="p" variant="caption">PDF or high-res Image format</Text>
        </div>
        {pending?.status === 'uploading' ? (
          <span className="text-xs text-brass font-bold">Uploading…</span>
        ) : pending?.status === 'error' ? (
          <span className="text-xs text-bad font-bold">Upload failed</span>
        ) : pending?.status === 'done' || hasServerFile ? (
          <span className="text-xs text-ok font-bold flex items-center gap-0.5">
            <Check className="w-3.5 h-3.5" /> Uploaded
          </span>
        ) : pending ? (
          <span className="text-xs text-brass font-bold flex items-center gap-0.5">
            <Check className="w-3.5 h-3.5" /> Selected
          </span>
        ) : (
          <Text variant="caption">Not uploaded</Text>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelect}
        accept={accept}
        className="hidden"
      />
      {pending && (
        <div className="p-3 bg-sheet rounded-lg border flex flex-col gap-2 shadow-xs mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ink-2 truncate max-w-[180px]">
              {pending.fileName}
            </span>
            <span className="text-ink-3">{pending.fileSize}</span>
          </div>
          {pending.status === 'error' && pending.error && (
            <p className="text-xs text-bad">{pending.error}</p>
          )}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        iconLeft={Upload}
        onClick={() => fileInputRef.current?.click()}
        className="w-full"
      >
        Select File
      </Button>
    </div>
  );
}

