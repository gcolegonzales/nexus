"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { unitBounds } from "@/tools/room-coat/lib/unit-layout";
import { formatMm } from "@/tools/room-coat/lib/units";
import {
  findWallHit,
  offsetToWorldOnWall,
  openingsForWall,
  projectPointToWall,
  snapToNearestWall,
  wallEdges,
  type WallHit,
} from "@/tools/room-coat/lib/wall-openings";
import type {
  Hallway,
  HallwayWaypoint,
  PlacedRoom,
  WallOpening,
  WallSide,
} from "@/tools/room-coat/types/state";
import { Badge, Card, useConfirm } from "@nexus/ui";
import { Button } from "@nexus/next";

const PX_PER_MM = 0.04;
const PADDING_MM = 1500;

type FloorPlanTool = "select" | "add-room" | "hallway" | "open-walls";

type OpeningDrag = {
  placementId: string;
  wallIndex: number;
  startMm: number;
  endMm: number;
} | null;

type WaypointDrag = {
  hallwayId: string;
  index: number;
  xMm: number;
  zMm: number;
} | null;

const TOOLS: Array<{ id: FloorPlanTool; label: string }> = [
  { id: "select", label: "Select" },
  { id: "add-room", label: "Add room" },
  { id: "hallway", label: "Draw hallway" },
  { id: "open-walls", label: "Open walls" },
];

