"use client";

import { Html, Line } from "@react-three/drei";
import { useMemo, useRef, type RefObject } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { DoubleSide, type Group, type Object3D } from "three";
import {
  commitWallPlacementPoint,
  computeExitAlignmentSnaps,
  draftDisplayPath,
  draftOpeningLinks,
  offsetFromWallPointer,
  openingSpanForLink,
  placementOpeningSpan,
  pullPointFromWallStart,
  resolveHallwayExitNormal,
  setPlacementCenter,
  setPlacementSpan,
  type ExitAlignmentSnap,
  type HallwayDrawDraft,
  type WallLink,
  type WallPlacement,
  PREVIEW_HALLWAY_COLOR,
  PREVIEW_HALLWAY_EMISSIVE,
  PREVIEW_OPENING_COLOR,
  PREVIEW_OPENING_EMISSIVE,
} from "@/tools/room-coat/lib/hallway-draft";
import type { RoomAngleSnapMode } from "@/tools/room-coat/lib/room-shape";
import {
  getHallwayWallLayout,
  offsetFromHallwayWallPointer,
  offsetToWorldOnHallwayWall,
  openingSpanForHallwayLink,
  setHallwayPlacementCenter,
  setHallwayPlacementSpan,
} from "@/tools/room-coat/lib/hallway-wall-hit";
import { buildHallwayPreviewSpecs } from "@/tools/room-coat/lib/hallway-geometry";
import type { SurfaceMeshSpec } from "@/tools/room-coat/lib/room-geometry";
import { offsetToWorldOnWall } from "@/tools/room-coat/lib/wall-openings";
import {
  hallwayWallHighlightKey,
  isHallwayWallLink,
  isRoomWallLink,
  wallLinkKey,
} from "@/tools/room-coat/lib/wall-links";
import { useFloorPointerDrag } from "@/tools/room-coat/components/editor/useFloorPointerDrag";
import {
  hallwayLastSegmentLengthMm,
  hallwayPathLengthMm,
  hallwaySegmentLengthMm,
} from "@/tools/room-coat/lib/surface-measurements";
import { formatMm } from "@/tools/room-coat/lib/units";
import { EDITOR_CHROME, EDITOR_Z_SCENE_HTML } from "@/tools/room-coat/components/editor/editor-chrome";
import {
  collectHallwayEntranceTargets,
  collectHallwayContinuationTargets,
  continuationGuidesForTargets,
  entranceGuidesForTargets,
  snapWallPlacementToEntrance,
} from "@/tools/room-coat/lib/hallway-entrance-snaps";
import { SnapGuideVisual } from "@/tools/room-coat/components/scene/LayoutVisuals";
import { FLOOR_SURFACE_Y_M } from "@/tools/room-coat/lib/room-geometry";
import type {
  Hallway,
  HallwayWaypoint,
  PlacedRoom,
  SnapPoint,
  UnitPreference,
  WallSide,
} from "@/tools/room-coat/types/state";

const MM_TO_M = 0.001;
const CONTINUATION_GUIDE_COLOR = "#38bdf8";

function ContinuationGuideVisual({
  guides,
}: {
  guides: import("@/tools/room-coat/lib/snap-guides").SnapGuideSegment[];
}) {
  if (guides.length === 0) return null;

  return (
    <group>
      {guides.map((guide, index) => (
        <Line
          key={`continuation-guide:${index}:${guide.x1Mm}:${guide.z1Mm}`}
          points={[
            [
              guide.x1Mm * MM_TO_M,
              FLOOR_SURFACE_Y_M + 0.018,
              guide.z1Mm * MM_TO_M,
            ],
            [
              guide.x2Mm * MM_TO_M,
              FLOOR_SURFACE_Y_M + 0.018,
              guide.z2Mm * MM_TO_M,
            ],
          ]}
          color={CONTINUATION_GUIDE_COLOR}
          lineWidth={2}
          dashed
          dashSize={0.1}
          gapSize={0.08}
          transparent
          opacity={0.9}
        />
      ))}
    </group>
  );
}

function ContinuationAnchorMarkers({
  targets,
}: {
  targets: import("@/tools/room-coat/lib/hallway-entrance-snaps").HallwayContinuationTarget[];
}) {
  if (targets.length === 0) return null;

  return (
    <group renderOrder={998}>
      {targets.map((target) => (
        <mesh
          key={target.id}
          position={[
            target.anchor.xMm * MM_TO_M,
            FLOOR_SURFACE_Y_M + 0.06,
            target.anchor.zMm * MM_TO_M,
          ]}
          renderOrder={999}
          raycast={() => null}
        >
          <sphereGeometry args={[0.08, 14, 14]} />
          <meshStandardMaterial
            color={CONTINUATION_GUIDE_COLOR}
            emissive="#0284c7"
            emissiveIntensity={0.45}
            depthTest={false}
            transparent
            opacity={0.92}
          />
        </mesh>
      ))}
    </group>
  );
}
const HANDLE_LIFT_M = 0.15;
const WALL_OUTSET_MM = 180;

