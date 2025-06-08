import { createRouter, createWebHashHistory } from 'vue-router';
import QuestionList   from '@/components/QuestionList.vue';
import QuestionDetail from '@/components/QuestionDetail.vue';

const routes = [
    { path: '/', component: QuestionList },
    { path: '/dialog/:qid', name: 'dialog', component: QuestionDetail, props: true },
    { path: '/:catchAll(.*)', redirect: '/' }
];

export default createRouter({
    history: createWebHashHistory(),
    routes
});
