/**
 * Autism-friendly tracing shapes for young children.
 *
 * Design principles:
 * ─────────────────────────────────────────────────────────
 * • All paths are CLOCKWISE — the most natural direction for developing motor control.
 * • Paths flow continuously with NO sharp reversals or backtracking.
 * • Start points are at the BOTTOM or BOTTOM-LEFT — gravity-natural for small hands.
 * • Curves are smooth and gradual; angles are rounded (children trace curves more easily than corners).
 * • Dot positions mark natural "pause points" every ~15–20% of path length — enough guidance without overload.
 * • Level 1 shapes are nearly perfect primitives (circle, simple star).
 * • Complexity grows gradually: Level 2 adds mild lobes/curves; Level 3 adds distinct silhouette features; Level 4 has compound outlines.
 * • All coordinates are NORMALISED (0–1). Scale to canvas at render time.
 *   Typical canvas: 400×400. So point [0.5, 0.5] → pixel (200, 200).
 *
 * Scoring guidance:
 * ─────────────────────────────────────────────────────────
 * Compute per-point deviation: for each sampled child stroke point find the
 * nearest point on the idealPath polyline and measure Euclidean distance.
 * Score = 100 − clamp(avgDeviation / tolerancePx × 100, 0, 100)
 * Recommended tolerancePx: Level 1 = 28px, Level 2 = 24px, Level 3 = 20px, Level 4 = 18px
 */

