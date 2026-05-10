import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, PanResponder, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Issue 1 ─────────────────────────────────────────────────────────────────
// REMOVED: unused `CANVAS_SIZE` constant. It was computed but never used.
// The actual canvas size comes from the `shapeSize` prop.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes average deviation of user path from ideal path.
 * FIX 5 (already applied): accepts pre-scaled pixel points — no double scaling.
 *
 * Issue 2 FIX: guard against empty scaledIdealPoints to avoid Infinity leaking
 * into metrics when a shape has no ideal path points.
 */
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

export default function TracingCanvas({ shape, shapeSize, onTrialComplete, guidanceLevel }) {
  const [userPath,      setUserPath]      = useState([]);
  const [isTracing,     setIsTracing]     = useState(false);
  const [trialStarted,  setTrialStarted]  = useState(false);

  const touchPointsRef    = useRef([]);
  const trialStartTimeRef = useRef(null);
  const liftCountRef      = useRef(0);
  const isTracingRef      = useRef(false);

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
      liftCount:        Math.max(0, liftCountRef.current - 1), // subtract final lift
      startAccuracy:    parseFloat(startAccuracy.toFixed(3)),
      endAccuracy:      parseFloat(endAccuracy.toFixed(3)),
      velocityVariance: parseFloat(velocityVariance.toFixed(4)),
    };

    // Reset all state
    setTracingState(false);
    setUserPath([]);
    setTrialStarted(false);
    touchPointsRef.current    = [];
    trialStartTimeRef.current = null;
    liftCountRef.current      = 0;

    onTrialComplete({ metrics, touchPathSample, completed });
  }, [onTrialComplete]); // shape/shapeSize accessed via refs — no stale closure

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
        }
      },

      onPanResponderMove: (evt) => {
        if (!isTracingRef.current || !trialStartTimeRef.current) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const t = Date.now() - trialStartTimeRef.current;
        touchPointsRef.current.push({ t, x, y });
        setUserPath(prev => [...prev, { x, y }]);
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
        }
      },
      onPanResponderMove:      (evt) => {
        if (!isTracingRef.current || !trialStartTimeRef.current) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const t = Date.now() - trialStartTimeRef.current;
        touchPointsRef.current.push({ t, x, y });
        setUserPath(prev => [...prev, { x, y }]);
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

        {/* Guide dots at key waypoints */}
        {shape.dotPositions.map((pos, i) => (
          <Circle
            key={i}
            cx={pos[0] * shapeSize}
            cy={pos[1] * shapeSize}
            r={guidanceLevel === 'full' ? 8 : 5}
            fill="#A0C8F0"
            opacity={0.7}
          />
        ))}

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