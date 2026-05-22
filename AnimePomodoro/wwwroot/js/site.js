setTitle = (title) => { document.title = title; };

// Lofi radio via HTML5 Audio — sem dependência de API externa
window.lofi = {
    audio: null,
    init: function (volume) {
        if (window.lofi.audio) return;
        window.lofi.audio = new Audio('https://streams.ilovemusic.de/iloveradio17.mp3');
        window.lofi.audio.volume = volume / 100;
    },
    play: function () {
        if (window.lofi.audio) window.lofi.audio.play().catch(function () {});
    },
    pause: function () {
        if (window.lofi.audio) window.lofi.audio.pause();
    },
    setVolume: function (vol) {
        if (window.lofi.audio) window.lofi.audio.volume = vol / 100;
    }
};
