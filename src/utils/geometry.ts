import type { Position, GameObject } from '../types';

/**
 * Euclidean distance between the centers of two GameObjects.
 */
export function distanceBetweenGameObjects(a: GameObject, b: GameObject): number {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

/**
 * Euclidean distance between two raw points.
 */
export function distanceBetweenPoints(a: Position, b: Position): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * AABB overlap check.
 */
export function checkCollision(a: GameObject, b: GameObject): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Normalises a vector, returning {x:1, y:0} for zero-length inputs.
 */
export function normalizeVector(v: Position): Position {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2);
  if (len < 0.0001) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/**
 * Returns the centre point of a GameObject.
 */
export function getCenter(obj: GameObject): Position {
  return { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
}