export function FloorPlanEditor() {
  const {
    state,
    activeUnit,
    activePlacedRooms,
    activeHallways,
    moveRoom,
    attachRoomToUnit,
    detachRoomFromUnit,
    addHallway,
    updateHallwayWaypoints,
    addWallOpening,
    removeWallOpening,
    deleteHallway,
    getAvailableRoomsForUnit,
  } = useRoomCoat();
  const confirm = useConfirm();

  const rooms = activePlacedRooms;
  const hallways = activeHallways;
  const available = getAvailableRoomsForUnit(activeUnit.id);
  const bounds = unitBounds(rooms);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<FloorPlanTool>("select");
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    () => available[0]?.id ?? "",
  );
  const [dragPlacementId, setDragPlacementId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    placementId: string;
    originXMm: number;
    originZMm: number;
  } | null>(null);
  const dragOffset = useRef({ x: 0, z: 0 });
  const dragPreviewRef = useRef<{
    placementId: string;
    originXMm: number;
    originZMm: number;
  } | null>(null);

  const [draftWaypoints, setDraftWaypoints] = useState<HallwayWaypoint[]>([]);
  const [hallwayHover, setHallwayHover] = useState<HallwayWaypoint | null>(null);
  const [hoveredWall, setHoveredWall] = useState<{
    placementId: string;
    wallIndex: number;
  } | null>(null);

  const [waypointDrag, setWaypointDrag] = useState<WaypointDrag>(null);
  const waypointDragRef = useRef<WaypointDrag>(null);
  const [hallwayPreview, setHallwayPreview] = useState<
    Record<string, HallwayWaypoint[]>
  >({});

  const [openingDrag, setOpeningDrag] = useState<OpeningDrag>(null);
  const openingDragRef = useRef<OpeningDrag>(null);

  const viewBox = useMemo(() => {
    const minX = bounds.minX - PADDING_MM;
    const maxX = bounds.maxX + PADDING_MM;
    const minZ = bounds.minZ - PADDING_MM;
    const maxZ = bounds.maxZ + PADDING_MM;
    return {
      minX,
      minZ,
      width: maxX - minX,
      height: maxZ - minZ,
    };
  }, [bounds]);

  function toSvgX(mm: number) {
    return (mm - viewBox.minX) * PX_PER_MM;
  }

  function toSvgY(mm: number) {
    return (mm - viewBox.minZ) * PX_PER_MM;
  }

  function fromSvgX(px: number) {
    return px / PX_PER_MM + viewBox.minX;
  }

  function fromSvgY(py: number) {
    return py / PX_PER_MM + viewBox.minZ;
  }

  function pointerToWorldFromClient(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: fromSvgX(clientX - rect.left),
      z: fromSvgY(clientY - rect.top),
    };
  }

  function pointerToWorld(event: React.PointerEvent) {
    return pointerToWorldFromClient(event.clientX, event.clientY);
  }

  function activateTool(nextTool: FloorPlanTool) {
    setTool(nextTool);
    setDraftWaypoints([]);
    setHallwayHover(null);
    setHoveredWall(null);
    setOpeningDrag(null);
    openingDragRef.current = null;
    setWaypointDrag(null);
    waypointDragRef.current = null;
  }

  function cancelActiveTool() {
    activateTool("select");
  }

  async function finishHallway() {
    if (draftWaypoints.length < 2) return;
    await addHallway(activeUnit.id, draftWaypoints);
    activateTool("select");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (tool !== "select" || draftWaypoints.length > 0) {
          event.preventDefault();
          cancelActiveTool();
        }
        return;
      }
      if (event.key === "Enter" && tool === "hallway" && draftWaypoints.length >= 2) {
        event.preventDefault();
        void finishHallway();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function updateHallwayHoverFromWorld(world: { x: number; z: number } | null) {
    if (!world || tool !== "hallway" || rooms.length === 0) {
      setHallwayHover(null);
      setHoveredWall(null);
      return;
    }
    const hit = findWallHit(rooms, world.x, world.z);
    if (!hit) {
      setHallwayHover(null);
      setHoveredWall(null);
      return;
    }
    setHallwayHover({ xMm: hit.x, zMm: hit.z });
    setHoveredWall({ placementId: hit.room.placementId, wallIndex: hit.wallIndex });
  }

  function handlePointerDownRoom(room: PlacedRoom, event: React.PointerEvent) {
    if (tool !== "select") return;
    const svg = svgRef.current;
    if (!svg) return;
    event.preventDefault();
    event.stopPropagation();
    svg.setPointerCapture(event.pointerId);
    const world = pointerToWorld(event);
    if (!world) return;
    dragOffset.current = {
      x: world.x - room.originXMm,
      z: world.z - room.originZMm,
    };
    setDragPlacementId(room.placementId);
    const preview = {
      placementId: room.placementId,
      originXMm: room.originXMm,
      originZMm: room.originZMm,
    };
    dragPreviewRef.current = preview;
    setDragPreview(preview);
  }

  function handlePointerMove(event: React.PointerEvent) {
    const world = pointerToWorld(event);

    if (dragPlacementId) {
      if (!world) return;
      const preview = {
        placementId: dragPlacementId,
        originXMm: Math.round(world.x - dragOffset.current.x),
        originZMm: Math.round(world.z - dragOffset.current.z),
      };
      dragPreviewRef.current = preview;
      setDragPreview(preview);
      return;
    }

    if (waypointDrag) {
      if (!world) return;
      const snapped = snapToNearestWall(rooms, world.x, world.z);
      const next = {
        ...waypointDrag,
        xMm: snapped ? snapped.x : Math.round(world.x),
        zMm: snapped ? snapped.z : Math.round(world.z),
      };
      waypointDragRef.current = next;
      setWaypointDrag(next);
      setHallwayPreview((current) => {
        const hallway = hallways.find((item) => item.id === next.hallwayId);
        if (!hallway) return current;
        const waypoints = hallway.waypointsMm.map((waypoint, index) =>
          index === next.index
            ? { xMm: next.xMm, zMm: next.zMm }
            : waypoint,
        );
        return { ...current, [next.hallwayId]: waypoints };
      });
      return;
    }

    if (openingDrag && tool === "open-walls") {
      if (!world) return;
      const room = rooms.find((item) => item.placementId === openingDrag.placementId);
      if (!room) return;
      const projected = projectPointToWall(
        room,
        openingDrag.wallIndex,
        world.x,
        world.z,
      );
      if (!projected) return;
      const next = { ...openingDrag, endMm: projected.offsetMm };
      openingDragRef.current = next;
      setOpeningDrag(next);
      return;
    }

    if (tool === "hallway" && !waypointDrag && !openingDrag) {
      updateHallwayHoverFromWorld(world);
    }
  }

  function handlePointerLeave() {
    if (tool === "hallway") {
      setHallwayHover(null);
      setHoveredWall(null);
    }
  }

  function handlePointerUp(event: React.PointerEvent) {
    const svg = svgRef.current;
    svg?.releasePointerCapture(event.pointerId);

    if (dragPlacementId) {
      const preview = dragPreviewRef.current;
      if (preview) {
        void moveRoom(preview.placementId, preview.originXMm, preview.originZMm);
      }
      dragPreviewRef.current = null;
      setDragPlacementId(null);
      setDragPreview(null);
      return;
    }

    if (waypointDrag) {
      const drag = waypointDragRef.current;
      if (drag) {
        const hallway = hallways.find((item) => item.id === drag.hallwayId);
        if (hallway) {
          const waypoints = hallway.waypointsMm.map((waypoint, index) =>
            index === drag.index
              ? { xMm: drag.xMm, zMm: drag.zMm }
              : waypoint,
          );
          void updateHallwayWaypoints(drag.hallwayId, waypoints);
        }
      }
      waypointDragRef.current = null;
      setWaypointDrag(null);
      setHallwayPreview((current) => {
        if (!waypointDrag) return current;
        const { [waypointDrag.hallwayId]: _, ...rest } = current;
        return rest;
      });
      return;
    }

    if (openingDrag) {
      const drag = openingDragRef.current;
      if (drag) {
        const span = Math.abs(drag.endMm - drag.startMm);
        if (span < 80) {
          for (const room of rooms) {
            for (const opening of room.wallOpenings) {
              if (
                opening.wallIndex !== drag.wallIndex ||
                room.placementId !== drag.placementId
              ) {
                continue;
              }
              const mid = (opening.startMm + opening.endMm) / 2;
              if (Math.abs(mid - drag.startMm) < 120) {
                void removeWallOpening(room.placementId, opening.id);
                openingDragRef.current = null;
                setOpeningDrag(null);
                return;
              }
            }
          }
        } else {
          void addWallOpening(
            drag.placementId,
            drag.wallIndex,
            drag.startMm,
            drag.endMm,
          );
        }
      }
      openingDragRef.current = null;
      setOpeningDrag(null);
    }
  }

  function commitHallwayPoint(hit: WallHit) {
    const point: HallwayWaypoint = { xMm: hit.x, zMm: hit.z };
    setDraftWaypoints((current) => {
      const last = current[current.length - 1];
      if (
        last &&
        Math.hypot(last.xMm - point.xMm, last.zMm - point.zMm) < 50
      ) {
        return current;
      }
      return [...current, point];
    });
  }

  function handleWallPointerDown(
    room: PlacedRoom,
    wallIndex: number,
    event: React.PointerEvent,
  ) {
    const world = pointerToWorld(event);
    if (!world) return;

    if (tool === "hallway") {
      event.preventDefault();
      event.stopPropagation();
      const projected = projectPointToWall(room, wallIndex, world.x, world.z);
      if (!projected || projected.distanceMm > 280) return;
      commitHallwayPoint({
        room,
        wallIndex,
        x: projected.x,
        z: projected.z,
        offsetMm: projected.offsetMm,
      });
      return;
    }

    if (tool === "open-walls") {
      event.preventDefault();
      event.stopPropagation();
      const svg = svgRef.current;
      svg?.setPointerCapture(event.pointerId);
      const projected = projectPointToWall(room, wallIndex, world.x, world.z);
      if (!projected) return;
      const drag = {
        placementId: room.placementId,
        wallIndex,
        startMm: projected.offsetMm,
        endMm: projected.offsetMm,
      };
      openingDragRef.current = drag;
      setOpeningDrag(drag);
    }
  }

  function handleWaypointPointerDown(
    hallway: Hallway,
    index: number,
    event: React.PointerEvent,
  ) {
    if (tool !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    const svg = svgRef.current;
    svg?.setPointerCapture(event.pointerId);
    const waypoint = hallway.waypointsMm[index];
    const drag = {
      hallwayId: hallway.id,
      index,
      xMm: waypoint.xMm,
      zMm: waypoint.zMm,
    };
    waypointDragRef.current = drag;
    setWaypointDrag(drag);
  }

  const toolHint: Record<FloorPlanTool, string> = {
    select: "Drag rooms and hallway corners. Switch tools above to edit.",
    "add-room": "Choose a catalog room, then add it to the canvas.",
    hallway:
      "Click wall edges to place corners — preview follows your cursor. Finish when done.",
    "open-walls":
      "Drag along a wall to open it. Tap an existing opening to close it.",
  };

  const canvasCursor =
    tool === "select"
      ? ""
      : tool === "hallway"
        ? hallwayHover
          ? "cursor-crosshair"
          : "cursor-not-allowed"
        : tool === "open-walls"
          ? "cursor-crosshair"
          : "";

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border bg-background/80 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text">Floor Plan</h3>
            <p className="mt-0.5 text-sm text-muted">{toolHint[tool]}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-background p-1">
            {TOOLS.map(({ id, label }) => (
              <Button
                key={id}
                variant={tool === id ? "primary" : "ghost"}
                className="!px-3 !py-1.5 text-sm"
                onClick={() => activateTool(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {tool === "add-room" && (
          <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3">
            {available.length === 0 ? (
              <p className="text-sm text-muted">
                {state.rooms.length === 0
                  ? "Create rooms on the Rooms tab first."
                  : "All catalog rooms are already on this floor plan."}
              </p>
            ) : (
              <>
                <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-sm">
                  <span className="font-medium text-text">Catalog room</span>
                  <select
                    className="rounded-lg border border-border bg-background px-3 py-2 text-text"
                    value={selectedRoomId || available[0]?.id || ""}
                    onChange={(event) => setSelectedRoomId(event.target.value)}
                  >
                    {available.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} ({formatMm(room.widthMm, state.unitPreference)}{" "}
                        × {formatMm(room.lengthMm, state.unitPreference)})
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="primary"
                  onClick={() => {
                    const roomId = selectedRoomId || available[0]?.id;
                    if (roomId) {
                      void attachRoomToUnit(roomId);
                      activateTool("select");
                    }
                  }}
                >
                  Add to floor plan
                </Button>
              </>
            )}
          </div>
        )}

        {tool === "hallway" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Badge variant="sky">
              {draftWaypoints.length} point{draftWaypoints.length === 1 ? "" : "s"}
            </Badge>
            <span className="text-sm text-muted">
              Click walls on the canvas below
            </span>
            <Button
              variant="primary"
              disabled={draftWaypoints.length < 2}
              onClick={() => void finishHallway()}
            >
              Finish hallway
            </Button>
            <Button
              variant="ghost"
              disabled={draftWaypoints.length === 0}
              onClick={() => setDraftWaypoints([])}
            >
              Clear points
            </Button>
            <Button variant="ghost" onClick={cancelActiveTool}>
              Cancel (Esc)
            </Button>
          </div>
        )}

        {tool !== "select" && tool !== "add-room" && tool !== "hallway" && (
          <div className="mt-3 border-t border-border pt-3">
            <Button variant="ghost" onClick={cancelActiveTool}>
              Done editing (Esc)
            </Button>
          </div>
        )}

        {rooms.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3 text-sm">
            {rooms.map((room) => (
              <li
                key={room.placementId}
                className="flex items-center gap-2 rounded-lg border border-border px-2 py-1"
              >
                <span className="text-text">{room.name}</span>
                <Button
                  variant="ghost"
                  className="!px-2 !py-0.5 text-xs"
                  onClick={async () => {
                    if (
                      await confirm({
                        title: "Remove room?",
                        message: `Remove ${room.name} from this unit?`,
                        confirmLabel: "Remove",
                        destructive: true,
                      })
                    ) {
                      void detachRoomFromUnit(room.placementId);
                    }
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        ref={canvasRef}
        className={`relative bg-background/40 ${tool !== "select" ? "ring-2 ring-inset ring-primary/30" : ""}`}
      >
        <div className="overflow-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewBox.width * PX_PER_MM} ${viewBox.height * PX_PER_MM}`}
            className={`h-[min(68vh,640px)] min-h-[360px] w-full touch-none ${canvasCursor}`}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          >
            {rooms.length === 0 && (
              <text
                x={(viewBox.width * PX_PER_MM) / 2}
                y={(viewBox.height * PX_PER_MM) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted text-sm"
              >
                {tool === "add-room"
                  ? "Choose a room above, then Add to floor plan"
                  : "Use Add room to place catalog rooms on the floor plan"}
              </text>
            )}

            {hallways.map((hallway) => {
              const waypoints =
                hallwayPreview[hallway.id] ?? hallway.waypointsMm;
              if (waypoints.length < 2) return null;
              const points = waypoints
                .map(
                  (waypoint) =>
                    `${toSvgX(waypoint.xMm)},${toSvgY(waypoint.zMm)}`,
                )
                .join(" ");
              return (
                <g key={hallway.id}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={Math.max(hallway.widthMm * PX_PER_MM, 4)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.65}
                  />
                  {tool === "select" &&
                    waypoints.map((waypoint, index) => (
                      <circle
                        key={`${hallway.id}-${index}`}
                        cx={toSvgX(waypoint.xMm)}
                        cy={toSvgY(waypoint.zMm)}
                        r={8}
                        fill="var(--primary)"
                        stroke="white"
                        strokeWidth={2}
                        className="cursor-grab active:cursor-grabbing"
                        onPointerDown={(event) =>
                          handleWaypointPointerDown(hallway, index, event)
                        }
                      />
                    ))}
                </g>
              );
            })}

            {draftWaypoints.length >= 1 && (
              <g>
                {draftWaypoints.length >= 2 && (
                  <polyline
                    points={draftWaypoints
                      .map(
                        (waypoint) =>
                          `${toSvgX(waypoint.xMm)},${toSvgY(waypoint.zMm)}`,
                      )
                      .join(" ")}
                    fill="none"
                    stroke="var(--accent-coral)"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.9}
                  />
                )}
                {hallwayHover && (
                  <line
                    x1={toSvgX(
                      draftWaypoints[draftWaypoints.length - 1].xMm,
                    )}
                    y1={toSvgY(
                      draftWaypoints[draftWaypoints.length - 1].zMm,
                    )}
                    x2={toSvgX(hallwayHover.xMm)}
                    y2={toSvgY(hallwayHover.zMm)}
                    stroke="var(--accent-coral)"
                    strokeWidth={3}
                    strokeDasharray="6 5"
                    opacity={0.7}
                  />
                )}
                {draftWaypoints.map((waypoint, index) => (
                  <circle
                    key={`draft-${index}`}
                    cx={toSvgX(waypoint.xMm)}
                    cy={toSvgY(waypoint.zMm)}
                    r={7}
                    fill="var(--accent-coral)"
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}

            {hallwayHover && tool === "hallway" && (
              <circle
                cx={toSvgX(hallwayHover.xMm)}
                cy={toSvgY(hallwayHover.zMm)}
                r={10}
                fill="none"
                stroke="var(--accent-coral)"
                strokeWidth={3}
                opacity={0.95}
                style={{ pointerEvents: "none" }}
              />
            )}

            {rooms.map((room) => {
              const preview =
                dragPreview?.placementId === room.placementId
                  ? dragPreview
                  : null;
              const originXMm = preview?.originXMm ?? room.originXMm;
              const originZMm = preview?.originZMm ?? room.originZMm;
              const displayRoom = { ...room, originXMm, originZMm };
              const x = toSvgX(originXMm - room.widthMm / 2);
              const y = toSvgY(originZMm - room.lengthMm / 2);
              const w = room.widthMm * PX_PER_MM;
              const h = room.lengthMm * PX_PER_MM;
              const dragging = dragPlacementId === room.placementId;

              return (
                <g key={room.placementId}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={6}
                    fill={
                      dragging
                        ? "rgba(56,163,219,0.28)"
                        : "rgba(148,163,184,0.15)"
                    }
                    stroke={dragging ? "var(--primary)" : "var(--border)"}
                    strokeWidth={2}
                    className={
                      tool === "select"
                        ? "cursor-grab active:cursor-grabbing"
                        : undefined
                    }
                    style={
                      tool !== "select" ? { pointerEvents: "none" } : undefined
                    }
                    onPointerDown={(event) => handlePointerDownRoom(room, event)}
                  />
                  <text
                    x={x + w / 2}
                    y={y + h / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-current text-[11px] font-medium"
                    style={{ pointerEvents: "none" }}
                  >
                    {room.name}
                  </text>

                  {wallEdges(displayRoom).map((edge) => (
                    <WallEdgeOverlay
                      key={`${room.placementId}-${edge.wallIndex}`}
                      room={displayRoom}
                      edge={edge}
                      openings={openingsForWall(displayRoom, edge.wallIndex)}
                      openingDrag={
                        openingDrag?.placementId === room.placementId &&
                        openingDrag.wallIndex === edge.wallIndex
                          ? openingDrag
                          : null
                      }
                      tool={tool}
                      isHovered={
                        hoveredWall?.placementId === room.placementId &&
                        hoveredWall.wallIndex === edge.wallIndex
                      }
                      toSvgX={toSvgX}
                      toSvgY={toSvgY}
                      onWallPointerDown={(wall, event) =>
                        handleWallPointerDown(displayRoom, wall, event)
                      }
                    />
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        {tool === "hallway" && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-background/90 px-3 py-2 text-xs text-muted shadow-sm ring-1 ring-border">
            Click a highlighted wall edge to place each corner
          </div>
        )}
      </div>

      {hallways.length > 0 && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          <p className="text-sm font-medium text-text">Hallways</p>
          {hallways.map((hallway) => (
            <div
              key={hallway.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <span className="text-text">
                {hallway.name}
                <span className="ml-2 text-muted">
                  {hallway.waypointsMm.length} points
                </span>
              </span>
              <Button
                variant="ghost"
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Remove hallway?",
                      message: `Remove ${hallway.name}?`,
                      confirmLabel: "Remove",
                      destructive: true,
                    })
                  ) {
                    void deleteHallway(hallway.id);
                  }
                }}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function WallEdgeOverlay({
  room,
  edge,
  openings,
  openingDrag,
  tool,
  isHovered,
  toSvgX,
  toSvgY,
  onWallPointerDown,
}: {
  room: PlacedRoom;
  edge: ReturnType<typeof wallEdges>[number];
  openings: WallOpening[];
  openingDrag: OpeningDrag;
  tool: FloorPlanTool;
  isHovered: boolean;
  toSvgX: (mm: number) => number;
  toSvgY: (mm: number) => number;
  onWallPointerDown: (wallIndex: number, event: React.PointerEvent) => void;
}) {
  const isWallTool = tool === "hallway" || tool === "open-walls";
  const segments = solidSegmentsWithPreview(
    edge.lengthMm,
    openings,
    openingDrag,
  );

  return (
    <g>
      {isHovered && tool === "hallway" && (
        <line
          x1={toSvgX(edge.x1)}
          y1={toSvgY(edge.z1)}
          x2={toSvgX(edge.x2)}
          y2={toSvgY(edge.z2)}
          stroke="var(--accent-coral)"
          strokeWidth={8}
          strokeLinecap="round"
          opacity={0.85}
          style={{ pointerEvents: "none" }}
        />
      )}

      {openings.map((opening) => {
        const start = offsetToWorldOnWall(room, edge.wallIndex, opening.startMm);
        const end = offsetToWorldOnWall(room, edge.wallIndex, opening.endMm);
        return (
          <line
            key={opening.id}
            x1={toSvgX(start.x)}
            y1={toSvgY(start.z)}
            x2={toSvgX(end.x)}
            y2={toSvgY(end.z)}
            stroke="var(--accent-coral)"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray="4 4"
            opacity={0.9}
            style={{ pointerEvents: "none" }}
          />
        );
      })}

      {openingDrag &&
        (() => {
          const lo = Math.min(openingDrag.startMm, openingDrag.endMm);
          const hi = Math.max(openingDrag.startMm, openingDrag.endMm);
          const start = offsetToWorldOnWall(room, edge.wallIndex, lo);
          const end = offsetToWorldOnWall(room, edge.wallIndex, hi);
          return (
            <line
              x1={toSvgX(start.x)}
              y1={toSvgY(start.z)}
              x2={toSvgX(end.x)}
              y2={toSvgY(end.z)}
              stroke="var(--accent-coral)"
              strokeWidth={6}
              strokeLinecap="round"
              opacity={0.55}
              style={{ pointerEvents: "none" }}
            />
          );
        })()}

      {isWallTool && (
        <line
          x1={toSvgX(edge.x1)}
          y1={toSvgY(edge.z1)}
          x2={toSvgX(edge.x2)}
          y2={toSvgY(edge.z2)}
          stroke="transparent"
          strokeWidth={22}
          className={tool === "hallway" ? "cursor-crosshair" : "cursor-crosshair"}
          onPointerDown={(event) => onWallPointerDown(edge.wallIndex, event)}
        />
      )}
    </g>
  );
}

function solidSegmentsWithPreview(
  lengthMm: number,
  openings: WallOpening[],
  preview: OpeningDrag,
): Array<{ startMm: number; endMm: number }> {
  const merged = [...openings];
  if (preview) {
    merged.push({
      id: "preview",
      wallIndex: preview.wallIndex,
      startMm: preview.startMm,
      endMm: preview.endMm,
    });
  }

  const ranges = merged
    .map((opening) => ({
      startMm: Math.max(0, Math.min(opening.startMm, opening.endMm)),
      endMm: Math.min(lengthMm, Math.max(opening.startMm, opening.endMm)),
    }))
    .filter((range) => range.endMm - range.startMm > 50)
    .sort((a, b) => a.startMm - b.startMm);

  const segments: Array<{ startMm: number; endMm: number }> = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.startMm > cursor + 50) {
      segments.push({ startMm: cursor, endMm: range.startMm });
    }
    cursor = Math.max(cursor, range.endMm);
  }
  if (lengthMm > cursor + 50) {
    segments.push({ startMm: cursor, endMm: lengthMm });
  }
  if (segments.length === 0 && ranges.length === 0) {
    segments.push({ startMm: 0, endMm: lengthMm });
  }
  return segments;
}
