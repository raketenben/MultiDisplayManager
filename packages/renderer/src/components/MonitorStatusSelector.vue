<template>
  <div class="container bg-light border rounded p-2">
    <mi 
      :id="index+1" 
    />
    <br>
    <small>ID: "{{ socketName }}"</small>
    <br>
    <label>Interval: </label>
    <input 
      v-model="interval" 
      class="m-1" 
      type="number" 
      min="0.1" 
      step="0.1" 
    >
    <br>
    <button 
      class="btn btn-secondary my-1"
      @click="fileUploadButton()"
    >
      Select files
    </button>

    <span 
      class="p-2"
      :title="fileList"
    > 
      {{ fileDisplayText }} 
    </span>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import MonitorImage from './MonitorImage.vue';

export default defineComponent({
    name: 'MonitorStatusSelector',
    components: {
      mi:MonitorImage,
    },
    props:{
        'index':{
            type: Number,
            required:true,
        },
        'socketName':{
            type: String,
            required:true,
        },
        'files':{
            type: Array,
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
        interval: 2,
      };
    },
    computed: {
      fileDisplayText: function() : string{
        if (this.files.length < 1) return ' - ';
        if (this.files.length > 1) return `${this.files.length} Files`;
        let filePathSplit = (this.files[0] as string).split('\\');
        return filePathSplit[filePathSplit.length-1];
      },
      fileList:function(){
        return this.files.map((file) => {
          return (file as string).split('\\').pop();
        }).join('\n');
      },
    },
    watch:{
      identifie:function(){
        window.link.identifieMonitor(this.socketName,this.index+1,this.identifie);
      },
      blackout:function(){
        window.link.blackoutMonitor(this.socketName,this.blackout);
      },
      interval:function(){
        window.link.setMonitorInterval(this.socketName,this.interval);
      },
    },
    methods:{
      fileUploadButton: function(){
        window.link.selectFiles(this.socketName);
      },
    },
});
</script>
