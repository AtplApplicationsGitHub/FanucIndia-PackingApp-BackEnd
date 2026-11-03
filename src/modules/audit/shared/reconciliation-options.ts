export interface ReconOption {
  value: string;
  label: string;
}

export const RECON_DECISION_OPTIONS: readonly ReconOption[] = [
  { value: 'CORRECT_SYSTEM_RECORD', label: 'Accept physical count (correct SAP / system record)' },
  { value: 'CORRECT_PHYSICAL_STOCK', label: 'Keep system record (correct physical stock)' },
];

export const RECON_SAP_ACTION_OPTIONS: readonly ReconOption[] = [
  { value: 'NONE', label: 'No SAP action' },
  { value: 'FLAG_FOR_ADJUSTMENT', label: 'Flag for SAP adjustment' },
];

export const RECON_DEFAULT_SAP_ACTION = 'NONE';

export const RECON_DECISION_VALUES = RECON_DECISION_OPTIONS.map((option) => option.value);
export const RECON_SAP_ACTION_VALUES = RECON_SAP_ACTION_OPTIONS.map((option) => option.value);

const labelOf = (options: readonly ReconOption[], value: string | null | undefined) =>
  value ? (options.find((option) => option.value === value)?.label ?? value) : '';

export const reconDecisionLabel = (value: string | null | undefined) =>
  labelOf(RECON_DECISION_OPTIONS, value);

export const reconSapActionLabel = (value: string | null | undefined) =>
  labelOf(RECON_SAP_ACTION_OPTIONS, value);
