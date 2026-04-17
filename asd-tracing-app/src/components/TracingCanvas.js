import React, { useRef, useState, useCallback } from 'react';
import { View, PanResponder, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = SCREEN_WIDTH * 0.9;

/**
 * Computes the average deviation of the user's path from the ideal path
 * This is the core motor measurement
 */
function computePathDeviation(userPoints, idealPoints, shapeSize) {
  if (userPoints.length < 3) return 100; // too short = high deviation

  let totalDeviation = 0;
  let count = 0;

  userPoints.forEach(userPoint => {
    // Find closest ideal path point to this user point
    let minDist = Infinity;
    idealPoints.forEach(ideal => {
      const dx = userPoint.x - (ideal[0] * shapeSize);
      const dy = userPoint.y - (ideal[1] * shapeSize);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
    });
    totalDeviation += minDist;
    count++;
  });

  return count > 0 ? totalDeviation / count : 100;
}

/**
 * Counts hesitations — pauses longer than 800ms mid-trace
 */
function countHesitations(touchPoints) {
  let count = 0;
  for (let i = 1; i < touchPoints.length; i++) {
    const gap = touchPoints[i].t - touchPoints[i - 1].t;
    if (gap > 800) count++;
  }
  return count;
}

/**
 * Computes velocity variance — measures smoothness
 * Low variance = smooth consistent stroke = better motor control
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
  return Math.min(1.0, variance / 10); // normalise to 0–1
}

export default function TracingCanvas({ shape, shapeSize, onTrialComplete, guidanceLevel }) {
  const [userPath, setUserPath]       = useState([]);
  const [isTracing, setIsTracing]     = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);
  const touchPointsRef = useRef([]); // raw touch data with timestamps
  const trialStartTimeRef = useRef(null);
  const liftCountRef = useRef(0);
  const sampleCounterRef = useRef(0); // for sampling every 5th point
  const isTracingRef = useRef(false);

  const scaledIdealPath = shape.idealPath.map(([x, y]) => ({
    x: x * shapeSize,
    y: y * shapeSize
  }));

  const startPoint = {
    x: shape.startPoint[0] * shapeSize,
    y: shape.startPoint[1] * shapeSize
  };
  const endPoint = {
    x: shape.endPoint[0] * shapeSize,
    y: shape.endPoint[1] * shapeSize
  };

  const startAndEndOverlap = Math.hypot(startPoint.x - endPoint.x, startPoint.y - endPoint.y) < 1;

  const setTracing = (value) => {
    isTracingRef.current = value;
    setIsTracing(value);
  };

  const buildPathString = (points) => {
    if (points.length < 2) return '';
    return points.reduce((path, point, i) =>
      i === 0 ? `M${point.x},${point.y}` : `${path} L${point.x},${point.y}`,
    '');
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const now = Date.now();

      // Check if finger is near start point (within 40px tolerance)
      const distToStart = Math.sqrt(
        Math.pow(locationX - startPoint.x, 2) +
        Math.pow(locationY - startPoint.y, 2)
      );

      if (distToStart < 40) {
        setTracing(true);
        setTrialStarted(true);
        trialStartTimeRef.current = now;
        liftCountRef.current = 0;
        sampleCounterRef.current = 0;
        touchPointsRef.current = [{ t: 0, x: locationX, y: locationY }];
        setUserPath([{ x: locationX, y: locationY }]);
      }
    },

    onPanResponderMove: (evt) => {
      if (!isTracingRef.current || !trialStartTimeRef.current) return;
      const { locationX, locationY } = evt.nativeEvent;
      const t = Date.now() - trialStartTimeRef.current;

      // Record every point for deviation calculation
      touchPointsRef.current.push({ t, x: locationX, y: locationY });
      setUserPath(prev => [...prev, { x: locationX, y: locationY }]);

      // Sample every 5th point for storage (reduces data size)
      sampleCounterRef.current++;
    },

    onPanResponderRelease: (evt) => {
      if (!isTracingRef.current) return;
      const { locationX, locationY } = evt.nativeEvent;
      liftCountRef.current++;

      // Check if finger released near end point
      const distToEnd = Math.sqrt(
        Math.pow(locationX - endPoint.x, 2) +
        Math.pow(locationY - endPoint.y, 2)
      );

      if (distToEnd < 50) {
        // Trial complete — compute all metrics
        finaliseTrial(locationX, locationY, true);
        return;
      }
      // If not near end, count as a lift (finger left the screen mid-trace)
      setTracing(false);
    },
  })).current;

  const finaliseTrial = useCallback((endX, endY, completed) => {
    const touchPoints = touchPointsRef.current;
    if (!trialStartTimeRef.current || touchPoints.length === 0) return;

    const totalTime   = Date.now() - trialStartTimeRef.current;

    // Compute all research metrics
    const pathDeviation    = computePathDeviation(touchPoints, shape.idealPath, shapeSize);
    const hesitationCount  = countHesitations(touchPoints);
    const velocityVariance = computeVelocityVariance(touchPoints);

    const startDist = Math.sqrt(
      Math.pow(touchPoints[0]?.x - startPoint.x, 2) +
      Math.pow(touchPoints[0]?.y - startPoint.y, 2)
    );
    const endDist = Math.sqrt(
      Math.pow(endX - endPoint.x, 2) +
      Math.pow(endY - endPoint.y, 2)
    );

    const startAccuracy = Math.max(0, 1 - startDist / 80);
    const endAccuracy   = Math.max(0, 1 - endDist / 80);

    // Sample every 5th touch point for storage
    const touchPathSample = touchPoints
      .filter((_, i) => i % 5 === 0)
      .map(p => ({ t: p.t, x: Math.round(p.x), y: Math.round(p.y) }));

    const metrics = {
      pathDeviation:    parseFloat(pathDeviation.toFixed(2)),
      maxDeviation:     parseFloat((touchPoints.length > 0 ? Math.max(...touchPoints.map(p => {
        const closest = shape.idealPath.reduce((min, ip) => {
          const d = Math.sqrt(Math.pow(p.x - ip[0]*shapeSize, 2) + Math.pow(p.y - ip[1]*shapeSize, 2));
          return d < min ? d : min;
        }, Infinity);
        return closest;
      })) : 0).toFixed(2)),
      completionTimeMs: totalTime,
      hesitationCount,
      liftCount:        liftCountRef.current - 1, // subtract final lift
      startAccuracy:    parseFloat(startAccuracy.toFixed(3)),
      endAccuracy:      parseFloat(endAccuracy.toFixed(3)),
      velocityVariance: parseFloat(velocityVariance.toFixed(4)),
    };

    setTracing(false);
    setUserPath([]);
    touchPointsRef.current = [];
    trialStartTimeRef.current = null;

    onTrialComplete({ metrics, touchPathSample, completed });
  }, [shape, shapeSize, onTrialComplete]);

  // Build the ideal path as SVG string (shown as dotted guide)
  const idealPathString = buildPathString(scaledIdealPath);
  const userPathString  = buildPathString(userPath);

  return (
    <View style={[styles.container, { width: shapeSize, height: shapeSize }]}
          {...panResponder.panHandlers}>
      <Svg width={shapeSize} height={shapeSize} pointerEvents="none">

        {/* Ideal dotted path guide */}
        <Path
          d={idealPathString}
          stroke="#A0C8F0"
          strokeWidth={guidanceLevel === 'full' ? 6 : 3}
          strokeDasharray="10,8"
          fill="none"
          strokeLinecap="round"
        />

        {/* Guide dots at key points */}
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

        {/* User's tracing path — shown in real time */}
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

        {/* Red end dot */}
        <Circle
          cx={endPoint.x} cy={endPoint.y}
          r={startAndEndOverlap ? 24 : 20}
          fill={startAndEndOverlap ? 'none' : '#F44336'}
          stroke={startAndEndOverlap ? '#F44336' : 'none'}
          strokeWidth={startAndEndOverlap ? 4 : 0}
          opacity={0.9}
        />

        {/* Green start dot */}
        <Circle
          cx={startPoint.x} cy={startPoint.y}
          r={20} fill="#4CAF50" opacity={0.9}
        />

      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFBF0', // warm off-white — gentle for sensory sensitivity
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E8DCC8',
    overflow: 'hidden',
  }
});