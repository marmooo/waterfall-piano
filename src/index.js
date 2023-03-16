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
  const input = document.getElementById("inputMIDIFile");
  input.files = dt.files;
  loadMIDIFromBlob(file);
}

function loadMIDIFileEvent(event) {
  loadMIDIFromBlob(event.target.files[0]);
}

function loadMIDIUrlEvent(event) {
  loadMIDIFromUrl(event.target.value);
}

async function loadMIDIFromUrlParams() {
  const query = new URLSearchParams(location.search);
  ns = await core.urlToNoteSequence(query.get("url"));
  convert(ns, query);
}

async function loadMIDIFromBlob(file, query) {
  ns = await core.blobToNoteSequence(file);
  convert(ns, query);
}

async function loadMIDIFromUrl(midiUrl, query) {
  ns = await core.urlToNoteSequence(midiUrl);
  convert(ns, query);
}

function setMIDIInfo(query) {
  if (query instanceof URLSearchParams) {
    const title = query.get("title");
    const composer = query.get("composer");
    const maintainer = query.get("maintainer");
    const web = query.get("web");
    const license = query.get("license");
    document.getElementById("midiTitle").textContent = title;
    if (composer != maintainer) {
      document.getElementById("composer").textContent = composer;
    }
    if (web) {
      const a = document.createElement("a");
      a.href = web;
      a.textContent = maintainer;
      document.getElementById("maintainer").replaceChildren(a);
    } else {
      document.getElementById("maintainer").textContent = maintainer;
    }
    try {
      new URL(license);
    } catch {
      document.getElementById("license").textContent = license;
    }
  } else {
    document.getElementById("midiTitle").textContent = "";
    document.getElementById("composer").textContent = "";
    document.getElementById("maintainer").textContent = "";
    document.getElementById("license").textContent = "";
  }
}

function convert(ns, query) {
  const waitTime = 3;
  ns.totalTime += waitTime;
  ns.notes.forEach((note) => {
    note.startTime += waitTime;
    note.endTime += waitTime;
  });
  ns.controlChanges.forEach((cc) => {
    cc.time += waitTime;
  });
  ns.tempos.slice(1).forEach((tempo) => {
    tempo.time += waitTime;
  });
  ns.timeSignatures.slice(1).forEach((ts) => {
    ts.time += waitTime;
  });
  ns.notes = ns.notes.sort((a, b) => {
    if (a.startTime < b.startTime) return -1;
    if (a.startTime > b.startTime) return 1;
    return 0;
  });
  nsCache = core.sequences.clone(ns);
  setMIDIInfo(query);
  setToolbar();
  initVisualizer();
  initPlayer();
}

async function loadSoundFontFileEvent(event) {
  if (player) {
    document.getElementById("soundfonts").options[0].selected = true;
    const file = event.target.files[0];
    const soundFontBuffer = await file.arrayBuffer();
    await player.loadSoundFontBuffer(soundFontBuffer);
  }
}

async function loadSoundFontUrlEvent(event) {
  if (player) {
    document.getElementById("soundfonts").options[0].selected = true;
    const response = await fetch(event.target.value);
    const soundFontBuffer = await response.arrayBuffer();
    await player.loadSoundFontBuffer(soundFontBuffer);
  }
}

function styleToViewBox(svg) {
  const style = svg.style;
  const width = parseFloat(style.width);
  const height = parseFloat(style.height);
  const viewBox = `0 0 ${width} ${height}`;
  svg.setAttribute("viewBox", viewBox);
  svg.removeAttribute("style");
}

