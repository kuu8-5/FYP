import * as Blockly from 'blockly/core'
// 匯入內建積木定義（turtle_repeat_internal 會沿用 controls_repeat_ext 的生成器）。
import 'blockly/blocks'
import { javascriptGenerator } from 'blockly/javascript'

// 烏龜積木的色相（與 Blockly Games 一致）。
const HUE = 160
// 迴圈積木沿用內建迴圈色相（由語系決定）。
const LOOP_HUE = '%{BKY_LOOPS_HUE}'

// 「向前/向後移動」下拉選項：顯示文字 → 產生的函式名稱。
const MOVE_OPTIONS = [
  ['向前移動指定距離', 'moveForward'],
  ['向後移動指定距離', 'moveBackward'],
]

// 「向右/向左轉」下拉選項（↻/↺ 為方向提示）。
const TURN_OPTIONS = [
  ['向右轉向指定角度 ↻', 'turnRight'],
  ['向左轉向指定角度 ↺', 'turnLeft'],
]

// 這些是注入使用者程式碼的 API 名稱，需保留避免被變數名稱覆蓋。
const API_NAMES = [
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
]

// 確保自訂積木只註冊一次（StrictMode 會重複呼叫此函式）。
let ready = false

/**
 * 定義 Page 2 烏龜（Blockly Games Turtle level 2）的自訂積木與生成器。
 *
 * level 2 只提供「移動」「轉向」「重複」三種積木，讓學習者用迴圈畫出五邊形。
 */
export function defineTurtleBlocks() {
  if (ready) return
  ready = true

  // 保留 API 名稱，避免生成的變數與它們衝突。
  javascriptGenerator.addReservedWords(API_NAMES.join(','))

  Blockly.defineBlocksWithJsonArray([
    // 向前/向後移動（距離用下拉選單，對應教學關卡的簡化版）。
    {
      type: 'turtle_move_internal',
      message0: '%1%2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'DIR',
          options: MOVE_OPTIONS,
        },
        {
          type: 'field_dropdown',
          name: 'VALUE',
          options: [
            ['20', '20'],
            ['50', '50'],
            ['100', '100'],
            ['150', '150'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: HUE,
      tooltip: '指定烏龜向前或向後移動的量。',
    },

    // 向右/向左轉（角度用下拉選單，含五邊形需要的 72°）。
    {
      type: 'turtle_turn_internal',
      message0: '%1%2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'DIR',
          options: TURN_OPTIONS,
        },
        {
          type: 'field_dropdown',
          name: 'VALUE',
          options: [
            ['1°', '1'],
            ['45°', '45'],
            ['72°', '72'],
            ['90°', '90'],
            ['120°', '120'],
            ['144°', '144'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: HUE,
      tooltip: '指定烏龜向左或向右轉向的角度。',
    },

    // 重複 N 次（次數用下拉選單）。文字沿用內建的 BKY_ 訊息，隨語系變中文。
    {
      type: 'turtle_repeat_internal',
      message0: '%{BKY_CONTROLS_REPEAT_TITLE}%2%{BKY_CONTROLS_REPEAT_INPUT_DO}%3',
      args0: [
        {
          type: 'field_dropdown',
          name: 'TIMES',
          options: [
            ['3', '3'],
            ['4', '4'],
            ['5', '5'],
            ['360', '360'],
          ],
        },
        {
          type: 'input_dummy',
        },
        {
          type: 'input_statement',
          name: 'DO',
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: LOOP_HUE,
      tooltip: '%{BKY_CONTROLS_REPEAT_TOOLTIP}',
      helpUrl: '%{BKY_CONTROLS_REPEAT_HELPURL}',
    },
  ])

  // 移動/轉向：產生 API 呼叫，最後一個參數帶上積木 id，
  // 讓 UI 播放動畫時能 highlight 對應的積木。
  javascriptGenerator.forBlock['turtle_move_internal'] = (block) => {
    const value = Number(block.getFieldValue('VALUE'))
    return `${block.getFieldValue('DIR')}(${value}, 'block_id_${block.id}');\n`
  }

  javascriptGenerator.forBlock['turtle_turn_internal'] = (block) => {
    const value = Number(block.getFieldValue('VALUE'))
    return `${block.getFieldValue('DIR')}(${value}, 'block_id_${block.id}');\n`
  }

  // 重複積木有 TIMES 欄位與 DO 陳述式，可直接沿用內建 controls_repeat_ext 生成器。
  javascriptGenerator.forBlock['turtle_repeat_internal'] =
    javascriptGenerator.forBlock['controls_repeat_ext']
}

// 工具箱：level 2 只露出烏龜與迴圈兩個分類。
export const turtleToolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '烏龜 Turtle',
      colour: '160',
      contents: [
        {
          kind: 'block',
          type: 'turtle_move_internal',
          fields: { VALUE: '100' },
        },
        {
          kind: 'block',
          type: 'turtle_turn_internal',
          fields: { VALUE: '90' },
        },
      ],
    },
    {
      kind: 'category',
      name: '迴圈 Loops',
      colour: '120',
      contents: [
        {
          kind: 'block',
          type: 'turtle_repeat_internal',
          fields: { TIMES: '4' },
        },
      ],
    },
  ],
}