export const SHAPES = {

  // ══════════════════════════════════════════════
  // LEVEL 1 — Ball (circle) & Star
  // Simple, near-primitive forms. Wide tolerance.
  // ══════════════════════════════════════════════

  ball: {
    id: 'ball_01',
    name: 'Ball',
    nameSinhala: 'බෝලය',
    category: 'basic',
    level: 1,
    /**
     * A near-perfect clockwise circle.
     * Start at the bottom (6 o'clock). Trace right → up → left → down → close.
     * 16 evenly-spaced points on the unit circle, radius ~0.30 centred at (0.50, 0.50).
     * Small children trace circles as their very first shape — big, round, forgiving.
     */
    idealPath: [
      [0.50, 0.80], // 0  — start: bottom centre (6 o'clock)
      [0.57, 0.79], // 1
      [0.64, 0.75], // 2  — lower right
      [0.70, 0.68], // 3
      [0.74, 0.60], // 4  — right side
      [0.76, 0.51], // 5
      [0.74, 0.42], // 6  — upper right
      [0.70, 0.34], // 7
      [0.63, 0.27], // 8  — top right
      [0.55, 0.22], // 9
      [0.45, 0.22], // 10 — top left
      [0.37, 0.27], // 11
      [0.30, 0.34], // 12 — upper left
      [0.26, 0.42], // 13
      [0.24, 0.51], // 14 — left side
      [0.26, 0.60], // 15
      [0.30, 0.68], // 16 — lower left
      [0.36, 0.75], // 17
      [0.43, 0.79], // 18
      [0.50, 0.80], // 19 — close back to start
    ],
    startPoint: [0.50, 0.80],
    endPoint:   [0.50, 0.80],
    dotPositions: [
  [0.70, 0.68], // lower-right (first hit when tracing CW from bottom)
  [0.74, 0.51], // right-side midpoint
  [0.50, 0.22], // top centre
  [0.24, 0.51], // left-side midpoint
],
    tolerancePx: 28,
    strokeColor: '#E24B4A',
  },

  star: {
    id: 'star_01',
    name: 'Star',
    nameSinhala: 'තරුව',
    category: 'basic',
    level: 1,
    /**
     * A clean 5-pointed star, clockwise from the bottom-left inner valley.
     * Children trace along the outside edge — no criss-crossing.
     * Path goes: inner valley → outer tip → inner valley → outer tip … (10 steps total, close).
     * Outer radius ~0.30, inner radius ~0.12, centre (0.50, 0.48).
     * Tip order (clockwise from bottom-left): bottom-left tip → bottom-right tip →
     * right tip → top-right tip → top tip → … — standard star winding.
     *
     * Computed with:
     *   tipAngle[k]   = -90° + k × 72°   (k = 0..4) — outer tips
     *   valleyAngle[k] = tipAngle[k] + 36° — inner valleys
     */
    idealPath: [
      // Start at the inner valley just LEFT of the bottom-left tip (natural pen-down)
      [0.39, 0.67], // inner valley 0 (between tip4 and tip0)  ← start
      [0.22, 0.58], // outer tip 0  — left tip
      [0.35, 0.43], // inner valley 1
      [0.29, 0.23], // outer tip 1  — upper-left tip
      [0.50, 0.34], // inner valley 2
      [0.71, 0.23], // outer tip 2  — upper-right tip
      [0.65, 0.43], // inner valley 3
      [0.78, 0.58], // outer tip 3  — right tip
      [0.61, 0.67], // inner valley 4
      [0.50, 0.80], // outer tip 4  — bottom tip
      [0.39, 0.67], // close — back to start
    ],
    startPoint: [0.39, 0.67],
    endPoint:   [0.39, 0.67],
    dotPositions: [
      [0.22, 0.58], // left tip
      [0.50, 0.34], // top inner valley
      [0.78, 0.58], // right tip
      [0.50, 0.80], // bottom tip
    ],
    tolerancePx: 28,
    strokeColor: '#EF9F27',
  },

  // ══════════════════════════════════════════════
  // LEVEL 2 — Flower & Banana
  // Recognisable outlines, flowing curves, mild detail.
  // ══════════════════════════════════════════════

  flower: {
    id: 'flower_01',
    name: 'Flower',
    nameSinhala: 'මල',
    category: 'plant',
    level: 2,
    /**
     * A simple 5-petal flower, viewed from above.
     * Centre at (0.50, 0.52), petal radius ~0.22, petal half-width ~0.08.
     * Each petal is traced as an outward bulge then return to centre ring.
     * Clockwise from bottom petal. Centre ring radius ~0.08.
     *
     * Movement: start at bottom-petal base → bulge out to petal tip → back to centre →
     * rotate 72° clockwise → next petal … → return to start.
     * Child essentially makes 5 rounded teardrops arranged in a ring.
     */
    idealPath: [
      [0.50, 0.60], // centre base — START

      // Petal 1 — BOTTOM
      [0.44, 0.64],
      [0.38, 0.72],
      [0.43, 0.80],
      [0.50, 0.83],
      [0.57, 0.80],
      [0.62, 0.72],
      [0.56, 0.64],
      [0.52, 0.59],

      // Petal 2 — BOTTOM-RIGHT
      [0.58, 0.56],
      [0.66, 0.53],
      [0.71, 0.47],
      [0.73, 0.40],
      [0.68, 0.34],
      [0.62, 0.35],
      [0.55, 0.40],
      [0.52, 0.45],

      // Petal 3 — TOP-RIGHT
      [0.56, 0.39],
      [0.58, 0.31],
      [0.53, 0.24],
      [0.47, 0.27],
      [0.44, 0.33],
      [0.45, 0.39],
      [0.50, 0.44],

      // Petal 4 — TOP-LEFT
      [0.47, 0.40],
      [0.40, 0.37],
      [0.33, 0.35],
      [0.29, 0.40],
      [0.28, 0.46],
      [0.33, 0.52],
      [0.40, 0.55],

      // Petal 5 — BOTTOM-LEFT
      [0.41, 0.57],
      [0.35, 0.60],
      [0.31, 0.65],
      [0.33, 0.72],
      [0.38, 0.78],
      [0.45, 0.76],
      [0.49, 0.70],
      [0.50, 0.64],

      [0.50, 0.60], // CLOSE — back to start
    ],
    startPoint: [0.50, 0.60],
    endPoint:   [0.50, 0.60],
    dotPositions: [
      [0.50, 0.83], // bottom petal tip
      [0.73, 0.40], // bottom-right tip
      [0.52, 0.24], // top-right tip
      [0.29, 0.40], // top-left tip
      [0.38, 0.78], // bottom-left tip
    ],
    tolerancePx: 24,
    strokeColor: '#D4537E',
  },

  banana: {
    id: 'banana_01',
    name: 'Banana',
    nameSinhala: 'කෙසෙල්',
    category: 'fruit',
    level: 2,
    /**
     * A banana silhouette: gently curved, tapered at both ends.
     * Orientation: curved upward — like a smile — widest in the middle.
     * The outer (top) edge is a single long convex arc.
     * The inner (bottom) edge is a tighter concave arc.
     * Start at LEFT tip, trace the outer curve to RIGHT tip, then trace the inner curve back.
     *
     * Key proportions:
     *  - Left tip:  (0.14, 0.55)
     *  - Right tip: (0.85, 0.55)
     *  - Outer arc apex (top):  (0.50, 0.28)   — widest bulge upward
     *  - Inner arc apex (btm):  (0.50, 0.48)   — concave belly
     *  - Max width at centre:   outer at y=0.28, inner at y=0.48 → ~0.20 normalised height
     */
    idealPath: [
      // ── OUTER (top) EDGE — left tip → right tip ──
      [0.14, 0.55], // LEFT TIP — START
      [0.18, 0.48], // ramp up left
      [0.24, 0.40], // upper left shoulder
      [0.32, 0.33], // climbing left
      [0.40, 0.29], // near apex left
      [0.50, 0.27], // OUTER APEX (topmost point)
      [0.60, 0.29], // near apex right
      [0.68, 0.33], // climbing right
      [0.76, 0.40], // upper right shoulder
      [0.82, 0.48], // ramp down right
      [0.86, 0.55], // RIGHT TIP

      // ── INNER (bottom) EDGE — right tip → left tip ──
      [0.82, 0.58], // round the right tip
      [0.76, 0.54], // inner right shoulder
      [0.68, 0.50], // concave inner right
      [0.58, 0.47], // inner right belly
      [0.50, 0.46], // INNER APEX (shallowest concave point)
      [0.42, 0.47], // inner left belly
      [0.32, 0.50], // concave inner left
      [0.24, 0.54], // inner left shoulder
      [0.18, 0.57], // round the left tip
      [0.14, 0.55], // CLOSE — back to LEFT TIP
    ],
    startPoint: [0.14, 0.55],
    endPoint:   [0.14, 0.55],
    dotPositions: [
      [0.32, 0.33], // upper left
      [0.50, 0.27], // outer apex
      [0.68, 0.33], // upper right
      [0.86, 0.55], // right tip
      [0.50, 0.46], // inner apex
    ],
    tolerancePx: 24,
    strokeColor: '#EF9F27',
  },

  // ══════════════════════════════════════════════
  // LEVEL 3 — Ship & Car
  // Compound silhouettes with flat bottoms and distinct upper features.
  // ══════════════════════════════════════════════

  ship: {
    id: 'ship_01',
    name: 'Ship',
    nameSinhala: 'නැව',
    category: 'vehicle',
    level: 3,
    /**
     * A simple cargo/ferry ship silhouette — side view, facing right.
     * Hull: a flat bottom with a bow that curves up to the right and a stern (left) that is vertical.
     * Superstructure: a rectangular bridge/cabin sits centre-left on the deck.
     * Funnel: a small rectangle on top of the bridge.
     *
     * Tracing order (clockwise from stern base):
     *  1. Bottom hull — straight left to right
     *  2. Bow curve — rounds up from waterline to deck height
     *  3. Deck — right to left across the top
     *  4. Funnel top (right side up, across, down left side)
     *  5. Bridge right wall down
     *  6. Deck gap
     *  7. Stern top down
     *  8. Return to start
     *
     * This continuous clockwise trace is achievable in one stroke for a young child.
     */
    idealPath: [
      // ── HULL BOTTOM — left (stern) to right (bow) ──
      [0.12, 0.72], // stern base — START
      [0.20, 0.75], // hull underside begins
      [0.32, 0.76], // hull midpoint
      [0.44, 0.76], // hull right half
      [0.56, 0.75], // approaching bow
      [0.66, 0.73], // bow start curving up
      [0.74, 0.68], // bow mid curve
      [0.80, 0.62], // bow upper curve
      [0.83, 0.56], // bow neck

      // ── DECK TOP — right (bow) to left (stern) ──
      [0.83, 0.52], // bow top / deck right end
      [0.74, 0.50], // deck right section
      [0.66, 0.50], // deck mid-right

      // ── FUNNEL (small rectangle, clockwise) ──
      [0.60, 0.50], // funnel base-right
      [0.60, 0.40], // funnel right wall up
      [0.54, 0.38], // funnel top right
      [0.48, 0.38], // funnel top left
      [0.48, 0.44], // funnel left wall down (partial — chimney taper)
      [0.48, 0.50], // funnel base-left

      // ── BRIDGE / CABIN (rectangle on deck) ──
      [0.44, 0.50], // bridge base-right
      [0.44, 0.42], // bridge right wall up
      [0.38, 0.42], // bridge top right
      [0.28, 0.42], // bridge top mid
      [0.22, 0.42], // bridge top left
      [0.22, 0.50], // bridge left wall down

      // ── REMAINING DECK — left of bridge ──
      [0.18, 0.50], // deck left section
      [0.12, 0.50], // stern deck

      // ── STERN — vertical drop ──
      [0.12, 0.72], // CLOSE — back to start (stern base)
    ],
    startPoint: [0.12, 0.72],
    endPoint:   [0.12, 0.72],
    dotPositions: [
      [0.44, 0.76], // hull midpoint
      [0.83, 0.56], // bow tip area
      [0.54, 0.38], // funnel top
      [0.28, 0.42], // bridge top centre
      [0.12, 0.50], // stern deck
    ],
    tolerancePx: 20,
    strokeColor: '#378ADD',
  },

  car: {
    id: 'car_01',
    name: 'Car',
    nameSinhala: 'කාරය',
    category: 'vehicle',
    level: 3,
    /**
     * A simple saloon/sedan car — side view, facing right.
     * Silhouette has: flat bottom with two wheel arches cut out,
     * a cabin that rises in a smooth arc, and a sloped bonnet (hood) and boot (trunk).
     *
     * Tracing order (clockwise from left bumper base):
     *  1. Bottom / chassis — left to right (with wheel arches as slight upward curves)
     *  2. Right bumper up
     *  3. Bonnet slope up
     *  4. Windshield up
     *  5. Roofline arc
     *  6. Rear window slope down
     *  7. Boot curve down
     *  8. Left bumper back down to start
     *
     * Wheel arches: traced as shallow upward U-curves inside the bottom edge.
     * Children love tracing cars — this shape is highly motivating.
     */
    idealPath: [
      // ── UNDERSIDE (left → right) with wheel arches ──
      [0.10, 0.72], // front bumper base — START
      [0.18, 0.72], // under front wheel arch left edge
      [0.22, 0.68], // front wheel arch up-left
      [0.28, 0.66], // front wheel arch top
      [0.34, 0.68], // front wheel arch up-right
      [0.38, 0.72], // under front wheel arch right edge
      [0.46, 0.72], // chassis midpoint (flat)
      [0.54, 0.72], // under rear wheel arch left edge
      [0.58, 0.68], // rear wheel arch up-left
      [0.64, 0.66], // rear wheel arch top
      [0.70, 0.68], // rear wheel arch up-right
      [0.74, 0.72], // under rear wheel arch right edge
      [0.82, 0.72], // rear bumper base right

      // ── REAR / BOOT ──
      [0.88, 0.70], // rear bumper curve
      [0.90, 0.65], // boot base right
      [0.90, 0.58], // boot right wall up
      [0.88, 0.54], // boot slope

      // ── ROOFLINE (right → left) ──
      [0.82, 0.46], // rear window slope
      [0.74, 0.40], // roof right
      [0.62, 0.36], // roof centre
      [0.50, 0.34], // roof apex
      [0.38, 0.36], // roof left
      [0.28, 0.40], // windshield top
      [0.20, 0.46], // windshield slope
      [0.14, 0.53], // bonnet top left

      // ── FRONT / BONNET ──
      [0.10, 0.58], // bonnet left
      [0.10, 0.72], // CLOSE — front bumper base (back to start)
    ],
    startPoint: [0.10, 0.72],
    endPoint:   [0.10, 0.72],
    dotPositions: [
      [0.28, 0.66], // front wheel top
      [0.64, 0.66], // rear wheel top
      [0.90, 0.58], // boot right
      [0.50, 0.34], // roof apex
      [0.20, 0.46], // windshield
    ],
    wheelCenters: [
      [0.28, 0.66],
      [0.64, 0.66],
    ],
    tireRadius: 0.08,
    tireStrokeWidth: 3,
    tireStrokeColor: '#333',
    tolerancePx: 20,
    strokeColor: '#1D9E75',
  },

  // ══════════════════════════════════════════════
  // LEVEL 4 — Hand & T-Shirt
  // Complex, multi-feature outlines requiring fine motor control.
  // ══════════════════════════════════════════════

hand: {
  id: 'hand_01',
  name: 'Hand',
  nameSinhala: 'අත',
  category: 'body',
  level: 4,
  /**
   * An open right hand — palm facing viewer, fingers spread wide.
   *
   * Key redesign changes from v1:
   * ─────────────────────────────────────────────────────────
   * • Fingers spread across x=0.10–0.85 (was 0.18–0.75) — 40% wider
   * • Each finger is 0.09 units wide (was 0.06) — easier to trace up/down
   * • Valley depth increased to y=0.58 (was y=0.46–0.48) — clear dips
   *   between fingers give child obvious "turn here" feedback
   * • Finger x-centres evenly spaced:
   *   thumb=0.15, index=0.30, middle=0.46, ring=0.62, pinky=0.76
   * • Thumb angled further left — clearly distinct from index
   * • Wrist widened to match broader hand (x=0.22–0.78)
   * • tolerancePx raised to 22 — fingers are wider so tolerance scales up
   */
  idealPath: [
    // ── WRIST LEFT SIDE — up ──
    [0.26, 0.90], // wrist base left — START
    [0.24, 0.80], // left wrist up
    [0.22, 0.70], // palm left edge
    [0.18, 0.62], // thumb base left

    // ── THUMB — angled left, clearly separated ──
    [0.14, 0.57], // thumb left wall
    [0.11, 0.50], // thumb upper left
    [0.10, 0.43], // thumb tip approach
    [0.12, 0.36], // THUMB TIP
    [0.16, 0.38], // thumb tip right
    [0.19, 0.44], // thumb right upper
    [0.21, 0.51], // thumb right wall
    [0.23, 0.58], // thumb base right

    // ── WEB between thumb and index ──
    [0.25, 0.54], // web valley (deep)
    [0.26, 0.50], // index base left

    // ── INDEX FINGER ──
    [0.25, 0.43], // index left wall lower
    [0.24, 0.34], // index left wall upper
    [0.25, 0.25], // index tip approach
    [0.28, 0.20], // INDEX TIP
    [0.32, 0.23], // index tip right
    [0.33, 0.32], // index right wall upper
    [0.34, 0.41], // index right wall lower
    [0.34, 0.50], // index base right

    // ── VALLEY index–middle (deep) ──
    [0.35, 0.58], // valley

    // ── MIDDLE FINGER — tallest ──
    [0.37, 0.50], // middle base left
    [0.37, 0.40], // middle left wall lower
    [0.37, 0.30], // middle left wall upper
    [0.38, 0.20], // middle tip approach
    [0.42, 0.14], // MIDDLE TIP (apex — tallest)
    [0.47, 0.18], // middle tip right
    [0.48, 0.28], // middle right wall upper
    [0.49, 0.38], // middle right wall lower
    [0.50, 0.48], // middle base right

    // ── VALLEY middle–ring (deep) ──
    [0.51, 0.58], // valley

    // ── RING FINGER ──
    [0.53, 0.50], // ring base left
    [0.53, 0.40], // ring left wall lower
    [0.54, 0.30], // ring left wall upper
    [0.55, 0.22], // ring tip approach
    [0.58, 0.18], // RING TIP
    [0.62, 0.21], // ring tip right
    [0.63, 0.30], // ring right wall upper
    [0.64, 0.40], // ring right wall lower
    [0.65, 0.50], // ring base right

    // ── VALLEY ring–pinky (deep) ──
    [0.66, 0.58], // valley

    // ── PINKY FINGER — shortest ──
    [0.68, 0.52], // pinky base left
    [0.68, 0.44], // pinky left wall lower
    [0.69, 0.36], // pinky left wall upper
    [0.71, 0.28], // pinky tip approach
    [0.74, 0.24], // PINKY TIP
    [0.77, 0.27], // pinky tip right
    [0.78, 0.34], // pinky right wall upper
    [0.78, 0.42], // pinky right wall lower
    [0.77, 0.52], // pinky base right

    // ── PALM RIGHT + WRIST ──
    [0.78, 0.62], // palm right edge
    [0.77, 0.72], // palm lower right
    [0.76, 0.80], // wrist right side
    [0.74, 0.86], // wrist right lower

    // ── WRIST BASE ──
    [0.66, 0.90], // wrist base right
    [0.54, 0.92], // wrist base mid-right
    [0.40, 0.92], // wrist base mid-left
    [0.26, 0.90], // CLOSE — back to start
  ],
  startPoint: [0.26, 0.90],
  endPoint:   [0.26, 0.90],
  dotPositions: [
    // ── THUMB ──
    [0.11, 0.50], // 0 — thumb left mid
    [0.12, 0.36], // 1 — THUMB TIP
    [0.19, 0.44], // 2 — thumb right mid

    // ── INDEX ──
    [0.24, 0.34], // 3 — index left upper
    [0.28, 0.20], // 4 — INDEX TIP
    [0.33, 0.32], // 5 — index right upper

    // ── MIDDLE ──
    [0.37, 0.30], // 6 — middle left upper
    [0.42, 0.14], // 7 — MIDDLE TIP
    [0.48, 0.28], // 8 — middle right upper

    // ── RING ──
    [0.54, 0.30], // 9  — ring left upper
    [0.58, 0.18], // 10 — RING TIP
    [0.63, 0.30], // 11 — ring right upper

    // ── PINKY ──
    [0.69, 0.36], // 12 — pinky left upper
    [0.74, 0.24], // 13 — PINKY TIP
    [0.78, 0.34], // 14 — pinky right upper

    // ── PALM + WRIST ──
    [0.77, 0.72], // 15 — palm lower right
    [0.40, 0.92], // 16 — wrist base mid
  ],
  tolerancePx: 22,
  strokeColor: '#D4537E',
},

tshirt: {
  id: 'tshirt_01',
  name: 'T-Shirt',
  nameSinhala: 'ටී-ෂර්ට්',
  category: 'clothing',
  level: 4,
  /**
   * A T-shirt outline — front view, flat (as if laid on a table).
   *
   * Key redesign changes from v1:
   * ─────────────────────────────────────────────────────────
   * • Collar deepened from y=0.27 → y=0.40: the U-neck is now
   *   clearly visible and easy to trace (was nearly invisible before).
   * • Shoulders widened and lowered to y=0.30 so the collar-to-sleeve
   *   transition is a smooth gentle slope, not a sharp jag.
   * • Sleeves are wider (cuff spans x=0.08–0.20 left, x=0.80–0.92 right)
   *   and more horizontal — easier for small hands to follow.
   * • Body sides are perfectly vertical (no drift), making the long
   *   straight strokes predictable and calming for ASD children.
   * • Fewer sharp direction changes — every corner is rounded naturally.
   * • Dot spacing: one dot every ~15–20% of path length.
   * • tolerancePx raised to 22 (was 18) — level 4 but more forgiving
   *   on the long straight body sections.
   *
   * Tracing order (clockwise from bottom-left):
   *  1. Bottom hem — left to right (long straight, confidence-building)
   *  2. Right body side — straight up
   *  3. Right underarm flare — diagonal step outward
   *  4. Right sleeve — angled out to cuff, across cuff, back in
   *  5. Right shoulder slope — gentle curve down to collar entry
   *  6. Collar U — deep visible curve, right to left
   *  7. Left shoulder slope — up to sleeve
   *  8. Left sleeve — out to cuff, across, back in
   *  9. Left underarm flare — diagonal step inward
   * 10. Left body side — straight down
   * 11. Close to start
   */
  idealPath: [
    // ── BOTTOM HEM — left to right ──
    [0.18, 0.85], // hem bottom-left — START
    [0.34, 0.85], // hem left-centre
    [0.50, 0.85], // hem centre
    [0.66, 0.85], // hem right-centre
    [0.82, 0.85], // hem bottom-right

    // ── RIGHT BODY SIDE — straight up ──
    [0.82, 0.75], // right side lower
    [0.82, 0.65], // right side mid
    [0.82, 0.57], // right side upper / underarm junction

    // ── RIGHT UNDERARM FLARE ──
    [0.86, 0.53], // step outward
    [0.89, 0.48], // sleeve lower-right

    // ── RIGHT SLEEVE — out to cuff, across, back in ──
    [0.91, 0.42], // sleeve mid-right
    [0.92, 0.36], // sleeve cuff right corner
    [0.88, 0.32], // cuff top-right
    [0.80, 0.30], // cuff top centre        ← dot here
    [0.72, 0.32], // cuff top-left
    [0.68, 0.36], // sleeve upper-left
    [0.65, 0.42], // sleeve return lower

    // ── RIGHT SHOULDER SLOPE → COLLAR ──
    [0.62, 0.46], // shoulder right outer
    [0.60, 0.42], // shoulder right inner
    [0.56, 0.37], // neck slope right

    // ── COLLAR — deep U curve (right → bottom → left) ──
    [0.58, 0.36], // collar entry right
    [0.56, 0.34], // collar right wall
    [0.53, 0.38], // collar curve right
    [0.50, 0.40], // COLLAR BOTTOM — deepest point
    [0.47, 0.38], // collar curve left
    [0.44, 0.34], // collar left wall
    [0.42, 0.36], // collar exit left

    // ── LEFT SHOULDER SLOPE → SLEEVE ──
    [0.44, 0.37], // neck slope left
    [0.40, 0.42], // shoulder left inner
    [0.38, 0.46], // shoulder left outer
    [0.35, 0.42], // sleeve return lower

    // ── LEFT SLEEVE — out to cuff, across, back in ──
    [0.32, 0.36], // sleeve upper-right
    [0.28, 0.32], // cuff top-right
    [0.20, 0.30], // cuff top centre        ← dot here
    [0.12, 0.32], // cuff top-left
    [0.08, 0.36], // sleeve cuff left corner
    [0.09, 0.42], // sleeve mid-left
    [0.11, 0.48], // sleeve lower-left

    // ── LEFT UNDERARM FLARE ──
    [0.14, 0.53], // step inward
    [0.18, 0.57], // left body upper / underarm junction

    // ── LEFT BODY SIDE — straight down ──
    [0.18, 0.65], // left side mid
    [0.18, 0.75], // left side lower
    [0.18, 0.85], // CLOSE — back to start
  ],
  startPoint: [0.18, 0.85],
  endPoint:   [0.18, 0.85],
  dotPositions: [
    [0.50, 0.85], // 1 — hem centre (early win, confirms start direction)
    [0.82, 0.65], // 2 — right body mid (long straight section checkpoint)
    [0.80, 0.30], // 3 — right cuff centre (sleeve turnaround)
    [0.50, 0.40], // 4 — collar bottom (deepest point — most distinctive)
    [0.20, 0.30], // 5 — left cuff centre (sleeve turnaround)
    [0.18, 0.57], // 6 — left underarm junction
    [0.18, 0.75], // 7 — left body lower (almost home)
  ],
  tolerancePx: 22,
  strokeColor: '#7F77DD',
},
};

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