function searchNotePosition(notes, time, recursive) {
  let left = 0;
  let right = notes.length - 1;
  let mid;
  if (time < notes[0].startTime) return -1;
  while (left <= right) {
    mid = Math.floor((left + right) / 2);
    if (notes[mid].startTime === time) {
      const t = notes[mid].startTime - 1e-8;
      if (t < notes[0].startTime) {
        return 0;
      } else {
        return searchNotePosition(notes, t, true);
      }
    } else if (notes[mid].startTime < time) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  if (recursive) {
    return right + 1;
  } else {
    return searchNotePosition(notes, notes[right].startTime, true);
  }
}

const MIN_NOTE_LENGTH = 1;
class WaterfallSVGVisualizer extends core.BaseSVGVisualizer {
  // The default range is 21 < pitch <= 108, which only considers piano,
  // however we need 9 < pitch <= 120 when considering all instruments.
  NOTES_PER_OCTAVE = 12;
  WHITE_NOTES_PER_OCTAVE = 7;
  LOW_C = 12;
  firstDrawnOctave = 0;
  lastDrawnOctave = 8;

  // svgPiano;
  // config;

  constructor(sequence, parentElement, config = {}) {
    super(sequence, config);

    if (!(parentElement instanceof HTMLDivElement)) {
      throw new Error(
        "This visualizer requires a <div> element to display the visualization",
      );
    }

    // Some sensible defaults.
    this.config.whiteNoteWidth = config.whiteNoteWidth || 20;
    this.config.blackNoteWidth = config.blackNoteWidth ||
      this.config.whiteNoteWidth * 2 / 3;
    this.config.whiteNoteHeight = config.whiteNoteHeight || 70;
    this.config.blackNoteHeight = config.blackNoteHeight || (2 * 70 / 3);
    this.config.showOnlyOctavesUsed = config.showOnlyOctavesUsed;

    this.setupDOM(parentElement);

    const size = this.getSize();
    this.width = size.width;
    this.height = size.height;

    // Make sure that if we've used this svg element before, it's now emptied.
    this.svg.style.width = `${this.width}px`;
    this.svg.style.height = `${this.height}px`;

    this.svgPiano.style.width = `${this.width}px`;
    this.svgPiano.style.height = `${this.config.whiteNoteHeight}px`;

    // Add a little bit of padding to the right, so that the scrollbar
    // doesn't overlap the last note on the piano.
    this.parentElement.style.width = `${
      this.width + this.config.whiteNoteWidth
    }px`;
    this.parentElement.scrollTop = this.parentElement.scrollHeight;

    this.clear();
    this.drawPiano();
    this.draw();
  }

  setupDOM(container) {
    this.parentElement = document.createElement("div");
    this.parentElement.classList.add("waterfall-notes-container");

    const height = Math.max(container.getBoundingClientRect().height, 200);

    // Height and padding-top must match for this to work.
    this.parentElement.style.paddingTop = `${
      height - this.config.whiteNoteHeight
    }px`;
    this.parentElement.style.height = `${
      height - this.config.whiteNoteHeight
    }px`;

    this.parentElement.style.boxSizing = "border-box";
    this.parentElement.style.overflowX = "hidden";
    this.parentElement.style.overflowY = "auto";

    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svgPiano = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    this.svg.classList.add("waterfall-notes");
    this.svgPiano.classList.add("waterfall-piano");

    this.parentElement.appendChild(this.svg);
    container.innerHTML = "";
    container.appendChild(this.parentElement);
    container.appendChild(this.svgPiano);
  }
  /**
   * Redraws the entire note sequence if it hasn't been drawn before,
   * optionally painting a note as active
   * @param activeNote (Optional) If specified, this `Note` will be painted
   * in the active color.
   * @param scrollIntoView (Optional) If specified and the note being
   * painted is offscreen, the parent container will be scrolled so that
   * the note is in view.
   * @returns The x position of the painted active note. Useful for
   * automatically advancing the visualization if the note was painted
   * outside of the screen.
   */
  // https://github.com/magenta/magenta-js/blob/master/music/src/core/visualizer.ts#L680
  // support responsive
  // improve performance
  // TODO: long press of piano keys?
  redraw(activeNote, startPos) {
    if (!visualizer.drawn) visualizer.draw();
    if (!activeNote) return;
    this.clearActivePianoKeys();
    const notes = visualizer.noteSequence.notes;
    const rects = [...visualizer.svg.children];
    const keys = [...visualizer.svgPiano.children];
    const startTime = activeNote.startTime;
    if (!startPos) startPos = searchNotePosition(notes, startTime);
    const endTarget = notes.slice(startPos);
    let endPos = endTarget.findIndex((note) => startTime < note.startTime);
    endPos = (endPos == -1) ? notes.length : startPos + endPos;
    for (let i = startPos; i < endPos; i++) {
      const note = notes[i];
      visualizer.fillActiveRect(rects[i], note);
      const pianoKeyPos = pianoKeyIndex.get(note.pitch);
      visualizer.fillActiveRect(keys[pianoKeyPos], note);
    }
  }

  getSize() {
    this.updateMinMaxPitches(true);

    let whiteNotesDrawn = 52; // For a full piano.
    if (this.config.showOnlyOctavesUsed) {
      // Go through each C note and see which is the one right below and
      // above our sequence.
      let foundFirst = false, foundLast = false;
      for (let i = 1; i < 7; i++) {
        const c = this.LOW_C + this.NOTES_PER_OCTAVE * i;
        // Have we found the lowest pitch?
        if (!foundFirst && c > this.config.minPitch) {
          this.firstDrawnOctave = i - 1;
          foundFirst = true;
        }
        // Have we found the highest pitch?
        if (!foundLast && c > this.config.maxPitch) {
          this.lastDrawnOctave = i - 1;
          foundLast = true;
        }
      }

      whiteNotesDrawn = (this.lastDrawnOctave - this.firstDrawnOctave + 1) *
        this.WHITE_NOTES_PER_OCTAVE;
    }

    const width = whiteNotesDrawn * this.config.whiteNoteWidth;

    // Calculate a nice width based on the length of the sequence we're
    // playing.
    // Warn if there's no totalTime or quantized steps set, since it leads
    // to a bad size.
    const endTime = this.noteSequence.totalTime;
    if (!endTime) {
      throw new Error(
        "The sequence you are using with the visualizer does not have a " +
          "totalQuantizedSteps or totalTime " +
          "field set, so the visualizer can't be horizontally " +
          "sized correctly.",
      );
    }

    const height = Math.max(
      endTime * this.config.pixelsPerTimeStep,
      MIN_NOTE_LENGTH,
    );
    return { width, height };
  }

  getNotePosition(note, _noteIndex) {
    const rect = this.svgPiano.querySelector(
      `rect[data-pitch="${note.pitch}"]`,
    );

    if (!rect) {
      return null;
    }

    // Size of this note.
    const len = this.getNoteEndTime(note) - this.getNoteStartTime(note);
    const x = Number(rect.getAttribute("x"));
    const w = Number(rect.getAttribute("width"));
    const h = Math.max(
      this.config.pixelsPerTimeStep * len - this.config.noteSpacing,
      MIN_NOTE_LENGTH,
    );

    // The svg' y=0 is at the top, but a smaller pitch is actually
    // lower, so we're kind of painting backwards.
    const y = this.height -
      (this.getNoteStartTime(note) * this.config.pixelsPerTimeStep) - h;
    return { x, y, w, h };
  }

  drawPiano() {
    this.svgPiano.innerHTML = "";

    const blackNoteOffset = this.config.whiteNoteWidth -
      this.config.blackNoteWidth / 2;
    const blackNoteIndexes = [1, 3, 6, 8, 10];

    // Dear future reader: I am sure there is a better way to do this, but
    // splitting it up makes it more readable and maintainable in case there's
    // an off by one key error somewhere.
    // Each note has an pitch. Pianos start on pitch 21 and end on 108.
    // First draw all the white notes, in this order:
    //    - if we're using all the octaves, pianos start on an A (so draw A,
    //    B)
    //    - ... the rest of the white keys per octave
    //    - if we started on an A, we end on an extra C.
    // Then draw all the black notes (so that these rects sit on top):
    //    - if the piano started on an A, draw the A sharp
    //    - ... the rest of the black keys per octave.

    let x = 0;
    let currentPitch = 0;
    if (this.config.showOnlyOctavesUsed) {
      // Starting on a C, and a bunch of octaves up.
      currentPitch = (this.firstDrawnOctave * this.NOTES_PER_OCTAVE) +
        this.LOW_C;
    } else {
      // Starting on the lowest A and B.
      currentPitch = this.LOW_C - 3;
      this.drawWhiteKey(currentPitch, x);
      this.drawWhiteKey(currentPitch + 2, this.config.whiteNoteWidth);
      currentPitch += 3;
      x = 2 * this.config.whiteNoteWidth;
    }

    // Draw the rest of the white notes.
    for (let o = this.firstDrawnOctave; o <= this.lastDrawnOctave; o++) {
      for (let i = 0; i < this.NOTES_PER_OCTAVE; i++) {
        // Black keys come later.
        if (blackNoteIndexes.indexOf(i) === -1) {
          this.drawWhiteKey(currentPitch, x);
          x += this.config.whiteNoteWidth;
        }
        currentPitch++;
      }
    }

    if (this.config.showOnlyOctavesUsed) {
      // Starting on a C, and a bunch of octaves up.
      currentPitch = (this.firstDrawnOctave * this.NOTES_PER_OCTAVE) +
        this.LOW_C;
      x = -this.config.whiteNoteWidth;
    } else {
      // Before we reset, add an extra C at the end because pianos.
      this.drawWhiteKey(currentPitch, x);

      // This piano started on an A, so draw the A sharp black key.
      currentPitch = this.LOW_C - 3;
      this.drawBlackKey(currentPitch + 1, blackNoteOffset);
      currentPitch += 3; // Next one is the LOW_C.
      x = this.config.whiteNoteWidth;
    }

    // Draw the rest of the black notes.
    for (let o = this.firstDrawnOctave; o <= this.lastDrawnOctave; o++) {
      for (let i = 0; i < this.NOTES_PER_OCTAVE; i++) {
        if (blackNoteIndexes.indexOf(i) !== -1) {
          this.drawBlackKey(currentPitch, x + blackNoteOffset);
        } else {
          x += this.config.whiteNoteWidth;
        }
        currentPitch++;
      }
    }
  }

  drawWhiteKey(index, x) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.dataset.pitch = String(index);
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", "0");
    rect.setAttribute("width", String(this.config.whiteNoteWidth));
    rect.setAttribute("height", String(this.config.whiteNoteHeight));
    rect.setAttribute("fill", "white");
    rect.setAttribute("original-fill", "white");
    rect.setAttribute("stroke", "black");
    rect.setAttribute("stroke-width", "3px");
    rect.classList.add("white");
    this.svgPiano.appendChild(rect);
    return rect;
  }

  drawBlackKey(index, x) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.dataset.pitch = String(index);
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", "0");
    rect.setAttribute("width", String(this.config.blackNoteWidth));
    rect.setAttribute("height", String(this.config.blackNoteHeight));
    rect.setAttribute("fill", "black");
    rect.setAttribute("original-fill", "black");
    rect.setAttribute("stroke", "black");
    rect.setAttribute("stroke-width", "3px");
    rect.classList.add("black");
    this.svgPiano.appendChild(rect);
    return rect;
  }

  clearActiveNotes() {
    super.unfillActiveRect(this.svg);
    this.clearActivePianoKeys();
  }

  clearActivePianoKeys() {
    const els = this.svgPiano.querySelectorAll("rect.active");
    for (let i = 0; i < els.length; ++i) {
      const el = els[i];
      el.setAttribute("fill", el.getAttribute("original-fill"));
      el.classList.remove("active");
    }
  }
}

