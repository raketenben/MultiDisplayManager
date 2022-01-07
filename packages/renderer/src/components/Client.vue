<template>
  <!-- pair code modal -->
  <div 
    ref="pairingModal"
    class="modal fade"
    role="dialog"
  >
    <div class="modal-dialog modal-mg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            Pairing Key:
          </h5>
        </div>
        <div class="modal-body d-flex flex-column align-items-center">
          <h1>{{ pairingKey }}</h1>
          <h5>Name: {{ displayName }}</h5>
          <div class="d-flex flex-row">
            <button 
              type="button"
              class="btn btn-success m-1"
              @click="setPassword"
            >
              Set Password
            </button>
            <button 
              type="button"
              class="btn btn-primary m-1"
              @click="setDisplayName"
            >
              Set Name
            </button>
            <button 
              type="button"
              class="btn btn-danger m-1"
              @click="exitPairing"
            >
              Exit Pairing Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- unlock modal -->
  <div 
    ref="unlockModal"
    class="modal fade"
    role="dialog"
  >
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            Unlock
          </h5>
        </div>
        <div class="modal-body d-flex flex-column align-items-center">
          <form
            class="d-flex flex-column"
            @action="unlockSubmit"
          >
            <div class="form-group d-flex flex-column">
              <label for="password">Password</label>
              <input
                id="password" 
                v-model="password"
                type="password"
                class="m-1"
              >
              <button
                class="btn btn-success m-1"
                @click="unlockSubmit"
              >
                Unlock
              </button>
              <span
                v-if="unlockResult === false"
                class="text-danger m-1"
              > 
                Wrong Password 
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
    
  <!-- set password modal -->
  <div 
    ref="setPasswordModal"
    class="modal fade"
    role="dialog"
  >
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            Set Password:
          </h5>
          <button 
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close" 
          />
        </div>
        <div class="modal-body d-flex flex-column align-items-center">
          <div class="form-group d-flex flex-column">
            <form
              class="d-flex flex-column"
              @submit="changePasswordSubmit"
            >
              <label
                for="password"
                class="m-1"
              >Old Password</label>
              <input
                id="password" 
                v-model="oldPassword" 
                type="password" 
                class="form-control"
              >
              <label
                for="password"
                class="m-1"
              >New Password</label>
              <input 
                id="password" 
                v-model="newPassword" 
                type="password" 
                class="form-control"
              >
              <button 
                type="button"
                class="btn btn-success m-1"
                @click="changePasswordSubmit"
              >
                Set Password
              </button>
              <span
                v-if="passwordSetResult === false"
                class="text-danger"
              >
                Password set failed
              </span>
              <span
                v-if="passwordSetResult === true"
                class="text-success"
              >
                Password changed successfully
              </span>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- set name modal -->
  <div 
    ref="displayNameModal"
    class="modal fade"
    role="dialog"
  >
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            Set display name
          </h5>
          <button 
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close" 
          />
        </div>
        <div class="modal-body d-flex flex-column align-items-center">
          <div class="form-group">
            <form
              class="d-flex flex-column"
              @submit="setDisplaySubmit"
            >
              <label for="password">Display Name</label>
              <input
                id="password" 
                v-model="displayName" 
                type="text" 
                class="form-control"
                pattern="[a-zA-Z0-9-_]{1,64}"
                maxlength="64"
              >
              <button 
                type="button"
                class="btn btn-success m-1"
                @click="setDisplaySubmit"
              >
                Update
              </button>
              <span
                v-if="displayNameSetResult === true"
                class="text-success"
              >
                Display name changed successfully
              </span>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="h-100 d-flex flex-column bg-black text-white justify-content-center">
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
      :class="{'d-none': isImage === false}"
      @load="imageLoaded"
      @error="loadError"
    >

    <!-- Video -->
    <video 
      ref="videoContent" 
      autoplay
      :class="{'d-none': isImage === true}"
      @ended="videoEnded"
      @error="loadError"
    />
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

import * as bootstrap from 'bootstrap';

