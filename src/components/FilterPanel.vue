<template>
    <div class="filter-panel">
        <!-- 筛选标签显示区域 -->
        <div class="filter-tags" @click="showDropdown = !showDropdown">
            <div class="filter-icon">
                <span class="material-icons">filter_list</span>
                选择标签
            </div>
            <div class="selected-tags">
                <span v-if="filters.period" class="tag time-tag">
                    {{ periodLabel[filters.period] }}
                    <span class="remove" @click.stop="removeFilter('period')">&times;</span>
                </span>
                <span v-for="type in selectedTypes" :key="type" class="tag type-tag">
                    {{ type }}
                    <span class="remove" @click.stop="removeType(type)">&times;</span>
                </span>
                <span v-for="tag in selectedTags" :key="tag" class="tag tag-question">
                    {{ tag }}
                    <span class="remove" @click.stop="removeTag(tag)">&times;</span>
                </span>
            </div>
            <span class="clear-all" v-if="hasFilters" @click.stop="clearAll">&times;</span>
        </div>

        <!-- 下拉菜单 -->
        <div v-if="showDropdown" class="dropdown-menu" ref="dropdownRef">
            <!-- 学习状态 -->
            <!-- <div class="filter-section">
                <div class="section-title">
                    <span class="material-icons">school</span>
                    学习状态
                </div>
                <div class="section-content">
                    <div class="filter-item" @click="setStudyStatus('review')">
                        <span class="material-icons">lightbulb</span>
                        回忆
                    </div>
                    <div class="filter-item" @click="setStudyStatus('learned')">
                        <span class="material-icons">check_circle</span>
                        已学
                    </div>
                    <div class="filter-item" @click="setStudyStatus('new')">
                        <span class="material-icons">new_releases</span>
                        未学
                    </div>
                </div>
            </div> -->

            <!-- 时间筛选 -->
            <div class="filter-section">
                <div class="section-title">
                    <span class="material-icons">schedule</span>
                    时间
                </div>
                <div class="section-content">
                    <div class="filter-item" 
                        v-for="(label, value) in periodLabel" 
                        :key="value"
                        :class="{ active: filters.period === value }"
                        @click="setPeriod(value)">
                        <span class="material-icons">{{ value ? 'event' : 'event_available' }}</span>
                        {{ label }}
                    </div>
                </div>
            </div>

            <!-- 类型筛选 -->
            <div class="filter-section">
                <div class="section-title">
                    <span class="material-icons">label</span>
                    类型
                </div>
                <div class="section-content">
                    <div class="filter-item" 
                        v-for="type in types" 
                        :key="type"
                        :class="{ active: selectedTypes.includes(type) }"
                        @click="toggleType(type)">
                        <span class="material-icons">local_offer</span>
                        {{ type }}
                    </div>
                </div>
            </div>

            <!-- 标签筛选 -->
            <div class="filter-section">
                <div class="section-title">
                    <span class="material-icons">sell</span>
                    标签
                </div>
                <div class="section-content">
                    <div class="filter-item"
                        v-for="tag in tags"
                        :key="tag"
                        :class="{ active: selectedTags.includes(tag) }"
                        @click="toggleTag(tag)">
                        <span class="material-icons">sell</span>
                        {{ tag }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
    types: {
        type: Array,
        default: () => []
    },
    tags: {
        type: Array,
        default: () => []
    },
    filters: {
        type: Object,
        default: () => ({
            type: [],
            period: '',
            studyStatus: '',
            tag: []
        })
    }
});

const emit = defineEmits(['update:filters']);
const showDropdown = ref(false);
const dropdownRef = ref(null);

const periodLabel = {
    '': '全部时间',
    '1m': '近1个月',
    '3m': '近3个月',
    '6m': '近6个月'
};

const selectedTypes = computed(() => {
    return Array.isArray(props.filters.type) ? props.filters.type : [];
});

const selectedTags = computed(() => {
    return Array.isArray(props.filters.tag) ? props.filters.tag : [];
});

const hasFilters = computed(() => {
    return props.filters.period || selectedTypes.value.length > 0 || selectedTags.value.length > 0;
});

// 处理点击外部关闭下拉菜单
function handleClickOutside(event) {
    const dropdown = dropdownRef.value;
    if (dropdown && !dropdown.contains(event.target) && !event.target.closest('.filter-tags')) {
        showDropdown.value = false;
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
});

function setPeriod(period) {
    emit('update:filters', {
        ...props.filters,
        period
    });
}

function toggleType(type) {
    const types = new Set(selectedTypes.value);
    if (types.has(type)) {
        types.delete(type);
    } else {
        types.add(type);
    }
    emit('update:filters', {
        ...props.filters,
        type: Array.from(types)
    });
}

function removeType(type) {
    const types = new Set(selectedTypes.value);
    types.delete(type);
    emit('update:filters', {
        ...props.filters,
        type: Array.from(types)
    });
}

function removeFilter(key) {
    const newFilters = { ...props.filters };
    if (key === 'type') {
        newFilters.type = [];
    } else {
        newFilters[key] = '';
    }
    emit('update:filters', newFilters);
}

function clearAll() {
    emit('update:filters', {
        type: [],
        period: '',
        studyStatus: '',
        tag: []
    });
}

function setStudyStatus(status) {
    emit('update:filters', {
        ...props.filters,
        studyStatus: status
    });
}

function toggleTag(tag) {
    const tags = new Set(selectedTags.value);
    if (tags.has(tag)) {
        tags.delete(tag);
    } else {
        tags.add(tag);
    }
    emit('update:filters', {
        ...props.filters,
        tag: Array.from(tags)
    });
}

function removeTag(tag) {
    const tags = new Set(selectedTags.value);
    tags.delete(tag);
    emit('update:filters', {
        ...props.filters,
        tag: Array.from(tags)
    });
}
</script>

<style scoped>
.filter-panel {
    position: relative;
    margin-bottom: 20px;
}

.filter-tags {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    min-height: 40px;
}

.filter-icon {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #666;
    margin-right: 12px;
}

.selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    flex: 1;
}

.tag {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 14px;
}

.time-tag {
    background-color: #fff8e1;
    color: #f57f17;
}

.type-tag {
    background-color: #e8f5e9;
    color: #2e7d32;
}

.tag-question {
    background-color: #e8f5e9;
    color: #2e7d32;
}

.remove {
    margin-left: 4px;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
}

.clear-all {
    font-size: 20px;
    color: #666;
    cursor: pointer;
    padding: 0 4px;
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 8px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    padding: 16px;
}

.filter-section {
    margin-bottom: 16px;
}

.filter-section:last-child {
    margin-bottom: 0;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    color: #666;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
}

.section-content {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.filter-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 16px;
    background: #f5f5f5;
    cursor: pointer;
    transition: all 0.2s;
}

.filter-item:hover {
    background: #eeeeee;
}

.filter-item.active {
    background: #e3f2fd;
    color: #1976d2;
}

.material-icons {
    font-size: 18px;
}
</style> 