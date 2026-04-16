/**
 * Each shape has:
 * - id: unique identifier
 * - name: display name (in English + Sinhala)
 * - category: for filtering
 * - idealPath: array of [x,y] points (0–1 normalised, scaled at render time)
 * - startPoint: [x,y] where the green dot appears
 * - endPoint:   [x,y] where the red dot appears
 * - dotPositions: intermediate guide dots along the path
 */

export const SRI_LANKAN_SHAPES = {
  elephant_cloud: {
    id: 'elephant_cloud_01',
    name: 'Elephant Cloud',
    nameSinhala: 'ඇත් වළාකුළ',
    category: 'animal',
    // Simplified elephant silhouette — trunk curves left, back rounds up
    idealPath: [
      [0.20, 0.80], // start — base of back leg
      [0.20, 0.55], // up the back leg
      [0.25, 0.40], // body bottom left
      [0.30, 0.25], // back curves up
      [0.50, 0.18], // top of back (highest point)
      [0.65, 0.22], // head top
      [0.72, 0.32], // forehead
      [0.75, 0.42], // face
      [0.70, 0.50], // below ear
      [0.60, 0.55], // neck
      [0.55, 0.45], // chest
      [0.45, 0.55], // tummy
      [0.40, 0.65], // front leg top
      [0.38, 0.80], // front leg bottom — end
    ],
    startPoint: [0.20, 0.80],
    endPoint:   [0.38, 0.80],
    dotPositions: [
      [0.20, 0.55], [0.35, 0.22], [0.50, 0.18],
      [0.72, 0.32], [0.60, 0.55], [0.38, 0.80]
    ]
  },

  mango_tree: {
    id: 'mango_tree_01',
    name: 'Mango Tree',
    nameSinhala: 'අඹ ගස',
    category: 'plant',
    idealPath: [
      [0.50, 0.90], // trunk base — start
      [0.50, 0.70], // trunk top
      [0.40, 0.60], // branch left
      [0.30, 0.45], // left crown
      [0.40, 0.30], // crown top left
      [0.50, 0.22], // crown peak
      [0.60, 0.30], // crown top right
      [0.70, 0.45], // right crown
      [0.60, 0.60], // branch right
      [0.50, 0.70], // back to trunk
    ],
    startPoint: [0.50, 0.90],
    endPoint:   [0.50, 0.70],
    dotPositions: [
      [0.50, 0.70], [0.35, 0.45], [0.50, 0.22], [0.65, 0.45]
    ]
  },

  lotus: {
    id: 'lotus_01',
    name: 'Lotus Flower',
    nameSinhala: 'නෙළුම් මල',
    category: 'plant',
    idealPath: [
      [0.50, 0.85], // stem base — start
      [0.50, 0.65], // stem top
      [0.38, 0.55], // left petal base
      [0.30, 0.38], // left petal tip
      [0.42, 0.42], // inner left
      [0.50, 0.28], // centre top
      [0.58, 0.42], // inner right
      [0.70, 0.38], // right petal tip
      [0.62, 0.55], // right petal base
      [0.50, 0.65], // back to centre
    ],
    startPoint: [0.50, 0.85],
    endPoint:   [0.50, 0.65],
    dotPositions: [
      [0.50, 0.65], [0.30, 0.38], [0.50, 0.28], [0.70, 0.38]
    ]
  },

  peacock: {
    id: 'peacock_01',
    name: 'Peacock',
    nameSinhala: 'මොනරා',
    category: 'animal',
    idealPath: [
      [0.50, 0.85], // feet — start
      [0.50, 0.70], // legs
      [0.48, 0.58], // body base
      [0.45, 0.45], // body
      [0.47, 0.35], // neck
      [0.50, 0.25], // head
      [0.55, 0.22], // beak direction
      [0.52, 0.30], // back to neck
      [0.58, 0.40], // back
      [0.65, 0.30], // tail feather right
      [0.70, 0.22], // tail tip right
      [0.60, 0.25], // tail mid
      [0.50, 0.20], // tail centre top
      [0.40, 0.25], // tail mid left
      [0.32, 0.22], // tail tip left
    ],
    startPoint: [0.50, 0.85],
    endPoint:   [0.32, 0.22],
    dotPositions: [
      [0.50, 0.70], [0.50, 0.25], [0.65, 0.30], [0.50, 0.20], [0.32, 0.22]
    ]
  },

  woodapple: {
    id: 'woodapple_01',
    name: 'Wood Apple',
    nameSinhala: 'දිවුල්',
    category: 'fruit',
    idealPath: [
      [0.50, 0.82], // bottom — start
      [0.35, 0.75], // lower left
      [0.25, 0.60], // left side
      [0.28, 0.42], // upper left
      [0.40, 0.28], // top left
      [0.50, 0.22], // top centre
      [0.60, 0.28], // top right
      [0.72, 0.42], // upper right
      [0.75, 0.60], // right side
      [0.65, 0.75], // lower right
      [0.50, 0.82], // back to bottom — end
    ],
    startPoint: [0.50, 0.82],
    endPoint:   [0.50, 0.82],
    dotPositions: [
      [0.25, 0.60], [0.50, 0.22], [0.75, 0.60]
    ]
  }
};

// Get shapes appropriate for a difficulty level
export function getShapesForDifficulty(level) {
  const allShapes = Object.values(SRI_LANKAN_SHAPES);
  // Level 1-2: rounder simpler shapes (woodapple, lotus)
  // Level 3-4: more complex (elephant, tree)
  // Level 5: all shapes including peacock
  const complexityMap = {
    1: ['woodapple_01', 'lotus_01'],
    2: ['woodapple_01', 'lotus_01', 'mango_tree_01'],
    3: ['lotus_01', 'mango_tree_01', 'elephant_cloud_01'],
    4: ['mango_tree_01', 'elephant_cloud_01', 'peacock_01'],
    5: ['elephant_cloud_01', 'peacock_01'],
  };
  const ids = complexityMap[level] || complexityMap[1];
  return allShapes.filter(s => ids.includes(s.id));
}