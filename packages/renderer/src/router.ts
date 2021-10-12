import {createRouter, createWebHashHistory} from 'vue-router';
import Base from '/@/components/Base.vue';
import Host from '/@/components/Host.vue';

const routes = [
  {path: '/', name: 'Base', component: Base},
  {path: '/host', name: 'Host', component: Host},
  {path: '/client', name: 'Client', component: () => import('./components/Client.vue')}, // Lazy load route component
];

export default createRouter({
  routes,
  history: createWebHashHistory(),
});
