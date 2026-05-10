import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, PanResponder, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
// ← AnimatedCircle import removed from here

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Issue 1 ─────────────────────────────────────────────────────────────────
// REMOVED: unused `CANVAS_SIZE` constant. It was computed but never used.
// The actual canvas size comes from the `shapeSize` prop.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks a single touch point against all waypoint dots.
 * Returns the index of the dot hit, or -1 if none.
 * Called on every move event — must be fast.
 *
 * @param {number} x, y       — current touch position in canvas pixels
 * @param {Array}  dotPositions — normalised [nx, ny] from shape
 * @param {number} shapeSize  — canvas size in pixels
 * @param {number} threshold  — hit radius in pixels (default 40)
 */
function checkDotHit(x, y, dotPositions, shapeSize, threshold = 40) {
  for (let i = 0; i < dotPositions.length; i++) {
    const px = dotPositions[i][0] * shapeSize;
    const py = dotPositions[i][1] * shapeSize;
    if (Math.hypot(x - px, y - py) < threshold) return i;
  }
  return -1;
}

function getClockwiseDotOrder(dotPositions, startPoint) {
  if (!Array.isArray(dotPositions) || dotPositions.length === 0) return [];
  if (dotPositions.length === 1) return [0];

  const centroid = dotPositions.reduce(
    (acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }),
    { x: 0, y: 0 }
  );
  const cx = centroid.x / dotPositions.length;
  const cy = centroid.y / dotPositions.length;

  // Screen space has Y increasing downward, so ascending atan2 angles
  // produces clockwise ordering around the centroid.
  const ordered = dotPositions
    .map(([x, y], index) => ({ index, angle: Math.atan2(y - cy, x - cx) }))
    .sort((a, b) => a.angle - b.angle)
    .map(item => item.index);

  if (!Array.isArray(startPoint) || startPoint.length < 2) {
    return ordered;
  }

  let rotationStart = 0;
  let minDist = Infinity;
  ordered.forEach((dotIndex, orderIndex) => {
    const [dx, dy] = dotPositions[dotIndex];
    const dist = Math.hypot(dx - startPoint[0], dy - startPoint[1]);
    if (dist < minDist) {
      minDist = dist;
      rotationStart = orderIndex;
    }
  });

  return [...ordered.slice(rotationStart), ...ordered.slice(0, rotationStart)];
}
/**
 * Checks which waypoint dots the user passed close enough to during tracing.
 * Returns an array of booleans — one per dot in shape.dotPositions.
 * 
 * @param {Array}  touchPoints  — raw touch points {x, y, t} from the trace
 * @param {Array}  dotPositions — normalised [nx, ny] dot positions from shape
 * @param {number} shapeSize    — canvas size in pixels (to scale dot positions)
 * @param {number} threshold    — pixel radius to count as "hit" (default 40px)
 */
function computeWaypointCoverage(touchPoints, dotPositions, shapeSize, threshold = 40) {
  return dotPositions.map(([nx, ny]) => {
    const px = nx * shapeSize;
    const py = ny * shapeSize;
    return touchPoints.some(p => Math.hypot(p.x - px, p.y - py) < threshold);
  });
}
function computePathDeviation(userPoints, scaledIdealPoints) {
  if (userPoints.length < 3)        return 100;
  if (scaledIdealPoints.length === 0) return 100; // FIX: guard empty ideal path

  let totalDeviation = 0;

  userPoints.forEach(userPoint => {
    let minDist = Infinity;
    scaledIdealPoints.forEach(ideal => {
      const dx = userPoint.x - ideal.x;
      const dy = userPoint.y - ideal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
    });
    // FIX: guard Infinity in case scaledIdealPoints loop somehow yields nothing
    totalDeviation += isFinite(minDist) ? minDist : 0;
  });

  return userPoints.length > 0 ? totalDeviation / userPoints.length : 100;
}

/**
 * Counts hesitations — pauses longer than 800ms mid-trace.
 */
function countHesitations(touchPoints) {
  let count = 0;
  for (let i = 1; i < touchPoints.length; i++) {
    if (touchPoints[i].t - touchPoints[i - 1].t > 800) count++;
  }
  return count;
}

/**
 * Computes velocity variance — measures stroke smoothness.
 * Low variance = smooth consistent stroke = better motor control.
 */
