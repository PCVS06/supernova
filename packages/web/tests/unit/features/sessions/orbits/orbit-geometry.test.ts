import {describe, expect, it} from "vitest";
import {orbitEllipse, orbitPosition} from "@/features/sessions/lib/orbits/orbit-geometry";

describe("projected orbital tracks", () => {
  it.each([
    {tilt: -0.4, vertical: false, eccentricity: 0.025},
    {tilt: 0.2, vertical: false, eccentricity: 0.4},
    {tilt: -0.3, vertical: true, eccentricity: 0.2},
    {tilt: 0.2, vertical: true, eccentricity: 0},
  ])("keeps a body on its visible ellipse through a full revolution: %j", ({tilt, vertical, eccentricity}) => {
    const lane = {radius: 160, period: 70, phase: 0.2, tilt, flatten: 0.64, eccentricity};
    const ellipse = orbitEllipse(lane, vertical);
    const rotation = (ellipse.rotation * Math.PI) / 180;
    for (const seconds of [0, 10, 25, 45, 69, 70]) {
      const point = orbitPosition(lane, seconds, vertical);
      const dx = point.x - ellipse.x,
        dy = point.y - ellipse.y;
      const x = dx * Math.cos(rotation) + dy * Math.sin(rotation);
      const y = -dx * Math.sin(rotation) + dy * Math.cos(rotation);
      expect((x / ellipse.rx) ** 2 + (y / ellipse.ry) ** 2).toBeCloseTo(1, 6);
    }
  });
});
