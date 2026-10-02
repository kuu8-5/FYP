// 畫布尺寸（正方形）與每步動畫延遲。
const WIDTH = 400
const HEIGHT = 400
const STEP_MS = 120
// 單次執行允許的最大動作數，避免無限迴圈。
const MAX_ACTIONS = 20000
// 像素比對時，單一像素 alpha 差異超過此值視為不同。
const ALPHA_TOLERANCE = 64
// level 2 允許的錯誤像素數（與 Blockly Games 相同）。
const PIXEL_ERRORS_ALLOWED = 100
// level 2 要求最多使用 3 塊積木（強迫使用迴圈）。
const MAX_BLOCKS_FOR_LEVEL = 3

// 烏龜起始位置（畫布正中央）與起始朝向（北，heading 0）。
const START_X = WIDTH / 2
const START_Y = HEIGHT / 2

// 使用者的每個動作會被記錄成一個 Step，之後再重播成動畫。
type Step =
  | { type: 'move'; distance: number; id?: string }
  | { type: 'turn'; angle: number; id?: string }
  | { type: 'pen'; down: boolean; id?: string }
  | { type: 'width'; width: number; id?: string }
  | { type: 'colour'; colour: string; id?: string }
  | { type: 'visible'; visible: boolean; id?: string }
  | { type: 'print'; text: string; id?: string }
  | { type: 'font'; font: string; size: number; style: string; id?: string }

// 答案比對結果。
export type TurtleCheck = {
  pixelErrors: number
  solved: boolean
  tooManyBlocks: boolean
}

// 提供給產生的程式碼與 UI 使用的遊戲 API。
export type TurtleGame = {
  moveForward: (distance: number, id?: string) => void
  moveBackward: (distance: number, id?: string) => void
  turnRight: (angle: number, id?: string) => void
  turnLeft: (angle: number, id?: string) => void
  penUp: (id?: string) => void
  penDown: (id?: string) => void
  penWidth: (width: number, id?: string) => void
  penColour: (colour: string, id?: string) => void
  hideTurtle: (id?: string) => void
  showTurtle: (id?: string) => void
  print: (text: string, id?: string) => void
  font: (font: string, size: number, style: string, id?: string) => void
  begin: () => void
  reset: () => void
  drawAnswer: () => void
  replay: (onStep?: (id: string) => void) => Promise<void>
  checkAnswer: (blockCount: number) => TurtleCheck
}

// 將角度正規化到 [0, 360)。
function normalizeAngle(angle: number) {
  angle %= 360
  if (angle < 0) angle += 360
  return angle
}

