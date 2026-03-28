(() => {
  const body = document.body;
  const pageId = body ? body.dataset.page : "";

  const navCards = document.querySelectorAll(".nav-card");
  navCards.forEach((card) => {
    if (card.dataset.page === pageId) {
      card.classList.add("is-active");
    }
  });

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealBlocks = document.querySelectorAll(".reveal");

  if (prefersReduced) {
    revealBlocks.forEach((block) => block.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealBlocks.forEach((block) => observer.observe(block));
  }

  initPageThree();
  initPageFive();

  function initPageThree() {
    const question = document.getElementById("we-question");
    const yesBtn = document.getElementById("yes-btn");
    const noBtn = document.getElementById("no-btn");
    const choiceZone = document.getElementById("choice-zone");
    const bubble = document.getElementById("we-bubble");

    if (!question || !yesBtn || !noBtn || !choiceZone || !bubble) {
      return;
    }

    let finished = false;
    let escapedOnce = false;
    let currentNoPosition = { left: 0, top: 0 };

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const setNoPosition = (left, top) => {
      const safeLeft = Math.max(6, left);
      const safeTop = Math.max(6, top);
      noBtn.style.right = "auto";
      noBtn.style.transform = "none";
      noBtn.style.left = `${safeLeft}px`;
      noBtn.style.top = `${safeTop}px`;
      currentNoPosition = { left: safeLeft, top: safeTop };
    };

    const getChoiceMetrics = () => {
      const zoneRect = choiceZone.getBoundingClientRect();
      const yesRect = yesBtn.getBoundingClientRect();

      return {
        zoneWidth: choiceZone.clientWidth,
        zoneHeight: choiceZone.clientHeight,
        yesLeft: yesRect.left - zoneRect.left,
        yesTop: yesRect.top - zoneRect.top,
        yesWidth: yesRect.width,
        yesHeight: yesRect.height,
        noWidth: noBtn.offsetWidth,
        noHeight: noBtn.offsetHeight
      };
    };

    const overlapsYes = (left, top, m) => {
      const gap = 10;
      return (
        left < m.yesLeft + m.yesWidth + gap &&
        left + m.noWidth > m.yesLeft - gap &&
        top < m.yesTop + m.yesHeight + gap &&
        top + m.noHeight > m.yesTop - gap
      );
    };

    const getDistanceFromYes = (left, top, m) => {
      const yesCenterX = m.yesLeft + m.yesWidth / 2;
      const yesCenterY = m.yesTop + m.yesHeight / 2;
      const noCenterX = left + m.noWidth / 2;
      const noCenterY = top + m.noHeight / 2;
      return Math.hypot(noCenterX - yesCenterX, noCenterY - yesCenterY);
    };

    const placeNoNearYes = () => {
      const m = getChoiceMetrics();
      const gap = 12;
      let left = m.yesLeft + m.yesWidth + gap;

      if (left + m.noWidth > m.zoneWidth - 6) {
        left = Math.max(6, m.yesLeft - m.noWidth - gap);
      }

      const top = clamp(m.yesTop, 6, Math.max(m.zoneHeight - m.noHeight - 6, 6));
      setNoPosition(left, top);
    };

    const pickFarPosition = (m) => {
      const maxX = Math.max(m.zoneWidth - m.noWidth - 6, 6);
      const maxY = Math.max(m.zoneHeight - m.noHeight - 6, 6);
      const safeDistance = window.innerWidth <= 520 ? 130 : 100;

      const candidates = [
        { left: 6, top: 6 },
        { left: maxX, top: 6 },
        { left: 6, top: maxY },
        { left: maxX, top: maxY },
        { left: Math.round(maxX / 2), top: 6 },
        { left: Math.round(maxX / 2), top: maxY },
        { left: 6, top: Math.round(maxY / 2) },
        { left: maxX, top: Math.round(maxY / 2) }
      ];

      for (let i = 0; i < 12; i += 1) {
        candidates.push({
          left: Math.floor(Math.random() * (maxX - 6 + 1)) + 6,
          top: Math.floor(Math.random() * (maxY - 6 + 1)) + 6
        });
      }

      const valid = candidates
        .filter((position) => !overlapsYes(position.left, position.top, m))
        .map((position) => ({
          ...position,
          distance: getDistanceFromYes(position.left, position.top, m)
        }))
        .sort((a, b) => b.distance - a.distance);

      const minShift = 34;
      const movedCandidates = valid.filter((position) => (
        Math.hypot(position.left - currentNoPosition.left, position.top - currentNoPosition.top) >= minShift
      ));

      const usable = movedCandidates.length > 0 ? movedCandidates : valid;
      if (usable.length === 0) {
        return { left: maxX, top: maxY };
      }

      const farEnough = usable.filter((position) => position.distance >= safeDistance);
      const rankedPool = farEnough.length > 0 ? farEnough : usable;
      const pool = rankedPool.slice(0, Math.min(4, rankedPool.length));
      return pool[Math.floor(Math.random() * pool.length)];
    };

    const runAway = () => {
      if (finished) {
        return;
      }

      escapedOnce = true;
      const m = getChoiceMetrics();
      const best = pickFarPosition(m);
      setNoPosition(best.left, best.top);
    };

    const handleResize = () => {
      if (finished) {
        return;
      }

      const m = getChoiceMetrics();
      const maxLeft = Math.max(m.zoneWidth - m.noWidth - 6, 6);
      const maxTop = Math.max(m.zoneHeight - m.noHeight - 6, 6);

      if (!escapedOnce) {
        placeNoNearYes();
        return;
      }

      const clampedLeft = clamp(currentNoPosition.left, 6, maxLeft);
      const clampedTop = clamp(currentNoPosition.top, 6, maxTop);
      setNoPosition(clampedLeft, clampedTop);

      if (overlapsYes(clampedLeft, clampedTop, m)) {
        runAway();
      }
    };

    requestAnimationFrame(placeNoNearYes);
    window.addEventListener("resize", handleResize);

    noBtn.addEventListener("pointerenter", runAway);
    noBtn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      runAway();
    });
    noBtn.addEventListener("click", (event) => {
      event.preventDefault();
    });

    yesBtn.addEventListener("click", () => {
      finished = true;
      window.removeEventListener("resize", handleResize);
      yesBtn.classList.add("is-hidden");
      noBtn.classList.add("is-hidden");
      question.textContent = "\u041c\u044b!!!";
      question.classList.add("pulse-heart");
      bubble.classList.remove("is-hidden");
      bubble.classList.add("pulse-heart");
    });

    const question2 = document.getElementById("we-question-2");
    const yes2 = document.getElementById("yes-btn-2");
    if (question2 && yes2) {
      yes2.addEventListener("click", () => {
        yes2.classList.add("is-hidden");
        question2.textContent = "\u0423\u0420\u0410 \u042d\u0422\u041e \u042f \u0418 \u041b\u042e\u0411\u0418\u041c\u0410\u042f!!";
        question2.classList.add("pulse-heart");
      });
    }

    const question3 = document.getElementById("we-question-3");
    const yes3 = document.getElementById("yes-btn-3");
    const heart = document.getElementById("heart-bouncer");

    if (question3 && yes3 && heart) {
      yes3.addEventListener("click", () => {
        question3.textContent = "\u0414\u0410, \u042d\u0422\u041e \u0422\u041e\u0416\u0415 \u041c\u042b!!";
        question3.classList.add("pulse-heart");
        heart.classList.remove("is-hidden");
      });
    }
  }

  function initPageFive() {
    const playlist = document.getElementById("playlist");
    const karaokeBox = document.getElementById("karaoke-box");
    const karaokeLines = document.getElementById("karaoke-lines");
    const trackStatus = document.getElementById("track-status");

    if (!playlist || !karaokeBox || !karaokeLines || !trackStatus) {
      return;
    }

    const synthTrack = {
      lyrics: [
        { at: 0.0, text: "I know your eyes in the morning sun" },
        { at: 3.5, text: "I feel you touch me in the pouring rain" },
        { at: 7.3, text: "And the moment that you wander far from me" },
        { at: 11.3, text: "I wanna feel you in my arms again" },
        { at: 15.6, text: "And you come to me on a summer breeze" },
        { at: 19.4, text: "Keep me warm in your love, then you softly leave" },
        { at: 23.6, text: "And it is me you need to show" },
        { at: 27.5, text: "How deep is your love" }
      ],
      notes: [
        { f: 329.63, d: 0.4 }, { f: 392.0, d: 0.4 }, { f: 440.0, d: 0.45 }, { f: 392.0, d: 0.45 },
        { f: 349.23, d: 0.45 }, { f: 329.63, d: 0.45 }, { f: 293.66, d: 0.6 }, { f: 261.63, d: 0.5 },
        { f: 293.66, d: 0.45 }, { f: 329.63, d: 0.45 }, { f: 392.0, d: 0.5 }, { f: 440.0, d: 0.55 },
        { f: 392.0, d: 0.5 }, { f: 349.23, d: 0.45 }, { f: 329.63, d: 0.45 }, { f: 293.66, d: 0.6 },
        { f: 261.63, d: 0.4 }, { f: 261.63, d: 0.4 }, { f: 293.66, d: 0.45 }, { f: 329.63, d: 0.5 },
        { f: 349.23, d: 0.5 }, { f: 392.0, d: 0.55 }, { f: 440.0, d: 0.6 }, { f: 392.0, d: 0.9 }
      ]
    };

    let player = {
      ctx: null,
      timer: null,
      stopTimer: null,
      startMs: 0,
      lyricIndex: -1,
      totalDuration: 0
    };

    const setPlayingState = (trackIndex) => {
      playlist.querySelectorAll(".track-item").forEach((item) => {
        item.classList.remove("is-playing");
      });

      if (typeof trackIndex === "number") {
        const item = playlist.querySelector(`.track-item .track-btn[data-track='${trackIndex}']`)?.closest(".track-item");
        if (item) {
          item.classList.add("is-playing");
        }
      }
    };

    const clearPlayer = () => {
      if (player.timer) {
        clearInterval(player.timer);
      }
      if (player.stopTimer) {
        clearTimeout(player.stopTimer);
      }
      if (player.ctx) {
        player.ctx.close();
      }

      player = {
        ctx: null,
        timer: null,
        stopTimer: null,
        startMs: 0,
        lyricIndex: -1,
        totalDuration: 0
      };
    };

    const renderLyrics = (activeIndex) => {
      const lines = karaokeLines.querySelectorAll(".karaoke-line");
      lines.forEach((line, idx) => {
        line.classList.toggle("is-current", idx === activeIndex);
      });
    };

    const startSynth = async () => {
      clearPlayer();

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        trackStatus.textContent = "\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 Web Audio API.";
        return;
      }

      const ctx = new AudioContextClass();
      player.ctx = ctx;
      await ctx.resume();

      karaokeBox.hidden = false;
      karaokeLines.innerHTML = "";
      synthTrack.lyrics.forEach((line) => {
        const lineElement = document.createElement("p");
        lineElement.className = "karaoke-line";
        lineElement.textContent = line.text;
        karaokeLines.appendChild(lineElement);
      });

      let playhead = ctx.currentTime + 0.08;
      synthTrack.notes.forEach((note) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = note.f;

        gainNode.gain.setValueAtTime(0.0001, playhead);
        gainNode.gain.exponentialRampToValueAtTime(0.13, playhead + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, playhead + note.d);

        oscillator.connect(gainNode).connect(ctx.destination);
        oscillator.start(playhead);
        oscillator.stop(playhead + note.d + 0.03);

        playhead += note.d;
      });

      player.startMs = performance.now();
      player.totalDuration = (playhead - (ctx.currentTime + 0.08)) * 1000;
      player.lyricIndex = -1;

      renderLyrics(-1);
      trackStatus.textContent = "\u0418\u0433\u0440\u0430\u0435\u0442: How Deep Is Your Love? (kawaii synth cover)";

      player.timer = setInterval(() => {
        const elapsed = (performance.now() - player.startMs) / 1000;
        let active = -1;

        for (let i = 0; i < synthTrack.lyrics.length; i += 1) {
          if (elapsed >= synthTrack.lyrics[i].at) {
            active = i;
          }
        }

        if (active !== player.lyricIndex) {
          player.lyricIndex = active;
          renderLyrics(active);
        }
      }, 120);

      player.stopTimer = setTimeout(() => {
        setPlayingState(null);
        trackStatus.textContent = "\u0422\u0440\u0435\u043a \u0437\u0430\u043a\u043e\u043d\u0447\u0438\u043b\u0441\u044f. \u041c\u043e\u0436\u043d\u043e \u0437\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c \u0441\u043d\u043e\u0432\u0430.";
        clearPlayer();
      }, player.totalDuration + 320);
    };

    playlist.addEventListener("click", (event) => {
      const button = event.target.closest(".track-btn");
      if (!button) {
        return;
      }

      const trackIndex = Number(button.dataset.track);
      setPlayingState(trackIndex);

      if (trackIndex === 0) {
        startSynth();
      } else {
        clearPlayer();
        karaokeBox.hidden = true;
        trackStatus.textContent = "\u042d\u0442\u043e\u0442 \u0442\u0440\u0435\u043a \u043f\u043e\u043a\u0430 \u043a\u0430\u043a \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u0432 \u043f\u043b\u0435\u0439\u043b\u0438\u0441\u0442\u0435 \u2726";
      }
    });
  }
})();
