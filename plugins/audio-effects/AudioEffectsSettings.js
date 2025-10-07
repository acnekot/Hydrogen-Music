import { createElementVNode as _createElementVNode, unref as _unref, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, pushScopeId as _pushScopeId, popScopeId as _popScopeId } from "vue"

const _withScopeId = n => (_pushScopeId("data-v-audio-effects-settings"),n=n(),_popScopeId(),n)
const _hoisted_1 = { class: "plugin-settings-page" }
const _hoisted_2 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("span", null, "返回", -1 /* HOISTED */))
const _hoisted_3 = [
  _hoisted_2
]
const _hoisted_4 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "header-meta" }, [
  /*#__PURE__*/_createElementVNode("h1", null, "音效增强"),
  /*#__PURE__*/_createElementVNode("p", null, "通过提升低频、高频、存在感与空间混响，为播放带来更具层次感的声音表现。")
], -1 /* HOISTED */))
const _hoisted_5 = {
  key: 0,
  class: "plugin-card"
}
const _hoisted_6 = { class: "plugin-option" }
const _hoisted_7 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "plugin-option-name" }, "启用音效增强", -1 /* HOISTED */))
const _hoisted_8 = { class: "plugin-option-control" }
const _hoisted_9 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "plugin-divider" }, null, -1 /* HOISTED */))
const _hoisted_10 = { class: "plugin-option" }
const _hoisted_11 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "plugin-option-name" }, "低音增强", -1 /* HOISTED */))
const _hoisted_12 = { class: "plugin-option-control" }
const _hoisted_13 = ["value"]
const _hoisted_14 = { class: "option-value" }
const _hoisted_15 = { class: "plugin-option" }
const _hoisted_16 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "plugin-option-name" }, "存在感增强", -1 /* HOISTED */))
const _hoisted_17 = { class: "plugin-option-control" }
const _hoisted_18 = ["value"]
const _hoisted_19 = { class: "option-value" }
const _hoisted_20 = { class: "plugin-option" }
const _hoisted_21 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "plugin-option-name" }, "高音增强", -1 /* HOISTED */))
const _hoisted_22 = { class: "plugin-option-control" }
const _hoisted_23 = ["value"]
const _hoisted_24 = { class: "option-value" }
const _hoisted_25 = { class: "plugin-option" }
const _hoisted_26 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "plugin-option-name" }, "立体声宽度", -1 /* HOISTED */))
const _hoisted_27 = { class: "plugin-option-control" }
const _hoisted_28 = ["value"]
const _hoisted_29 = { class: "option-value" }
const _hoisted_30 = { class: "plugin-option" }
const _hoisted_31 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "plugin-option-name" }, "空间混响", -1 /* HOISTED */))
const _hoisted_32 = { class: "plugin-option-control" }
const _hoisted_33 = ["value"]
const _hoisted_34 = { class: "option-value" }
const _hoisted_35 = { class: "plugin-option" }
const _hoisted_36 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "plugin-option-name" }, "输出增益", -1 /* HOISTED */))
const _hoisted_37 = { class: "plugin-option-control" }
const _hoisted_38 = ["value"]
const _hoisted_39 = { class: "option-value" }
const _hoisted_40 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("div", { class: "plugin-divider" }, null, -1 /* HOISTED */))
const _hoisted_41 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("span", { class: "hint" }, "默认设置提供轻微的现场感，可在此基础上微调至喜好的音色。", -1 /* HOISTED */))
const _hoisted_42 = {
  key: 1,
  class: "plugin-card plugin-card--unavailable"
}
const _hoisted_43 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("h2", null, "当前环境暂不支持", -1 /* HOISTED */))
const _hoisted_44 = /*#__PURE__*/ _withScopeId(() => /*#__PURE__*/_createElementVNode("p", null, "检测到当前浏览器或运行环境未启用 Web Audio，暂无法使用音效增强功能。", -1 /* HOISTED */))
const _hoisted_45 = [
  _hoisted_43,
  _hoisted_44
]

import { useRouter } from 'vue-router'
import {
  audioEffectsState,
  resetAudioEffects,
  setAudioEffectsAmbience,
  setAudioEffectsBass,
  setAudioEffectsBypass,
  setAudioEffectsOutputGain,
  setAudioEffectsPresence,
  setAudioEffectsStereoWidth,
  setAudioEffectsTreble
} from './index.js'


