// 迷宮素材（由 Vite 打包成網址）：地磚集、終點旗標、角色 sprite。
import markerUrl from "../../assets/maze/marker.png";
import pegmanUrl from "../../assets/maze/pegman.png";
import tilesUrl from "../../assets/maze/tiles_pegman.png";

// 每個地磚的像素大小（SVG viewBox 的單位）與角色 sprite 尺寸。
const SQUARE_SIZE = 50;
const PEGMAN_WIDTH = 49;
const PEGMAN_HEIGHT = 52;
// 角色每個移動/轉向動作的動畫總時間（毫秒）。
const STEP_MS = 100;

// 迷宮地圖：# 是牆、. 是通路、S 是起點、G 是終點。
const MAZE = ["#######", "#S...##", "#.##.##", "#.#G.##", "#....##", "#######"];

const ROWS = MAZE.length;
const COLS = MAZE[0].length;

// 方向順序：北、東、南、西（配合角色 sprite 的 16 方向格）。
// 往下方是SVG canvas的y會增加
const DIRS = [
	[0, -1],
	[1, 0],
	[0, 1],
	[-1, 0],
];

// Map each possible shape to a sprite.
// Input: Binary string representing Centre/North/East/South/West squares
//        (same order as the normalize() sum below; 1 = open path, 0 = wall/outside).
// Output: [column, row] of that tile's 50px cell in tiles_pegman.png (5 columns x 4 rows).
const TILE_SHAPES: Record<string, [number, number]> = {
	"10010": [4, 0],
	"10001": [3, 3],
	"11000": [0, 1],
	"10100": [0, 2],
	"11010": [4, 1], // Vertical
	"10101": [3, 2], // Horizontal
	"10110": [0, 0], // Elbows
	"10011": [2, 0],
	"11001": [4, 2],
	"11100": [2, 3],
	"11110": [1, 1], // Junctions
	"10111": [1, 0],
	"11011": [2, 1],
	"11101": [1, 2],
	"11111": [2, 2], // Cross
	null0: [4, 3], // Empty
	null1: [3, 0],
	null2: [3, 1],
	null3: [0, 3],
	null4: [1, 3],
};

type Cell = { x: number; y: number };

// 在地圖字串中尋找指定字元（例如 S 或 G）的座標。
function findCell(ch: string): Cell {
	for (let y = 0; y < ROWS; y++) {
		const x = MAZE[y].indexOf(ch);
		if (x !== -1) return { x, y };
	}
	throw new Error(`找不到 ${ch}`);
}

const START = findCell("S");
const GOAL = findCell("G");

const SVG_NS = "http://www.w3.org/2000/svg";

// 建立 SVG 元素並一次設定屬性的小工具。
function svgElement<K extends keyof SVGElementTagNameMap>(
	tag: K,
	attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
	const el = document.createElementNS(SVG_NS, tag);
	for (const [name, value] of Object.entries(attrs)) {
		el.setAttribute(name, String(value));
	}
	return el;
}

// 提供給產生的程式碼使用的遊戲 API。
export type MazeGame = {
	reset: () => void;
	playLog: () => Promise<void>;
	move: () => void;
	turnLeft: () => void;
	turnRight: () => void;
	atGoal: () => boolean;
};

/**
 * 在指定的 SVG 內繪製迷宮並建立遊戲。
 *
 * 執行分兩階段：
 * 1. move/turnLeft/turnRight 只更新狀態並把動作寫入 log（同步、可拋錯）。
 * 2. playLog() 依 log 逐步播放角色移動/轉向的動畫。
 */
