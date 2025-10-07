import { unref as _unref, toDisplayString as _toDisplayString, normalizeClass as _normalizeClass, createElementVNode as _createElementVNode, renderList as _renderList, Fragment as _Fragment, openBlock as _openBlock, createElementBlock as _createElementBlock, normalizeStyle as _normalizeStyle, createCommentVNode as _createCommentVNode, Transition as _Transition, withCtx as _withCtx, createVNode as _createVNode, Teleport as _Teleport, createBlock as _createBlock, pushScopeId as _pushScopeId, popScopeId as _popScopeId } from "vue"

const _withScopeId = n => (_pushScopeId("data-v-plugin-selector"),n=n(),_popScopeId(),n)
const _hoisted_1 = { class: "selector-head" }
const _hoisted_2 = ["onClick"]

import { computed, onActivated, onDeactivated, ref } from "vue";
import { absolutePosition } from "../utils/domHandler";


const __sfc__ = {
  __name: 'Selector',
  props: {
  options: Array,
  modelValue: null,
  maxItems: {
    type: Number,
    default: 4,
  },
},
  emits: ["update:modelValue"],
  setup(__props, { emit }) {

const props = __props




const select = ref();
const overlay = ref();
const option = ref(false);
const current = computed(() =>
  props.options.find((x) => x.value === props.modelValue)
);

const changeOption = (e) => {
  emit("update:modelValue", e.value);
  option.value = false;
};

const isLongLabel = (label) => {
  return label?.length >= 20
}

let clickOutside = (event) => {
  if (select.value && !select.value.contains(event.target)) {
    option.value = false;
  }
};
onActivated(() => {
  window.addEventListener("click", clickOutside);
});
onDeactivated(() => {
  window.removeEventListener("click", clickOutside);
});

const changeOptionsVisible = () => (option.value = !option.value);

return (_ctx, _cache) => {
  return (_openBlock(), _createElementBlock("div", {
    class: "selector",
    ref_key: "select",
    ref: select,
    onClick: changeOptionsVisible
  }, [
    _createElementVNode("div", _hoisted_1, [
      _createElementVNode("span", {
        class: _normalizeClass(["select-head-cont", { 'long-label': isLongLabel(_unref(current)?.label) }])
      }, _toDisplayString(_unref(current)?.label), 3 /* TEXT, CLASS */)
    ]),
    (_openBlock(), _createBlock(_Teleport, { to: "body" }, [
      _createVNode(_Transition, {
        name: "selector",
        onEnter: _cache[0] || (_cache[0] = $event => (_unref(absolutePosition)(overlay.value, select.value)))
      }, {
        default: _withCtx(() => [
          (option.value)
            ? (_openBlock(), _createElementBlock("div", {
                key: 0,
                class: "selector-option",
                style: _normalizeStyle({
            '--count': __props.options.length < __props.maxItems ? __props.options.length : __props.maxItems,
            maxHeight: __props.maxItems * 34 + 16 + 'px',
          }),
                ref_key: "overlay",
                ref: overlay
              }, [
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(__props.options, (item) => {
                  return (_openBlock(), _createElementBlock("div", {
                    class: _normalizeClass(["selector-option-item", {
              'selector-option-item-selected': __props.modelValue === item.value,
            }]),
                    onClick: $event => (changeOption(item))
                  }, [
                    _createElementVNode("span", {
                      class: _normalizeClass({'long-label' :isLongLabel(item?.label)})
                    }, _toDisplayString(item?.label), 3 /* TEXT, CLASS */)
                  ], 10 /* CLASS, PROPS */, _hoisted_2))
                }), 256 /* UNKEYED_FRAGMENT */))
              ], 4 /* STYLE */))
            : _createCommentVNode("v-if", true)
        ]),
        _: 1 /* STABLE */
      })
    ]))
  ], 512 /* NEED_PATCH */))
}
}

}

const __css__ = ".selector[data-v-plugin-selector] {\n  position: relative;\n&-head[data-v-plugin-selector] {\n    text-align: center;\n    box-sizing: border-box;\n}\n}\n.selector-option[data-v-plugin-selector] {\n  position: absolute;\n  overflow-y: overlay;\n  background: rgb(228, 240, 240);\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);\n  line-height: 25px;\n  user-select: none;\n  padding: 8px 0;\n}\n.selector-head[data-v-plugin-selector]{\n  padding: 2px 10px;\n  width: 100%;\n}\n.selector-head[data-v-plugin-selector],.selector-option-item[data-v-plugin-selector]{\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n}\n.selector-head:hover .long-label[data-v-plugin-selector], .selector-option-item:hover .long-label[data-v-plugin-selector]{\n    display: block;\n    width: fit-content;\n    animation: slide-label-plugin-selector 5s linear infinite alternate;\n}\n.selector-option-item[data-v-plugin-selector] {\n  width: 200px;\n  height: 34px;\n  font: 13px SourceHanSansCN-Bold;\n  background-image: linear-gradient(90deg, black, black);\n  background-repeat: repeat-y;\n  background-position: -200px 0;\n  padding: 0 16px;\n  line-height: 34px;\n  transition: background-position 0.2s, color 0.2s;\n  cursor: pointer;\n  text-align: center;\n&[data-v-plugin-selector]:hover {\n    background-position: 0 0;\n    color: white;\n}\n&-selected[data-v-plugin-selector] {\n    background-color: black;\n    color: white;\n}\n}\n@keyframes slide-label-plugin-selector{\nfrom {\n    transform: translatex(0%);\n}\nto{\n    transform: translatex(-60%);\n}\n}\n[data-v-plugin-selector]::-webkit-scrollbar-track {\n  border-radius: 0;\n}\n[data-v-plugin-selector]::-webkit-scrollbar {\n  -webkit-appearance: none;\n  width: 6px;\n  height: 6px;\n}\n[data-v-plugin-selector]::-webkit-scrollbar-thumb {\n  cursor: pointer;\n  border-radius: 0;\n  background: rgba(0, 0, 0, 0.15);\n  transition: color 0.2s ease;\n}\n\n\n.selector-enter-active,\n.selector-leave-active {\n  transition: all .225s;\n  overflow: hidden;\n  box-sizing: content-box;\n}\n.selector-enter-from,\n.selector-leave-to {\n  height: 0;\n&.selector-option {\n    padding: 0;\n}\n}\n.selector-enter-to,\n.selector-leave-from {\n  height: calc(var(--count) * 34px);\n&.selector-option {\n    padding: 8px 0;\n}\n}";

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
