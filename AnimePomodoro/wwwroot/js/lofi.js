// Lofi music generator — Web Audio API, zero dependências externas
//
// Estrutura:
//   - Bateria: kick (oscilador com pitch sweep), snare (ruído filtrado), hi-hat (ruído highpass)
//   - Baixo:   oscilador triangle com filtro lowpass
//   - Acordes: 4 osciladores sine levemente desafinados (Am7 → Fmaj7 → Cmaj7 → G7)
//   - Crackle: ruído esparso imitando disco de vinil
//   - Scheduler de baixa latência (look-ahead de 120ms, tick a cada 25ms)

window.lofi = (function () {
    'use strict';

    var ctx, master, crackle;
    var running = false, timer = null, fadeTimer = null;
    var globalStep = 0, nextTime = 0;
    var savedVol = 0.35;

    var BPM  = 78;
    var STEP = 60 / BPM / 2;   // duração de colcheia ≈ 0.385 s
    var LOOK = 0.12;            // janela de pré-agendamento (s)
    var TICK = 25;              // intervalo do scheduler (ms)
    var FADE = 1.0;             // duração do fade-out (s)

    // Progressão: Am7 - Fmaj7 - Cmaj7 - G7
    var CHORDS = [
        [220.00, 261.63, 329.63, 392.00],
        [174.61, 220.00, 261.63, 329.63],
        [261.63, 329.63, 392.00, 493.88],
        [196.00, 246.94, 293.66, 349.23],
    ];
    var BASS = [110.00, 87.31, 130.81, 98.00]; // A2, F2, C3, G2

    // Padrão de 16 passos (colcheias)
    var KICK  = [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0];
    var SNARE = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
    var HIHAT = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];

    function rnd(n) { return (Math.random() * 2 - 1) * n; }

    function mkNoise(dur) {
        var len = Math.ceil(ctx.sampleRate * dur);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        return buf;
    }

    function adsr(g, t, peak, atk, dec) {
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + atk);
        g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dec);
    }

    function kick(t) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(115 + rnd(8), t);
        o.frequency.exponentialRampToValueAtTime(36, t + 0.13);
        adsr(g, t, 0.92, 0.003, 0.25);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.3);
    }

    function snare(t) {
        var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = mkNoise(0.2);
        f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.7;
        adsr(g, t, 0.42, 0.002, 0.15);
        src.connect(f); f.connect(g); g.connect(master);
        src.start(t); src.stop(t + 0.2);
    }

    function hihat(t) {
        var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = mkNoise(0.06);
        f.type = 'highpass'; f.frequency.value = 8000;
        adsr(g, t, 0.10, 0.001, 0.04);
        src.connect(f); f.connect(g); g.connect(master);
        src.start(t); src.stop(t + 0.06);
    }

    function bass(t, freq) {
        var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        o.detune.value = rnd(5);
        f.type = 'lowpass'; f.frequency.value = 260;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.55, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 3.6);
        o.connect(f); f.connect(g); g.connect(master);
        o.start(t); o.stop(t + STEP * 4);
    }

    function chord(t, notes) {
        var dur = STEP * 16;
        notes.forEach(function (freq) {
            var o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = freq;
            o.detune.value = rnd(7);
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.07, t + 0.08);
            g.gain.setValueAtTime(0.07, t + dur - 0.18);
            g.gain.linearRampToValueAtTime(0, t + dur);
            o.connect(g); g.connect(master);
            o.start(t); o.stop(t + dur + 0.1);
        });
    }

    function scheduleStep(t) {
        var s   = globalStep % 16;
        var bar = Math.floor(globalStep / 16) % 4;
        var T   = t + rnd(0.007);

        if (KICK[s])     kick(T);
        if (SNARE[s])    snare(T);
        if (HIHAT[s])    hihat(T);
        if (s % 8 === 0) bass(T, BASS[bar]);
        if (s === 0)     chord(T, CHORDS[bar]);

        globalStep++;
    }

    function schedule() {
        while (nextTime < ctx.currentTime + LOOK) {
            scheduleStep(nextTime);
            nextTime += STEP;
        }
        timer = setTimeout(schedule, TICK);
    }

    function startCrackle() {
        var len = ctx.sampleRate * 5;
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d   = buf.getChannelData(0);
        for (var i = 0; i < len; i++) {
            d[i] = Math.random() < 0.0015 ? (Math.random() * 2 - 1) * 0.5 : 0;
        }
        crackle = ctx.createBufferSource();
        crackle.buffer = buf;
        crackle.loop = true;
        var g = ctx.createGain();
        g.gain.value = 0.055;
        crackle.connect(g);
        g.connect(ctx.destination);
        crackle.start();
    }

    function stopCrackleAfter(ms) {
        var c = crackle;
        crackle = null;
        fadeTimer = setTimeout(function () {
            try { c.stop(); } catch (e) {}
        }, ms);
    }

    return {
        init: function (vol) {
            if (ctx) return;
            savedVol = (vol / 100) * 0.7;
            ctx    = new (window.AudioContext || window.webkitAudioContext)();
            master = ctx.createGain();
            var lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 3800;
            master.connect(lp);
            lp.connect(ctx.destination);
            master.gain.value = savedVol;
        },
        play: function () {
            if (!ctx || running) return;
            clearTimeout(fadeTimer);
            if (ctx.state === 'suspended') ctx.resume();
            running    = true;
            globalStep = 0;
            nextTime   = ctx.currentTime + 0.05;
            master.gain.cancelScheduledValues(ctx.currentTime);
            master.gain.setValueAtTime(savedVol, ctx.currentTime);
            schedule();
            startCrackle();
        },
        pause: function () {
            if (!running) return;
            running = false;
            clearTimeout(timer);
            // Fade-out suave em 1s
            master.gain.cancelScheduledValues(ctx.currentTime);
            master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
            master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + FADE);
            stopCrackleAfter((FADE + 0.1) * 1000);
        },
        setVolume: function (vol) {
            savedVol = (vol / 100) * 0.7;
            if (master && running) master.gain.value = savedVol;
        }
    };
})();
