import { ref } from 'vue';

const bus = ref(new Map());

export function useEventBus() {
    const on = (event, callback) => {
        bus.value.set(event, callback);
    };

    const emit = (event, ...args) => {
        if (bus.value.has(event)) {
            bus.value.get(event)(...args);
        }
    };

    return { on, emit };
} 