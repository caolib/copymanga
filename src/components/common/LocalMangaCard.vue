<template>
    <MangaCard :manga="manga" :item="item" click-type="local" :use-card-cover="true" :show-overlay="true"
        :overlay-text="overlayText" :show-author="false" card-class="manga-card local-manga-card" v-bind="$attrs"
        @click="handleClick">
        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}"></slot>
        </template>
    </MangaCard>
</template>

<script setup>
import { computed } from 'vue'
import MangaCard from '../manga/MangaCard.vue'
import { useMangaCardClick } from '@/composables/useMangaCardClick.js'

const props = defineProps({
    manga: {
        type: Object,
        required: true
    },
    item: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['click'])

const { handleMangaCardClick } = useMangaCardClick()

// 计算覆盖层文本
const overlayText = computed(() => {
    if (props.manga.chapterCount) {
        return `${props.manga.chapterCount} 章节`
    }
    return ''
})

// 处理点击
const handleClick = (clickData) => {
    // 发送自定义事件
    emit('click', clickData)

    // 执行默认点击逻辑
    handleMangaCardClick(clickData)
}
</script>