export function createMazeGame(svg: SVGSVGElement): MazeGame {
	// 迷宮為正方形，viewBox 邊長取長寬格數較大者。
	const scale = Math.max(ROWS, COLS) * SQUARE_SIZE;
	svg.setAttribute("viewBox", `0 0 ${scale} ${scale}`);
	// 清空舊內容，讓 StrictMode 重複掛載時不會疊圖。
	svg.replaceChildren();

	// 底色。
	svg.appendChild(
		svgElement("rect", {
			height: ROWS * SQUARE_SIZE,
			width: COLS * SQUARE_SIZE,
			fill: "#F1EEE7",
			"stroke-width": 1,
			stroke: "#CCB",
		}),
	);

	// 將某格視為通路('1')或牆/界外('0')。
	const normalize = (x: number, y: number) =>
		x < 0 || x >= COLS || y < 0 || y >= ROWS || MAZE[y][x] === "#" ? "0" : "1";

	// 逐格依「中心 + 上下左右是否為通路」的 5 位字串挑選對應地磚貼圖；
	// 找不到對應形狀時（例如全空）隨機挑一張裝飾性地磚。
	let tileId = 0;
	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			let tileShape =
				normalize(x, y) +
				normalize(x, y - 1) +
				normalize(x + 1, y) +
				normalize(x, y + 1) +
				normalize(x - 1, y);
			if (!TILE_SHAPES[tileShape]) {
				tileShape =
					tileShape === "00000" && Math.random() > 0.3
						? "null0"
						: `null${Math.floor(1 + Math.random() * 4)}`;
			}
			const [left, top] = TILE_SHAPES[tileShape];

			// 用 clipPath 把 tiles 貼圖裁成這一格的大小。
			const tileClip = svgElement("clipPath", { id: `tileClipPath${tileId}` });
			tileClip.appendChild(
				svgElement("rect", {
					height: SQUARE_SIZE,
					width: SQUARE_SIZE,
					x: x * SQUARE_SIZE,
					y: y * SQUARE_SIZE,
				}),
			);
			svg.appendChild(tileClip);

			svg.appendChild(
				svgElement("image", {
					height: SQUARE_SIZE * 4,
					width: SQUARE_SIZE * 5,
					"clip-path": `url(#tileClipPath${tileId})`,
					x: (x - left) * SQUARE_SIZE,
					y: (y - top) * SQUARE_SIZE,
					href: tilesUrl,
				}),
			);
			tileId++;
		}
	}

	// 終點旗標。
	svg.appendChild(
		svgElement("image", {
			id: "finish",
			height: 34,
			width: 20,
			x: SQUARE_SIZE * (GOAL.x + 0.5) - 10,
			y: SQUARE_SIZE * (GOAL.y + 0.6) - 34,
			href: markerUrl,
		}),
	);

	// 角色的裁切範圍（位置由 displayPegman 更新）。
	const pegmanClip = svgElement("clipPath", { id: "pegmanClipPath" });
	const clipRect = svgElement("rect", {
		id: "clipRect",
		height: PEGMAN_HEIGHT,
		width: PEGMAN_WIDTH,
	});
	pegmanClip.appendChild(clipRect);
	svg.appendChild(pegmanClip);

	// 角色貼圖：pegman.png 是 21 格的 sprite sheet，靠 clip + 位移顯示單一格。
	const pegman = svgElement("image", {
		id: "pegman",
		height: PEGMAN_HEIGHT,
		width: PEGMAN_WIDTH * 21,
		"clip-path": "url(#pegmanClipPath)",
		href: pegmanUrl,
	});
	svg.appendChild(pegman);

	// 角色狀態與動作紀錄（log 供 playLog 重播）。
	let player = { ...START, dir: 1 };
	let log: string[] = [];

	// x、y 可為格數（含小數），d 為 0-15 的方向格（方向 * 4 代表朝向）。
	function displayPegman(x: number, y: number, d: number) {
		const frame = ((Math.round(d) % 16) + 16) % 16;
		const top = SQUARE_SIZE * (y + 0.5) - PEGMAN_HEIGHT / 2 - 8;
		pegman.setAttribute("x", String(x * SQUARE_SIZE - frame * PEGMAN_WIDTH + 1));
		pegman.setAttribute("y", String(top));
		clipRect.setAttribute("x", String(x * SQUARE_SIZE + 1));
		clipRect.setAttribute("y", String(top));
	}

	// 回到起點（朝東）並清空動作紀錄。
	function reset() {
		player = { ...START, dir: 1 };
		log = [];
		displayPegman(player.x, player.y, player.dir * 4);
	}

	// 防止使用者程式碼陷入無限迴圈。
	function guard() {
		if (log.length > 500) throw new Error("步數太多，可能陷入無限迴圈");
	}

	// 依目前方向前進一格；撞牆或出界時拋錯（由 UI 顯示失敗訊息）。
	function move() {
		const [dx, dy] = DIRS[player.dir];
		const x = player.x + dx;
		const y = player.y + dy;
		if (MAZE[y]?.[x] === undefined || MAZE[y][x] === "#") {
			throw new Error("撞到牆壁了");
		}
		player.x = x;
		player.y = y;
		log.push("move");
		guard();
	}

	// 左轉（方向索引 -1，等同 +3 取模）。
	function turnLeft() {
		player.dir = (player.dir + 3) % 4;
		log.push("left");
		guard();
	}

	// 右轉（方向索引 +1 取模）。
	function turnRight() {
		player.dir = (player.dir + 1) % 4;
		log.push("right");
		guard();
	}

	// 是否已站在終點。
	function atGoal() {
		return player.x === GOAL.x && player.y === GOAL.y;
	}

	const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	// 用 4 個小步把角色從 (x0,y0,d0) 移動到 (x1,y1,d1)，形成補間動畫。
	async function tween(x0: number, y0: number, d0: number, x1: number, y1: number, d1: number) {
		for (let i = 1; i <= 4; i++) {
			const t = i / 4;
			displayPegman(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, d0 + (d1 - d0) * t);
			await sleep(STEP_MS);
		}
	}

	// 從起點重播 log 中的所有動作（移動或轉向）。
	async function playLog() {
		let { x, y } = START;
		let dir = 1;
		displayPegman(x, y, dir * 4);
		for (const action of log) {
			if (action === "move") {
				const [dx, dy] = DIRS[dir];
				await tween(x, y, dir * 4, x + dx, y + dy, dir * 4);
				x += dx;
				y += dy;
			} else {
				const delta = action === "left" ? -4 : 4;
				await tween(x, y, dir * 4, x, y, dir * 4 + delta);
				dir = (dir + (action === "left" ? 3 : 1)) % 4;
			}
		}
	}

	// 初始化角色位置。
	reset();

	return { reset, playLog, move, turnLeft, turnRight, atGoal };
}
