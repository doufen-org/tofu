document.querySelector('.menu').addEventListener('click', function (event) {
    console.log(event);return;
    let node = event.target;
    while (!node.matches('')) {
        node = node.parentNode;
    }
})
