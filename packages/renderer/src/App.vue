<template>
  <router-view />
</template>

<script lang="ts">

import {defineComponent} from 'vue';

export default defineComponent({
  name: 'App',
  created: function(){
    //listen for app interface out
    
    window.link.getInterfaceType().then((_interface) => {
      this.$router.push(_interface);
    });
  },
});

</script>

<style>
  * {
    box-sizing:border-box
  }
</style>