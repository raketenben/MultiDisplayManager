<template>
  <button 
    type="button"
    class="btn navbar-light btn-primary"
    @click="onClick"
  >
    <i
      v-if="!modelValue"
      class="bi bi-pause-fill "
    />
    <i
      v-else
      class="bi bi-play-fill"
    />
  </button>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

export default defineComponent({
    name: 'PausePlayButton',
    props:{
        'modelValue':{
            type: Boolean,
            required:true,
        },
    },
    emits: ['update:modelValue'],
    methods:{
        onClick: function() {
            this.$emit('update:modelValue', !this.modelValue);
        },
    },
});
</script>