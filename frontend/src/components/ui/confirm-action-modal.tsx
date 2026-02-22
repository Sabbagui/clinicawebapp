'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from './dialog';
import { Button } from './button';

interface ConfirmDetail {
  label: string;
  value: string;
}

interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  description?: string;
  details?: ConfirmDetail[];
  content?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export function ConfirmActionModal({
  open,
  title,
  description,
  details = [],
  content,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
  isLoading = false,
  error,
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title={title} description={description}>
      <div className="space-y-4">
        {details.length > 0 && (
          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            {details.map((detail) => (
              <div
                key={detail.label}
                className="grid grid-cols-[110px_1fr] gap-2 text-sm"
              >
                <span className="text-muted-foreground">{detail.label}</span>
                <span className="font-medium">{detail.value}</span>
              </div>
            ))}
          </div>
        )}
        {content}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Esta ação ficará registrada na auditoria.</span>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processando...' : confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