function initPianoKeyIndex() {
  [...visualizer.svgPiano.children].forEach((rect, i) => {
    const pitch = parseInt(rect.dataset.pitch);
    pianoKeyIndex.set(pitch, i);
  });
}

function getMinMaxPitch() {
  let min = Infinity;
  let max = -Infinity;
  ns.notes.forEach((note) => {
    if (note.pitch < min) min = note.pitch;
    if (max < note.pitch) max = note.pitch;
  });
  return [min, max];
}

function initVisualizer() {
  const gamePanel = document.getElementById("gamePanel");
  const rect = gamePanel.getBoundingClientRect();
  const [minPitch, maxPitch] = getMinMaxPitch(ns);
  const whiteNoteWidth = Math.round(
    rect.width / (maxPitch - minPitch + 1) * 12 / 7,
  );
  const whiteNoteHeight = Math.round(whiteNoteWidth * 70 / 20);
  const config = {
    showOnlyOctavesUsed: true,
    whiteNoteWidth: whiteNoteWidth,
    whiteNoteHeight: whiteNoteHeight,
    blackNoteWidth: Math.round(whiteNoteWidth * 2 / 3),
    blackNoteHeight: Math.round(whiteNoteHeight * 2 / 3),
    maxPitch: maxPitch,
    minPitch: minPitch,
  };
  visualizer = new WaterfallSVGVisualizer(ns, gamePanel, config);
  initPianoKeyIndex();
  styleToViewBox(visualizer.svg);
  styleToViewBox(visualizer.svgPiano);
  [...visualizer.svgPiano.children].forEach((rect) => {
    rect.setAttribute("vector-effect", "non-scaling-stroke");
    rect.setAttribute("stroke-width", "1px");
    rect.setAttribute("ry", "3%");
  });
  const parentElement = visualizer.parentElement;
  parentElement.style.width = "100%";
  parentElement.style.height = "50vh";
  parentElement.style.paddingTop = "50vh";
  parentElement.style.overflowY = "hidden";
  resize();
}

