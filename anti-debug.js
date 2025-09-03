(function a() {
    try {
        (function b(i) {
            if (('' + (i / i)).length !== 1 || i % 20 === 0) {
                (function () {}).constructor('debugger')()
            } else {
                debugger
            }
            b(++i)
        })(0)
    } catch (e) {
        setTimeout(a, 5000)
    }
})();

document.onkeydown = (e) => {
    if (e.key == 123) { // Disable F12
        e.preventDefault();
    }
    if (e.ctrlKey && e.shiftKey && e.key == 'I') { // Disable Ctrl+Shift+I
        e.preventDefault();
    }
    if (e.ctrlKey && e.shiftKey && e.key == 'C') { // Disable Ctrl+Shift+C
        e.preventDefault();
    }
    if (e.ctrlKey && e.shiftKey && e.key == 'J') { // Disable Ctrl+Shift+J
        e.preventDefault();
    }
    if (e.ctrlKey && e.key == 'U') { // Disable Ctrl+U
        e.preventDefault();
    }
    if (e.ctrlKey && (e.key == 'S' || e.key == 's')) { // Disable Ctrl+S
        e.preventDefault();
    }
    if (e.ctrlKey && (e.key == 'U' || e.key == 'u')) { // Disable Ctrl+U
        e.preventDefault();
    }
    if (e.key === 'F12') { // Disable F12
        return false;
    }
};
