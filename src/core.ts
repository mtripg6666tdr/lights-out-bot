import { ButtonStyles, ComponentTypes, MessageActionRow } from "oceanic.js";

export type Difficulty = "easy" | "normal" | "hard";
const diffMap = {
  easy: [1, 5],
  normal: [6, 10],
  hard: [11, 18],
} as const satisfies Record<Difficulty, readonly [number, number]>

export class LightsOutGame {
  private _board: boolean[][];
  private _clickCount: number = 0;

  get clickCount(){
    return this._clickCount;
  }

  constructor(){
    this._board = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => false));
  }

  init(difficulty: Difficulty){
    this._board.forEach(row => row.fill(false));

    const [f, e] = diffMap[difficulty];
    const points = Math.floor(Math.random() * (e - f)) + f;
    for(let i = 0; i < points; i++){
      this.click(
        Math.floor(Math.random() * this._board.length),
        Math.floor(Math.random() * this._board[0].length),
      );
    }
    this._clickCount = 0;

    return this;
  }

  click(x: number, y: number){
    if(!this._board[x] || typeof this._board[x][y] !== "boolean"){
      throw new Error("No such cell found.");
    }

    [
      [x, y],
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ].forEach(([cx, cy]) => {
      if(typeof this._board[cx]?.[cy] === "boolean"){
        this._board[cx][cy] = !this._board[cx][cy];
      }
    });
    this._clickCount++;

    return this.checkIfWin();
  }

  private checkIfWin(){
    return this._board.every(row => row.every(cell => !cell));
  }

  exportComponents(): MessageActionRow[] {
    return this._board.map((row, x) => ({
      type: ComponentTypes.ACTION_ROW,
      components: row.map((cell, y) => ({
        type: ComponentTypes.BUTTON,
        style: cell ? ButtonStyles.PRIMARY : ButtonStyles.SECONDARY,
        customID: `cell-${x}-${y}`,
        label: String.fromCodePoint(0x200B),
      }))
    }));
  }
}
