// Title screen: collapsible, scrollable changelog panel (left) + menu buttons moved up.
//   node tools/pixelgo-menu/changelog.mjs
// - Builds the panel textures from the menu button PNGs (same frame style).
// - Re-injects the changelog elements into title_screen_layout.txt (idempotent:
//   removes previous elements whose instance_identifier starts with "pixelgo-changelog-").
// - Changelog text: config/fancymenu/assets/changelog/changelog_<en|fr>.md, chosen via the
//   lang key pixelgo.menu.changelog_lang (kubejs/assets/pixelgo/lang/*.json, other languages fall back to en).
// - Collapsed state is the FancyMenu variable "pixelgo_changelog_closed" (persists between launches).
import fs from 'node:fs';
import { readPng, writePng } from './png.mjs';

import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ASSETS = ROOT + 'config/fancymenu/assets/menu/last_chance/';
const LAYOUT = ROOT + 'config/fancymenu/customization/title_screen_layout.txt';
const SRC = '[source:local]/config/fancymenu/assets/menu/last_chance/';

// ---------- geometry (GUI px) ----------
// Vertically centred: menu buttons anchored mid-right, panel anchored mid-left, y relative to screen centre.
const MENU_TOP = -126;           // y of the first menu button (7 buttons x 36 = 252 high, centred)
const MENU_STEP = 36;
const PX = 20, PY = MENU_TOP, PW = 215, PH = 7 * MENU_STEP; // panel aligned with the 7 menu buttons
const HH = 26;                   // header height
const VAR = 'pixelgo_changelog_closed';
const DARK = '#262A35', FRAME = '#5F5A73', FRAME_LIGHT = '#8488BB';

// ---------- textures ----------
function textures() {
  const top = readPng(ASSETS + 'singleplayer.png'), bot = readPng(ASSETS + 'exit.png');
  const W = top.w, TOPR = 26, BOTR = 26, H = TOPR + BOTR;
  const full = { w: W, h: H, data: Buffer.alloc(W * H * 4) };
  top.data.copy(full.data, 0, 0, W * TOPR * 4);
  bot.data.copy(full.data, W * TOPR * 4, W * (bot.h - BOTR) * 4, W * bot.h * 4);
  // 2x box downscale -> matches the on-screen size of the button frames (311px drawn at 157)
  const w = W >> 1, h = H >> 1, half = { w, h, data: Buffer.alloc(w * h * 4) };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
    let s = 0; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) s += full.data[((y * 2 + dy) * W + x * 2 + dx) * 4 + c];
    half.data[(y * w + x) * 4 + c] = Math.round(s / 4);
  }
  writePng(ASSETS + 'changelog_panel.png', half);
  const solid = (file, rgba) => { const d = Buffer.alloc(4 * 4 * 4); for (let i = 0; i < 16; i++) d.set(rgba, i * 4); writePng(ASSETS + file, { w: 4, h: 4, data: d }); };
  solid('changelog_clear.png', [0, 0, 0, 0]);
  solid('changelog_hover.png', [0x84, 0x88, 0xbb, 0x50]);
  solid('changelog_line.png', [0x5f, 0x5a, 0x73, 0xff]);
  // scroll grabber: frame purple with dark outline
  const grab = (file, fill) => { const w = 4, h = 16, d = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(x === 0 || x === w - 1 || y === 0 || y === h - 1 ? [0x26, 0x2a, 0x35, 0xff] : fill, (y * w + x) * 4);
    writePng(ASSETS + file, { w, h, data: d }); };
  grab('changelog_grabber.png', [0x84, 0x88, 0xbb, 0xff]);
  grab('changelog_grabber_hover.png', [0xa8, 0xab, 0xd6, 0xff]);
  // dropdown arrows (pixel triangles, 11x6)
  const arrow = (file, down) => { const w = 11, h = 6, d = Buffer.alloc(w * h * 4);
    for (let r = 0; r < h; r++) { const y = down ? r : h - 1 - r; for (let x = r; x < w - r; x++) d.set([0x26, 0x2a, 0x35, 0xff], (y * w + x) * 4); }
    writePng(ASSETS + file, { w, h, data: d }); };
  arrow('changelog_arrow_down.png', true);
  arrow('changelog_arrow_up.png', false);
}

// ---------- layout blocks ----------
let seq = 0;
const now = Date.now();
const id = (name) => `pixelgo-changelog-${name}`;
const uid = () => { const h = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join(''); return `${h(8)}-${h(4)}-4${h(3)}-a${h(3)}-${h(12)}-${now + seq++}`; };