const __sfc__ = {
  __name: 'AudioEffectsSettings',
  setup(__props) {

const state = audioEffectsState
const router = useRouter()

const goBack = () => {
  router.push('/settings')
}

const toggleBypass = () => {
  setAudioEffectsBypass(!state.bypass)
}

const onBassChange = (value) => {
  setAudioEffectsBass(Number(value))
}

const onPresenceChange = (value) => {
  setAudioEffectsPresence(Number(value))
}

const onTrebleChange = (value) => {
  setAudioEffectsTreble(Number(value))
}

const onWidthChange = (value) => {
  setAudioEffectsStereoWidth(Number(value))
}

const onAmbienceChange = (value) => {
  setAudioEffectsAmbience(Number(value))
}

const onOutputGainChange = (value) => {
  setAudioEffectsOutputGain(Number(value))
}

const reset = () => {
  resetAudioEffects()
}

const displayDb = (value) => {
  if (!Number.isFinite(Number(value))) return '0 dB'
  const numeric = Math.round(Number(value) * 10) / 10
  const prefix = numeric > 0 ? '+' : ''
  return `${prefix}${numeric} dB`
}

const displayPercent = (value) => {
  if (!Number.isFinite(Number(value))) return '0%'
  return `${Math.round(Number(value) * 100)}%`
}

const displayWidth = (value) => {
  if (!Number.isFinite(Number(value))) return '100%'
  return `${Math.round(Number(value) * 100)}%`
}

return (_ctx, _cache) => {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("header", { class: "plugin-settings-header" }, [
      _createElementVNode("button", {
        class: "back-button",
        type: "button",
        onClick: goBack
      }, _hoisted_3),
      _hoisted_4
    ]),
    (_unref(state).available)
      ? (_openBlock(), _createElementBlock("section", _hoisted_5, [
          _createElementVNode("div", _hoisted_6, [
            _hoisted_7,
            _createElementVNode("div", _hoisted_8, [
              _createElementVNode("button", {
                class: "button button--toggle",
                type: "button",
                onClick: toggleBypass
              }, _toDisplayString(_unref(state).bypass ? '已关闭' : '已开启'), 1 /* TEXT */)
            ])
          ]),
          _hoisted_9,
          _createElementVNode("div", {
            class: _normalizeClass(["plugin-option-list", { 'is-disabled': _unref(state).bypass }])
          }, [
            _createElementVNode("div", _hoisted_10, [
              _hoisted_11,
              _createElementVNode("div", _hoisted_12, [
                _createElementVNode("input", {
                  class: "slider",
                  type: "range",
                  min: "-12",
                  max: "12",
                  step: "1",
                  value: _unref(state).bass,
                  onInput: _cache[0] || (_cache[0] = $event => (onBassChange($event.target.value)))
                }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_13),
                _createElementVNode("span", _hoisted_14, _toDisplayString(displayDb(_unref(state).bass)), 1 /* TEXT */)
              ])
            ]),
            _createElementVNode("div", _hoisted_15, [
              _hoisted_16,
              _createElementVNode("div", _hoisted_17, [
                _createElementVNode("input", {
                  class: "slider",
                  type: "range",
                  min: "-12",
                  max: "12",
                  step: "1",
                  value: _unref(state).presence,
                  onInput: _cache[1] || (_cache[1] = $event => (onPresenceChange($event.target.value)))
                }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_18),
                _createElementVNode("span", _hoisted_19, _toDisplayString(displayDb(_unref(state).presence)), 1 /* TEXT */)
              ])
            ]),
            _createElementVNode("div", _hoisted_20, [
              _hoisted_21,
              _createElementVNode("div", _hoisted_22, [
                _createElementVNode("input", {
                  class: "slider",
                  type: "range",
                  min: "-12",
                  max: "12",
                  step: "1",
                  value: _unref(state).treble,
                  onInput: _cache[2] || (_cache[2] = $event => (onTrebleChange($event.target.value)))
                }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_23),
                _createElementVNode("span", _hoisted_24, _toDisplayString(displayDb(_unref(state).treble)), 1 /* TEXT */)
              ])
            ]),
            _createElementVNode("div", _hoisted_25, [
              _hoisted_26,
              _createElementVNode("div", _hoisted_27, [
                _createElementVNode("input", {
                  class: "slider",
                  type: "range",
                  min: "0",
                  max: "2",
                  step: "0.05",
                  value: _unref(state).stereoWidth,
                  onInput: _cache[3] || (_cache[3] = $event => (onWidthChange($event.target.value)))
                }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_28),
                _createElementVNode("span", _hoisted_29, _toDisplayString(displayWidth(_unref(state).stereoWidth)), 1 /* TEXT */)
              ])
            ]),
            _createElementVNode("div", _hoisted_30, [
              _hoisted_31,
              _createElementVNode("div", _hoisted_32, [
                _createElementVNode("input", {
                  class: "slider",
                  type: "range",
                  min: "0",
                  max: "1",
                  step: "0.05",
                  value: _unref(state).ambience,
                  onInput: _cache[4] || (_cache[4] = $event => (onAmbienceChange($event.target.value)))
                }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_33),
                _createElementVNode("span", _hoisted_34, _toDisplayString(displayPercent(_unref(state).ambience)), 1 /* TEXT */)
              ])
            ]),
            _createElementVNode("div", _hoisted_35, [
              _hoisted_36,
              _createElementVNode("div", _hoisted_37, [
                _createElementVNode("input", {
                  class: "slider",
                  type: "range",
                  min: "-12",
                  max: "6",
                  step: "0.5",
                  value: _unref(state).outputGain,
                  onInput: _cache[5] || (_cache[5] = $event => (onOutputGainChange($event.target.value)))
                }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_38),
                _createElementVNode("span", _hoisted_39, _toDisplayString(displayDb(_unref(state).outputGain)), 1 /* TEXT */)
              ])
            ])
          ], 2 /* CLASS */),
          _hoisted_40,
          _createElementVNode("div", { class: "reset-row" }, [
            _createElementVNode("button", {
              class: "button",
              type: "button",
              onClick: reset
            }, "恢复默认"),
            _hoisted_41
          ])
        ]))
      : (_openBlock(), _createElementBlock("section", _hoisted_42, _hoisted_45))
  ]))
}
}

}

