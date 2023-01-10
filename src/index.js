function loadConfig() {
  if (localStorage.getItem("darkMode") == 1) {
    document.documentElement.dataset.theme = "dark";
  }
}

function toggleDarkMode() {
  if (localStorage.getItem("darkMode") == 1) {
    localStorage.setItem("darkMode", 0);
    delete document.documentElement.dataset.theme;
  } else {
    localStorage.setItem("darkMode", 1);
    document.documentElement.dataset.theme = "dark";
  }
}

function dropFileEvent(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.getElementById("inputFile");
  input.files = dt.files;
  convertFromBlob(file);
}

function convertFileEvent(event) {
  convertFromBlob(event.target.files[0]);
}

function convertUrlEvent(event) {
  convertFromUrl(event.target.value);
}

async function convertFromUrlParams() {
  const query = parseQuery(location.search);
  ns = await core.urlToNoteSequence(query.url);
  convert(ns, query.title, query.composer);
}

async function convertFromBlob(file) {
  ns = await core.blobToNoteSequence(file);
  const title = file.name;
  convert(ns, title);
}

async function convertFromUrl(midiUrl) {
  ns = await core.urlToNoteSequence(midiUrl);
  const title = midiUrl.split("/").at(-1);
  convert(ns, title);
}

function convert(ns, title, composer) {
  if (title) document.getElementById("midiTitle").textContent = title;
  if (composer) document.getElementById("composer").textContent = composer;
  ns.totalTime += 3;
  ns.notes.forEach((note) => {
    note.startTime += 3;
    note.endTime += 3;
  });
  nsCache = core.sequences.clone(ns);
  setToolbar();
  initVisualizer();
  initPlayer();
}

function getScale(visualizer) {
  const rect = visualizer.parentElement.getBoundingClientRect();
  const size = visualizer.getSize();
  return rect.width / size.width;
}

// https://github.com/magenta/magenta-js/blob/master/music/src/core/visualizer.ts#L680
// support responsive
// improve performance
function redraw(visualizer, activeNote) {
  if (!visualizer.drawn) {
    visualizer.draw();
  }

  if (!activeNote) {
    return null;
  }

  const parentElement = visualizer.parentElement;

  // Remove the current active note, if one exists.
  visualizer.clearActiveNotes();
  parentElement.style.paddingTop = parentElement.style.height;

  const scale = getScale(visualizer);
  const notes = visualizer.noteSequence.notes;
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const isActive = activeNote &&
      visualizer.isPaintingActiveNote(note, activeNote);

    // We're only looking to re-paint the active notes.
    if (!isActive) {
      continue;
    }

    // Activate this note.
    const el = visualizer.svg.querySelector(`rect[data-index="${i}"]`);
    visualizer.fillActiveRect(el, note);

    // And on the keyboard.
    const key = visualizer.svgPiano.querySelector(
      `rect[data-pitch="${note.pitch}"]`,
    );
    visualizer.fillActiveRect(key, note);

    if (note === activeNote) {
      const y = parseFloat(el.getAttribute("y"));
      const height = parseFloat(el.getAttribute("height"));

      // Scroll the waterfall.
      // if (y < (parentElement.scrollTop - height)) {
      //   parentElement.scrollTop = (y + height) * scale;
      // }
      parentElement.scrollTop = (y + height) * scale;

      // This is the note we wanted to draw.
      return y;
    }
  }
  return null;
}

function styleToViewBox(svg) {
  const style = svg.style;
  const width = parseFloat(style.width);
  const height = parseFloat(style.height);
  const viewBox = `0 0 ${width} ${height}`;
  svg.setAttribute("viewBox", viewBox);
  svg.removeAttribute("style");
}

function initVisualizer() {
  const gamePanel = document.getElementById("gamePanel");
  const config = { showOnlyOctavesUsed: true };
  // const config = {};
  visualizer = new core.WaterfallSVGVisualizer(ns, gamePanel, config);
  styleToViewBox(visualizer.svg);
  styleToViewBox(visualizer.svgPiano);
  const parentElement = visualizer.parentElement;
  parentElement.style.width = "100%";
  parentElement.style.height = "50vh";
  parentElement.style.overflowY = "hidden";
  parentElement.scrollTop = parentElement.scrollHeight;
}

function initPlayer() {
  const soundFont =
    "https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus";
  const playerCallback = {
    run: (note) => redraw(visualizer, note),
    stop: () => {
      visualizer.clearActiveNotes();
      clearPlayer();
      const parentElement = visualizer.parentElement;
      parentElement.scrollTop = parentElement.scrollHeight;
      const repeatObj = document.getElementById("repeat");
      const repeat = repeatObj.classList.contains("active");
      if (repeat) {
        player.start(ns);
        setSmoothScroll();
        initSeekbar(ns, 0);
      }
    },
  };
  stop();
  player = new core.SoundFontPlayer(
    soundFont,
    undefined,
    undefined,
    undefined,
    playerCallback,
  );
}

