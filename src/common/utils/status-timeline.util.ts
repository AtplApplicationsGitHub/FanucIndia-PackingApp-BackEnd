export type TimelineState = 'completed' | 'pending' | 'upcoming';

export interface TimelineNode {
  key: string;
  label: string;
  state: TimelineState;
}

export function calculateStatusHubTimeline(order: any): TimelineNode[] {
  const statusStepper = Array.isArray(order.statusStepper)
    ? order.statusStepper
    : [];

  const hasCompletedStatus = (status: string): boolean => {
    return statusStepper.some(
      (step: any) =>
        String(step.status ?? '').toLowerCase() === status.toLowerCase() &&
        step.createdDateTime != null,
    );
  };

  const erpCompleted = order.isErpImported === 1 || order.isErpImported === true;
  const r105Completed = order.priority !== null && order.priority !== undefined;
  const w105Completed = hasCompletedStatus('Issued');
  const f105Completed = hasCompletedStatus('Packed');
  const storageCompleted = hasCompletedStatus('WIP Storage');
  const labelPrintCompleted = hasCompletedStatus('Ready for Dispatch');
  const dispatchedCompleted = hasCompletedStatus('Dispatched');

  return [
    {
      key: 'ERP',
      label: 'ERP',
      state: erpCompleted ? 'completed' : 'pending',
    },
    {
      key: 'R105',
      label: 'R105',
      state: r105Completed ? 'completed' : erpCompleted ? 'pending' : 'upcoming',
    },
    {
      key: 'W105',
      label: 'W105',
      state: w105Completed ? 'completed' : r105Completed ? 'pending' : 'upcoming',
    },
    {
      key: 'F105',
      label: 'F105',
      state: f105Completed ? 'completed' : w105Completed ? 'pending' : 'upcoming',
    },
    {
      key: 'Storage',
      label: 'Storage',
      state: storageCompleted ? 'completed' : f105Completed ? 'pending' : 'upcoming',
    },
    {
      key: 'LabelPrint',
      label: 'Label Print',
      state: labelPrintCompleted ? 'completed' : storageCompleted ? 'pending' : 'upcoming',
    },
    {
      key: 'Dispatched',
      label: 'Dispatched',
      state: dispatchedCompleted ? 'completed' : labelPrintCompleted ? 'pending' : 'upcoming',
    },
  ];
}