export default defineComponent({
  name: 'Client',
  data: function(){
    return {
      pairingKey: '------',
      displayName: '',

      password: '',
      oldPassword: '',
      newPassword: '',

      unlockResult: null as boolean | null,
      passwordSetResult: null as boolean | null,
      displayNameSetResult: null as boolean | null,

      setPasswordModal: null as bootstrap.Modal | null,
      unlockModal: null as bootstrap.Modal | null,
      pairingModal: null as bootstrap.Modal | null,
      displayNameModal: null as bootstrap.Modal | null,

      isImage: false as boolean,

      identifie: 0 as number,
      blackout: false as boolean,
    };
  },
  mounted:function(){
    this.pairingModal = new bootstrap.Modal(this.$refs.pairingModal as HTMLElement,{backdrop: 'static'});
    this.setPasswordModal = new bootstrap.Modal(this.$refs.setPasswordModal as HTMLElement);
    this.unlockModal = new bootstrap.Modal(this.$refs.unlockModal as HTMLElement);
    this.displayNameModal = new bootstrap.Modal(this.$refs.displayNameModal as HTMLElement);

    window.addEventListener('keydown',(e) => {
      if(e.key == 'Escape') this.onEscape();
    });

    window.link.getDisplayName().then((name) => {
      this.displayName = name;
    });

    window.link.onBlackoutUpdated((blackout) => {
      this.blackout = blackout;
    });
    window.link.onIdentifieUpdated((identifie) => {
      this.identifie = identifie;
    });

    window.link.onDisplaySucessfullyPaired(() => {
      this.exitPairing();
    });

    window.link.onDisplayFileUpdated((filePath,isImage) => {
      (this.$refs.videoContent as HTMLVideoElement).pause();
      (this.$refs.videoContent as HTMLVideoElement).currentTime = 0;

      this.isImage = isImage;

      if(isImage === true){
        (this.$refs.imageContent as HTMLImageElement).setAttribute('src',filePath);
      }else if(isImage === false){
        (this.$refs.videoContent as HTMLVideoElement).setAttribute('src',filePath);
        (this.$refs.videoContent as HTMLVideoElement).play();
      }
    });
  },
  methods:{
    videoEnded:function() : void {
      (this.$refs.videoContent as HTMLVideoElement).currentTime = 0;
      window.link.videoFinished();
    },
    imageLoaded:function() : void {
      window.link.imageLoaded();
    },
    loadError:function() : void {
      window.link.loadError();
    },

    onEscape:function() : void {
        window.link.unlock('').then((unlocked) => {
          if(unlocked){
            if(this.pairingModal) this.pairingModal.show();
            this.updatePairingKey();
          }else{
            if(this.unlockModal) this.unlockModal.show();
          }
        });
    },
    updatePairingKey:function() : void {
      window.link.getPairingKey().then((key) => {
        this.pairingKey = key;
      });
    },
    exitPairing:function() : void {
      //TODO: make sure this is the correct way to exit pairing
      if(this.unlockModal) this.unlockModal.hide();
      if(this.pairingModal) this.pairingModal.hide();
      if(this.setPasswordModal) this.setPasswordModal.hide();

      window.link.lock();
    },
    setPassword:function() : void {
      if(this.setPasswordModal) this.setPasswordModal.show();
    },
    setDisplayName:function() : void {
      if(this.displayNameModal) this.displayNameModal.show();
    },
    changePasswordSubmit:function() : void {
      window.link.changePassword(this.oldPassword,this.newPassword).then((success) => {
          this.passwordSetResult = success;
          this.oldPassword = '';
          this.newPassword = '';
      });
    },
    unlockSubmit:function(e : Event) : void {
      e.preventDefault();
      window.link.unlock(this.password).then((unlocked) => {
        if(unlocked){
          if(this.unlockModal) this.unlockModal.hide();
          if(this.pairingModal) this.pairingModal.show();
          this.updatePairingKey();
          this.unlockResult = true;
        }else{
          this.unlockResult = false;
        }
        this.password = '';
      });
    },
    setDisplaySubmit:function(e : Event) : void {
      e.preventDefault();
      window.link.setDisplayName(this.displayName).then((success) => {
        this.displayNameSetResult = success;
      });
    },
  },
});

</script>

<style scoped>

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
  .modal {
    color: #000;
  }
</style>