function reqContainer(mode) {
  const c = uid();
  if (!mode) return [`element_loading_requirement_container_identifier = ${c}`, `[loading_requirement_container_meta:${c}] = [groups:][instances:]`];
  const r = uid();
  return [
    `element_loading_requirement_container_identifier = ${c}`,
    `[loading_requirement_container_meta:${c}] = [groups:][instances:${r};]`,
    `[loading_requirement:fancymenu_visibility_requirement_is_variable_value][requirement_mode:${mode}][req_id:${r}] = ${VAR}:true`,
  ];
}

function common(type, name, x, y, w, h, mode) {
  return [
    `element_type = ${type}`, `instance_identifier = ${id(name)}`,
    'appearance_delay = no_delay', 'disappearance_delay = no_delay', 'fade_in_v2 = no_fading', 'fade_out = no_fading',
    'auto_sizing = false', 'sticky_anchor = false', 'anchor_point = mid-left',
    `x = ${x}`, `y = ${y}`, `width = ${w}`, `height = ${h}`, 'stay_on_screen = true',
    ...reqContainer(mode),
    'enable_parallax = false', 'invert_parallax = false', 'animated_offset_x = 0', 'animated_offset_y = 0',
    'load_once_per_session = false', 'layer_hidden_in_editor = false',
    'advanced_rotation_mode = false', 'advanced_vertical_tilt_mode = false', 'advanced_horizontal_tilt_mode = false',
    'should_be_affected_by_decoration_overlays = false', 'in_editor_color = #FFC800FF',
    'advanced_posx = -2147483648', 'advanced_posy = -2147483648', 'advanced_width = -2147483648', 'advanced_height = -2147483648',
    'stretch_x = false', 'stretch_y = false',
    'appearance_delay_seconds = 1.0', 'disappearance_delay_seconds = 1.0', 'fade_in_speed = 1.0', 'fade_out_speed = 1.0',
    'base_opacity = 1.0', 'parallax_intensity_x = 0.5', 'parallax_intensity_y = 0.5',
    'rotation_degrees = 0.0', 'advanced_rotation_degrees = 0.0', 'vertical_tilt_degrees = 0.0',
    'advanced_vertical_tilt_degrees = 0.0', 'horizontal_tilt_degrees = 0.0', 'advanced_horizontal_tilt_degrees = 0.0',
  ];
}
const block = (lines) => 'element {\n' + lines.map((l) => '  ' + l).join('\n') + '\n}\n';

const image = (name, file, x, y, w, h, mode, nine = false) => block([
  `source = ${SRC}${file}`, 'repeat_texture = false', `nine_slice_texture = ${nine}`,
  'nine_slice_texture_border_x = 10', 'nine_slice_texture_border_y = 12', 'image_tint = #FFFFFF',
  'restart_animated_on_menu_load = false',
  ...common('image', name, x, y, w, h, mode),
]);

const text = (name, source, sourceMode, x, y, w, h, mode, scroll) => block([
  `interactable = ${scroll}`, `source = ${source}`, `source_mode = ${sourceMode}`,
  'shadow = false', 'case_mode = normal', 'scale = 1.0', `base_color = ${DARK}`,
  'text_border = 2', 'line_spacing = 2', `enable_scrolling = ${scroll}`, 'auto_line_wrapping = true',
  'remove_html_breaks = true',
  'code_block_single_color = #737373FF', 'code_block_multi_color = #565656FF',
  `headline_line_color = ${FRAME_LIGHT}FF`, `separation_line_color = ${FRAME_LIGHT}FF`, 'hyperlink_color = #0771FCFF',
  `quote_color = ${FRAME}FF`, 'quote_indent = 8.0', 'quote_italic = true',
  `bullet_list_dot_color = ${FRAME_LIGHT}FF`, 'bullet_list_indent = 8.0', 'bullet_list_spacing = 3.0',
  'parse_markdown = true', 'table_show_header = true', 'table_alternate_row_colors = true',
  'table_line_color = #787878FF', 'table_header_background_color = #323232FF', 'table_row_background_color = #282828FF',
  'table_alternate_row_color = #3C3C3CFF', 'table_line_thickness = 1.0', 'table_cell_padding = 8.0', 'table_margin = 4.0',
  `grabber_texture_normal = ${SRC}changelog_grabber.png`, `grabber_texture_hover = ${SRC}changelog_grabber_hover.png`,
  ...common('text_v2', name, x, y, w, h, mode),
]);

