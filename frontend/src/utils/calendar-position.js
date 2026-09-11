/** Keep the full calendar inside the visible viewport, preferring the space below its field. */
export default function calendarPosition(anchor, calendar, viewport) {
  const gap = 8;
  const leftEdge = (viewport.offsetLeft ?? 0) + gap;
  const topEdge = (viewport.offsetTop ?? 0) + gap;
  const rightEdge = leftEdge + viewport.width - gap * 2;
  const bottomEdge = topEdge + viewport.height - gap * 2;
  const width = Math.min(calendar.width, Math.max(0, rightEdge - leftEdge));
  const maxHeight = Math.max(0, bottomEdge - topEdge);
  const height = Math.min(calendar.height, maxHeight);
  const below = anchor.bottom + gap;
  const above = anchor.top - gap - height;
  const preferredTop = below + height <= bottomEdge ? below : above;
  return {
    left: Math.max(leftEdge, Math.min(anchor.left, rightEdge - width)),
    top: Math.max(topEdge, Math.min(preferredTop, bottomEdge - height)),
    width,
    maxHeight,
  };
}