/** Return all shapes for a given level (1–4). */
export function getShapesForLevel(level) {
  return Object.values(SHAPES).filter(s => s.level === level);
}

/** Backward compatibility alias for getShapesForLevel */
export function getShapesForDifficulty(level) {
  return getShapesForLevel(level);
}

/** Backward compatibility alias for SHAPES */
export const SRI_LANKAN_SHAPES = SHAPES;

/**
 * Scale normalised path coordinates to canvas pixels.
 * @param {number[][]} path   — array of [x,y] in 0–1 range
 * @param {number}     width  — canvas width  in pixels
 * @param {number}     height — canvas height in pixels
 * @param {number}     [padding=20] — padding in pixels to keep dots off edges
 */
export function scalePath(path, width, height, padding = 20) {
  const w = width  - padding * 2;
  const h = height - padding * 2;
  return path.map(([nx, ny]) => [
    Math.round(padding + nx * w),
    Math.round(padding + ny * h),
  ]);
}

/**
 * Score a child's traced stroke against the ideal path.
 * @param {number[][]} childPoints  — array of [x,y] canvas pixels from touch/mouse events
 * @param {number[][]} scaledIdeal  — ideal path already scaled to canvas pixels
 * @param {number}     tolerancePx — acceptable deviation in pixels (from shape definition)
 * @returns {number} score 0–100
 */
export function scoreTrace(childPoints, scaledIdeal, tolerancePx) {
  if (!childPoints.length || !scaledIdeal.length) return 0;

  // Build a dense polyline for the ideal path (interpolate every 2px)
  const densePath = [];
  for (let i = 0; i < scaledIdeal.length - 1; i++) {
    const [x0, y0] = scaledIdeal[i];
    const [x1, y1] = scaledIdeal[i + 1];
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.round(dist / 2));
    for (let t = 0; t <= steps; t++) {
      densePath.push([
        x0 + (x1 - x0) * t / steps,
        y0 + (y1 - y0) * t / steps,
      ]);
    }
  }

  // For each child point, find distance to nearest ideal point
  let totalDev = 0;
  for (const [cx, cy] of childPoints) {
    let minDist = Infinity;
    for (const [ix, iy] of densePath) {
      const d = Math.hypot(cx - ix, cy - iy);
      if (d < minDist) minDist = d;
    }
    totalDev += minDist;
  }

  const avgDev = totalDev / childPoints.length;
  const score = 100 - Math.min(100, (avgDev / tolerancePx) * 100);
  return Math.round(Math.max(0, score));
}