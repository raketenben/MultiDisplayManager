<template>
  <div 
    id="fileManagementModal"
    ref="fileModal"
    class="modal fade"
    role="dialog"
  >
    <div class="container">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              File Management
            </h5>
            <button 
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close" 
            />
          </div>
          <div class="modal-body overflow-auto">
            <button
              class="btn btn-success m-1"
              @click="uploadFiles"
            >
              <i class="bi bi-file-earmark-arrow-up" />
              Add Files
            </button>
            <div
              v-if="uploadInProgress"
              class="progress m-1"
            >
              <div
                class="progress-bar bg-success"
                role="progressbar"
                :style="{width: `${uploadProgress}%` }"
                aria-valuenow="25"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {{ uploadProgress }}%
              </div>
            </div>
            <ul class="list-group m-1">
              <draggable
                :list="files"
                item-key="(e,i) => {return e;}"
                @change="change"
              >
                <template #item="{element,index}">
                  <li class="list-group-item d-flex flex-row align-items-center justify-content-between">
                    <i class="bi bi-grip-vertical" />
                    <span>
                      {{ element }}
                    </span>
                    <button 
                      class="btn btn-outline-danger m-1 justify-self-end" 
                      @click="remove(index)"
                    >
                      <i class="bi bi-trash" />
                    </button>
                  </li>
                </template>
              </draggable>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

import draggable from 'vuedraggable/src/vuedraggable';

import type { Client } from 'types/renderer';
import type  { PropType } from 'vue';

import * as bootstrap from 'bootstrap';

export default defineComponent({
    name: 'FileManager',
    components: {
      draggable,
    },
    props:{
        'data':{
            type: Object as PropType<Client>,
            required:true,
        },
    },
    data() {
      return {
        files: [] as string[],
        fileModal: null as bootstrap.Modal | null,
        uploadProgress: 22,
        uploadInProgress: false,
      };
    },
    watch: {
      'data.port': function() {
        this.updateFiles();
      },
      'data.address': function() {
        this.updateFiles();
      },
    },
    mounted() {
      this.fileModal = new bootstrap.Modal(this.$refs.fileModal as HTMLElement);
      this.updateFiles();

      window.link.onUploadProgress(this.data.name,(progress : number) => {
        this.uploadProgress = progress;
      });
    },
    methods: {
      uploadFiles() {
        this.uploadProgress = 0;
        this.uploadInProgress = true;
        window.link.uploadClientFiles(this.data.name).then(() => {
          this.uploadInProgress = false;
          this.updateFiles();
        });
      },
      updateFiles: function() {
        window.link.getClientFiles(this.data.name).then((files) => {
          if(files) this.files = files;
        });
      },
      change: function( e : {moved:{newIndex:number,oldIndex:number}} ) {
        window.link.reorderClientFiles(this.data.name, e.moved.oldIndex, e.moved.newIndex).then(() => {
          this.updateFiles();
        });
      },
      remove: function(index: number) {
        window.link.deleteClientFile(this.data.name, index).then(() => {
          this.updateFiles();
        });
      },
      show: function() {
        if(this.fileModal) this.fileModal.show();
      },
      progressUpdate: function(progress: number) {
        this.uploadProgress = progress;
      },
    },
});
</script>

<style scoped>
  .list-group-item {
    cursor: grab;
  }

  .list-group-item:hover {
    background-color: #f5f5f5;
  }
</style>
