<template>
  <nav 
    class="navbar bg-light p-0 justify-content-between"
  >
    <div>
      <!-- blackout the screens -->
      <button 
        class="btn navbar-light btn-primary m-1"
        @click="blackoutActive = !blackoutActive"
      >
        <i 
          v-if="!blackoutActive" 
          class="bi bi-display" 
        />
        <i 
          v-else 
          class="bi bi-display-fill" 
        />
      </button>

      <!-- identifie the screens -->
      <button 
        class="btn navbar-light btn-primary m-1"
        @click="identifieActive = !identifieActive"
      >
        <i 
          v-if="!identifieActive" 
          class="bi bi-question-square" 
        />
        <i 
          v-else 
          class="bi bi-x-circle" 
        />
      </button>
    </div>
    <div 
      class="btn-group align-self-sm-center" 
      role="group" 
      aria-label="Play / Pause"
    >
      <div class="input-group-text">
        <i class="bi bi-collection-play-fill text-dark" />
      </div>
      <button
        class="btn navbar-light btn-outline-primary"
        @click="setPauseAll(false)"
      >
        <i class="bi bi-play" />
      </button>

      <button
        class="btn navbar-light btn-outline-primary"
        @click="setPauseAll(true)"
      >
        <i class="bi bi-pause" />
      </button>
    </div>

    <!-- pairing modal -->
    <button 
      type="button"
      class="btn navbar-light btn-primary m-2"
      data-bs-toggle="modal"
      data-bs-target="#pairingModal"
    >
      <i class="bi bi-link" />
      Devices
    </button>
  </nav>

  <acm 
    :available-clients="available_clients" 
    :paired-clients="paired_clients"
  />

  <!-- show waiting message -->
  <div 
    v-if="clients_length == 0" 
    class="alert alert-info"
  >
    <p>no screens connected</p>
  </div>
  <div class="container p-2">
    <div class="row g-2">
      <div 
        v-for="([name,data],i) in paired_clients" 
        :key="name" 
        class="col" 
      >
        <mss 
          :ref="setRef"
          :blackout="blackoutActive" 
          :identifie="identifieActive" 
          :data="data"
          :index="parseInt(i.toString())"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import MonitorStatusSelector from './MonitorStatusSelector.vue';
import AvailableClientsModal from './AvailableClientsModal.vue';
import type { Client } from 'types/renderer';
export default defineComponent({
  name: 'Host',
  components:{
    mss:MonitorStatusSelector,
    acm:AvailableClientsModal,
  },
  data: function(){
    return {
      available_clients: new Map() as Map<string,Client>,
      pairable_clients: new Map() as Map<string,Client>,
      paired_clients: new Map() as Map<string,Client>,
      mssRefs: [] as Array<typeof MonitorStatusSelector>,
      identifieActive: false as boolean,
      blackoutActive: false as boolean,
    };
  },
  computed: {
    clients_length:function() : number {
      return this.paired_clients.size;
    },
  },
  beforeUpdate: function(){
    this.mssRefs = [];
  },
  mounted:function(){
    window.link.onAvailableClients((clients : Map<string,Client>) => {
      this.available_clients = clients;
    });
    window.link.onPairableClients((clients : Map<string,Client>) => {
      this.available_clients = clients;
    });
    window.link.onPairedClients((clients : Map<string,Client>) => {
      this.paired_clients = clients;
    });
  },
  methods: {
    setPauseAll: function(paused: boolean) {
      for(let e of this.mssRefs) {
        e.setPaused(paused);
      }
    },
    setRef: function(ele: typeof MonitorStatusSelector) : string {
      this.mssRefs.push(ele);
      return ele.name;
    },
  },
});
</script>

<style scoped>
  .navbar button {
    font-size:1.2em !important;
  }
</style>