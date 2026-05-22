setTitle = (title) => { document.title = title; };

window.lofi = {
    player: null,
    init: function (volume) {
        if (window.lofi.player) return;
        window.lofi.player = new YT.Player('yt-player', {
            videoId: 'jfKfPfyJRdk',
            playerVars: { autoplay: 0, controls: 0, fs: 0, rel: 0, iv_load_policy: 3 },
            events: {
                onReady: function () {
                    window.lofi.player.setVolume(volume);
                }
            }
        });
    },
    play: function () { if (window.lofi.player) window.lofi.player.playVideo(); },
    pause: function () { if (window.lofi.player) window.lofi.player.pauseVideo(); },
    setVolume: function (vol) { if (window.lofi.player) window.lofi.player.setVolume(vol); }
};