class MagentaPlayer extends core.SoundFontPlayer {
  constructor(ns, runCallback, stopCallback) {
    const soundFontUrl =
      "https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus";
    const callback = {
      run: (note) => runCallback(note),
      stop: () => stopCallback(),
    };
    super(soundFontUrl, undefined, undefined, undefined, callback);
    this.ns = ns;
    this.output.volume.value = 20 * Math.log(0.5) / Math.log(10);
  }

  loadSamples(ns) {
    return super.loadSamples(ns).then(() => {
      this.synth = true;
    });
  }

  start(ns) {
    return super.start(ns);
  }

  restart(seconds) {
    if (seconds) {
      return super.start(ns, undefined, seconds / ns.ticksPerQuarter);
    } else {
      return this.start(this.ns);
    }
  }

  resume(seconds) {
    super.resume();
    this.seekTo(seconds);
  }

  changeVolume(volume) {
    // 0 <= volume <= 100 --> 1e-5 <= dB <= 1 --> -100 <= slider <= 0
    if (volume == 0) {
      volume = -100;
    } else {
      volume = 20 * Math.log(volume / 100) / Math.log(10);
    }
    this.output.volume.value = volume;
  }

  changeMute(status) {
    this.output.mute = status;
  }
}

class SoundFontPlayer {
  constructor(stopCallback) {
    this.context = new AudioContext();
    this.state = "stopped";
    this.callStop = false;
    this.stopCallback = stopCallback;
    this.prevGain = 0.5;
    this.cacheUrls = new Array(128);
    this.totalTicks = 0;
  }