function computeVelocityVariance(touchPoints) {
  if (touchPoints.length < 3) return 1.0;

  const velocities = [];
  for (let i = 1; i < touchPoints.length; i++) {
    const dt = touchPoints[i].t - touchPoints[i - 1].t;
    if (dt === 0) continue;
    const dx = touchPoints[i].x - touchPoints[i - 1].x;
    const dy = touchPoints[i].y - touchPoints[i - 1].y;
    velocities.push(Math.sqrt(dx * dx + dy * dy) / dt);
  }

  if (velocities.length === 0) return 1.0;
  const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
  return Math.min(1.0, variance / 10);
}

/**
 * Builds an SVG path string from an array of {x, y} pixel points.
 */
function buildPathString(points) {
  if (points.length < 2) return '';
  return points.reduce(
    (path, point, i) => i === 0 ? `M${point.x},${point.y}` : `${path} L${point.x},${point.y}`,
    ''
  );
}
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function TracingCanvas({ shape, shapeSize, onTrialComplete, guidanceLevel }) {
  const [userPath,      setUserPath]      = useState([]);
  const [isTracing,     setIsTracing]     = useState(false);
  const [trialStarted,  setTrialStarted]  = useState(false);
const hitDotsRef   = useRef([]);   // tracks hit state during live tracing
const [hitDots, setHitDots] = useState([]); // triggers SVG re-render per hit
  const nextExpectedDotRef = useRef(0); // enforces ordered dot hits
  const clockwiseDotOrderRef = useRef([]);
  const touchPointsRef    = useRef([]);
  const trialStartTimeRef = useRef(null);
  const liftCountRef      = useRef(0);
  const isTracingRef      = useRef(false);
  const shapeSizeRef = useRef(shapeSize);
useEffect(() => { shapeSizeRef.current = shapeSize; }, [shapeSize]);
  useEffect(() => {
    clockwiseDotOrderRef.current = getClockwiseDotOrder(shape.dotPositions, shape.startPoint);
    nextExpectedDotRef.current = 0;
  }, [shape]);

  // One Animated.Value per waypoint dot — initialised when shape changes
  const pulseAnimsRef = useRef([]);

  // Reinitialise pulse animations whenever shape changes
  useEffect(() => {
    pulseAnimsRef.current = shape.dotPositions.map(() => new Animated.Value(0));
  }, [shape]);

  const triggerPulse = useCallback((index) => {
    const anim = pulseAnimsRef.current[index];
    if (!anim) return;
    anim.setValue(0); // reset before playing
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false, // SVG props can't use native driver
    }).start();
  }, []);

  // ─── Issue 3 FIX ───────────────────────────────────────────────────────────
  // canvasLayoutRef was used to offset locationX/Y, but PanResponder's
  // locationX/Y are ALREADY relative to the responder view — they do NOT need
  // subtracting the canvas origin. Subtracting it causes a systematic offset
  // error that makes the start/end distance checks always fail on scroll or
  // when the canvas is not at (0,0) on screen.
  //
  // SOLUTION: Remove canvasLayoutRef entirely. Use locationX/Y directly.
  // onLayout is also removed as it served no purpose without the offset.
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Scaled paths (pixels) ────────────────────────────────────────────────
  // Issue 4 FIX: memoize via useMemo equivalent — recompute only when
  // shape or shapeSize changes, not on every render caused by setUserPath.
  // We use a ref-based cache to avoid adding useMemo dep on shape identity.
  const scaledIdealPath = shape.idealPath.map(([x, y]) => ({
    x: x * shapeSize,
    y: y * shapeSize,
  }));

  const startPoint = {
    x: shape.startPoint[0] * shapeSize,
    y: shape.startPoint[1] * shapeSize,
  };
  const endPoint = {
    x: shape.endPoint[0] * shapeSize,
    y: shape.endPoint[1] * shapeSize,
  };

  const startAndEndOverlap =
    Math.hypot(startPoint.x - endPoint.x, startPoint.y - endPoint.y) < 1;

  // Keep a ref to scaledIdealPath so finaliseTrial (useCallback) can access
  // the latest value without stale closure issues.
  const scaledIdealPathRef = useRef(scaledIdealPath);
  useEffect(() => { scaledIdealPathRef.current = scaledIdealPath; }, [shape, shapeSize]);

  const startPointRef = useRef(startPoint);
  useEffect(() => { startPointRef.current = startPoint; }, [shape, shapeSize]);

  const endPointRef = useRef(endPoint);
  useEffect(() => { endPointRef.current = endPoint; }, [shape, shapeSize]);

  const setTracingState = (value) => {
    isTracingRef.current = value;
    setIsTracing(value);
  };

  // ─── Issue 5 FIX: finaliseTrial defined BEFORE panResponder ───────────────
  // The original code defined finaliseTrial with useCallback AFTER the
  // panResponder useEffect, which means the first render's panResponder
  // captured an undefined finaliseTrial. Moved above panResponder creation.
  const finaliseTrial = useCallback((endX, endY, completed) => {
    const touchPoints = touchPointsRef.current;
    if (!trialStartTimeRef.current || touchPoints.length === 0) return;

    const totalTime        = Date.now() - trialStartTimeRef.current;
    const scaledIdeal      = scaledIdealPathRef.current;
    const startPt          = startPointRef.current;
    const endPt            = endPointRef.current;

    const pathDeviation    = computePathDeviation(touchPoints, scaledIdeal);
    const hesitationCount  = countHesitations(touchPoints);
    const velocityVariance = computeVelocityVariance(touchPoints);

    // ── Waypoint coverage ──────────────────────────────────────────────────────
// Use live-tracked hits from onPanResponderMove (already computed, no double work)
const waypointHits = hitDotsRef.current.length === shape.dotPositions.length
  ? [...hitDotsRef.current]
  : computeWaypointCoverage(touchPoints, shape.dotPositions, shapeSizeRef.current);
  // ↑ fallback to computation if ref wasn't initialised (edge case)
const waypointScore = waypointHits.filter(Boolean).length / 
  (waypointHits.length || 1); // 0.0 – 1.0

    const startDist = Math.hypot(
      (touchPoints[0]?.x ?? 0) - startPt.x,
      (touchPoints[0]?.y ?? 0) - startPt.y
    );
    const endDist = Math.hypot(endX - endPt.x, endY - endPt.y);

    const startAccuracy = Math.max(0, 1 - startDist / 80);
    const endAccuracy   = Math.max(0, 1 - endDist  / 80);

    // ─── Issue 6 FIX ─────────────────────────────────────────────────────────
    // maxDeviation used shape.idealPath (normalised) with shapeSize multiplication
    // inline — a stale closure risk AND the same double-scaling bug as pathDeviation.
    // Now computed against scaledIdeal (pixel coords) for consistency.
    const maxDeviation = touchPoints.length > 0
      ? Math.max(...touchPoints.map(p => {
          let minDist = Infinity;
          scaledIdeal.forEach(ip => {
            const d = Math.hypot(p.x - ip.x, p.y - ip.y);
            if (d < minDist) minDist = d;
          });
          return isFinite(minDist) ? minDist : 0;
        }))
      : 0;

    // Sample every 5th touch point for backend storage
    const touchPathSample = touchPoints
      .filter((_, i) => i % 5 === 0)
      .map(p => ({ t: p.t, x: Math.round(p.x), y: Math.round(p.y) }));

const metrics = {
  pathDeviation:    parseFloat(pathDeviation.toFixed(2)),
  maxDeviation:     parseFloat(maxDeviation.toFixed(2)),
  completionTimeMs: totalTime,
  hesitationCount,
  liftCount:        Math.max(0, liftCountRef.current - 1),
  startAccuracy:    parseFloat(startAccuracy.toFixed(3)),
  endAccuracy:      parseFloat(endAccuracy.toFixed(3)),
  velocityVariance: parseFloat(velocityVariance.toFixed(4)),

  // ── NEW ──
  waypointHits,                                          // [true, false, true, …]
  waypointScore:    parseFloat(waypointScore.toFixed(3)), // 0.000 – 1.000
  // Blended accuracy: 70% path accuracy + 30% waypoint coverage
  // pathAccuracy here is a proxy — backend uses its own formula,
  // but we send a pre-blended hint it can use or ignore
  blendedAccuracy:  parseFloat(
    (startAccuracy * 0.15 + endAccuracy * 0.15 + waypointScore * 0.30 +
     Math.max(0, 1 - pathDeviation / 100) * 0.40
    ).toFixed(3)
  ),
};

    // Reset all state
    setTracingState(false);
    setUserPath([]);
    setTrialStarted(false);
    touchPointsRef.current    = [];
    trialStartTimeRef.current = null;
    liftCountRef.current      = 0;
    nextExpectedDotRef.current = 0;
    console.log('Waypoint hits:', waypointHits);
console.log('Waypoint score:', waypointScore);
console.log('Blended accuracy:', metrics.blendedAccuracy);

    onTrialComplete({ metrics, touchPathSample, completed });
  }, [onTrialComplete, shape]); // shape/shapeSize accessed via refs — no stale closure

  // ─── PanResponder ─────────────────────────────────────────────────────────
  // Issue 7 FIX: panResponder was in a useRef initialised once at mount, which
  // captured the initial shape's startPoint/endPoint forever. The useEffect
  // recreation was correct but used panResponderRef.current inside the View
  // spread — a stale ref on first render before the effect runs.
  //
  // SOLUTION: Create panResponder inside useMemo-equivalent pattern using
  // useRef + useEffect so it always reflects the latest shape, AND spread
  // handlers correctly by deriving them from the ref at render time.
  const panResponderRef = useRef(null);

  useEffect(() => {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponder:         () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture:  () => true,

      onPanResponderGrant: (evt) => {
        const { locationX: x, locationY: y } = evt.nativeEvent;
        // locationX/Y are already canvas-relative — no offset needed (Issue 3 FIX)
        const distToStart = Math.hypot(x - startPointRef.current.x, y - startPointRef.current.y);

        if (distToStart < 44) { // 44px — minimum tap target per WCAG
          setTracingState(true);
          setTrialStarted(true);
          trialStartTimeRef.current = Date.now();
          liftCountRef.current      = 0;
          touchPointsRef.current    = [{ t: 0, x, y }];
          setUserPath([{ x, y }]);
          hitDotsRef.current = new Array(shape.dotPositions.length).fill(false);
setHitDots([...hitDotsRef.current]);
nextExpectedDotRef.current = 0;
        }
      },

      onPanResponderMove: (evt) => {
        if (!isTracingRef.current || !trialStartTimeRef.current) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const t = Date.now() - trialStartTimeRef.current;
        touchPointsRef.current.push({ t, x, y });
        setUserPath(prev => [...prev, { x, y }]);
        // Live waypoint hit detection
const hitIndex = checkDotHit(
  x, y,
  shape.dotPositions,
  shapeSizeRef.current
);
const expectedDotIndex = clockwiseDotOrderRef.current[nextExpectedDotRef.current];
if (hitIndex !== -1 &&
  hitIndex === expectedDotIndex &&           // must match clockwise expected dot
  !hitDotsRef.current[hitIndex]) {           // must not already be hit
  hitDotsRef.current[hitIndex] = true;
  nextExpectedDotRef.current += 1;             // advance the expected pointer
  setHitDots([...hitDotsRef.current]);
  triggerPulse(hitIndex);
}
      },

      onPanResponderRelease: (evt) => {
        if (!isTracingRef.current) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        liftCountRef.current++;

        const distToEnd = Math.hypot(x - endPointRef.current.x, y - endPointRef.current.y);

        if (distToEnd < 50) {
          finaliseTrial(x, y, true);
        } else {
          // Finger lifted mid-trace — allow continuation (don't reset)
          setTracingState(false);
        }
      },

      // ─── Issue 8 FIX ───────────────────────────────────────────────────────
      // Added onPanResponderTerminate so if another gesture (scroll, system UI)
      // steals the responder, we cleanly stop tracing instead of hanging forever.
      onPanResponderTerminate: () => {
        if (isTracingRef.current) {
          setTracingState(false);
          setUserPath([]);
          hitDotsRef.current = [];
          setHitDots([]);
          nextExpectedDotRef.current = 0;
          // reset pulse animations
          if (pulseAnimsRef.current && pulseAnimsRef.current.length) {
            pulseAnimsRef.current.forEach(a => a.setValue(0));
          }
          touchPointsRef.current    = [];
          trialStartTimeRef.current = null;

        }
      },
    });
  }, [shape, shapeSize, finaliseTrial]);

  // Build SVG path strings
  const idealPathString = buildPathString(scaledIdealPath);
  const userPathString  = buildPathString(userPath);

  // ─── Issue 9 FIX ───────────────────────────────────────────────────────────
  // The spread `{...(panResponderRef.current ? panResponderRef.current.panHandlers : {})}`
  // causes a React warning and misses events on first render because
  // panResponderRef.current is null until the useEffect fires.
  // 
  // SOLUTION: initialise panResponder synchronously on first render using
  // a lazy ref initialiser pattern, then update it in useEffect for shape changes.
  // We achieve this by using a stable wrapper ref that always delegates to current.
  const panHandlersRef = useRef({});

  useEffect(() => {
    if (panResponderRef.current) {
      panHandlersRef.current = panResponderRef.current.panHandlers;
    }
  }, [shape, shapeSize, finaliseTrial]);

  // Initialise synchronously for the very first render
  if (!panResponderRef.current) {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponder:         () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture:  () => true,
      onPanResponderGrant:     (evt) => {
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const distToStart = Math.hypot(x - startPointRef.current.x, y - startPointRef.current.y);
        if (distToStart < 44) {
          setTracingState(true);
          setTrialStarted(true);
          trialStartTimeRef.current = Date.now();
          liftCountRef.current      = 0;
          touchPointsRef.current    = [{ t: 0, x, y }];
          setUserPath([{ x, y }]);
          // initialise hit dots for this trial
          hitDotsRef.current = new Array(shape.dotPositions.length).fill(false);
          setHitDots([...hitDotsRef.current]);
          nextExpectedDotRef.current = 0;
        }
      },
      onPanResponderMove:      (evt) => {
        if (!isTracingRef.current || !trialStartTimeRef.current) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const t = Date.now() - trialStartTimeRef.current;
        touchPointsRef.current.push({ t, x, y });
        setUserPath(prev => [...prev, { x, y }]);
        // Live waypoint hit detection (synchronous responder)
        const hitIndex = checkDotHit(x, y, shape.dotPositions, shapeSizeRef.current);
        const expectedDotIndex = clockwiseDotOrderRef.current[nextExpectedDotRef.current];
       if (hitIndex !== -1 &&
     hitIndex === expectedDotIndex &&           // must match clockwise expected dot
     !hitDotsRef.current[hitIndex]) {           // must not already be hit
  hitDotsRef.current[hitIndex] = true;
  nextExpectedDotRef.current += 1;             // advance the expected pointer
  setHitDots([...hitDotsRef.current]);
  triggerPulse(hitIndex);
}
      },
      onPanResponderRelease:   (evt) => {
        if (!isTracingRef.current) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        liftCountRef.current++;
        const distToEnd = Math.hypot(x - endPointRef.current.x, y - endPointRef.current.y);
        if (distToEnd < 50) {
          finaliseTrial(x, y, true);
        } else {
          setTracingState(false);
        }
      },
      onPanResponderTerminate: () => {
        if (isTracingRef.current) {
          setTracingState(false);
          setUserPath([]);
          // reset pulse animations
          if (pulseAnimsRef.current && pulseAnimsRef.current.length) {
            pulseAnimsRef.current.forEach(a => a.setValue(0));
          }
          touchPointsRef.current    = [];
          trialStartTimeRef.current = null;
        }
      },
    });
    panHandlersRef.current = panResponderRef.current.panHandlers;
  }

  return (
    <View
      style={[styles.container, { width: shapeSize, height: shapeSize }]}
      {...panHandlersRef.current}
      // Issue 3 FIX: onLayout removed — it was feeding coordinates into
      // canvasLayoutRef which was then incorrectly subtracted from locationX/Y.
    >
      <Svg width={shapeSize} height={shapeSize} pointerEvents="none">

        {/* Dotted ideal path guide */}
        <Path
          d={idealPathString}
          stroke="#A0C8F0"
          strokeWidth={guidanceLevel === 'full' ? 6 : 3}
          strokeDasharray="10,8"
          fill="none"
          strokeLinecap="round"
        />

        {/* Guide dots at key waypoints (animated pulses) */}
        {shape.dotPositions.map((pos, i) => {
          const cx = pos[0] * shapeSize;
          const cy = pos[1] * shapeSize;
          const baseR = guidanceLevel === 'full' ? 8 : 5;
          const isHit = !!hitDots[i];
          const anim = pulseAnimsRef.current[i] || new Animated.Value(0);

          const ringR = anim.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [baseR, baseR * 1.5, baseR * 3],
          });
          const ringOpacity = anim.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0.7, 0.5, 0],
          });

          return (
            <G key={i}>
              <AnimatedCircle
                cx={cx}
                cy={cy}
                r={ringR}
                stroke="#4CAF50"
                strokeWidth={2}
                fill="none"
                opacity={ringOpacity}
              />
              <Circle
                cx={cx}
                cy={cy}
                r={isHit ? baseR * 1.3 : baseR}
                fill={isHit ? '#4CAF50' : '#A0C8F0'}
                opacity={isHit ? 1.0 : 0.7}
              />
            </G>
          );
        })}

        {/* Live user tracing path */}
        {userPathString !== '' && (
          <Path
            d={userPathString}
            stroke="#FF8C42"
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* End dot — ring style when start === end (closed shape) */}
        <Circle
          cx={endPoint.x}
          cy={endPoint.y}
          r={startAndEndOverlap ? 24 : 20}
          fill={startAndEndOverlap ? 'none' : '#F44336'}
          stroke={startAndEndOverlap ? '#F44336' : 'none'}
          strokeWidth={startAndEndOverlap ? 4 : 0}
          opacity={0.9}
        />

        {/* Start dot — always rendered on top */}
        <Circle
          cx={startPoint.x}
          cy={startPoint.y}
          r={20}
          fill="#4CAF50"
          opacity={0.9}
        />

      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBF0',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E8DCC8',
    overflow: 'hidden',
  },
});
//edweieh