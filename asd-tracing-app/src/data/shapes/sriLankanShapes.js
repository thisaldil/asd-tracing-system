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
      [0.50, 0.60], // centre base — START (enter bottom petal)

      // Petal 1 — BOTTOM
      [0.44, 0.65], // left edge of petal base
      [0.40, 0.72], // lower left curve
      [0.43, 0.80], // tip approach left
      [0.50, 0.83], // BOTTOM petal tip
      [0.57, 0.80], // tip approach right
      [0.60, 0.72], // lower right curve
      [0.56, 0.65], // right edge of petal base

      // Move to centre, begin next petal (bottom-right)
      [0.52, 0.60], // re-enter centre ring (slight arc)

      // Petal 2 — BOTTOM-RIGHT
      [0.58, 0.56], // right base
      [0.66, 0.54], // outer right
      [0.72, 0.48], // tip approach
      [0.73, 0.40], // BOTTOM-RIGHT tip
      [0.68, 0.34], // inner right
      [0.62, 0.34], // base return
      [0.57, 0.40], // re-enter centre

      // Petal 3 — TOP-RIGHT
      [0.55, 0.44], // right upper base
      [0.58, 0.38], // outer approach
      [0.57, 0.30], // tip approach
      [0.52, 0.24], // TOP-RIGHT tip
      [0.46, 0.26], // left side
      [0.44, 0.32], // base return
      [0.47, 0.40], // re-enter centre top

      // Petal 4 — TOP-LEFT
      [0.44, 0.42], // left upper base
      [0.38, 0.38], // outer approach
      [0.33, 0.34], // tip approach
      [0.29, 0.38], // TOP-LEFT tip
      [0.28, 0.46], // lower left
      [0.32, 0.52], // base return
      [0.42, 0.54], // re-enter centre left

      // Petal 5 — BOTTOM-LEFT
      [0.40, 0.56], // left base
      [0.34, 0.58], // outer left
      [0.30, 0.64], // tip approach
      [0.32, 0.72], // BOTTOM-LEFT tip approach
      [0.37, 0.76], // tip
      [0.43, 0.74], // return right side
      [0.48, 0.68], // base return

      [0.50, 0.60], // CLOSE — back to start
    ],
    startPoint: [0.50, 0.60],
    endPoint:   [0.50, 0.60],
    dotPositions: [
      [0.50, 0.83], // bottom petal tip
      [0.73, 0.40], // bottom-right tip
      [0.52, 0.24], // top-right tip
      [0.29, 0.38], // top-left tip
      [0.37, 0.76], // bottom-left tip
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
      [0.28, 0.66], // front wheel arch top (wheel cutout)
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

      // ── ROOFLINE (right → left) ──
      [0.88, 0.52], // rear window top right
      [0.82, 0.44], // rear window slope
      [0.74, 0.38], // roof right
      [0.62, 0.34], // roof centre
      [0.50, 0.33], // roof apex
      [0.38, 0.35], // roof left
      [0.28, 0.38], // windshield top
      [0.20, 0.44], // windshield slope
      [0.14, 0.52], // bonnet top left

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
      [0.50, 0.33], // roof apex
      [0.20, 0.44], // windshield
    ],
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
     * An open right hand — palm facing viewer, fingers pointing up.
     * All 5 fingers clearly distinguishable: thumb + index + middle + ring + pinky.
     * Traced clockwise from the base of the wrist on the left side.
     *
     * Tracing order:
     *  1. Left wrist side up
     *  2. Thumb (short, angled left, rounded tip)
     *  3. Web between thumb and index
     *  4. Index finger (up, rounded tip, back down)
     *  5. Valley between index and middle
     *  6. Middle finger (tallest, rounded tip)
     *  7. Valley between middle and ring
     *  8. Ring finger
     *  9. Valley between ring and pinky
     * 10. Pinky (shortest)
     * 11. Right wrist side down
     * 12. Wrist base back to start
     *
     * Proportions: fingers occupy y 0.18–0.55, palm y 0.55–0.82, wrist y 0.82–0.88
     */
    idealPath: [
      // ── WRIST + THUMB SIDE ──
      [0.30, 0.88], // wrist base left — START
      [0.28, 0.78], // left wrist side up
      [0.26, 0.68], // palm left edge
      [0.24, 0.60], // thumb base left

      // ── THUMB ──
      [0.20, 0.56], // thumb left wall up
      [0.18, 0.50], // thumb upper left
      [0.18, 0.44], // thumb left mid
      [0.20, 0.38], // thumb tip approach
      [0.24, 0.34], // THUMB TIP
      [0.28, 0.36], // thumb tip right
      [0.30, 0.42], // thumb right mid
      [0.32, 0.48], // thumb right wall down
      [0.34, 0.54], // thumb base right / web

      // ── WEB + INDEX BASE ──
      [0.36, 0.50], // web valley
      [0.38, 0.46], // index base left

      // ── INDEX FINGER ──
      [0.36, 0.40], // index left wall
      [0.35, 0.32], // index upper left
      [0.36, 0.24], // index tip approach
      [0.39, 0.20], // INDEX FINGER TIP
      [0.42, 0.22], // tip right
      [0.43, 0.30], // index upper right
      [0.44, 0.38], // index right wall
      [0.45, 0.46], // index base right

      // ── VALLEY INDEX–MIDDLE ──
      [0.46, 0.48], // valley

      // ── MIDDLE FINGER (tallest) ──
      [0.47, 0.44], // middle base left
      [0.46, 0.36], // middle left wall
      [0.46, 0.26], // middle upper left
      [0.47, 0.18], // MIDDLE FINGER TIP approach
      [0.50, 0.16], // MIDDLE FINGER TIP (apex)
      [0.53, 0.18], // tip right
      [0.54, 0.26], // middle upper right
      [0.54, 0.36], // middle right wall
      [0.54, 0.44], // middle base right

      // ── VALLEY MIDDLE–RING ──
      [0.55, 0.46], // valley

      // ── RING FINGER ──
      [0.56, 0.42], // ring base left
      [0.56, 0.34], // ring left wall
      [0.56, 0.26], // ring upper left
      [0.58, 0.22], // RING FINGER TIP approach
      [0.61, 0.20], // RING FINGER TIP
      [0.63, 0.22], // tip right
      [0.64, 0.28], // ring upper right
      [0.64, 0.36], // ring right wall
      [0.65, 0.44], // ring base right

      // ── VALLEY RING–PINKY ──
      [0.66, 0.46], // valley

      // ── PINKY FINGER (shortest) ──
      [0.67, 0.44], // pinky base left
      [0.67, 0.38], // pinky left wall
      [0.68, 0.30], // pinky upper left
      [0.70, 0.26], // PINKY TIP approach
      [0.72, 0.24], // PINKY TIP
      [0.74, 0.26], // tip right
      [0.75, 0.32], // pinky upper right
      [0.75, 0.40], // pinky right wall
      [0.74, 0.48], // pinky base right

      // ── PALM RIGHT + WRIST ──
      [0.74, 0.56], // palm right edge
      [0.73, 0.65], // palm lower right
      [0.72, 0.75], // wrist right side
      [0.70, 0.82], // wrist right lower

      // ── WRIST BASE ──
      [0.64, 0.86], // wrist base right
      [0.54, 0.88], // wrist base mid-right
      [0.42, 0.88], // wrist base mid-left
      [0.30, 0.88], // CLOSE — back to start
    ],
    startPoint: [0.30, 0.88],
    endPoint:   [0.30, 0.88],
    dotPositions: [
  // ── THUMB (dots 0–2) ──
  [0.20, 0.56], // 0 — thumb left wall (up-stroke mid)
  [0.24, 0.34], // 1 — THUMB TIP
  [0.32, 0.48], // 2 — thumb right wall (down-stroke mid)

  // ── INDEX FINGER (dots 3–5) ──
  [0.35, 0.32], // 3 — index upper left (up-stroke mid)
  [0.39, 0.20], // 4 — INDEX TIP
  [0.43, 0.30], // 5 — index upper right (down-stroke mid)

  // ── MIDDLE FINGER (dots 6–8) ──
  [0.46, 0.26], // 6 — middle upper left (up-stroke mid)
  [0.50, 0.16], // 7 — MIDDLE TIP
  [0.54, 0.26], // 8 — middle upper right (down-stroke mid)

  // ── RING FINGER (dots 9–11) ──
  [0.56, 0.26], // 9  — ring upper left (up-stroke mid)
  [0.61, 0.20], // 10 — RING TIP
  [0.64, 0.28], // 11 — ring upper right (down-stroke mid)

  // ── PINKY FINGER (dots 12–14) ──
  [0.68, 0.30], // 12 — pinky upper left (up-stroke mid)
  [0.72, 0.24], // 13 — PINKY TIP
  [0.75, 0.32], // 14 — pinky upper right (down-stroke mid)

  // ── PALM + WRIST (dots 15–16) ──
  [0.73, 0.65], // 15 — palm lower right
  [0.42, 0.88], // 16 — wrist base mid
],
    tolerancePx: 18,
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
     * Features: two short sleeves sticking out at the sides, a round/U neck collar,
     * straight body sides, and a straight hem at the bottom.
     *
     * Traced clockwise from bottom-left hem corner:
     *  1. Bottom hem left → right
     *  2. Right body side up
     *  3. Right sleeve underarm diagonal out
     *  4. Right sleeve end (cuff) — short vertical
     *  5. Right sleeve top — diagonal back in toward shoulder
     *  6. Right shoulder → collar
     *  7. Collar curve (U-shape, left to right)
     *  8. Left shoulder → left sleeve
     *  9. Left sleeve top → cuff → underarm
     * 10. Left body side down
     * 11. Back to bottom-left hem
     */
    idealPath: [
      // ── BOTTOM HEM ──
      [0.18, 0.84], // hem bottom-left — START
      [0.32, 0.84], // hem left-centre
      [0.50, 0.84], // hem centre
      [0.68, 0.84], // hem right-centre
      [0.82, 0.84], // hem bottom-right

      // ── RIGHT BODY SIDE — up ──
      [0.82, 0.72], // right side lower
      [0.82, 0.60], // right side mid
      [0.82, 0.52], // right side upper / underarm

      // ── RIGHT SLEEVE — diagonal out then cuff ──
      [0.86, 0.48], // underarm step out
      [0.88, 0.44], // sleeve lower right
      [0.90, 0.38], // sleeve mid-right diagonal
      [0.90, 0.34], // sleeve cuff right
      [0.84, 0.30], // sleeve cuff centre
      [0.78, 0.32], // sleeve cuff left
      [0.76, 0.36], // sleeve upper-left edge
      [0.74, 0.40], // sleeve top diagonal in
      [0.72, 0.44], // sleeve shoulder join

      // ── RIGHT SHOULDER + COLLAR ──
      [0.70, 0.42], // shoulder right
      [0.66, 0.38], // neck slope right
      [0.62, 0.34], // collar right entry

      // ── COLLAR — U-shape curve (right → left) ──
      [0.60, 0.32], // collar right
      [0.57, 0.30], // collar upper-right
      [0.54, 0.28], // collar apex right
      [0.50, 0.27], // COLLAR BOTTOM CENTRE (deepest dip)
      [0.46, 0.28], // collar apex left
      [0.43, 0.30], // collar upper-left
      [0.40, 0.32], // collar left

      // ── LEFT SHOULDER + SLEEVE ──
      [0.38, 0.34], // neck slope left
      [0.34, 0.38], // shoulder left
      [0.30, 0.42], // shoulder left outer
      [0.28, 0.44], // sleeve shoulder join left

      // ── LEFT SLEEVE ──
      [0.26, 0.40], // sleeve top diagonal out
      [0.24, 0.36], // sleeve upper-left edge
      [0.22, 0.32], // sleeve cuff right
      [0.16, 0.30], // sleeve cuff centre
      [0.10, 0.34], // sleeve cuff left
      [0.10, 0.38], // sleeve mid-left
      [0.12, 0.44], // sleeve lower left diagonal
      [0.14, 0.48], // underarm step in

      // ── LEFT BODY SIDE — down ──
      [0.18, 0.52], // left side upper
      [0.18, 0.60], // left side mid
      [0.18, 0.72], // left side lower
      [0.18, 0.84], // CLOSE — back to start (hem bottom-left)
    ],
    startPoint: [0.18, 0.84],
    endPoint:   [0.18, 0.84],
    dotPositions: [
      [0.50, 0.84], // hem centre
      [0.82, 0.52], // right underarm
      [0.84, 0.30], // right cuff centre
      [0.50, 0.27], // collar bottom
      [0.16, 0.30], // left cuff centre
      [0.14, 0.48], // left underarm
      [0.18, 0.72], // left body lower
    ],
    tolerancePx: 18,
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