  async loadSoundFontDir(ns, dir) {
    const programs = new Set();
    ns.notes.forEach((note) => programs.add(note.program));
    if (ns.notes.some((note) => note.isDrum)) programs.add(128);
    const promises = [...programs].map((program) => {
      const programId = program.toString().padStart(3, "0");
      const url = `${dir}/${programId}.sf3`;
      if (this.cacheUrls[program] == url) return true;
      this.cacheUrls[program] = url;
      return this.fetchBuffer(url);
    });
    const buffers = await Promise.all(promises);
    for (const buffer of buffers) {
      if (buffer instanceof ArrayBuffer) {
        await this.loadSoundFontBuffer(buffer);
      }
    }
  }

  async fetchBuffer(url) {
    const response = await fetch(url);
    if (response.status == 200) {
      return await response.arrayBuffer();
    } else {
      return undefined;
    }
  }

  async loadSoundFontUrl(url) {
    const buffer = await this.fetchBuffer(url);
    const soundFontId = await this.loadSoundFontBuffer(buffer);
    return soundFontId;
  }

  async loadSoundFontBuffer(soundFontBuffer) {
    if (!this.synth) {
      await this.context.audioWorklet.addModule(
        "https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/externals/libfluidsynth-2.3.0-with-libsndfile.min.js",
      );
      await this.context.audioWorklet.addModule(
        "https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/dist/js-synthesizer.worklet.min.js",
      );
      this.synth = new JSSynth.AudioWorkletNodeSynthesizer();
      this.synth.init(this.context.sampleRate);
      const node = this.synth.createAudioNode(this.context);
      node.connect(this.context.destination);
    }
    const soundFontId = await this.synth.loadSFont(soundFontBuffer);
    return soundFontId;
  }

  async loadNoteSequence(ns) {
    await this.synth.resetPlayer();
    this.ns = ns;
    const midiBuffer = core.sequenceProtoToMidi(ns);
    this.totalTicks = this.calcTick(ns.totalTime);
    return player.synth.addSMFDataToPlayer(midiBuffer);
  }

  resumeContext() {
    this.context.resume();
  }