const __css__ = ".plugin-settings-page[data-v-audio-effects-settings] {\n  padding: 32px 28px;\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n  color: #000;\n}\n.plugin-settings-header[data-v-audio-effects-settings] {\n  display: flex;\n  align-items: flex-start;\n  gap: 16px;\n}\n.back-button[data-v-audio-effects-settings] {\n  border: none;\n  background: rgba(0, 0, 0, 0.08);\n  color: #000;\n  font-family: SourceHanSansCN-Bold;\n  font-size: 14px;\n  padding: 8px 18px;\n  border-radius: 999px;\n  cursor: pointer;\n  transition: 0.2s;\n}\n.back-button[data-v-audio-effects-settings]:hover {\n  opacity: 0.85;\n  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);\n}\n.header-meta[data-v-audio-effects-settings] {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.header-meta h1[data-v-audio-effects-settings] {\n  margin: 0;\n  font-size: 28px;\n  font-family: SourceHanSansCN-Bold;\n}\n.header-meta p[data-v-audio-effects-settings] {\n  margin: 0;\n  font-size: 14px;\n  line-height: 1.7;\n  color: rgba(0, 0, 0, 0.65);\n}\n.plugin-card[data-v-audio-effects-settings] {\n  background: rgba(255, 255, 255, 0.6);\n  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);\n  border-radius: 20px;\n  padding: 24px;\n  display: flex;\n  flex-direction: column;\n  gap: 20px;\n}\n.plugin-option-list[data-v-audio-effects-settings] {\n  display: flex;\n  flex-direction: column;\n  gap: 18px;\n}\n.plugin-option[data-v-audio-effects-settings] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: space-between;\n  gap: 16px;\n}\n.plugin-option-name[data-v-audio-effects-settings] {\n  font-size: 16px;\n  font-family: SourceHanSansCN-Bold;\n  min-width: 140px;\n}\n.plugin-option-control[data-v-audio-effects-settings] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  flex: 1;\n  justify-content: flex-end;\n}\n.slider[data-v-audio-effects-settings] {\n  width: 260px;\n}\n.option-value[data-v-audio-effects-settings] {\n  min-width: 68px;\n  text-align: right;\n  font-size: 13px;\n  color: rgba(0, 0, 0, 0.6);\n}\n.button[data-v-audio-effects-settings] {\n  border: none;\n  background: rgba(0, 0, 0, 0.08);\n  color: #000;\n  font-family: SourceHanSansCN-Bold;\n  font-size: 14px;\n  padding: 8px 20px;\n  border-radius: 999px;\n  cursor: pointer;\n  transition: 0.2s;\n}\n.button[data-v-audio-effects-settings]:hover {\n  opacity: 0.85;\n  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);\n}\n.button--toggle[data-v-audio-effects-settings] {\n  min-width: 148px;\n}\n.plugin-divider[data-v-audio-effects-settings] {\n  height: 1px;\n  width: 100%;\n  background: rgba(0, 0, 0, 0.08);\n}\n.reset-row[data-v-audio-effects-settings] {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n}\n.hint[data-v-audio-effects-settings] {\n  font-size: 12px;\n  color: rgba(0, 0, 0, 0.55);\n}\n.plugin-card--unavailable[data-v-audio-effects-settings] {\n  align-items: flex-start;\n  gap: 12px;\n}\n.plugin-card--unavailable h2[data-v-audio-effects-settings] {\n  margin: 0;\n  font-size: 18px;\n  font-family: SourceHanSansCN-Bold;\n}\n.plugin-card--unavailable p[data-v-audio-effects-settings] {\n  margin: 0;\n  font-size: 14px;\n  color: rgba(0, 0, 0, 0.6);\n  line-height: 1.6;\n}\n.is-disabled[data-v-audio-effects-settings] {\n  opacity: 0.45;\n  pointer-events: none;\n}\n@media (max-width: 768px) {\n.plugin-settings-page[data-v-audio-effects-settings] {\n    padding: 24px 16px;\n}\n.plugin-option-control[data-v-audio-effects-settings] {\n    justify-content: flex-start;\n}\n.slider[data-v-audio-effects-settings] {\n    width: 200px;\n}\n}";

let __styleEl__ = null;

function __injectCSS__() {

  if (__styleEl__ || !__css__) return;

  if (typeof document === 'undefined') return;

  __styleEl__ = document.createElement('style');

  __styleEl__.setAttribute('type', 'text/css');

  __styleEl__.innerHTML = __css__;

  document.head.appendChild(__styleEl__);

}

__injectCSS__();

const __setup__ = __sfc__.setup;

__sfc__.setup = function(...args) {

  __injectCSS__();

  return __setup__ ? __setup__.apply(this, args) : undefined;

};

export default __sfc__;
