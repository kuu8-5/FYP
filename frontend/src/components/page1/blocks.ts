import * as Blockly from "blockly/core";
// 匯入內建積木（controls_repeat_ext、logic_negate 等）的定義。
import "blockly/blocks";
import { Order, javascriptGenerator } from "blockly/javascript";

// 確保自訂積木只註冊一次（StrictMode 會重複呼叫此函式）。
let ready = false;

/**
 * 定義 Page 1 迷宮的自訂積木與程式碼生成器。
 *
 * 產生的是 `move()/turnLeft()/turnRight()/atGoal()` 呼叫，
 * 由 Page1.tsx 執行時注入 logic.ts 的遊戲 API。
 */
export function defineMazeBlocks() {
	if (ready) return;
	ready = true;

	Blockly.defineBlocksWithJsonArray([
		// 陳述式積木：向前移動一格。
		{
			type: "maze_move",
			message0: "向前移動",
			previousStatement: null,
			nextStatement: null,
			colour: 160,
		},
		// 陳述式積木：左轉 90 度。
		{
			type: "maze_turn_left",
			message0: "向左轉",
			previousStatement: null,
			nextStatement: null,
			colour: 160,
		},
		// 陳述式積木：右轉 90 度。
		{
			type: "maze_turn_right",
			message0: "向右轉",
			previousStatement: null,
			nextStatement: null,
			colour: 160,
		},
		// 值積木：判斷是否已到終點（可搭配邏輯/迴圈積木使用）。
		{
			type: "maze_at_goal",
			message0: "到達終點",
			output: "Boolean",
			colour: 160,
		},
	]);

	// 各積木對應產生的 JavaScript 片段；值積木需回傳 [程式碼, 運算優先序]。
	javascriptGenerator.forBlock["maze_move"] = () => "move();\n";
	javascriptGenerator.forBlock["maze_turn_left"] = () => "turnLeft();\n";
	javascriptGenerator.forBlock["maze_turn_right"] = () => "turnRight();\n";
	javascriptGenerator.forBlock["maze_at_goal"] = () => ["atGoal()", Order.FUNCTION_CALL];
}

// 陰影積木（shadow）：讓內建積木的值插槽預設帶一個可替換的數值/文字。
const numberShadow = (num: number) => ({
	shadow: { type: "math_number", fields: { NUM: num } },
});
const textShadow = (text: string) => ({
	shadow: { type: "text", fields: { TEXT: text } },
});

