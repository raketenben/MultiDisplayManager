<template>
  <div class="container bg-light border rounded p-2">
    <div 
      class="container d-flex flex-row justify-content-between align-items-center"
    >
      <h4 class="m-0">
        {{ data.displayName }}
      </h4>
      <div>
        <mi 
          :id="index+1" 
        />
      </div>
    </div>
    <div class="container form-group">
      <label>Display Time (s): </label>
      <input 
        v-model="interval" 
        class="m-1 border border-dark rounded" 
        type="number" 
        min="0.1" 
        step="0.1"
        max="525600"
      >
    </div>
    <div class="container d-flex flex-row align-items-center justify-content-between p-0">
      <div class="container d-flex gap-1">
        <button 
          class="btn btn-secondary"
          @click="openFileModal"
        >
          <i class="bi bi-files" />
          Manage Files
        </button>
        <ppb v-model="paused" />
      </div>
      <div>
        <span
          v-if="data.available"
          class="text-success"
        >Available</span>
        <span
          v-else
          class="text-danger"
        >Not Available</span>
      </div>
    </div>
  </div>
  <fm
    ref="fileModal"
    :data="data"
  />
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import MonitorImage from './MonitorImage.vue';
import FileManager from './FileManager.vue';
import PausePlayButton from './PausePlayButton.vue';
import type { Client } from 'types/renderer';
import type  { PropType } from 'vue';
export default defineComponent({
    name: 'MonitorStatusSelector',
    components: {
      mi:MonitorImage,
      fm: FileManager,
      ppb: PausePlayButton,
    },
    props:{
        'index':{
            type: Number,
            required:true,
        },
        'data':{
            type: Object as PropType<Client>,
            required:true,
        },
        'identifie':{
          type: Boolean,
          required:true,
        },
        'blackout':{
          type: Boolean,
          required:true,
        },
    },
    data:function(){
      return {
        interval: 5,
        paused: false,
      };
    },
    watch: {
      'identifie': function() {
        if(this.identifie){
          window.link.updateClientIdentifie(this.data.name, this.index+1);
        }else{
          window.link.updateClientIdentifie(this.data.name, 0);
        }
      },
      'blackout': function() {
        window.link.updateClientBlackout(this.data.name, this.blackout);
      },
      'interval': function() {
        window.link.updateClientInterval(this.data.name, this.interval);
      },
      'data': function() {
        this.updateInterval();
      },
    },
    mounted:function(){
      this.updateInterval();
    },
    methods:{
      openFileModal:function(){
        (this.$refs.fileModal as typeof FileManager).show();
      },
      updateInterval:function(){
        window.link.getClientInterval(this.data.name).then(interval => {
          if(interval) this.interval = interval;
        });
      },
      setPaused:function(paused : boolean){
        this.paused = paused;
        //TODO pause call
        //window.link.updateClientPaused(this.data.name, this.paused);
      },
    },
});
</script>

<style scoped>
  .form-group input {
    width: 5em;
  }
</style>