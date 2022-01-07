import {createApp} from 'vue';
import App from '/@/App.vue';
import router from '/@/router';

//incliude styles

import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/scss/bootstrap.scss';
import 'bootstrap';

createApp(App)
  .use(router)
  .mount('#app');