// 度轉弧度。
function toRadians(deg: number) {
  return (deg * Math.PI) / 180
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 建立烏龜繪圖遊戲。
 *
 * 需要三塊 canvas：
 * - displayCanvas：實際顯示（黑底 + 淡色答案殘影 + 使用者畫的線 + 烏龜）。
 * - scratchCanvas：使用者的繪圖層（隱藏，也是答案比對來源）。
 * - answerCanvas：標準答案層（隱藏，預先畫好五邊形）。
 *
 * 流程：begin() 清空紀錄 → 執行產生的程式碼（只記錄動作）→ replay() 播放動畫
 * → checkAnswer() 比對像素與積木數。
 */
export function createTurtleGame(
  displayCanvas: HTMLCanvasElement,
  scratchCanvas: HTMLCanvasElement,
  answerCanvas: HTMLCanvasElement,
): TurtleGame {
  // 三個 2D 繪圖環境（canvas 已存在，getContext 必定成功）。
  const displayCtx = displayCanvas.getContext('2d')!
  const scratchCtx = scratchCanvas.getContext('2d')!
  const answerCtx = answerCanvas.getContext('2d')!

  // 烏龜狀態：位置、朝向（度，0 為北）、筆是否放下、是否可見。
  let turtleX = START_X
  let turtleY = START_Y
  let turtleHeading = 0
  let isPenDown = true
  let visible = true
  // 動作紀錄。
  let log: Step[] = []

  // 把烏龜（圓形身體 + 箭頭頭部）畫在顯示層目前位置。
  function drawTurtle() {
    if (!visible) return

    // 烏龜顏色跟著筆的顏色。
    displayCtx.strokeStyle = scratchCtx.strokeStyle
    displayCtx.fillStyle = scratchCtx.fillStyle

    // 身體。
    const radius = scratchCtx.lineWidth / 2 + 10
    displayCtx.beginPath()
    displayCtx.arc(turtleX, turtleY, radius, 0, 2 * Math.PI, false)
    displayCtx.lineWidth = 3
    displayCtx.stroke()

    // 頭部（依 heading 旋轉的箭頭）。
    const HEAD_WIDTH = 0.3
    const HEAD_TIP = 10
    const ARROW_TIP = 4
    const BEND = 6
    let radians = toRadians(turtleHeading)
    const tipX = turtleX + (radius + HEAD_TIP) * Math.sin(radians)
    const tipY = turtleY - (radius + HEAD_TIP) * Math.cos(radians)
    radians -= HEAD_WIDTH
    const leftX = turtleX + (radius + ARROW_TIP) * Math.sin(radians)
    const leftY = turtleY - (radius + ARROW_TIP) * Math.cos(radians)
    radians += HEAD_WIDTH / 2
    const leftControlX = turtleX + (radius + BEND) * Math.sin(radians)
    const leftControlY = turtleY - (radius + BEND) * Math.cos(radians)
    radians += HEAD_WIDTH
    const rightControlX = turtleX + (radius + BEND) * Math.sin(radians)
    const rightControlY = turtleY - (radius + BEND) * Math.cos(radians)
    radians += HEAD_WIDTH / 2
    const rightX = turtleX + (radius + ARROW_TIP) * Math.sin(radians)
    const rightY = turtleY - (radius + ARROW_TIP) * Math.cos(radians)

    displayCtx.beginPath()
    displayCtx.moveTo(tipX, tipY)
    displayCtx.lineTo(leftX, leftY)
    displayCtx.bezierCurveTo(
      leftControlX,
      leftControlY,
      rightControlX,
      rightControlY,
      rightX,
      rightY,
    )
    displayCtx.closePath()
    displayCtx.fill()
  }

  // 重新合成顯示層：黑底 → 淡色答案 → 使用者繪圖 → 烏龜。
  function display() {
    displayCtx.beginPath()
    displayCtx.rect(0, 0, WIDTH, HEIGHT)
    displayCtx.fillStyle = '#000'
    displayCtx.fill()

    displayCtx.globalCompositeOperation = 'source-over'
    displayCtx.globalAlpha = 0.2
    displayCtx.drawImage(answerCanvas, 0, 0)
    displayCtx.globalAlpha = 1

    displayCtx.globalCompositeOperation = 'source-over'
    displayCtx.drawImage(scratchCanvas, 0, 0)

    drawTurtle()
  }

  // 重設烏龜狀態與畫布（筆的預設樣式與 Blockly Games 相同）。
  function reset() {
    turtleX = START_X
    turtleY = START_Y
    turtleHeading = 0
    isPenDown = true
    visible = true

    scratchCtx.clearRect(0, 0, WIDTH, HEIGHT)
    scratchCtx.strokeStyle = '#fff'
    scratchCtx.fillStyle = '#fff'
    scratchCtx.lineWidth = 5
    scratchCtx.lineCap = 'round'
    scratchCtx.font = 'normal 18pt Arial'
    display()
  }

  // 依目前朝向移動（筆放下時會畫線）。0 距離時給極小位移，避免 WebKit 不畫點。
  function applyMove(distance: number) {
    if (isPenDown) {
      scratchCtx.beginPath()
      scratchCtx.moveTo(turtleX, turtleY)
    }
    let bump = 0
    if (distance) {
      const radians = toRadians(turtleHeading)
      turtleX += distance * Math.sin(radians)
      turtleY -= distance * Math.cos(radians)
    } else {
      bump = 0.1
    }
    if (isPenDown) {
      scratchCtx.lineTo(turtleX, turtleY + bump)
      scratchCtx.stroke()
    }
  }

  // 把單一動作套用到畫布/狀態（重播時逐一呼叫）。
  function applyStep(step: Step) {
    switch (step.type) {
      case 'move':
        applyMove(step.distance)
        break
      case 'turn':
        turtleHeading = normalizeAngle(turtleHeading + step.angle)
        break
      case 'pen':
        isPenDown = step.down
        break
      case 'width':
        scratchCtx.lineWidth = step.width
        break
      case 'colour':
        scratchCtx.strokeStyle = step.colour
        scratchCtx.fillStyle = step.colour
        break
      case 'visible':
        visible = step.visible
        break
      case 'print':
        // 文字沿烏龜朝向輸出。
        scratchCtx.save()
        scratchCtx.translate(turtleX, turtleY)
        scratchCtx.rotate(toRadians(turtleHeading - 90))
        scratchCtx.fillText(step.text, 0, 0)
        scratchCtx.restore()
        break
      case 'font':
        scratchCtx.font = `${step.style} ${step.size}pt ${step.font}`
        break
    }
  }

  // 記錄一個動作（超過上限視為無限迴圈）。
  function push(step: Step) {
    if (log.length >= MAX_ACTIONS) {
      throw new Error('程式步數過多，可能陷入無限迴圈')
    }
    log.push(step)
  }

  // 開始新的一次執行：清空紀錄並重設畫布。
  function begin() {
    log = []
    reset()
  }

  // 從頭重播所有動作；每一步都重新合成畫面並可回報積木 id 供 highlight。
  async function replay(onStep?: (id: string) => void) {
    reset()
    for (const step of log) {
      applyStep(step)
      display()
      if (step.id && onStep) onStep(step.id)
      await sleep(STEP_MS)
    }
  }

  // 預先繪製標準答案：五邊形 = 重複 5 次（前進 100、右轉 72°），
  // 畫在 scratch 後複製到 answer 層，最後重設回乾淨畫布。
  function drawAnswer() {
    reset()
    for (let i = 0; i < 5; i++) {
      applyMove(100)
      turtleHeading = normalizeAngle(turtleHeading + 72)
    }
    answerCtx.globalCompositeOperation = 'copy'
    answerCtx.drawImage(scratchCanvas, 0, 0)
    answerCtx.globalCompositeOperation = 'source-over'
    reset()
  }

  // 比對使用者繪圖與標準答案的 alpha 通道，並檢查積木數量。
  function checkAnswer(blockCount: number): TurtleCheck {
    const userImage = scratchCtx.getImageData(0, 0, WIDTH, HEIGHT)
    const answerImage = answerCtx.getImageData(0, 0, WIDTH, HEIGHT)
    const len = Math.min(userImage.data.length, answerImage.data.length)
    let pixelErrors = 0
    // 每 4 個 byte 一組 RGBA，只比較 alpha（索引 3）。
    for (let i = 3; i < len; i += 4) {
      if (Math.abs(userImage.data[i] - answerImage.data[i]) > ALPHA_TOLERANCE) {
        pixelErrors++
      }
    }
    const pixelsMatch = pixelErrors <= PIXEL_ERRORS_ALLOWED
    return {
      pixelErrors,
      solved: pixelsMatch && blockCount <= MAX_BLOCKS_FOR_LEVEL,
      tooManyBlocks: pixelsMatch && blockCount > MAX_BLOCKS_FOR_LEVEL,
    }
  }

  // 對外 API：移動/轉向等只記錄動作（不做畫），
  // moveBackward / turnLeft 以負號反轉，實際繪製統一在 replay 進行。
  return {
    moveForward: (distance, id) => push({ type: 'move', distance, id }),
    moveBackward: (distance, id) => push({ type: 'move', distance: -distance, id }),
    turnRight: (angle, id) => push({ type: 'turn', angle, id }),
    turnLeft: (angle, id) => push({ type: 'turn', angle: -angle, id }),
    penUp: (id) => push({ type: 'pen', down: false, id }),
    penDown: (id) => push({ type: 'pen', down: true, id }),
    penWidth: (width, id) => push({ type: 'width', width, id }),
    penColour: (colour, id) => push({ type: 'colour', colour, id }),
    hideTurtle: (id) => push({ type: 'visible', visible: false, id }),
    showTurtle: (id) => push({ type: 'visible', visible: true, id }),
    print: (text, id) => push({ type: 'print', text, id }),
    font: (font, size, style, id) =>
      push({ type: 'font', font, size, style, id }),
    begin,
    reset,
    drawAnswer,
    replay,
    checkAnswer,
  }
}
