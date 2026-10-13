import { DragPayload, SlotAddress } from './models';

const MIME_TYPE = 'application/x-tft-builder';

export function writeDrag(event: DragEvent, payload: DragPayload): void {
  if (!event.dataTransfer) return;
  const json = JSON.stringify(payload);
  event.dataTransfer.setData(MIME_TYPE, json);
  event.dataTransfer.setData('text/plain', json);
  event.dataTransfer.effectAllowed = payload.kind === 'placement' ? 'move' : 'copy';
}

export function isSlotAddress(value: unknown): value is SlotAddress {
  if (!value || typeof value !== 'object') return false;
  const slot = value as SlotAddress;
  const capacity = slot.zone === 'board' ? 28 : slot.zone === 'bench' ? 9 : 0;
  return Number.isInteger(slot.index) && slot.index >= 0 && slot.index < capacity;
}

export function readDrag(event: DragEvent): DragPayload | null {
  try {
    const json = event.dataTransfer?.getData(MIME_TYPE)
      || event.dataTransfer?.getData('text/plain');
    if (!json) return null;
    const data = JSON.parse(json) as DragPayload;
    if (data.kind === 'unit' && Number.isInteger(data.unit_id)) return data;
    if (data.kind === 'item' && typeof data.item_id === 'string') return data;
    if (data.kind === 'placement' && isSlotAddress(data.from)) return data;
  } catch { /* Ignore external or malformed drag data. */ }
  return null;
}