  async restart(seconds) {
    this.state = "started";
    await this.synth.playPlayer();
    this.seekTo(seconds);
    await this.synth.waitForPlayerStopped();
    await this.synth.waitForVoicesStopped();
    this.state = "paused";
    const currentTick = await this.synth.retrievePlayerCurrentTick();
    if (this.totalTicks <= currentTick) {
      player.seekTo(0);
      this.stopCallback();
    }
  }

  async start(ns, _qpm, seconds) {
    if (ns) await this.loadNoteSequence(ns);
    if (seconds) this.seekTo(seconds);
    this.restart();
  }

  stop() {
    if (this.isPlaying()) {
      this.synth.stopPlayer();
    }
  }

  pause() {
    this.state = "paused";
    this.synth.stopPlayer();
  }

  resume(seconds) {
    this.restart(seconds);
  }

  changeVolume(volume) {
    // 0 <= volume <= 1
    volume = volume / 100;
    this.synth.setGain(volume);
  }

  changeMute(status) {
    if (status) {
      this.prevGain = this.synth.getGain();
      this.synth.setGain(0);
    } else {
      this.synth.setGain(this.prevGain);
    }
  }

  calcTick(seconds) {
    let tick = 0;
    let prevTime = 0;
    let prevQpm = 120;
    for (const tempo of this.ns.tempos) {
      const currTime = tempo.time;
      const currQpm = tempo.qpm;
      if (currTime < seconds) {
        const t = currTime - prevTime;
        tick += prevQpm / 60 * t * this.ns.ticksPerQuarter;
      } else {
        const t = seconds - prevTime;
        tick += prevQpm / 60 * t * this.ns.ticksPerQuarter;
        return Math.round(tick);
      }
      prevTime = currTime;
      prevQpm = currQpm;
    }
    const t = seconds - prevTime;
    tick += prevQpm / 60 * t * this.ns.ticksPerQuarter;
    return Math.round(tick);
  }

  seekTo(seconds) {
    const tick = this.calcTick(seconds);
    this.synth.seekPlayer(tick);
  }

  isPlaying() {
    if (!this.synth) return false;
    return this.synth.isPlaying();
  }

  getPlayState() {
    if (!this.synth) return "stopped";
    if (this.synth.isPlaying()) return "started";
    return this.state;
  }
}

function stopCallback() {
  clearInterval(timer);
  currentTime = 0;
  currentPos = 0;
  initSeekbar(ns, 0);
  visualizer.parentElement.scrollTop = visualizer.parentElement.scrollHeight;
  clearPlayer();
  const repeatObj = document.getElementById("repeat");
  const repeat = repeatObj.classList.contains("active");
  if (repeat) play();
  visualizer.clearActiveNotes();
}

async function initPlayer() {
  disableController();
  if (player && player.isPlaying()) player.stop();
  currentTime = 0;
  currentPos = 0;
  initSeekbar(ns, 0);

  // // Magenta.js
  // const runCallback = (note) => visualizer.redraw(note);
  // player = new MagentaPlayer(ns, runCallback, stopCallback);
  // await player.loadSamples(ns);

  // js-synthesizer
  player = new SoundFontPlayer(stopCallback);
  if (firstRun) {
    firstRun = false;
    await loadSoundFont("GeneralUser_GS_v1.471");
  } else {
    await loadSoundFont();
  }

  enableController();
}

async function loadSoundFont(name) {
  if (player instanceof SoundFontPlayer) {
    if (!name) {
      const soundfonts = document.getElementById("soundfonts");
      const index = soundfonts.selectedIndex;
      if (index == 0) return; // use local file or url
      name = soundfonts.options[index].value;
    }
    const soundFontDir = `https://soundfonts.pages.dev/${name}`;
    await player.loadSoundFontDir(ns, soundFontDir);
    await player.loadNoteSequence(ns);
  }
}

function checkNoteEvent() {
  const notes = ns.notes;
  if (notes.length <= currentPos) return;
  const noteTime = notes[currentPos].startTime;
  if (noteTime <= currentTime) {
    let nextPos = currentPos + 1;
    while (notes.length < nextPos && noteTime == notes[nextPos].startTime) {
      nextPos += 1;
    }
    visualizer.redraw(notes[currentPos], currentPos);
    currentPos = nextPos;
  }
}

