import {
  getWarRoomHousePlan,
  type WarRoomBuilding,
} from "./war-room-data";
import {
  getWarRoomFloorPresentation,
  getWarRoomMinimapPlayerRotation,
} from "./war-room-floor-indicator";
import type { WarRoomHudSnapshot } from "./war-room-engine";

type Props = {
  hud: WarRoomHudSnapshot;
  room: { buildings: readonly WarRoomBuilding[] };
};

export default function WarRoomMiniMap({ hud, room }: Props) {
  const pointX = (x: number) => 9 + ((Math.max(-34, Math.min(34, x)) + 34) / 68) * 102;
  const pointY = (z: number) => 9 + ((Math.max(-34, Math.min(34, z)) + 34) / 68) * 102;
  const mapScale = 102 / 68;
  const floorPresentation = getWarRoomFloorPresentation(
    room.buildings,
    hud.player.x,
    hud.player.z,
    hud.player.floorHeight,
  );
  const playerFloor = floorPresentation?.floor ?? 0;
  const targetFloorHeight = floorPresentation?.floorHeight ?? 0;

  return (
    <svg
      className={`war-room-minimap is-floor-${playerFloor}`}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`Savaş alanı mini haritası, ${playerFloor === 0 ? "alt kat" : "üst kat"}`}
    >
      <rect x="2" y="2" width="116" height="116" rx="14" />
      <path d="M12 12h96v96H12zM60 12v96M12 60h96" />
      {room.buildings.map((building) => {
        const plan = getWarRoomHousePlan(building);
        const width = building.width * mapScale;
        const depth = building.depth * mapScale;
        return (
          <g
            key={building.id}
            className="war-room-minimap__building"
            transform={`translate(${pointX(building.x)} ${pointY(building.z)}) rotate(${-building.rotationY * 180 / Math.PI})`}
          >
            <rect x={-width / 2} y={-depth / 2} width={width} height={depth} rx="1.2" />
            <line
              className="war-room-minimap__corridor"
              x1={-plan.corridorWallX * mapScale}
              x2={-plan.corridorWallX * mapScale}
              y1={-depth / 2}
              y2={depth / 2}
            />
            <line
              className="war-room-minimap__corridor"
              x1={plan.corridorWallX * mapScale}
              x2={plan.corridorWallX * mapScale}
              y1={-depth / 2}
              y2={depth / 2}
            />
            <line
              className="war-room-minimap__partition"
              x1={-width / 2}
              x2={width / 2}
              y1={plan.roomDividerZ * mapScale}
              y2={plan.roomDividerZ * mapScale}
            />
            <line
              className="war-room-minimap__stairs"
              x1={plan.stairX * mapScale}
              x2={plan.stairX * mapScale}
              y1={plan.stairStartZ * mapScale}
              y2={plan.stairEndZ * mapScale}
            />
          </g>
        );
      })}
      <text className="war-room-minimap__floor-label" x="60" y="16" textAnchor="middle">
        {playerFloor === 0 ? "ALT KAT" : "ÜST KAT"}
      </text>
      {hud.enemies.map((enemy) => enemy.alive
        && Math.abs(enemy.floorHeight - targetFloorHeight) < 1.05 && (
        <circle
          key={enemy.id}
          className={enemy.commander ? "is-commander" : ""}
          cx={pointX(enemy.x)}
          cy={pointY(enemy.z)}
          r={enemy.commander ? 5 : 3.2}
        />
      ))}
      {hud.healingPoints.map((point) => Math.abs(point.floorHeight - targetFloorHeight) < 1.05 && (
        <circle
          key={`heal-${point.id}`}
          className={`is-heal-point${point.available ? "" : " is-depleted"}`}
          cx={pointX(point.x)}
          cy={pointY(point.z)}
          r={3.8}
        />
      ))}
      <g
        className="war-room-minimap__player"
        transform={`translate(${pointX(hud.player.x)} ${pointY(hud.player.z)}) rotate(${getWarRoomMinimapPlayerRotation(hud.player.yaw)})`}
      >
        <path d="M0 -7 5 6 0 3 -5 6Z" />
      </g>
    </svg>
  );
}
