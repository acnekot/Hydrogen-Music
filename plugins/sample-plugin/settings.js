import { defineComponent, ref, h } from 'vue'

export default defineComponent({
    name: 'SamplePluginSettings',
    setup() {
        const counter = ref(0)
        const message = ref('点击下方按钮体验插件系统的交互。')
        const handleClick = () => {
            counter.value += 1
            message.value = `按钮已点击 ${counter.value} 次`
        }

        return () =>
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', color: 'black' } }, [
                h('p', { style: { fontSize: '13px', margin: 0 } }, message.value),
                h(
                    'div',
                    {
                        style: {
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px 18px',
                            backgroundColor: 'rgba(255, 255, 255, 0.35)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: '0.2s',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                        },
                        onClick: handleClick,
                    },
                    `点击体验（${counter.value}）`
                ),
            ])
    },
})