function setTimer(seconds) {
  const delay = 1;
  const startTime = Date.now() - seconds * 1000;
  const totalTime = ns.totalTime;
  clearInterval(timer);
  timer = setInterval(() => {
    const nextTime = (Date.now() - startTime) / 1000;
    if (Math.floor(currentTime) != Math.floor(nextTime)) {
      updateSeekbar(nextTime);
    }
    currentTime = nextTime;
    if (currentTime < totalTime) {
      const rate = 1 - currentTime / totalTime;
      visualizer.parentElement.scrollTop = currentScrollHeight * rate;
      if (player instanceof SoundFontPlayer) {
        checkNoteEvent();
      }
    } else {
      clearInterval(timer);
    }
  }, delay);
}

// fix delay caused by player.start(ns) by seeking after playing
function setLoadingTimer(time) {
  const loadingTimer = setInterval(() => {
    if (player.isPlaying()) {
      clearInterval(loadingTimer);
      player.seekTo(time);
      setTimer(time);
      enableController();
    }
  }, 10);
}

function disableController() {
  controllerDisabled = true;
  const target = document.getElementById("controller")
    .querySelectorAll("button, input");
  [...target].forEach((node) => {
    node.disabled = true;
  });
}

function enableController() {
  controllerDisabled = false;
  const target = document.getElementById("controller")
    .querySelectorAll("button, input");
  [...target].forEach((node) => {
    node.disabled = false;
  });
}

function unlockAudio() {
  player.resumeContext();
}

function play() {
  disableController();
  document.getElementById("play").classList.add("d-none");
  document.getElementById("pause").classList.remove("d-none");
  switch (player.getPlayState()) {
    case "stopped":
      initSeekbar(ns, currentTime);
      setLoadingTimer(currentTime);
      player.restart();
      break;
    case "started":
    case "paused":
      player.resume(currentTime);
      setTimer(currentTime);
      enableController();
      break;
  }
}

function pause() {
  player.pause();
  clearPlayer();
}

function clearPlayer() {
  clearInterval(timer);
  document.getElementById("play").classList.remove("d-none");
  document.getElementById("pause").classList.add("d-none");
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
  if (player.isPlaying()) disableController();
  const input = document.getElementById("speed");
  const value = parseInt(input.value) - 10;
  const speed = (value <= 0) ? 1 : value;
  input.value = speed;
  changeSpeed(speed);
}

function speedUp() {
  if (player.isPlaying()) disableController();
  const input = document.getElementById("speed");
  const speed = parseInt(input.value) + 10;
  input.value = speed;
  changeSpeed(speed);
}

async function changeSpeed(speed) {
  if (!ns) return;
  const playState = player.getPlayState();
  player.stop();
  clearInterval(timer);
  const prevRate = nsCache.totalTime / ns.totalTime;
  const rate = prevRate / (speed / 100);
  const newSeconds = currentTime * rate;
  setSpeed(ns, speed);
  initSeekbar(ns, newSeconds);
  if (playState == "started") {
    setLoadingTimer(newSeconds);
    player.start(ns);
  } else if (player instanceof SoundFontPlayer) {
    await player.loadNoteSequence(ns);
    player.seekTo(newSeconds);
  }
}

function changeSpeedEvent(event) {
  if (player.isPlaying()) disableController();
  const speed = parseInt(event.target.value);
  changeSpeed(speed);
}

