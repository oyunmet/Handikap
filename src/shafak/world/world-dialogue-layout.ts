export type DialogueViewport = {
  width: number;
  height: number;
};

export function calculateNpcDialoguePosition(
  projectedX: number,
  projectedY: number,
  size: DialogueViewport,
): [number, number] {
  const mobile = size.width <= 760;
  const compactMobile = mobile && size.height <= 680;
  const bubbleWidth = mobile
    ? Math.min(compactMobile ? 214 : 230, size.width - 24)
    : Math.min(270, size.width - 48);
  const halfHeight = mobile ? (size.height < 520 ? 42 : 54) : 76;
  const hudBottom = mobile
    ? compactMobile ? 92 : 116
    : 0;
  const safeTop = mobile
    ? Math.max(hudBottom + halfHeight + 10, size.height * 0.18)
    : Math.max(226, size.height * 0.38);

  // The joystick sits well above the bottom edge on phones, so reserve its full
  // rectangle plus a gap rather than only keeping the dialogue off the footer.
  const joystickSize = size.width <= 390 ? 116 : 124;
  const controlsTop = mobile
    ? size.height - Math.max(126, 104) - joystickSize
    : size.height - 145;
  const maxY = mobile
    ? Math.max(
        size.height < 560 ? halfHeight + 24 : safeTop,
        controlsTop - halfHeight - 12,
      )
    : Math.max(safeTop, size.height - 145 - halfHeight);
  const minX = bubbleWidth / 2 + 12;
  const maxX = Math.max(minX, size.width - bubbleWidth / 2 - 12);

  return [
    Math.max(minX, Math.min(maxX, projectedX)),
    Math.max(mobile && size.height < 560 ? halfHeight + 24 : safeTop, Math.min(maxY, projectedY)),
  ];
}
