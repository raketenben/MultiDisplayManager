<template>
  <div class="h-100 d-flex flex-column justify-content-center align-items-center">
    <div 
      class="spinner-border m-2" 
      role="status"
    />
    <span>Loading...</span>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';

export default defineComponent({
  name: 'Base',
});

</script>