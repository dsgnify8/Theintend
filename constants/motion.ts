// One easing curve everywhere. Fast out, long settle, no overshoot.
import { AccessibilityInfo, Easing } from 'react-native';

export const EASE = Easing.bezier(0.22, 1, 0.36, 1);

export const DURATION = {
  colour: 300,
  transform: 500,
  reveal: 800,
};

// Someone who has asked their phone to stop moving things should not be
// animated at. Resolve this before starting anything and skip when it is on.
export async function reduceMotion(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}
