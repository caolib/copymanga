import router from ".";


const goBack = () => {
    router.back();
}

const goForward = () => {
    router.forward();
}

export {
    goBack,
    goForward
}