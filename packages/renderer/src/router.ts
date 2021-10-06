import {createRouter, createWebHashHistory} from 'vue-router';
import Host from '/@/components/Host.vue';

const routes = [
  {path: '/', name: 'Host', alias:'/host', component: Host},
  {path: '/client', name: 'Client', component: () => import('./components/Client.vue')}, // Lazy load route component
];

export default createRouter({
  routes,
  history: createWebHashHistory(),
});
