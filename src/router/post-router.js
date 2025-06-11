import router from ".";

const goToPostDetail = (postId) => {
    router.push({ name: 'PostDetail', params: { postId } });
}

export {
    goToPostDetail
}