function button(name, setTo, x, y, w, h, mode) {
  const blk = uid(), act = uid();
  return block([
    `button_element_executable_block_identifier = ${blk}`,
    `[executable_action_instance:${act}][action_type:set_variable] = ${VAR}:${setTo}`,
    `[executable_block:${blk}][type:generic] = [executables:${act};]`,
    `backgroundnormal = ${SRC}changelog_clear.png`, `backgroundhovered = ${SRC}changelog_hover.png`,
    'underline_label_on_hover = false', 'transparent_background = false', 'restartbackgroundanimations = true',
    'nine_slice_custom_background = false', 'clicksound = [source:local]/config/fancymenu/assets/click.ogg',
    'label =  ', 'navigatable = true',
    ...(() => { const c = uid(); return [`widget_active_state_requirement_container_identifier = ${c}`, `[loading_requirement_container_meta:${c}] = [groups:][instances:]`]; })(),
    'is_template = false', 'template_apply_width = false', 'template_apply_height = false', 'template_apply_posx = false',
    'template_apply_posy = false', 'template_apply_opacity = false', 'template_apply_visibility = false',
    'template_apply_label = false', 'template_share_with = buttons', 'nine_slice_slider_handle = false',
    ...common('custom_button', name, x, y, w, h, mode),
    'click_sound_volume = 1.0', 'click_sound_channel = master', 'hover_sound_volume = 1.0', 'hover_sound_channel = master',
    'label_scale = 1.0', 'label_shadow = false', 'nine_slice_border_x = 5', 'nine_slice_border_y = 5',
    'nine_slice_slider_handle_border_x = 5', 'nine_slice_slider_handle_border_y = 5',
    'unhover_sound_volume = 1.0', 'unhover_sound_channel = master',
  ]);
}

function elements() {
  const OPEN = 'if_not', CLOSED = 'if';
  const title = '**{"placeholder":"local","values":{"key":"pixelgo.menu.changelog_title"}}**';
  const body = '[source:local]/config/fancymenu/assets/changelog/changelog_{"placeholder":"local","values":{"key":"pixelgo.menu.changelog_lang"}}.md';
  const bx = PX + 4, by = PY + 4, bw = PW - 8, bh = HH - 4;
  return [
    image('panel-open', 'changelog_panel.png', PX, PY, PW, PH, OPEN, true),
    image('panel-closed', 'changelog_panel.png', PX, PY, PW, HH + 6, CLOSED, true),
    image('separator', 'changelog_line.png', PX + 8, PY + HH, PW - 16, 1, OPEN),
    button('toggle-close', 'true', bx, by, bw, bh, OPEN),
    button('toggle-open', 'false', bx, by, bw, bh, CLOSED),
    text('title', title, 'direct', PX + 8, PY + 7, PW - 40, 14, null, false),
    image('arrow-open', 'changelog_arrow_up.png', PX + PW - 23, PY + 11, 11, 6, OPEN),
    image('arrow-closed', 'changelog_arrow_down.png', PX + PW - 23, PY + 11, 11, 6, CLOSED),
    text('body', body, 'resource', PX + 8, PY + HH + 3, PW - 13, PH - HH - 12, OPEN, true),
  ].join('\n');
}

// ---------- patch layout ----------
function patch() {
  let src = fs.readFileSync(LAYOUT, 'utf8').replace(/\r\n/g, '\n');
  // drop previous run
  src = src.replace(/element \{\n(?:(?!\n\}\n)[\s\S])*?instance_identifier = pixelgo-changelog-[\s\S]*?\n\}\n\n?/g, '');
  // move the 7 menu buttons up
  const order = ['mc_titlescreen_singleplayer_button', 'mc_titlescreen_multiplayer_button', 'mc_titlescreen_options_button',
    'titlescreen_mods_button', '82f715d7-0428-4fd4-b63c-b06a472ab306-1756026274850', 'c1b20bc7-fca4-40f2-adcc-c4a2571e9482-1756026476027',
    'mc_titlescreen_quit_button'];
  order.forEach((ident, i) => {
    const re = new RegExp(`(instance_identifier = ${ident}\\n[\\s\\S]*?\\n  anchor_point = )[a-z-]+(\\n[\\s\\S]*?\\n  y = )-?\\d+`);
    if (!re.test(src)) throw new Error('button not found: ' + ident);
    src = src.replace(re, `$1mid-right$2${MENU_TOP + i * MENU_STEP}`);
  });
  const at = src.indexOf('vanilla_button {');
  src = src.slice(0, at) + elements() + '\n' + src.slice(at);
  fs.writeFileSync(LAYOUT, src);
}

textures();
patch();
console.log('changelog panel written; menu top =', MENU_TOP);
