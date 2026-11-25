// Solve each label column without allocating or reading layout in the render loop.
export function stackLabels(ids, desired, heights, positions, top, bottom, gap) {
  let totalHeight = 0;
  for (let i = 0; i < ids.length; i++) totalHeight += heights[ids[i]];
  const spacing = ids.length > 1
    ? Math.max(0, Math.min(gap, (bottom - top - totalHeight) / (ids.length - 1)))
    : 0;

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    let y = Math.max(top, Math.min(desired[id], bottom - heights[id]));
    if (i) {
      const previous = ids[i - 1];
      y = Math.max(y, positions[previous] + heights[previous] + spacing);
    }
    positions[id] = y;
  }
  // A backward pass absorbs overflow while retaining the order of the parts.
  for (let i = ids.length - 1; i >= 0; i--) {
    const id = ids[i];
    const ceiling = i === ids.length - 1
      ? bottom - heights[id]
      : positions[ids[i + 1]] - heights[id] - spacing;
    positions[id] = Math.min(positions[id], ceiling);
  }
}

// Camera-space coordinates relative to the object's center. A positive z is nearer
// the eye. Both horizontal and vertical constraints must hold for every box corner.
export function cornerDistance(x, y, z, tanHalfFov, aspect, widthFraction, heightFraction) {
  return Math.max(
    Math.abs(x) / (tanHalfFov * aspect * widthFraction) + z,
    Math.abs(y) / (tanHalfFov * heightFraction) + z
  );
}
