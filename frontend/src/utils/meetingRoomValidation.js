export function normalizeRoomName(name) {
  return name?.trim().toLowerCase() ?? '';
}

export function normalizeRoomFloor(floor) {
  return floor?.trim().toLowerCase() ?? '';
}

export function sanitizeFloorInput(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function handleFloorKeyDown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const allowedKeys = new Set([
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
  ]);
  if (allowedKeys.has(event.key)) return;
  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
}

export function mergeFloorPaste(currentValue, pastedText, selectionStart, selectionEnd) {
  const sanitized = sanitizeFloorInput(pastedText);
  const start = selectionStart ?? currentValue.length;
  const end = selectionEnd ?? currentValue.length;
  return sanitizeFloorInput(`${currentValue.slice(0, start)}${sanitized}${currentValue.slice(end)}`);
}

export function getFloorInputProps(value, onValueChange) {
  return {
    type: 'text',
    inputMode: 'numeric',
    pattern: '[0-9]*',
    autoComplete: 'off',
    value,
    onChange: (event) => onValueChange(sanitizeFloorInput(event.target.value)),
    onKeyDown: handleFloorKeyDown,
    onPaste: (event) => {
      event.preventDefault();
      onValueChange(
        mergeFloorPaste(
          value,
          event.clipboardData.getData('text'),
          event.target.selectionStart,
          event.target.selectionEnd
        )
      );
    },
    onDrop: (event) => event.preventDefault(),
  };
}

export function isDuplicateRoomOnFloor(name, floor, existingRooms, excludeId = null) {
  const normalizedName = normalizeRoomName(name);
  if (!normalizedName) return false;
  const normalizedFloor = normalizeRoomFloor(floor);
  return existingRooms.some((room) => {
    if (excludeId != null && room.id === excludeId) return false;
    return (
      normalizeRoomName(room.name) === normalizedName &&
      normalizeRoomFloor(room.floor) === normalizedFloor
    );
  });
}
