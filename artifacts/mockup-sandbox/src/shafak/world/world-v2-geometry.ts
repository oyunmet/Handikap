export const WORLD_V2_DUNE_COLUMNS = 80;
export const WORLD_V2_DUNE_ROWS = 112;
export const WORLD_V2_DUNE_WIDTH = 260;
export const WORLD_V2_DUNE_DEPTH = 480;

export function createWorldV2DuneData() {
  const columns = WORLD_V2_DUNE_COLUMNS;
  const rows = WORLD_V2_DUNE_ROWS;
  const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
  const colors = new Float32Array(positions.length);
  const indices = new Uint32Array(columns * rows * 6);
  let vertex = 0;
  for (let row = 0; row <= rows; row += 1) {
    const longitudinal = (row / rows - 0.5) * WORLD_V2_DUNE_DEPTH;
    for (let column = 0; column <= columns; column += 1) {
      const lateral = (column / columns - 0.5) * WORLD_V2_DUNE_WIDTH;
      const absX = Math.abs(lateral);
      const shoulder = Math.max(0, Math.min(1, (absX - 5.5) / 9));
      const shoulderCurve = shoulder * shoulder * (3 - 2 * shoulder);
      const broadDune = Math.sin(lateral * 0.026 + Math.sin(longitudinal * 0.009) * 1.4) * 1.7;
      const crossDune = Math.sin(lateral * 0.074 - longitudinal * 0.018) * 0.58;
      const fineAsh = Math.sin(lateral * 0.19 + longitudinal * 0.063) * 0.13;
      const height = -1.05 + shoulderCurve * (broadDune + crossDune + fineAsh);
      const offset = vertex * 3;
      positions[offset] = lateral;
      positions[offset + 1] = longitudinal;
      positions[offset + 2] = height;
      const variation = 0.84 + ((row * 17 + column * 29) % 31) / 220;
      colors[offset] = variation;
      colors[offset + 1] = variation * 0.985;
      colors[offset + 2] = variation * 0.96;
      vertex += 1;
    }
  }
  let indexOffset = 0;
  const stride = columns + 1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * stride + column;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices[indexOffset++] = a;
      indices[indexOffset++] = b;
      indices[indexOffset++] = d;
      indices[indexOffset++] = b;
      indices[indexOffset++] = c;
      indices[indexOffset++] = d;
    }
  }
  return { positions, colors, indices };
}