function setSpeed(ns, speed) {
  if (speed <= 0) speed = 1;
  speed /= 100;
  const controlChanges = nsCache.controlChanges;
  ns.controlChanges.forEach((n, i) => {
    n.time = controlChanges[i].time / speed;
  });
  const tempos = nsCache.tempos;
  ns.tempos.forEach((n, i) => {
    n.time = tempos[i].time / speed;
    n.qpm = tempos[i].qpm * speed;
  });
  const timeSignatures = nsCache.timeSignatures;
  ns.timeSignatures.forEach((n, i) => {
    n.time = timeSignatures[i].time / speed;
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
    volumebar.value = 0;
    player.changeMute(true);
  } else {
    i.className = "bi bi-volume-up-fill";
    volumebar.value = volumebar.dataset.value;
    player.changeMute(false);
  }
}

function changeVolumebar() {
  const volumebar = document.getElementById("volumebar");
  const volume = parseInt(volumebar.value);
  volumebar.dataset.value = volume;
  player.changeVolume(volume);
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
  clearInterval(timer);
  visualizer.clearActiveNotes();
  currentTime = parseInt(event.target.value);
  if (currentTime == 0) {
    currentPos = 0;
  } else {
    currentPos = searchNotePosition(ns.notes, currentTime);
  }
  document.getElementById("currentTime").textContent = formatTime(currentTime);
  seekScroll(currentTime);
  if (player.getPlayState() == "started") {
    player.seekTo(currentTime);
    setTimer(currentTime);
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
  document.getElementById("currentTime").textContent = formatTime(seconds);
}

function loadSoundFontList() {
  return fetch("https://soundfonts.pages.dev/list.json")
    .then((response) => response.json())
    .then((data) => {
      const soundfonts = document.getElementById("soundfonts");
      data.forEach((info) => {
        const option = document.createElement("option");
        option.textContent = info.name;
        if (info.name == "GeneralUser_GS_v1.471") {
          option.selected = true;
        }
        soundfonts.appendChild(option);
      });
    });
}

async function changeConfig() {
  switch (player.getPlayState()) {
    case "started": {
      player.stop();
      await loadSoundFont();
      const speed = parseInt(document.getElementById("speed").value);
      setSpeed(ns, speed);
      const seconds = parseInt(document.getElementById("seekbar").value);
      initSeekbar(ns, seconds);
      setLoadingTimer(seconds);
      player.start(ns);
      break;
    }
    case "paused":
      configChanged = true;
      break;
  }
}

function resize() {
  const parentElement = visualizer.parentElement;
  const rectHeight = parentElement.getBoundingClientRect().height;
  currentScrollHeight = parentElement.scrollHeight - rectHeight;
  seekScroll(currentTime);
}

function seekScroll(time) {
  const rate = (ns.totalTime - time) / ns.totalTime;
  visualizer.parentElement.scrollTop = currentScrollHeight * rate;
}

function typeEvent(event) {
  if (!player || !player.synth) return;
  if (controllerDisabled) return;
  player.resumeContext();
  switch (event.code) {
    case "Space":
      event.preventDefault();
      if (player.getPlayState() == "started") {
        pause();
      } else {
        play();
      }
  }
}

function initQuery() {
  const query = new URLSearchParams();
  query.set("title", "When the Swallows Homeward Fly (Agathe)");
  query.set("composer", "Franz Wilhelm Abt");
  query.set("maintainer", "Stan Sanderson");
  query.set("license", "Public Domain");
  return query;
}

const pianoKeyIndex = new Map();
let currentTime = 0;
let currentPos = 0;
let currentScrollHeight;
let ns;
let nsCache;
let timer;
let player;
let visualizer;
let firstRun = true;
loadConfig();
if (location.search) {
  loadMIDIFromUrlParams();
} else {
  const query = initQuery();
  loadMIDIFromUrl("abt.mid", query);
}
loadSoundFontList();

document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
document.ondragover = (e) => {
  e.preventDefault();
};
document.ondrop = dropFileEvent;
document.getElementById("play").onclick = play;
document.getElementById("pause").onclick = pause;
document.getElementById("speed").onchange = changeSpeedEvent;
document.getElementById("speedDown").onclick = speedDown;
document.getElementById("speedUp").onclick = speedUp;
document.getElementById("repeat").onclick = repeat;
document.getElementById("volumeOnOff").onclick = volumeOnOff;
document.getElementById("volumebar").onchange = changeVolumebar;
document.getElementById("seekbar").onchange = changeSeekbar;
document.getElementById("inputMIDIFile").onchange = loadMIDIFileEvent;
document.getElementById("inputMIDIUrl").onchange = loadMIDIUrlEvent;
document.addEventListener("keydown", typeEvent);
document.getElementById("inputSoundFontFile").onchange = loadSoundFontFileEvent;
document.getElementById("inputSoundFontUrl").onchange = loadSoundFontUrlEvent;
document.getElementById("soundfonts").onchange = changeConfig;
window.addEventListener("resize", resize);
document.addEventListener("click", unlockAudio, {
  once: true,
  useCapture: true,
});
