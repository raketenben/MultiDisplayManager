<template>
  <div 
    class="alert alert-primary" 
    role="alert"
  >
    <p>sfsfsf</p>
  </div>
  <router-view />
</template>

<script lang="ts">
import '/@/../../../node_modules/bootstrap/scss/bootstrap.scss';

import {defineComponent} from 'vue';

export default defineComponent({
  name: 'App',
  created: function(){
      window.link.on('interfaceTypeResponse',(_interface) => {
      this.$router.push(_interface);
    });
    window.link.send('interfaceTypeRequest',true);
  },
});

</script>