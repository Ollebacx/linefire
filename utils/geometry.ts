
import { Position, GameObject } from '../types';

export const distanceBetweenPoints = (pos1: Position, pos2: Position): number => {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const distanceBetweenGameObjects = (obj1: GameObject, obj2: GameObject): number => {
  const center1 = { x: obj1.x + obj1.width / 2, y: obj1.y + obj1.height / 2 };
  const center2 = { x: obj2.x + obj2.width / 2, y: obj2.y + obj2.height / 2 };
  return distanceBetweenPoints(center1, center2);
};

export const checkCollision = (obj1: GameObject, obj2: GameObject): boolean => {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  );
};

export const normalizeVector = (pos: Position): Position => {
  const mag = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: pos.x / mag, y: pos.y / mag };
};

export const getCenter = (obj: GameObject): Position => {
    return { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
};
