import bat from '../weapons/bat';

export const CHARACTER_BAT_HITS = 25;
export class CharacterHealth {
  damage = 0;
  get gone() { return this.damage >= bat.power * CHARACTER_BAT_HITS; }
  get batHits() { return Math.min(CHARACTER_BAT_HITS, Math.round(this.damage / bat.power * 10) / 10); }
  hit(amount: number, fromContact = false) {
    if (!this.gone && !fromContact && Number.isFinite(amount) && amount > 0) this.damage += amount;
    return this.gone;
  }
}
