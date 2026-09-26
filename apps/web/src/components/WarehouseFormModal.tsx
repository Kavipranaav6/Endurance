import React, { useState } from "react";
import { CreateWarehouseInput, UpdateWarehouseInput } from "@stocksense/schemas";
import { FormGroup } from "./FormGroup";
import { X, Building2 } from "lucide-react";

interface WarehouseFormModalProps {
  warehouse: any | null; // null for Create
  onClose: () => void;
  onSubmitCreate: (data: CreateWarehouseInput) => Promise<void>;
  onSubmitUpdate: (data: UpdateWarehouseInput) => Promise<void>;
}

export const WarehouseFormModal: React.FC<WarehouseFormModalProps> = ({
  warehouse,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isNew = !warehouse;

  const [name, setName] = useState(warehouse?.name || "");
  const [shortCode, setShortCode] = useState(warehouse?.shortCode || "");
  const [address, setAddress] = useState(warehouse?.address || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Warehouse Name is required.");
      return;
    }
    if (!shortCode.trim()) {
      setError("Short Code is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (isNew) {
        await onSubmitCreate({
          name: name.trim(),
          shortCode: shortCode.trim().toUpperCase(),
          address: address.trim() || undefined,
        });
      } else {
        await onSubmitUpdate({
          id: warehouse.id,
          name: name.trim(),
          shortCode: shortCode.trim().toUpperCase(),
          address: address.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save warehouse.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-border rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-accent/10 text-accent border border-accent/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-primary">
                {isNew ? "Create New Warehouse" : `Edit Warehouse: ${warehouse.name}`}
              </h2>
              <p className="text-xs text-primary-muted mt-0.5">
                {isNew
                  ? "Define a physical facility or central distribution hub"
                  : "Update warehouse identity and address"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-primary-muted hover:text-primary rounded hover:bg-background transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded bg-red-50 border border-status-late/30 text-status-late text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormGroup
            id="wh-name"
            label="Warehouse Name *"
            placeholder="e.g. Main Distribution Hub"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <FormGroup
            id="wh-code"
            label="Short Code * (max 10 chars)"
            placeholder="e.g. WH-MAIN"
            maxLength={10}
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value.toUpperCase())}
            required
          />

          <div className="flex flex-col space-y-1 text-left">
            <label
              htmlFor="wh-address"
              className="text-[13px] font-medium text-primary-muted select-none"
            >
              Facility Address / Logistics Note
            </label>
            <textarea
              id="wh-address"
              rows={3}
              placeholder="e.g. Building 4, Logistics Park, Sector 9"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="px-3 py-2 text-sm text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors resize-none"
            />
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-primary-muted hover:text-primary border border-border rounded hover:bg-background-subtle transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? "Saving..." : isNew ? "Create Warehouse" : "Update Warehouse"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
