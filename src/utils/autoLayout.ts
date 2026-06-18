import { CanvasObject } from '../types/canvas';

const ALIGN_GRID = 24;
const PLACEMENT_GAP = 20;
const SEARCH_LIMIT = 48;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const roundToGrid = (value: number, grid = ALIGN_GRID) => Math.round(value / grid) * grid;
const ceilToGrid = (value: number, grid = ALIGN_GRID) => Math.ceil(value / grid) * grid;

const getObjectRect = (object: CanvasObject): Rect => ({
  x: object.position.x,
  y: object.position.y,
  width: object.size.width,
  height: object.size.height,
});

const intersects = (a: Rect, b: Rect, gap = PLACEMENT_GAP) => {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
};

const collidesWithObjects = (rect: Rect, objects: CanvasObject[]) => {
  return objects.some((object) => intersects(rect, getObjectRect(object)));
};

const findAvailablePosition = (
  objects: CanvasObject[],
  desired: { x: number; y: number },
  size: { width: number; height: number }
) => {
  const stepX = ceilToGrid(size.width + PLACEMENT_GAP);
  const stepY = ceilToGrid(size.height + PLACEMENT_GAP);
  const baseX = roundToGrid(desired.x);
  const baseY = roundToGrid(desired.y);

  const baseRect: Rect = { x: baseX, y: baseY, width: size.width, height: size.height };
  if (!collidesWithObjects(baseRect, objects)) {
    return { x: baseX, y: baseY };
  }

  for (let row = 0; row <= SEARCH_LIMIT; row++) {
    const maxCol = Math.max(1, row + 1);
    for (let col = 0; col <= maxCol; col++) {
      const candidates = [
        { x: baseX + col * stepX, y: baseY + row * stepY },
        { x: baseX - col * stepX, y: baseY + row * stepY },
        { x: baseX + col * stepX, y: baseY - row * stepY },
      ];

      for (const candidate of candidates) {
        const rect: Rect = {
          x: candidate.x,
          y: candidate.y,
          width: size.width,
          height: size.height,
        };

        if (!collidesWithObjects(rect, objects)) {
          return candidate;
        }
      }
    }
  }

  return { x: baseX, y: baseY };
};

export const placeIncomingObject = (objects: CanvasObject[], object: CanvasObject): CanvasObject => {
  const position = findAvailablePosition(objects, object.position, object.size);
  return {
    ...object,
    position,
  };
};

export const placeIncomingObjects = (objects: CanvasObject[], incomingObjects: CanvasObject[]): CanvasObject[] => {
  if (incomingObjects.length === 0) return incomingObjects;
  if (incomingObjects.length === 1) return [placeIncomingObject(objects, incomingObjects[0])];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const object of incomingObjects) {
    minX = Math.min(minX, object.position.x);
    minY = Math.min(minY, object.position.y);
    maxX = Math.max(maxX, object.position.x + object.size.width);
    maxY = Math.max(maxY, object.position.y + object.size.height);
  }

  const groupSize = {
    width: maxX - minX,
    height: maxY - minY,
  };

  const groupOrigin = findAvailablePosition(objects, { x: minX, y: minY }, groupSize);
  const offsetX = groupOrigin.x - minX;
  const offsetY = groupOrigin.y - minY;

  return incomingObjects.map((object) => ({
    ...object,
    position: {
      x: roundToGrid(object.position.x + offsetX),
      y: roundToGrid(object.position.y + offsetY),
    },
  }));
};
