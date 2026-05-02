export type TimelineState = 'completed' | 'pending' | 'upcoming';

export interface TimelineNode {
  key: string;
  label: string;
  state: TimelineState;
}

export function calculateStatusHubTimeline(order: any): TimelineNode[] {
  // Extract completed statuses from the SO_Status_Stepper table relation
  const stepperStatuses = order.statusStepper?.map((s: any) => s.status) || [];
  const hasStatus = (status: string) => stepperStatuses.includes(status);

  // Core Milestone Checks based on SO SEARCH stepper statuses
  const isIssued = hasStatus('Issued');
  const isPacked = hasStatus('Packed');
  const isReadyForDispatch = hasStatus('Ready for Dispatch');
  const isDispatched = hasStatus('Dispatched') || order.status === 'Dispatched';

  // 1. ERP Timeline
  const erpCompleted = order.isErpImported === 1;
  const erpState: TimelineState = erpCompleted ? 'completed' : 'pending';

  // 2. R105 Timeline (Priority assigned)
  const r105Completed = order.priority != null;
  const r105State: TimelineState = r105Completed ? 'completed' : 'pending';

  // 3. W105 Timeline
  const w105Completed = isIssued;
  const w105State: TimelineState = w105Completed 
    ? 'completed' 
    : (r105Completed ? 'pending' : 'upcoming');

  // 4. F105 Timeline
  const f105Completed = isPacked;
  const f105State: TimelineState = f105Completed 
    ? 'completed' 
    : (w105Completed ? 'pending' : 'upcoming');

  // 5. Storage Timeline (BUG FIX: Remains completed if Dispatched, even if fgLocation is null)
  const storageCompleted = (order.fgLocation != null) || isDispatched;
  const storageState: TimelineState = storageCompleted 
    ? 'completed' 
    : (f105Completed ? 'pending' : 'upcoming');

  // 6. Label Print Timeline (Respects the boolean passed from the service OR the stepper status)
  const labelPrintCompleted = isReadyForDispatch || order.isCustomerLabelPrinted === true;
  const labelPrintState: TimelineState = labelPrintCompleted 
    ? 'completed' 
    : (storageCompleted ? 'pending' : 'upcoming');

  // 7. Dispatched Timeline
  const dispatchedState: TimelineState = isDispatched 
    ? 'completed' 
    : (labelPrintCompleted ? 'pending' : 'upcoming');

  return [
    { key: 'ERP', label: 'ERP', state: erpState },
    { key: 'R105', label: 'R105', state: r105State },
    { key: 'W105', label: 'W105', state: w105State },
    { key: 'F105', label: 'F105', state: f105State },
    { key: 'Storage', label: 'Storage', state: storageState },
    { key: 'LabelPrint', label: 'Label Print', state: labelPrintState },
    { key: 'Dispatched', label: 'Dispatched', state: dispatchedState },
  ];
}