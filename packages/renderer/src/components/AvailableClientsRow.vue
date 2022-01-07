<template>
  <li class="list-group-item d-flex justify-content-between align-items-center">
    {{ data.displayName }}

    <span
      v-if="data.available"
      class="text-success"
    >Available</span>
    <span
      v-else
      class="text-danger"
    >Not Available</span>

    <button 
      v-if="!paired" 
      class="btn btn-success m-1"
      @click="showKeyPairModal"
    >
      Pair
    </button>

    <button 
      v-else
      class="btn btn-danger m-1"
      @click="unpair"
    >
      Remove
    </button>

    <!-- pair code modal -->
    <div 
      ref="pairingKeyModal"
      class="modal fade"
      role="dialog"
    >
      <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              Pairing
            </h5>
            <button 
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close" 
            />
          </div>
          <div class="modal-body">
            <form 
              @submit="formSubmit"
            >
              <div class="form-group d-flex justify-content-between">
                <input 
                  v-model="key"
                  class="text-center"
                  placeholder="- - - - - -"
                  type="text" 
                  pattern="[0-9]{6}"
                  @keypress="onKeyPress"
                >
                <input 
                  type="submit" 
                  class="btn btn-primary"
                  value="Pair"
                >
              </div>
              <p 
                v-if="error"
                class="text-danger my-1"
              >
                Pairing key is invalid
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  </li>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

import type { Client } from 'types/renderer';
import type  { PropType } from 'vue';

import * as bootstrap from 'bootstrap';

export default defineComponent({
    name: 'AvailableClientsRow',
    props:{
        'data': {
          type: Object as PropType<Client>,
          required: true,
        },
        'paired': {
          type: Boolean,
          required: true,
        },
    },
    data: function() {
        return {
          key: '' as string,
          status: false as boolean,
          modal : null as bootstrap.Modal | null,
          error: false as boolean,
        };
    },
    mounted: function() {
      this.modal = new bootstrap.Modal(this.$refs.pairingKeyModal as HTMLElement);
    },
    methods:{
        formSubmit: function(e: Event) {
          e.preventDefault();
          this.pair();
        },
        pair: async function(){
          const result = await window.link.pairClient(this.data.name, this.key);
          if(result){
            this.key = '';
            if(this.modal) this.modal.hide();
            //(this.$refs.status as HTMLElement).innerText = 'Pairing failed';
          }else{
            this.error = true;
          }
        },
        unpair: async function(){
          window.link.unpairClient(this.data.name);
        },
        showKeyPairModal: function(){
          if(this.modal) this.modal.show();
        },
        onKeyPress: function(evt : KeyboardEvent) {
          if (evt.key === 'Enter') {
            evt.preventDefault();
            this.pair();
          }

          /* check if number */
          const allowed = ['Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'];
          if(!allowed.includes(evt.code)) evt.preventDefault();
          if(this.key.length < 6) return;
          evt.preventDefault();
        },
    },
});
</script>
<style>
  .modal {
    background: rgba(0, 0, 0, .1);
  }
</style>