type DragKind = "center" | "left" | "right" | "pull" | "path";

function toM(point: HallwayWaypoint, y = 0.12): [number, number, number] {
  return [point.xMm * MM_TO_M, y, point.zMm * MM_TO_M];
}

function outwardOffset(
  room: PlacedRoom | null,
  placement: WallPlacement,
  mm: number,
): { xMm: number; zMm: number } {
  if (Math.hypot(placement.faceNormalX, placement.faceNormalZ) > 0.01) {
    return {
      xMm: placement.faceNormalX * mm,
      zMm: placement.faceNormalZ * mm,
    };
  }
  if (!room || !isRoomWallLink(placement.link)) {
    return { xMm: 0, zMm: mm };
  }
  const exit = resolveHallwayExitNormal(
    room,
    placement.link.wallIndex,
    placement.link.offsetMm,
  );
  return { xMm: exit.x * mm, zMm: exit.z * mm };
}

function endpointHandlePosition(
  room: PlacedRoom | null,
  xMm: number,
  zMm: number,
  yM: number,
  placement: WallPlacement,
  extraOutsetMm = WALL_OUTSET_MM,
): [number, number, number] {
  const out = outwardOffset(room, placement, extraOutsetMm);
  return [(xMm + out.xMm) * MM_TO_M, yM, (zMm + out.zMm) * MM_TO_M];
}

function RoomWallOpeningOutline({
  room,
  link,
  widthMm,
  placement,
}: {
  room: PlacedRoom;
  link: Extract<WallLink, { kind: "room" }>;
  widthMm: number;
  placement?: WallPlacement;
}) {
  const span = placement
    ? placementOpeningSpan(room, [], placement)
    : openingSpanForLink(room, link, widthMm);
  const exit = placement
    ? { x: placement.faceNormalX, z: placement.faceNormalZ }
    : resolveHallwayExitNormal(room, link.wallIndex, link.offsetMm);
  const outsetMm = 30;
  const bottomY = 0.04;
  const topY = room.heightMm * MM_TO_M - 0.04;
  const midY = room.heightMm * MM_TO_M * 0.5;

  const start = offsetToWorldOnWall(room, link.wallIndex, span.startMm);
  const end = offsetToWorldOnWall(room, link.wallIndex, span.endMm);

  const pos = (x: number, z: number, y: number): [number, number, number] => [
    (x + exit.x * outsetMm) * MM_TO_M,
    y,
    (z + exit.z * outsetMm) * MM_TO_M,
  ];

  const bl = pos(start.x, start.z, bottomY);
  const br = pos(end.x, end.z, bottomY);
  const tl = pos(start.x, start.z, topY);
  const tr = pos(end.x, end.z, topY);
  const ml = pos(start.x, start.z, midY);
  const mr = pos(end.x, end.z, midY);

  return (
    <group renderOrder={996}>
      <Line
        points={[bl, br, tr, tl, bl]}
        color={PREVIEW_OPENING_COLOR}
        lineWidth={5}
        renderOrder={996}
      />
      <Line
        points={[ml, mr]}
        color={PREVIEW_OPENING_EMISSIVE}
        lineWidth={7}
        renderOrder={997}
      />
    </group>
  );
}

function HallwayWallOpeningOutline({
  hallway,
  link,
  widthMm,
  placement,
}: {
  hallway: Hallway;
  link: Extract<WallLink, { kind: "hallway" }>;
  widthMm: number;
  placement?: WallPlacement;
}) {
  const span =
    placement && isHallwayWallLink(placement.link)
      ? placementOpeningSpan(null, [hallway], placement)
      : openingSpanForHallwayLink(hallway, link, widthMm);
  if (!span) return null;

  const layout = getHallwayWallLayout(hallway, link.segIndex, link.side);
  if (!layout) return null;

  const exit = placement
    ? { x: placement.faceNormalX, z: placement.faceNormalZ }
    : { x: layout.normalX, z: layout.normalZ };
  const outsetMm = 30;
  const bottomY = 0.04;
  const topY = hallway.heightMm * MM_TO_M - 0.04;
  const midY = hallway.heightMm * MM_TO_M * 0.5;

  const start = offsetToWorldOnHallwayWall(
    hallway,
    link.segIndex,
    link.side,
    span.startMm,
  );
  const end = offsetToWorldOnHallwayWall(
    hallway,
    link.segIndex,
    link.side,
    span.endMm,
  );
  if (!start || !end) return null;

  const pos = (x: number, z: number, y: number): [number, number, number] => [
    (x + exit.x * outsetMm) * MM_TO_M,
    y,
    (z + exit.z * outsetMm) * MM_TO_M,
  ];

  const bl = pos(start.x, start.z, bottomY);
  const br = pos(end.x, end.z, bottomY);
  const tl = pos(start.x, start.z, topY);
  const tr = pos(end.x, end.z, topY);
  const ml = pos(start.x, start.z, midY);
  const mr = pos(end.x, end.z, midY);

  return (
    <group renderOrder={996}>
      <Line
        points={[bl, br, tr, tl, bl]}
        color={PREVIEW_OPENING_COLOR}
        lineWidth={5}
        renderOrder={996}
      />
      <Line
        points={[ml, mr]}
        color={PREVIEW_OPENING_EMISSIVE}
        lineWidth={7}
        renderOrder={997}
      />
    </group>
  );
}

