import { useEffect, useRef, useState } from 'react'
import * as Blockly from 'blockly/core'
import { javascriptGenerator } from 'blockly/javascript'
import { applyZhHantLocale } from '../../blocklyLocale'
// 三檔分工：blocks.ts（自訂積木/生成器/toolbox）、logic.ts（迷宮遊戲邏輯）、本檔（UI）。
import { defineMazeBlocks, mazeToolbox } from './blocks'
import { createMazeGame, type MazeGame } from './logic'
import './page1.css'

// 尚未執行程式時的預設提示。
const initialStatus = '拖曳積木，讓角色走到終點。'

/**
 * Page 1：Blockly 迷宮。
 *
 * 這個元件只負責「UI 與整合」：
 * 1. 掛載 React ref 指向的 DOM（Blockly 容器與迷宮 SVG）。
 * 2. 注入（inject）Blockly workspace 並監聽變更以即時產生 JavaScript。
 * 3. 按下「執行」時，用產生的程式碼驅動 logic.ts 的迷宮遊戲，再播放動畫。
 */
function Page1() {
  // Blockly 的注入容器（inject 後 Blockly 會在此 div 內建立 SVG 畫布）。
  const blocklyRef = useRef<HTMLDivElement>(null)
  // 迷宮底圖與角色的 SVG；實際內容由 logic.ts 的 createMazeGame 產生。
  const mazeRef = useRef<SVGSVGElement>(null)
  // 保存 workspace 實例供事件處理器與清除時使用。
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  // 保存迷宮遊戲實例（move / turnLeft / atGoal / playLog ...）。
  const gameRef = useRef<MazeGame | null>(null)
  // 狀態訊息與即時產生的程式碼，用來顯示在右側面板。
  const [status, setStatus] = useState(initialStatus)
  const [code, setCode] = useState('')

  // 只執行一次：初始化 Blockly、建立迷宮、綁定全域事件。
  // 空依賴陣列 + cleanup 可同時正確處理 React StrictMode 的「掛載→卸載→再掛載」。
  useEffect(() => {
    const blocklyDiv = blocklyRef.current
    const svg = mazeRef.current
    // DOM 尚未就緒（理論上不會發生，因 ref 在 render 後已綁定）就直接跳過。
    if (!blocklyDiv || !svg) return

    // 必須先套用語系，再定義積木/注入，積木文字才會是繁體中文。
    applyZhHantLocale()
    defineMazeBlocks()

    // 在 SVG 內繪製迷宮並建立遊戲 API（角色初始位置、log 等）。
    gameRef.current = createMazeGame(svg)

    // 注入 Blockly workspace，設定工具箱、渲染器與縮放/垃圾桶/格線。
    const workspace = Blockly.inject(blocklyDiv, {
      toolbox: mazeToolbox,
      // zelos 渲染器讓繁體中文積木有一致的外觀。
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

    // 積木變更時即時更新「產生的 JavaScript」，但忽略純 UI 事件（縮放/選取等）。
    workspace.addChangeListener((event) => {
      if (event.isUiEvent) return
      setCode(javascriptGenerator.workspaceToCode(workspace))
    })

    // Blockly 不會自動跟著容器尺寸改變，視窗縮放時要手動重新計算大小。
    const onResize = () => Blockly.svgResize(workspace)
    window.addEventListener('resize', onResize)

    // 卸載時清除事件與 workspace，避免 StrictMode 二次掛載時殘留/重複注入。
    return () => {
      window.removeEventListener('resize', onResize)
      workspace.dispose()
      workspaceRef.current = null
      gameRef.current = null
    }
  }, [])

  // 按下「執行」：把產生的程式碼丟進迷宮遊戲執行，再播放移動動畫。
  async function handleRun() {
    const workspace = workspaceRef.current
    const game = gameRef.current
    if (!workspace || !game) return

    // 重設角色與動作紀錄（log），確保每次執行都從起點開始。
    game.reset()
    const generated = javascriptGenerator.workspaceToCode(workspace)
    setCode(generated)

    // 以 new Function 將產生的程式碼包成函式，並注入遊戲 API 作為參數，
    // 避免污染全域；使用者程式碼的錯誤在此捕捉。
    let error: Error | null = null
    try {
      new Function(
        'move',
        'turnLeft',
        'turnRight',
        'atGoal',
        generated,
      )(game.move, game.turnLeft, game.turnRight, game.atGoal)
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err))
    }

    // 例如撞牆、步數過多等執行期錯誤：顯示訊息且不播放動畫。
    if (error) {
      setStatus(`失敗：${error.message}`)
      return
    }

    // 先記下執行當下是否已到終點，再播放動畫，最後顯示結果。
    const won = game.atGoal()
    await game.playLog()
    setStatus(won ? '成功！走到終點了。' : '還沒到終點，再試一次。')
  }

  // 按下「重設」：清空 workspace 積木、角色回到起點、還原提示與程式碼。
  function handleReset() {
    workspaceRef.current?.clear()
    gameRef.current?.reset()
    setStatus(initialStatus)
    setCode('')
  }

  return (
    // 整個迷宮遊戲被限制在固定高度的卡片內，不會佔滿整個 Dashboard。
    <section className="maze-page">
      <div className="maze-toolbar">
        <h2>Blockly 迷宮 Maze</h2>
        <button type="button" onClick={handleRun}>
          執行 (Run)
        </button>
        <button type="button" onClick={handleReset}>
          重設 (Reset)
        </button>
      </div>
      <div className="maze-layout">
        {/* 左側：Blockly 積木編輯區 */}
        <div className="maze-blockly" ref={blocklyRef} />
        {/* 右側：迷宮畫面、狀態訊息與產生的程式碼 */}
        <aside className="maze-side">
          <h3>迷宮</h3>
          <svg
            ref={mazeRef}
            className="maze-svg"
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
          />
          <p className="maze-status">{status}</p>
          <h3>產生的 JavaScript</h3>
          <pre className="maze-code">{code}</pre>
        </aside>
      </div>
    </section>
  )
}

export default Page1
