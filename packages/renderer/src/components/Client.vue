<template>
  <div class="h-100 d-flex flex-column bg-black text-white justify-content-center">
    <!--iterator for displaying errors-->
    <div 
      v-for="error in errors"
      :key="error.text"
      class="alert alert-danger" 
      role="alert"
    >
      <p>{{ error.text }}</p>
    </div>

    <!--show waiting message as long as no host is found-->
    <div 
      v-if="!host" 
      class="align-self-center justify-self-center d-flex flex-column align-items-center"
    >
      <span>Waiting for Host...</span>
      <div 
        class="spinner-border m-2" 
        role="status"
      />
    </div>

    <div 
      v-else 
      class="h-100"
    > 
      <!-- screen identifier and blackout -->
      <h1 
        class="identifie"
        :class="{blackout:blackout}"
      >
        {{ (identifie == 0) ? '' : identifie }}
      </h1>

      <!-- Image -->
      <img 
        ref="imageContent" 
        class="d-none"
      >

      <!-- Video -->
      <video 
        ref="videoContent" 
        autoplay 
        class="d-none" 
        @ended="videoEnded"
      />
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

import type {Socket} from 'socket.io-client';
import io from 'socket.io-client';

export default defineComponent({
  name: 'Client',
  data: function(){
    return {
      errors: [] as Error[],
      socket: null as Socket | null,
      hosts: [] as DiscoveryData[],
      files: [] as string[],
      fileIndex: 0 as number,
      contentType: null as string | null,
      interval: 2000 as number,
      timeout: null as number | null,
      identifie: 0 as number,
      blackout: false as boolean,
    };
  },
  computed:{
    hostIndex: function(){
      if(this.hosts.length == 0) return null;
      return 0;
    },
    host:function() : DiscoveryData | null {
      if(this.hostIndex === null) return null;
      return this.hosts[this.hostIndex];
    },
    currentURL:function() : string | null {
      //make sure all required values are present
      if(!this.host || !this.socket || !this.currentFile) return null;
      return `http://${this.host.addr}:${this.host.data.port}/${this.socket.id}/${this.currentFile}`;
    },
    currentFile:function() : string | null {
      if(this.files.length < this.fileIndex) return null;
      return this.files[this.fileIndex];
    },
  },
  watch:{
    hostIndex:function(){
      if(!this.host){
        if(this.socket != null)
        this.socket.disconnect();
        this.socket = null;
        return;
      }
      let hostSocketAddress = `ws://${this.host.addr}:${this.host.data.port}`;
      this.socket = io(hostSocketAddress);
      this.setSocketListener();
    },
    currentURL:function(){
      if(!this.currentURL) return;
      let url = this.currentURL;
      fetch(url,{method:'HEAD'}).then((response) => {
        let contentType = response.headers.get('Content-Type')?.split('/')[0];
        this.contentType = (!contentType) ? null : contentType;

        switch(this.contentType){
          case 'image':
            (this.$refs.imageContent as HTMLImageElement).classList.remove('d-none');
            (this.$refs.videoContent as HTMLVideoElement).classList.add('d-none');

            (this.$refs.imageContent as HTMLImageElement).setAttribute('src',url);

            //make sure image is loaded before next file is queued
            (this.$refs.imageContent as HTMLImageElement).addEventListener('load',() => {
              //start timeout for next file
              this.timeout = window.setTimeout(() => {
                this.nextFile();
              },this.interval);
            });

            break;
          case 'video':
            (this.$refs.imageContent as HTMLImageElement).classList.add('d-none');
            (this.$refs.videoContent as HTMLVideoElement).classList.remove('d-none');

            (this.$refs.videoContent as HTMLVideoElement).setAttribute('src',url);
            break;
          default:
            this.nextFile();
        }
      });
    },
  },
  created: function(){
    window.link.onNewHost((newHost) => {
      this.hosts.push(newHost);
    });
  },
  methods:{
    nextFile:function() : void {
      if(this.fileIndex < this.files.length-1){
        this.fileIndex++;
      }else{
        this.fileIndex = 0;
      }
    },
    videoEnded:function() : void {
      if(this.files.length == 1){
        this.nextFile();
      }else{
        (this.$refs.videoContent as HTMLVideoElement).pause();
        (this.$refs.videoContent as HTMLVideoElement).currentTime = 0;
        (this.$refs.videoContent as HTMLVideoElement).play();
      }
    },
    setSocketListener:function() {
      if(!this.socket) return;
      this.socket.on('filesPublished',(_files) => {
        //clear timeouts
        if(this.timeout){
          clearTimeout(this.timeout);
          this.timeout = null;
        }
        //stop playing video
        
        this.files = _files;
        this.nextFile();
      });
      this.socket.on('interval',(value) => {
        this.interval = value*1000;
        console.log(this.interval);
      });
      this.socket.on('identifie',(value) => {
        this.identifie = value;
      });
      this.socket.on('blackout',(value) => {
        this.blackout = value;
      });
      this.socket.on('disconnect',() => {
        console.info('Host disconnected');
        //clear all old values
        (this.$refs.videoContent as HTMLVideoElement).pause();
        //clear sockets
        this.socket = null;
        this.files.splice(0,this.files.length);
        if(this.hostIndex !== null) this.hosts.splice(this.hostIndex,1);
      });
      this.socket.on('error',(err) => {
        this.errors.push(new Error(err));
        this.socket = null;
      });
    },
  },
});

interface DiscoveryData {
  addr : string,
  data:{
      port: number,
  }
}

class Error{
  text! : string;

  constructor (_text : string) {
    this.text = _text;

    return this;
  }
}

</script>

<style scoped>
  * {
    cursor:none;
  }

  video, img {
    object-fit: contain;
    width:100%;
    height:100%;
  }

  .identifie {
    display: inline-block;

    color:white;

    position: absolute;
    left: 0px;
    right: 0px;
    top: 0px;
    bottom: 0px;

    height:100vh;
    width: 100vw;
    
    text-align: center;
    vertical-align: middle;

    overflow: hidden;
    font-size: 100vh;
    line-height: 100vh;
    z-index: 1;
  }

  .blackout {
    background: black;
  }
</style>
