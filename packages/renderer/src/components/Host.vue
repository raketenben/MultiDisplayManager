<template>
  <nav 
    class="navbar bg-light p-2"
  >
    <div class="container-fluid justify-content-start">
      <!-- blackout the screens -->
      <button 
        class="btn navbar-light btn-primary m-2"
        @click="blackoutActive = !blackoutActive"
      >
        <img 
          v-if="!blackoutActive" 
          src="../../assets/screen.svg" 
          alt="Blackout screen"
        >
        <img 
          v-else 
          src="../../assets/screen-black.svg" 
          alt="Show screen"
        >
      </button>

      <!-- identifie the screens -->
      <button 
        class="btn navbar-light btn-primary m-2"
        @click="identifieActive = !identifieActive"
      >
        <img 
          v-if="!identifieActive" 
          src="../../assets/question.svg" 
          alt="Identifie screen"
        >
        <img 
          v-else 
          src="../../assets/cross.svg" 
          alt="Hide identifier"
        >
      </button>
    </div>
  </nav>

  <!-- show waiting message -->
  <div 
    v-if="clients_length == 0" 
    class="alert alert-info"
  >
    <p>Waiting for clients to connect...</p>
  </div>
  <div class="container p-2">
    <div class="row g-2">
      <div 
        v-for="([socketName,files], i) in clients" 
        :key="socketName" 
        class="col" 
      >
        <mss 
          :blackout="blackoutActive" 
          :identifie="identifieActive" 
          :index="i" 
          :socket-name="socketName" 
          :files="files"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">

import {defineComponent} from 'vue';
import MonitorStatusSelector from './MonitorStatusSelector.vue';

export default defineComponent({
  name: 'Host',
  components:{
    mss:MonitorStatusSelector,
  },
  data: function(){
    return {
      clients : new Map() as Map<string,string[]>,
      identifieActive: false as boolean,
      blackoutActive: false as boolean,
    };
  },
  computed: {
    clients_length:function() : number {
      return this.clients.size;
    },
  },
  created:function(){
    window.link.onClientsUpdated((clients) => {
      this.clients = clients;
      console.log(this.clients);
    });
  },
});

</script>

<style>
  button img {
    filter: invert(1);
  }
</style>
