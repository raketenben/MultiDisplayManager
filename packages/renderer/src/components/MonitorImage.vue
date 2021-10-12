<template>
  <img 
    src="../../assets/screen.svg" 
    :alt="`Monitor`"
  >
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
