const TAU = Math.PI * 2;
export class CharacterGait {
  phase = 0;
  blend = 0;
  bob = 0;
  step(speed: number, delta: number) {
    const dt = Math.min(.05, Math.max(0, delta));
    this.blend += (Math.min(1, speed / .65) - this.blend) * (1 - Math.exp(-dt * 9));
    this.phase = (this.phase + speed * dt * TAU / .72) % TAU;
    this.bob = (-.035 + Math.cos(this.phase * 2) * .008) * this.blend;
  }
  leg(side: number) {
    const cycle = (this.phase / TAU + side * .5) % 1;
    const swing = Math.max(0, (cycle - .6) / .4), ease = swing * swing * (3 - 2 * swing);
    const z = (cycle < .6 ? .216 - cycle / .6 * .432 : -.216 + ease * .432) * this.blend;
    const lift = Math.sin(swing * Math.PI) * .085 * this.blend;
    const down = .72 + this.bob - lift;
    const distance = Math.min(.7198, Math.hypot(down, z));
    const bend = Math.acos(Math.max(-1, Math.min(1, distance / .72)));
    const hip = Math.atan2(-z, down) - bend;
    const knee = 2 * bend;
    return { hip: hip * this.blend, knee: knee * this.blend, ankle: -(hip + knee) * this.blend, lift, z };
  }
}