function setSmoothScroll() {
  let length = 0;
  const delay = 20;
  const endTime = Date.now() + ns.totalTime * 1000;
  const parentElement = visualizer.parentElement;
  scrollInterval = setInterval(() => {
    if (Date.now() < endTime) {
      const scrollHeight = parentElement.scrollHeight;
      const unitLength = scrollHeight / ns.totalTime * delay / 1000;
      length += unitLength;
      if (length >= 1) {
        const intLength = Math.floor(length);
        parentElement.scrollTop -= intLength;
        length -= intLength;
      }
    } else {
      clearInterval(scrollInterval);
    }
  }, delay);
}

function play() {
  document.getElementById("play").classList.add("d-none");
  document.getElementById("pause").classList.remove("d-none");
  switch (player.getPlayState()) {
    case "stopped":
      if (player.getPlayState() == "started") return;
      setSpeed(ns);
      player.loadSamples(ns).then(() => {
        player.start(ns);
        setSmoothScroll();
        initSeekbar(ns, 0);
      });
      break;
    case "paused": {
      player.resume();
      const seconds = parseInt(document.getElementById("seekbar").value);
      setSeekbarInterval(seconds);
      setSmoothScroll();
    }
  }
}

function pause() {
  player.pause();
  clearPlayer();
}

function stop() {
  if (player && player.isPlaying()) {
    document.getElementById("currentTime").textContent = formatTime(0);
    player.stop();
    clearPlayer();
  }
}

function clearPlayer() {
  document.getElementById("play").classList.remove("d-none");
  document.getElementById("pause").classList.add("d-none");
  clearInterval(seekbarInterval);
  clearInterval(scrollInterval);
}

function getCheckboxString(name, label) {
  return `
<div class="form-check form-check-inline">
  <label class="form-check-label">
    <input class="form-check-input" name="${name}" value="${label}" type="checkbox" checked>
    ${label}
  </label>
</div>`;
}

function setInstrumentsCheckbox() {
  const set = new Set();
  ns.notes.forEach((note) => {
    set.add(note.instrument);
  });
  const map = new Map();
  let str = "";
  set.forEach((instrumentId) => {
    str += getCheckboxString("instrument", instrumentId);
    map.set(instrumentId, true);
  });
  const doc = new DOMParser().parseFromString(str, "text/html");
  const node = document.getElementById("filterInstruments");
  node.replaceChildren(...doc.body.childNodes);
  [...node.querySelectorAll("input")].forEach((input) => {
    input.addEventListener("change", () => {
      const instrumentId = input.value;
      [...visualizer.svg.children].forEach((rect) => {
        if (rect.dataset.instrument == instrumentId) {
          rect.classList.toggle("d-none");
        }
      });
    });
  });
}

function setProgramsCheckbox() {
  const set = new Set();
  ns.notes.forEach((note) => {
    set.add(note.program);
  });
  const map = new Map();
  let str = "";
  set.forEach((programId) => {
    str += getCheckboxString("program", programId);
    map.set(programId, true);
  });
  const doc = new DOMParser().parseFromString(str, "text/html");
  const node = document.getElementById("filterPrograms");
  node.replaceChildren(...doc.body.childNodes);
  [...node.querySelectorAll("input")].forEach((input) => {
    input.addEventListener("change", () => {
      const programId = input.value;
      [...visualizer.svg.children].forEach((rect) => {
        if (rect.dataset.program == programId) {
          rect.classList.toggle("d-none");
        }
      });
    });
  });
}

function setToolbar() {
  setProgramsCheckbox();
  setInstrumentsCheckbox();
}

function speedDown() {
  const input = document.getElementById("speed");
  const speed = parseInt(input.value) - 10;
  if (speed < 0) {
    input.value = 0;
  } else {
    input.value = speed;
  }
  document.getElementById("speedDown").disabled = true;
  changeSpeed();
  document.getElementById("speedDown").disabled = false;
}

function speedUp() {
  const input = document.getElementById("speed");
  input.value = parseInt(input.value) + 10;
  document.getElementById("speedUp").disabled = true;
  changeSpeed();
  document.getElementById("speedUp").disabled = false;
}

function changeSpeed() {
  if (!ns) return;
  switch (player.getPlayState()) {
    case "started": {
      player.stop();
      clearInterval(seekbarInterval);
      clearInterval(scrollInterval);
      const prevTotalTime = ns.totalTime;
      setSpeed(ns);
      const speedChange = prevTotalTime / ns.totalTime;
      const seconds = parseInt(document.getElementById("seekbar").value);
      const newSeconds = seconds / speedChange;
      player.start(ns, undefined, newSeconds);
      setSmoothScroll();
      initSeekbar(ns, newSeconds);
      break;
    }
    case "paused": {
      speedChanged = true;
      break;
    }
  }
}

