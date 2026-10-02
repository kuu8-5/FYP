import * as Blockly from 'blockly/core'
import * as zhHant from 'blockly/msg/zh-hant'

/**
 * 套用繁體中文（zh-Hant）語系給 Blockly。
 *
 * `blockly/msg/zh-hant` 是以 CommonJS 匯出的訊息物件，經 ESM 轉換後
 * namespace 內可能夾帶非字串的 `default`，直接丟給 setLocale 會型別不符，
 * 因此這裡只挑出字串屬性的訊息再設定。
 */
export function applyZhHantLocale() {
  const messages: Record<string, string> = {}
  for (const [key, value] of Object.entries(zhHant)) {
    if (typeof value === 'string') messages[key] = value
  }
  Blockly.setLocale(messages)
}
