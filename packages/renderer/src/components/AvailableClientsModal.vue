<template>
  <div 
    id="pairingModal"
    class="modal fade"
    role="dialog"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            Devices
          </h5>
          <button 
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close" 
          />
        </div>
        <div class="modal-body">
          <ul class="list-group">
            <h6>Ready for Pairing:</h6>
            <div
              v-if="pairableClients.size < 1"
              class="alert alert-info"
              role="alert"
            >
              no screen in pairing mode found
            </div>
            <acr 
              v-for="[name,client] in pairableClients"
              :key="name" 
              :data="client"
              :paired="false"
            />
          </ul>
          <br>
          <ul class="list-group">
            <h6>Paired:</h6>
            <div
              v-if="pairedClients.size < 1"
              class="alert alert-info"
              role="alert"
            >
              no screens connected
            </div>
            <acr 
              v-for="[name,client] in pairedClients" 
              :key="name" 
              :data="client"
              :paired="true"
            />
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import type { PropType} from 'vue';

import type { Client } from 'types/renderer';

import AvailableClientsRow from './AvailableClientsRow.vue';

export default defineComponent({
    name: 'AvailableClientsModal',
    components:{
      acr:AvailableClientsRow,
    },
    props:{
        'availableClients': {
          type: Object as PropType<Map<string,Client>>,
          required: true,
        },
        'pairedClients': {
          type: Object as PropType<Map<string,Client>>,
          required: true,
        },
    },
    computed:{
      pairableClients(){
        return new Map([...this.availableClients].filter(([,client])=>{
          return client.pairingModeActive;
        }));
      },
    },
});
</script>