function setSpeed(ns) {
  const input = document.getElementById("speed");
  const speed = parseInt(input.value) / 100;
  const controlChanges = nsCache.controlChanges;
  ns.controlChanges.forEach((n, i) => {
    n.time = controlChanges[i].time / speed;
  });
  const tempos = nsCache.tempos;
  ns.tempos.forEach((n, i) => {
    n.time = tempos[i].time / speed;
    n.qpm = tempos[i].qpm * speed;
  });
  const notes = nsCache.notes;
  ns.notes.forEach((n, i) => {
    n.startTime = notes[i].startTime / speed;
    n.endTime = notes[i].endTime / speed;
  });
  ns.totalTime = nsCache.totalTime / speed;
}

function repeat() {
  document.getElementById("repeat").classList.toggle("active");
}

function volumeOnOff() {
  const i = document.getElementById("volumeOnOff").firstElementChild;
  const volumebar = document.getElementById("volumebar");
  if (i.classList.contains("bi-volume-up-fill")) {
    i.className = "bi bi-volume-mute-fill";
    volumebar.dataset.value = volumebar.value;
    volumebar.value = -50;
    player.output.mute = true;
  } else {
    i.className = "bi bi-volume-up-fill";
    volumebar.value = volumebar.dataset.value;
    player.output.mute = false;
  }
}

function changeVolumebar() {
  const volumebar = document.getElementById("volumebar");
  const volume = volumebar.value;
  volumebar.dataset.value = volume;
  player.output.volume.value = volume;
}

function formatTime(seconds) {
  seconds = Math.floor(seconds);
  const s = seconds % 60;
  const m = (seconds - s) / 60;
  const h = (seconds - s - 60 * m) / 3600;
  const ss = String(s).padStart(2, "0");
  const mm = (m > 9 || !h) ? `${m}:` : `0${m}:`;
  const hh = h ? `${h}:` : "";
  return `${hh}${mm}${ss}`;
}

function changeSeekbar(event) {
  clearInterval(seekbarInterval);
  const seconds = parseInt(event.target.value);
  document.getElementById("currentTime").textContent = formatTime(seconds);
  if (player.isPlaying()) {
    clearInterval(seekbarInterval);
    player.seekTo(seconds);
    if (player.getPlayState() == "started") {
      setSeekbarInterval(seconds);
    }
  }
}

function updateSeekbar(seconds) {
  const seekbar = document.getElementById("seekbar");
  seekbar.value = seconds;
  const time = formatTime(seconds);
  document.getElementById("currentTime").textContent = time;
}

function initSeekbar(ns, seconds) {
  document.getElementById("seekbar").max = ns.totalTime;
  document.getElementById("seekbar").value = seconds;
  document.getElementById("totalTime").textContent = formatTime(ns.totalTime);
  clearInterval(seekbarInterval);
  setSeekbarInterval(seconds);
}

function setSeekbarInterval(seconds) {
  seekbarInterval = setInterval(() => {
    updateSeekbar(seconds);
    seconds += 1;
  }, 1000);
}

function resizeScroll() {
  const seconds = parseInt(document.getElementById("seekbar").value);
  const parentElement = visualizer.parentElement;
  const scrollSize = (ns.totalTime - seconds / ns.totalTime) *
    parentElement.scrollHeight;
  parentElement.scrollTop = scrollSize;
}

function parseQuery(queryString) {
  const query = {};
  const pairs = (queryString[0] === "?" ? queryString.substr(1) : queryString)
    .split("&");
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split("=");
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
  }
  return query;
}

let ns;
let nsCache;
let seekbarInterval;
let scrollInterval;
let player;
let visualizer;
loadConfig();
if (location.search) {
  convertFromUrlParams();
} else {
  convertFromUrl("abt.mid");
}

document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
document.ondragover = (e) => {
  e.preventDefault();
};
document.ondrop = dropFileEvent;
document.getElementById("inputFile").onchange = convertFileEvent;
document.getElementById("inputUrl").onchange = convertUrlEvent;
document.getElementById("play").onclick = play;
document.getElementById("pause").onclick = pause;
document.getElementById("speed").onchange = changeSpeed;
document.getElementById("speedDown").onclick = speedDown;
document.getElementById("speedUp").onclick = speedUp;
document.getElementById("repeat").onclick = repeat;
document.getElementById("volumeOnOff").onclick = volumeOnOff;
document.getElementById("volumebar").onchange = changeVolumebar;
document.getElementById("seekbar").onchange = changeSeekbar;
window.addEventListener("resize", resizeScroll);
