import { useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly/core'
import { javascriptGenerator } from 'blockly/javascript'
import { applyZhHantLocale } from '../../blocklyLocale'
// 三檔分工：blocks.ts（自訂積木/生成器/toolbox）、logic.ts（烏龜繪圖邏輯）、本檔（UI）。
import { defineTurtleBlocks, turtleToolbox } from './blocks'
import { createTurtleGame, type TurtleGame } from './logic'
import './page2.css'

// 尚未解題時的提示（對應 Blockly Games Turtle level 2 的說明）。
const initialStatus = '更改你的程式，讓它改為繪製一個五邊形而不是正方形。'

// level 2 的起始積木：一個「向前移動 100」，讓學習者在此基礎上改成五邊形。
const defaultXml =
  '<xml>' +
  '<block type="turtle_move_internal" x="70" y="70">' +
  '<field name="VALUE">100</field>' +
  '</block>' +
  '</xml>'

// 產生的程式碼會夾帶 block id（供播放時 highlight 對應積木），
// 顯示在畫面上時把這段參數移除，讓程式碼保持乾淨易讀。
const stripBlockIds = (code: string) => code.replace(/, 'block_id_[^']*'/g, '')

/**
 * Page 2：Blockly 烏龜（Blockly Games Turtle level 2，畫五邊形）。
 *
 * 元件負責 UI 與整合；繪圖／動畫／答案比對都在 logic.ts：
 * 1. 準備三個 canvas（顯示層、使用者繪圖層、答案層）。
 * 2. 注入 Blockly workspace，載入起始積木並即時產生 JavaScript。
 * 3. 執行時先同步跑一次程式碼「記錄動作」，再逐步重播動畫，最後比對答案。
 */
function Page2() {
  // Blockly 的注入容器。
  const blocklyRef = useRef<HTMLDivElement>(null)
  // 實際顯示給使用者的畫布（黑底＋答案殘影＋使用者的線＋烏龜）。
  const displayRef = useRef<HTMLCanvasElement>(null)
  // 隱藏的使用者繪圖層（每次執行前清空，也是像素比對的來源）。
  const scratchRef = useRef<HTMLCanvasElement>(null)
  // 隱藏的標準答案層（五邊形，用來比對與顯示淡色殘影）。
  const answerRef = useRef<HTMLCanvasElement>(null)
  // 保存 workspace 實例供事件處理器與清除時使用。
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  // 保存烏龜遊戲實例（record / replay / checkAnswer ...）。
  const gameRef = useRef<TurtleGame | null>(null)
  // 狀態訊息與即時產生的程式碼。
  const [status, setStatus] = useState(initialStatus)
  const [code, setCode] = useState('')

  // 只執行一次：初始化語系/積木、建立畫布遊戲、注入 Blockly、載入起始積木。
  // 空依賴陣列 + cleanup 可正確處理 React StrictMode 的重複掛載。
  useEffect(() => {
    const blocklyDiv = blocklyRef.current
    const display = displayRef.current
    const scratch = scratchRef.current
    const answer = answerRef.current
    if (!blocklyDiv || !display || !scratch || !answer) return

    // 先套用語系，積木中的 %{BKY_...} 文字才會是繁體中文。
    applyZhHantLocale()
    defineTurtleBlocks()

    // 建立繪圖遊戲並先畫出淡淡的標準答案（五邊形殘影）。
    const game = createTurtleGame(display, scratch, answer)
    gameRef.current = game
    game.drawAnswer()

    // 注入 Blockly workspace（與 Page 1 相同的渲染器與縮放設定）。
    const workspace = Blockly.inject(blocklyDiv, {
      toolbox: turtleToolbox,
      renderer: 'zelos',
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.9,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
      trashcan: true,
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true,
      },
    })
    workspaceRef.current = workspace

    // 載入 level 2 的起始積木（XML 轉 DOM 後放進 workspace）。
    Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(defaultXml), workspace)

    // 積木變更時即時更新程式碼；忽略純 UI 事件。
    workspace.addChangeListener((event) => {
      if (event.isUiEvent) return
      setCode(stripBlockIds(javascriptGenerator.workspaceToCode(workspace)))
    })

    // 變更監聽是在載入起始積木後才綁定，因此這裡先手動產生一次。
    setCode(stripBlockIds(javascriptGenerator.workspaceToCode(workspace)))

    // 視窗縮放時讓 Blockly 重新計算大小。
    const onResize = () => Blockly.svgResize(workspace)
    window.addEventListener('resize', onResize)

    // 卸載時清除事件與 workspace，避免殘留或重複注入。
    return () => {
      window.removeEventListener('resize', onResize)
      workspace.dispose()
      workspaceRef.current = null
      gameRef.current = null
    }
  }, [])

  // 按下「執行」：先記錄動作、再播放動畫，最後比對答案並顯示結果。
  async function handleRun() {
    const workspace = workspaceRef.current
    const game = gameRef.current
    if (!workspace || !game) return

    // begin 會清空動作紀錄並重設烏龜與畫布。
    game.begin()
    const generated = javascriptGenerator.workspaceToCode(workspace)
    setCode(stripBlockIds(generated))

    // 以 new Function 將程式碼包成函式，注入烏龜 API 作為參數。
    // 這個階段只「記錄」每個動作，不會真的畫圖（繪圖在 replay 時進行）。
    let error: Error | null = null
    try {
      new Function(
        'moveForward',
        'moveBackward',
        'turnRight',
        'turnLeft',
        'penUp',
        'penDown',
        'penWidth',
        'penColour',
        'hideTurtle',
        'showTurtle',
        'print',
        'font',
        generated,
      )(
        game.moveForward,
        game.moveBackward,
        game.turnRight,
        game.turnLeft,
        game.penUp,
        game.penDown,
        game.penWidth,
        game.penColour,
        game.hideTurtle,
        game.showTurtle,
        game.print,
        game.font,
      )
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err))
    }

    // 例如步數過多等執行期錯誤：顯示訊息並取消 highlight。
    if (error) {
      workspace.highlightBlock(null)
      setStatus(`失敗：${error.message}`)
      return
    }

    // 逐步重播動畫，每步高亮對應的積木；播完後取消高亮。
    await game.replay((id) => workspace.highlightBlock(id))
    workspace.highlightBlock(null)

    // 比對使用者畫的圖與標準答案，並要求只用 3 塊積木（逼使用者用迴圈）。
    const result = game.checkAnswer(workspace.getAllBlocks(false).length)
    if (result.solved) {
      setStatus('成功！你畫出了五邊形。')
    } else if (result.tooManyBlocks) {
      setStatus('你的解法有用，但可以更好：請只用 3 塊積木畫出五邊形。')
    } else {
      setStatus('還沒畫出五邊形，再試一次。')
    }
  }

  // 按下「重設」：取消高亮、清空繪圖並讓烏龜回到原點（保留積木程式）。
  function handleReset() {
    workspaceRef.current?.highlightBlock(null)
    gameRef.current?.reset()
    setStatus(initialStatus)
  }

  return (
    // 整個烏龜遊戲限制在固定高度的卡片內，不會佔滿整個 Dashboard。
    <section className="turtle-page">
      <div className="turtle-toolbar">
        <h2>Blockly 烏龜 Turtle</h2>
        <button type="button" onClick={handleRun}>
          執行 (Run)
        </button>
        <button type="button" onClick={handleReset}>
          重設 (Reset)
        </button>
      </div>
      <div className="turtle-layout">
        {/* 左側：Blockly 積木編輯區 */}
        <div className="turtle-blockly" ref={blocklyRef} />
        {/* 右側：畫布、狀態提示與產生的程式碼 */}
        <aside className="turtle-side">
          <h3>畫布</h3>
          {/* 顯示層 */}
          <canvas
            ref={displayRef}
            className="turtle-canvas"
            width={400}
            height={400}
          />
          {/* 使用者繪圖層（隱藏，只供繪製與答案比對） */}
          <canvas
            ref={scratchRef}
            className="turtle-hidden"
            width={400}
            height={400}
          />
          {/* 標準答案層（隱藏，只供比對與殘影） */}
          <canvas
            ref={answerRef}
            className="turtle-hidden"
            width={400}
            height={400}
          />
          <p className="turtle-status">{status}</p>
          <p className="turtle-hint">
            提示：使用「重複」積木，只用 3 塊積木就能畫出五邊形。
          </p>
          <h3>產生的 JavaScript</h3>
          <pre className="turtle-code">{code}</pre>
        </aside>
      </div>
    </section>
  )
}

export default Page2
