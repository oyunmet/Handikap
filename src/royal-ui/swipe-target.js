export function getAdjacentSwipeTarget({
  row,
  col,
  startX,
  startY,
  endX,
  endY,
}, threshold = 15) {
  const values = [row, col, startX, startY, endX, endY];
  if (!values.every(Number.isFinite)) return null;

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  if (Math.hypot(deltaX, deltaY) <= threshold) return null;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return { row, col: col + Math.sign(deltaX) };
  }
  return { row: row + Math.sign(deltaY), col };
}
