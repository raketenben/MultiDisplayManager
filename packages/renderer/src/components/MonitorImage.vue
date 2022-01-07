<template>
  <i class="bi bi-display" />
  <span> - {{ id }}</span>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

export default defineComponent({
    name: 'MonitorImage',
    props:{
        'id':{
            type: Number,
            required:true,
        },
    },
});
</script>

<style scoped>
    i, span {
        font-size: 1.4em;
    }
</style>