import { createRouter, createWebHashHistory } from 'vue-router';
import QuestionList   from '@/components/QuestionList.vue';
import QuestionDetail from '@/components/QuestionDetail.vue';
import UserProfile from '@/components/UserProfile.vue';
import { getAuth } from 'firebase/auth';

const routes = [
    { path: '/', component: QuestionList },
    { path: '/dialog/:qid', name: 'dialog', component: QuestionDetail, props: true },
    { 
        path: '/profile', 
        name: 'profile', 
        component: UserProfile,
        meta: { requiresAuth: true }
    },
    {
        path: '/my-favorites',
        name: 'myFavorites',
        component: QuestionDetail,
        props: { mode: 'favorites' }
    },
    { path: '/walkman', name: 'walkman', component: QuestionList },
    { path: '/:catchAll(.*)', redirect: '/' }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

// 路由守卫
router.beforeEach(async (to, from, next) => {
    const auth = getAuth();
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

    // 等待 Firebase 初始化完成
    await new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(() => {
            unsubscribe();
            resolve();
        });
    });

    if (requiresAuth && !auth.currentUser) {
        next('/');
    } else {
        next();
    }
});

export default router;