// Blockly 內建（自帶）積木的標準分類。依官方標準工具箱整理，
// 涵蓋 `blockly/blocks` 註冊的所有預設積木（僅省略 mutator 內部子積木）。
// categorystyle 會套用主題色，讓內建積木與迷宮積木區隔。
const standardCategories = [
	{
		kind: "category",
		name: "邏輯 Logic",
		categorystyle: "logic_category",
		contents: [
			{ kind: "block", type: "controls_if" },
			{ kind: "block", type: "logic_compare" },
			{ kind: "block", type: "logic_operation" },
			{ kind: "block", type: "logic_negate" },
			{ kind: "block", type: "logic_boolean" },
			{ kind: "block", type: "logic_null" },
			{ kind: "block", type: "logic_ternary" },
		],
	},
	{
		kind: "category",
		name: "迴圈 Loops",
		categorystyle: "loop_category",
		contents: [
			{
				kind: "block",
				type: "controls_repeat_ext",
				inputs: { TIMES: numberShadow(10) },
			},
			{ kind: "block", type: "controls_whileUntil" },
			{
				kind: "block",
				type: "controls_for",
				inputs: {
					FROM: numberShadow(1),
					TO: numberShadow(10),
					BY: numberShadow(1),
				},
			},
			{ kind: "block", type: "controls_forEach" },
			{ kind: "block", type: "controls_flow_statements" },
		],
	},
	{
		kind: "category",
		name: "數學 Math",
		categorystyle: "math_category",
		contents: [
			{ kind: "block", type: "math_number", fields: { NUM: 123 } },
			{
				kind: "block",
				type: "math_arithmetic",
				inputs: { A: numberShadow(1), B: numberShadow(1) },
			},
			{ kind: "block", type: "math_single", inputs: { NUM: numberShadow(9) } },
			{ kind: "block", type: "math_trig", inputs: { NUM: numberShadow(45) } },
			{ kind: "block", type: "math_constant" },
			{
				kind: "block",
				type: "math_number_property",
				inputs: { NUMBER_TO_CHECK: numberShadow(0) },
			},
			{ kind: "block", type: "math_round", inputs: { NUM: numberShadow(3.1) } },
			{ kind: "block", type: "math_on_list" },
			{
				kind: "block",
				type: "math_modulo",
				inputs: { DIVIDEND: numberShadow(64), DIVISOR: numberShadow(10) },
			},
			{
				kind: "block",
				type: "math_constrain",
				inputs: {
					VALUE: numberShadow(50),
					LOW: numberShadow(1),
					HIGH: numberShadow(100),
				},
			},
			{
				kind: "block",
				type: "math_random_int",
				inputs: { FROM: numberShadow(1), TO: numberShadow(100) },
			},
			{ kind: "block", type: "math_random_float" },
			{
				kind: "block",
				type: "math_atan2",
				inputs: { X: numberShadow(1), Y: numberShadow(1) },
			},
		],
	},
	{
		kind: "category",
		name: "文字 Text",
		categorystyle: "text_category",
		contents: [
			{ kind: "block", type: "text" },
			{ kind: "block", type: "text_join" },
			{ kind: "block", type: "text_append", inputs: { TEXT: textShadow("") } },
			{
				kind: "block",
				type: "text_length",
				inputs: { VALUE: textShadow("abc") },
			},
			{
				kind: "block",
				type: "text_isEmpty",
				inputs: { VALUE: textShadow("") },
			},
			{
				kind: "block",
				type: "text_indexOf",
				inputs: { VALUE: textShadow("banana"), FIND: textShadow("b") },
			},
			{ kind: "block", type: "text_charAt", inputs: { VALUE: textShadow("abc") } },
			{
				kind: "block",
				type: "text_getSubstring",
				inputs: { STRING: textShadow("abc") },
			},
			{
				kind: "block",
				type: "text_changeCase",
				inputs: { TEXT: textShadow("abc") },
			},
			{ kind: "block", type: "text_trim", inputs: { TEXT: textShadow(" abc ") } },
			{
				kind: "block",
				type: "text_count",
				inputs: { TEXT: textShadow("abc"), SUB: textShadow("b") },
			},
			{
				kind: "block",
				type: "text_replace",
				inputs: {
					TEXT: textShadow("abc"),
					FROM: textShadow("b"),
					TO: textShadow("x"),
				},
			},
			{ kind: "block", type: "text_reverse", inputs: { TEXT: textShadow("abc") } },
			{ kind: "block", type: "text_print", inputs: { TEXT: textShadow("abc") } },
			{
				kind: "block",
				type: "text_prompt_ext",
				inputs: { TEXT: textShadow("輸入文字") },
			},
		],
	},
	{
		kind: "category",
		name: "清單 Lists",
		categorystyle: "list_category",
		contents: [
			{ kind: "block", type: "lists_create_with", extraState: { itemCount: 3 } },
			{ kind: "block", type: "lists_create_with" },
			{
				kind: "block",
				type: "lists_repeat",
				inputs: { NUM: numberShadow(5) },
			},
			{ kind: "block", type: "lists_length" },
			{ kind: "block", type: "lists_isEmpty" },
			{ kind: "block", type: "lists_indexOf" },
			{ kind: "block", type: "lists_getIndex" },
			{ kind: "block", type: "lists_setIndex" },
			{ kind: "block", type: "lists_getSublist" },
			{ kind: "block", type: "lists_sort" },
			{
				kind: "block",
				type: "lists_split",
				inputs: { DELIM: textShadow(",") },
			},
			{ kind: "block", type: "lists_reverse" },
		],
	},
	{
		kind: "category",
		name: "變數 Variables",
		categorystyle: "variable_category",
		custom: "VARIABLE",
	},
	{
		kind: "category",
		name: "動態變數 Variables (Dynamic)",
		categorystyle: "variable_dynamic_category",
		custom: "VARIABLE_DYNAMIC",
	},
	{
		kind: "category",
		name: "函式 Functions",
		categorystyle: "procedure_category",
		custom: "PROCEDURE",
	},
];

// 工具箱（分類 + 積木清單），注入 workspace 時使用。
export const mazeToolbox = {
	kind: "categoryToolbox",
	contents: [
		{
			kind: "category",
			name: "迷宮 Maze",
			colour: "160",
			contents: [
				{ kind: "block", type: "maze_move" },
				{ kind: "block", type: "maze_turn_left" },
				{ kind: "block", type: "maze_turn_right" },
				{ kind: "block", type: "maze_at_goal" },
			],
		},
		...standardCategories,
	],
};