function EndpointOpeningOutline({
  rooms,
  hallways,
  link,
  widthMm,
  placement,
}: {
  rooms: PlacedRoom[];
  hallways: Hallway[];
  link: WallLink;
  widthMm: number;
  placement?: WallPlacement;
}) {
  if (isRoomWallLink(link)) {
    const room = rooms.find((item) => item.placementId === link.placementId);
    if (!room) return null;
    return (
      <RoomWallOpeningOutline
        room={room}
        link={link}
        widthMm={widthMm}
        placement={placement}
      />
    );
  }

  const hallway = hallways.find((item) => item.id === link.hallwayId);
  if (!hallway) return null;
  return (
    <HallwayWallOpeningOutline
      hallway={hallway}
      link={link}
      widthMm={widthMm}
      placement={placement}
    />
  );
}

function HallwayPreviewMeshes({ specs }: { specs: SurfaceMeshSpec[] }) {
  return (
    <>
      {specs.map((spec) => {
        const isWall = spec.category === "wall";
        const isFloor = spec.category === "floor";
        const opacity = isFloor ? 0.62 : isWall ? 0.48 : 0.38;

        return (
          <mesh
            key={spec.surfaceId}
            position={spec.position}
            rotation={spec.rotation}
            renderOrder={901}
            raycast={() => null}
          >
            <planeGeometry args={spec.size} />
            <meshStandardMaterial
              color={isWall ? "#94a3b8" : PREVIEW_HALLWAY_COLOR}
              emissive={PREVIEW_HALLWAY_EMISSIVE}
              emissiveIntensity={isWall ? 0.22 : 0.35}
              transparent
              opacity={opacity}
              side={DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

function Handle({
  position,
  color,
  emissive,
  size = 0.12,
  hitSize = 0.22,
  onPointerDown,
}: {
  position: [number, number, number];
  color: string;
  emissive: string;
  size?: number;
  hitSize?: number;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
}) {
  return (
    <group position={position} renderOrder={1000}>
      <mesh
        renderOrder={1001}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPointerDown(event);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "grab";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[hitSize, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh renderOrder={1002}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.55}
          depthTest={false}
          transparent
          opacity={0.95}
        />
      </mesh>
    </group>
  );
}

function HallwayExitAlignmentMarkers({
  rooms,
  hallways,
  draft,
  onSnapCommit,
  disableOrbit,
  enableOrbit,
}: {
  rooms: PlacedRoom[];
  hallways: Hallway[];
  draft: HallwayDrawDraft;
  onSnapCommit: (snap: ExitAlignmentSnap) => void;
  disableOrbit: () => void;
  enableOrbit: () => void;
}) {
  const snaps = useMemo(
    () => computeExitAlignmentSnaps(rooms, hallways, draft),
    [rooms, hallways, draft],
  );

  if (snaps.length === 0) return null;

  return (
    <group renderOrder={998}>
      {snaps.map((snap, index) => {
        const guidePoints = snap.guidePath.map(
          (point) => toM(point, 0.09) as [number, number, number],
        );
        return (
          <group key={`exit-align-${index}-${snap.point.xMm}-${snap.point.zMm}`}>
            {guidePoints.length >= 2 && (
              <Line
                points={guidePoints}
                color="#34d399"
                lineWidth={3}
                dashed
                dashSize={0.14}
                gapSize={0.1}
                transparent
                opacity={0.75}
              />
            )}
            <Handle
              position={toM(snap.point, 0.16)}
              color="#34d399"
              emissive="#059669"
              size={0.15}
              hitSize={0.28}
              onPointerDown={(event) => {
                event.stopPropagation();
                disableOrbit();
                onSnapCommit(snap);
                enableOrbit();
              }}
            />
            <Html
              position={[snap.point.xMm * MM_TO_M, 0.42, snap.point.zMm * MM_TO_M]}
              center
              zIndexRange={[EDITOR_Z_SCENE_HTML, 0]}
              style={{ pointerEvents: "none" }}
            >
              <div
                className={`max-w-[220px] whitespace-normal rounded-md px-2 py-1 text-center text-[11px] font-medium text-emerald-100 ${EDITOR_CHROME}`}
              >
                {snap.label}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function EndpointPlacementHandles({
  rooms,
  hallways,
  placement,
  role,
  snapPoints,
  onPlacementChange,
  onPullOut,
  onConfirmEnd,
  onConfirmStart,
  onPlacementDragEnd,
  disableOrbit,
  enableOrbit,
  floorLocalSpaceRef,
}: {
  rooms: PlacedRoom[];
  hallways: Hallway[];
  placement: WallPlacement;
  role: "start" | "end";
  snapPoints: SnapPoint[];
  onPlacementChange: (placement: WallPlacement) => void;
  onPullOut?: (preview: HallwayWaypoint) => void;
  onConfirmEnd?: () => void;
  onConfirmStart?: () => void;
  onPlacementDragEnd: () => void;
  disableOrbit: () => void;
  enableOrbit: () => void;
  floorLocalSpaceRef: RefObject<Object3D | null>;
}) {
  const link = placement.link;
  const room = isRoomWallLink(link)
    ? (rooms.find((item) => item.placementId === link.placementId) ?? null)
    : null;
  const hallway = isHallwayWallLink(link)
    ? (hallways.find((item) => item.id === link.hallwayId) ?? null)
    : null;
  if (!room && !hallway) return null;

  const span = placementOpeningSpan(room, hallways, placement);
  const heightMm = room?.heightMm ?? hallway?.heightMm ?? 2438;
  const y = heightMm * MM_TO_M * 0.55 + HANDLE_LIFT_M;
  const beginFloorDrag = useFloorPointerDrag(
    disableOrbit,
    enableOrbit,
    floorLocalSpaceRef,
  );
  const centerClickRef = useRef(false);
  const entranceTargets = useMemo(
    () => collectHallwayEntranceTargets(rooms, hallways, snapPoints),
    [rooms, hallways, snapPoints],
  );

  function snapCenterPlacement(next: WallPlacement, offsetMm: number): WallPlacement {
    return snapWallPlacementToEntrance(
      rooms,
      hallways,
      next,
      offsetMm,
      entranceTargets,
    );
  }

  const left = isRoomWallLink(link)
    ? offsetToWorldOnWall(room!, link.wallIndex, span.startMm)
    : offsetToWorldOnHallwayWall(
        hallway!,
        link.segIndex,
        link.side,
        span.startMm,
      );
  const right = isRoomWallLink(link)
    ? offsetToWorldOnWall(room!, link.wallIndex, span.endMm)
    : offsetToWorldOnHallwayWall(
        hallway!,
        link.segIndex,
        link.side,
        span.endMm,
      );
  const center = isRoomWallLink(link)
    ? offsetToWorldOnWall(room!, link.wallIndex, link.offsetMm)
    : offsetToWorldOnHallwayWall(
        hallway!,
        link.segIndex,
        link.side,
        link.offsetMm,
      );
  if (!left || !right || !center) return null;

  const { point: centerlineStart } = useMemo(
    () => commitWallPlacementPoint(room, hallways, placement),
    [room, hallways, placement],
  );

  const pullHandlePos = useMemo((): [number, number, number] => {
    const out = outwardOffset(room, placement, 520);
    return [
      (centerlineStart.xMm + out.xMm) * MM_TO_M,
      y + 0.08,
      (centerlineStart.zMm + out.zMm) * MM_TO_M,
    ];
  }, [centerlineStart, placement, room, y]);

  function startWallDrag(
    kind: DragKind,
    event: ThreeEvent<PointerEvent>,
    onMove: (xMm: number, zMm: number) => void,
    onEnd?: () => void,
  ) {
    centerClickRef.current = kind === "center";
    beginFloorDrag(event, {
      onMove,
      onEnd: () => {
        if (
          role === "end" &&
          kind === "center" &&
          centerClickRef.current &&
          onConfirmEnd
        ) {
          onConfirmEnd();
        }
        if (
          role === "start" &&
          kind === "center" &&
          centerClickRef.current &&
          onConfirmStart
        ) {
          onConfirmStart();
        }
        onEnd?.();
        onPlacementDragEnd();
        document.body.style.cursor = "";
      },
    });
  }

  return (
    <group renderOrder={999}>
      <Line
        points={[
          endpointHandlePosition(room, left.x, left.z, y, placement, 40),
          endpointHandlePosition(room, right.x, right.z, y, placement, 40),
        ]}
        color={PREVIEW_OPENING_COLOR}
        lineWidth={6}
        renderOrder={998}
      />

      <EndpointOpeningOutline
        rooms={rooms}
        hallways={hallways}
        link={placement.link}
        widthMm={placement.widthMm}
        placement={placement}
      />

      <Handle
        position={endpointHandlePosition(room, left.x, left.z, y, placement)}
        color="#a5f3fc"
        emissive="#0891b2"
        size={0.1}
        onPointerDown={(event) =>
          startWallDrag("left", event, (xMm, zMm) => {
            centerClickRef.current = false;
            if (room && isRoomWallLink(placement.link)) {
              const projected = offsetFromWallPointer(
                room,
                placement.link.wallIndex,
                xMm,
                zMm,
                placement.widthMm,
              );
              onPlacementChange(
                setPlacementSpan(room, placement, projected, span.endMm),
              );
              return;
            }
            if (hallway && isHallwayWallLink(placement.link)) {
              const projected = offsetFromHallwayWallPointer(
                hallway,
                placement.link.segIndex,
                placement.link.side,
                xMm,
                zMm,
                placement.widthMm,
              );
              onPlacementChange(
                setHallwayPlacementSpan(
                  hallway,
                  placement,
                  projected,
                  span.endMm,
                ),
              );
            }
          })
        }
      />
      <Handle
        position={endpointHandlePosition(room, right.x, right.z, y, placement)}
        color="#a5f3fc"
        emissive="#0891b2"
        size={0.1}
        onPointerDown={(event) =>
          startWallDrag("right", event, (xMm, zMm) => {
            centerClickRef.current = false;
            if (room && isRoomWallLink(placement.link)) {
              const projected = offsetFromWallPointer(
                room,
                placement.link.wallIndex,
                xMm,
                zMm,
                placement.widthMm,
              );
              onPlacementChange(
                setPlacementSpan(room, placement, span.startMm, projected),
              );
              return;
            }
            if (hallway && isHallwayWallLink(placement.link)) {
              const projected = offsetFromHallwayWallPointer(
                hallway,
                placement.link.segIndex,
                placement.link.side,
                xMm,
                zMm,
                placement.widthMm,
              );
              onPlacementChange(
                setHallwayPlacementSpan(
                  hallway,
                  placement,
                  span.startMm,
                  projected,
                ),
              );
            }
          })
        }
      />
      <Handle
        position={endpointHandlePosition(room, center.x, center.z, y, placement)}
        color={role === "start" ? "#fbbf24" : "#34d399"}
        emissive={role === "start" ? "#d97706" : "#059669"}
        size={0.14}
        onPointerDown={(event) =>
          startWallDrag("center", event, (xMm, zMm) => {
            if (Math.hypot(xMm - center.x, zMm - center.z) > 35) {
              centerClickRef.current = false;
            }
            if (room && isRoomWallLink(placement.link)) {
              const offsetMm = offsetFromWallPointer(
                room,
                placement.link.wallIndex,
                xMm,
                zMm,
                placement.widthMm,
              );
              onPlacementChange(
                snapCenterPlacement(
                  setPlacementCenter(room, placement, offsetMm),
                  offsetMm,
                ),
              );
              return;
            }
            if (hallway && isHallwayWallLink(placement.link)) {
              const offsetMm = offsetFromHallwayWallPointer(
                hallway,
                placement.link.segIndex,
                placement.link.side,
                xMm,
                zMm,
                placement.widthMm,
              );
              onPlacementChange(
                snapCenterPlacement(
                  setHallwayPlacementCenter(hallway, placement, offsetMm),
                  offsetMm,
                ),
              );
            }
          })
        }
      />

      {role === "start" && onPullOut && (
        <>
          <Line
            points={[
              endpointHandlePosition(
                room,
                center.x,
                center.z,
                y,
                placement,
                60,
              ),
              pullHandlePos,
            ]}
            color="#fde68a"
            lineWidth={4}
            dashed
            dashSize={0.08}
            gapSize={0.06}
            renderOrder={998}
          />
          <Handle
            position={pullHandlePos}
            color="#e879f9"
            emissive="#c026d3"
            size={0.13}
            hitSize={0.24}
            onPointerDown={(event) =>
              startWallDrag("pull", event, (xMm, zMm) => {
                centerClickRef.current = false;
                const preview = pullPointFromWallStart(
                  room,
                  hallways,
                  placement,
                  xMm,
                  zMm,
                );
                if (preview) onPullOut(preview);
              })
            }
          />
        </>
      )}
    </group>
  );
}

function alignedPreviewPoint(
  last: HallwayWaypoint,
  preview: HallwayWaypoint,
): HallwayWaypoint {
  const dx = Math.abs(preview.xMm - last.xMm);
  const dz = Math.abs(preview.zMm - last.zMm);
  return dx >= dz
    ? { xMm: preview.xMm, zMm: last.zMm }
    : { xMm: last.xMm, zMm: preview.zMm };
}

function HallwayDraftMeasureLabel({
  path,
  draft,
  unitPreference,
}: {
  path: HallwayWaypoint[];
  draft: HallwayDrawDraft;
  unitPreference: UnitPreference;
}) {
  const widthText = formatMm(draft.widthMm, unitPreference);

  if (path.length === 0) {
    if (!draft.preview) return null;
    return (
      <Html
        position={[
          draft.preview.xMm * MM_TO_M,
          0.35,
          draft.preview.zMm * MM_TO_M,
        ]}
        center
        zIndexRange={[EDITOR_Z_SCENE_HTML, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium tabular-nums text-slate-100 ${EDITOR_CHROME}`}
        >
          W {widthText}
        </div>
      </Html>
    );
  }

  const lengthText = formatMm(hallwayPathLengthMm(path), unitPreference);

  let segmentText: string | null = null;
  let labelPoint = path[path.length - 1];

  if (draft.preview && path.length >= 1) {
    const anchor = path[path.length - 1];
    const aligned = alignedPreviewPoint(anchor, draft.preview);
    segmentText = formatMm(
      hallwaySegmentLengthMm(anchor, aligned),
      unitPreference,
    );
    labelPoint = {
      xMm: Math.round((anchor.xMm + aligned.xMm) / 2),
      zMm: Math.round((anchor.zMm + aligned.zMm) / 2),
    };
  } else if (path.length >= 2) {
    segmentText = formatMm(hallwayLastSegmentLengthMm(path), unitPreference);
    const start = path[path.length - 2];
    const end = path[path.length - 1];
    labelPoint = {
      xMm: Math.round((start.xMm + end.xMm) / 2),
      zMm: Math.round((start.zMm + end.zMm) / 2),
    };
  }

  return (
    <Html
      position={[labelPoint.xMm * MM_TO_M, 0.35, labelPoint.zMm * MM_TO_M]}
      center
      zIndexRange={[EDITOR_Z_SCENE_HTML, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium tabular-nums text-slate-100 ${EDITOR_CHROME}`}
      >
        W {widthText} · L {lengthText}
        {segmentText ? ` · Seg ${segmentText}` : ""}
      </div>
    </Html>
  );
}

export function HallwayDrawVisuals({
  rooms,
  hallways,
  draft,
  snapPoints,
  unitPreference,
  angleSnapMode = "ortho",
  showCeilings = false,
  onPlacementChange,
  onStartPullOut,
  onConfirmEndPlacement,
  onConfirmStartEntrance,
  onAlignSnapCommit,
  onPathPreview,
  onPathCommit,
  onPlacementDragEnd,
  onPathDragEnd,
  disableOrbit,
  enableOrbit,
}: {
  rooms: PlacedRoom[];
  hallways: Hallway[];
  draft: HallwayDrawDraft;
  snapPoints: SnapPoint[];
  unitPreference: UnitPreference;
  angleSnapMode?: RoomAngleSnapMode;
  showCeilings?: boolean;
  onPlacementChange: (placement: WallPlacement) => void;
  onStartPullOut: (preview: HallwayWaypoint) => void;
  onConfirmEndPlacement: () => void;
  onConfirmStartEntrance: () => void;
  onAlignSnapCommit: (snap: ExitAlignmentSnap) => void;
  onPathPreview: (xMm: number, zMm: number) => void;
  onPathCommit: () => void;
  onPlacementDragEnd: () => void;
  onPathDragEnd: () => void;
  disableOrbit: () => void;
  enableOrbit: () => void;
}) {
  const localRootRef = useRef<Group>(null);
  const previewPath = useMemo(
    () => draftDisplayPath(rooms, hallways, draft, { angleSnapMode }),
    [angleSnapMode, rooms, hallways, draft],
  );

  const openingLinks = useMemo(
    () => draftOpeningLinks(rooms, hallways, draft),
    [rooms, hallways, draft],
  );

  const beginFloorDrag = useFloorPointerDrag(
    disableOrbit,
    enableOrbit,
    localRootRef,
  );

  const previewHeightMm = useMemo(() => {
    if (!draft.wallPlacement) return 2438;
    const link = draft.wallPlacement.link;
    if (isRoomWallLink(link)) {
      const startRoom = rooms.find((room) => room.placementId === link.placementId);
      return startRoom?.heightMm ?? 2438;
    }
    if (isHallwayWallLink(link)) {
      const startHallway = hallways.find((hallway) => hallway.id === link.hallwayId);
      return startHallway?.heightMm ?? 2438;
    }
    return 2438;
  }, [rooms, hallways, draft.wallPlacement]);

  const previewSpecs = useMemo(
    () =>
      buildHallwayPreviewSpecs(
        previewPath,
        draft.widthMm,
        previewHeightMm,
        showCeilings,
      ),
    [previewPath, draft.widthMm, previewHeightMm, showCeilings],
  );

  const hasPlacement = useMemo(() => {
    if (!draft.wallPlacement) return false;
    const link = draft.wallPlacement.link;
    if (isRoomWallLink(link)) {
      return rooms.some((room) => room.placementId === link.placementId);
    }
    if (isHallwayWallLink(link)) {
      return hallways.some((hallway) => hallway.id === link.hallwayId);
    }
    return false;
  }, [draft.wallPlacement, rooms, hallways]);

  const showExitPortal =
    draft.endPlacement &&
    (draft.phase === "align-exit" || draft.phase === "dragging");
  const showExitAlignment =
    draft.endPlacement &&
    draft.startPlacement &&
    (draft.phase === "align-exit" || draft.phase === "dragging");

  const entranceGuides = useMemo(() => {
    if (draft.phase === "idle") return [];
    const targets = collectHallwayEntranceTargets(rooms, hallways, snapPoints);
    return entranceGuidesForTargets(rooms, hallways, targets);
  }, [rooms, hallways, snapPoints, draft.phase]);

  const continuationTargets = useMemo(() => {
    if (draft.phase === "idle") return [];
    return collectHallwayContinuationTargets(hallways);
  }, [hallways, draft.phase]);

  const continuationGuides = useMemo(
    () => continuationGuidesForTargets(continuationTargets),
    [continuationTargets],
  );

  return (
    <group ref={localRootRef}>
    <group renderOrder={900}>
      {continuationGuides.length > 0 && (
        <ContinuationGuideVisual guides={continuationGuides} />
      )}
      {continuationTargets.length > 0 && (
        <ContinuationAnchorMarkers targets={continuationTargets} />
      )}
      {entranceGuides.length > 0 && (
        <SnapGuideVisual guides={entranceGuides} />
      )}
      {previewSpecs.length > 0 && (
        <HallwayPreviewMeshes specs={previewSpecs} />
      )}

      {draft.phase !== "idle" && draft.phase !== "align-exit" && (
        <HallwayDraftMeasureLabel
          path={previewPath}
          draft={draft}
          unitPreference={unitPreference}
        />
      )}

      {openingLinks.map(({ link, widthMm, placement }) => (
        <EndpointOpeningOutline
          key={`opening-${wallLinkKey(link)}`}
          rooms={rooms}
          hallways={hallways}
          link={link}
          widthMm={widthMm}
          placement={placement}
        />
      ))}

      {hasPlacement && draft.wallPlacement && (
        <EndpointPlacementHandles
          rooms={rooms}
          hallways={hallways}
          placement={draft.wallPlacement}
          role={draft.phase === "placing-end" ? "end" : "start"}
          snapPoints={snapPoints}
          onPlacementChange={onPlacementChange}
          onPullOut={
            draft.phase === "placing-start" ? onStartPullOut : undefined
          }
          onConfirmEnd={
            draft.phase === "placing-end" ? onConfirmEndPlacement : undefined
          }
          onConfirmStart={
            draft.phase === "placing-start" ? onConfirmStartEntrance : undefined
          }
          onPlacementDragEnd={onPlacementDragEnd}
          disableOrbit={disableOrbit}
          enableOrbit={enableOrbit}
          floorLocalSpaceRef={localRootRef}
        />
      )}

      {draft.phase === "align-exit" && draft.startPlacement && (
        <EndpointPlacementHandles
          rooms={rooms}
          hallways={hallways}
          placement={draft.startPlacement}
          role="start"
          snapPoints={snapPoints}
          onPlacementChange={onPlacementChange}
          onPullOut={onStartPullOut}
          onPlacementDragEnd={onPlacementDragEnd}
          disableOrbit={disableOrbit}
          enableOrbit={enableOrbit}
          floorLocalSpaceRef={localRootRef}
        />
      )}

      {showExitPortal && draft.endPlacement && (
        <EndpointPlacementHandles
          rooms={rooms}
          hallways={hallways}
          placement={draft.endPlacement}
          role="end"
          snapPoints={snapPoints}
          onPlacementChange={onPlacementChange}
          onPlacementDragEnd={onPlacementDragEnd}
          disableOrbit={disableOrbit}
          enableOrbit={enableOrbit}
          floorLocalSpaceRef={localRootRef}
        />
      )}

      {showExitAlignment && (
        <HallwayExitAlignmentMarkers
          rooms={rooms}
          hallways={hallways}
          draft={draft}
          onSnapCommit={onAlignSnapCommit}
          disableOrbit={disableOrbit}
          enableOrbit={enableOrbit}
        />
      )}

      {(draft.phase === "dragging" || draft.phase === "ready") &&
        draft.points.length > 0 && (
          <>
            {draft.points.map((point, index) => {
              const isEnd = index === draft.points.length - 1;
              if (!isEnd && index !== 0) return null;
              const displayPoint = previewPath[index] ?? point;
              return (
                <Handle
                  key={`pt-${index}`}
                  position={toM(displayPoint, index === 0 ? 0.14 : 0.12)}
                  color={index === 0 ? "#fbbf24" : PREVIEW_HALLWAY_COLOR}
                  emissive={index === 0 ? "#d97706" : PREVIEW_HALLWAY_EMISSIVE}
                  size={index === 0 ? 0.11 : 0.13}
                  hitSize={0.22}
                  onPointerDown={(event) => {
                    if (!isEnd) return;
                    beginFloorDrag(event, {
                      onMove: (xMm, zMm) => onPathPreview(xMm, zMm),
                      onEnd: () => {
                        onPathDragEnd();
                        onPathCommit();
                        document.body.style.cursor = "";
                      },
                    });
                  }}
                />
              );
            })}
          </>
        )}

      {draft.preview && draft.points.length > 0 && (
        <mesh
          position={toM(
            (() => {
              const last =
                previewPath[draft.points.length - 1] ??
                draft.points[draft.points.length - 1];
              const dx = Math.abs(draft.preview.xMm - last.xMm);
              const dz = Math.abs(draft.preview.zMm - last.zMm);
              return dx >= dz
                ? { xMm: draft.preview.xMm, zMm: last.zMm }
                : { xMm: last.xMm, zMm: draft.preview.zMm };
            })(),
            0.1,
          )}
          renderOrder={1000}
        >
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial
            color="#fde68a"
            emissive="#fbbf24"
            emissiveIntensity={0.5}
            transparent
            opacity={0.9}
            depthTest={false}
          />
        </mesh>
      )}
    </group>
    </group>
  );
}

export function OpenWallVisuals({
  rooms,
  hover,
  openingAnchor,
  openingPreviewEnd,
}: {
  rooms: PlacedRoom[];
  hover: HallwayWaypoint | null;
  openingAnchor: {
    placementId: string;
    wallIndex: number;
    offsetMm: number;
  } | null;
  openingPreviewEnd: HallwayWaypoint | null;
}) {
  return (
    <group>
      {hover && (
        <mesh position={[hover.xMm * MM_TO_M, 0.12, hover.zMm * MM_TO_M]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial
            color="#fdba74"
            emissive="#fb923c"
            emissiveIntensity={0.55}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}

      {openingAnchor &&
        (() => {
          const room = rooms.find(
            (item) => item.placementId === openingAnchor.placementId,
          );
          if (!room) return null;
          const point = offsetToWorldOnWall(
            room,
            openingAnchor.wallIndex,
            openingAnchor.offsetMm,
          );
          return (
            <mesh position={[point.x * MM_TO_M, 0.2, point.z * MM_TO_M]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshStandardMaterial
                color="#a855f7"
                emissive="#9333ea"
                emissiveIntensity={0.5}
              />
            </mesh>
          );
        })()}

      {openingAnchor &&
        openingPreviewEnd &&
        (() => {
          const room = rooms.find(
            (item) => item.placementId === openingAnchor.placementId,
          );
          if (!room) return null;
          const start = offsetToWorldOnWall(
            room,
            openingAnchor.wallIndex,
            openingAnchor.offsetMm,
          );
          const y = room.heightMm * MM_TO_M * 0.5;
          return (
            <Line
              points={[
                [start.x * MM_TO_M, y, start.z * MM_TO_M],
                [
                  openingPreviewEnd.xMm * MM_TO_M,
                  y,
                  openingPreviewEnd.zMm * MM_TO_M,
                ],
              ]}
              color="#c084fc"
              lineWidth={3}
              dashed
              dashSize={0.12}
              gapSize={0.08}
            />
          );
        })()}
    </group>
  );
}

export function getHighlightWallKeys(
  hoveredWallKey: string | null,
): Set<string> {
  const keys = new Set<string>();
  if (hoveredWallKey) keys.add(hoveredWallKey);
  return keys;
}

export function hallwaySuppressWallKey(
  draft: HallwayDrawDraft,
): string | null {
  if (
    !draft.wallPlacement ||
    (draft.phase !== "placing-start" && draft.phase !== "placing-end")
  ) {
    return null;
  }
  const link = draft.wallPlacement.link;
  if (isRoomWallLink(link)) {
    return `${link.placementId}:${link.wallIndex}`;
  }
  if (isHallwayWallLink(link)) {
    return hallwayWallHighlightKey(link.hallwayId, link.segIndex, link.side);
  }
  return null;
}
