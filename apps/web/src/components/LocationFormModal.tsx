import React, { useState } from "react";
import { CreateLocationInput, UpdateLocationInput } from "@stocksense/schemas";
import { FormGroup } from "./FormGroup";
import { X, MapPin } from "lucide-react";

interface LocationFormModalProps {
  location: any | null; // null for Create
  warehouses: Array<{ id: string; name: string; shortCode: string }>;
  onClose: () => void;
  onSubmitCreate: (data: CreateLocationInput) => Promise<void>;
  onSubmitUpdate: (data: UpdateLocationInput) => Promise<void>;
}

export const LocationFormModal: React.FC<LocationFormModalProps> = ({
  location,
  warehouses,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isNew = !location;

  const [name, setName] = useState(location?.name || "");
  const [shortCode, setShortCode] = useState(location?.shortCode || "");
  const [warehouseId, setWarehouseId] = useState(
    location?.warehouseId || warehouses[0]?.id || ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Location Name is required.");
      return;
    }
    if (!shortCode.trim()) {
      setError("Short Code is required.");
      return;
    }
    if (!warehouseId) {
      setError("Parent Warehouse must be selected.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (isNew) {
        await onSubmitCreate({
          name: name.trim(),
          shortCode: shortCode.trim().toUpperCase(),
          warehouseId,
        });
      } else {
        await onSubmitUpdate({
          id: location.id,
          name: name.trim(),
          shortCode: shortCode.trim().toUpperCase(),
          warehouseId,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save location.");
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
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-primary">
                {isNew ? "Create Internal Location" : `Edit Location: ${location.name}`}
              </h2>
              <p className="text-xs text-primary-muted mt-0.5">
                {isNew
                  ? "Define an aisle, rack, shelf, or bin inside a warehouse"
                  : "Update location details or warehouse association"}
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
          <div className="flex flex-col space-y-1 text-left">
            <label
              htmlFor="loc-warehouse"
              className="text-[13px] font-medium text-primary-muted select-none"
            >
              Parent Warehouse *
            </label>
            <select
              id="loc-warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="h-9 px-3 text-sm text-primary bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            >
              {warehouses.length === 0 ? (
                <option value="" disabled>No warehouses configured</option>
              ) : (
                warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.shortCode})
                  </option>
                ))
              )}
            </select>
          </div>

          <FormGroup
            id="loc-name"
            label="Location Name *"
            placeholder="e.g. Zone A - Shelf 01"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <FormGroup
            id="loc-code"
            label="Short Code / Bin Tag * (max 10 chars)"
            placeholder="e.g. LOC-A1"
            maxLength={10}
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value.toUpperCase())}
            required
          />

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
              {isSubmitting ? "Saving..." : isNew ? "Create Location" : "Update Location"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
