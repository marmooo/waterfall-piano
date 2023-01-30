function loadConfig(){localStorage.getItem("darkMode")==1&&(document.documentElement.dataset.theme="dark")}function toggleDarkMode(){localStorage.getItem("darkMode")==1?(localStorage.setItem("darkMode",0),delete document.documentElement.dataset.theme):(localStorage.setItem("darkMode",1),document.documentElement.dataset.theme="dark")}function dropFileEvent(a){a.preventDefault();const b=a.dataTransfer.files[0],c=new DataTransfer;c.items.add(b);const d=document.getElementById("inputFile");d.files=c.files,convertFromBlob(b)}function convertFileEvent(a){convertFromBlob(a.target.files[0])}function convertUrlEvent(a){convertFromUrl(a.target.value)}async function convertFromUrlParams(){const a=new URLSearchParams(location.search);ns=await core.urlToNoteSequence(a.get("url")),convert(ns,a)}async function convertFromBlob(a,b){ns=await core.blobToNoteSequence(a),convert(ns,b)}async function convertFromUrl(a,b){ns=await core.urlToNoteSequence(a),convert(ns,b)}function setMIDIInfo(a){if(a instanceof URLSearchParams){const f=a.get("title"),c=a.get("composer"),b=a.get("maintainer"),d=a.get("web"),e=a.get("license");if(document.getElementById("midiTitle").textContent=f,c!=b&&(document.getElementById("composer").textContent=c),d){const a=document.createElement("a");a.href=d,a.textContent=b,document.getElementById("maintainer").replaceChildren(a)}else document.getElementById("maintainer").textContent=b;try{new URL(e)}catch{document.getElementById("license").textContent=e}}else document.getElementById("midiTitle").textContent="",document.getElementById("composer").textContent="",document.getElementById("maintainer").textContent="",document.getElementById("license").textContent=""}function convert(a,b){a.totalTime+=3,a.notes.forEach(a=>{a.startTime+=3,a.endTime+=3}),nsCache=core.sequences.clone(a),setMIDIInfo(b),setToolbar(),initVisualizer(),initPlayer()}function redraw(a,b){if(a.drawn||a.draw(),!b)return null;const c=a.parentElement;a.clearActiveNotes(),c.style.paddingTop=c.style.height;const d=a.noteSequence.notes;for(let c=0;c<d.length;c++){const e=d[c],f=b&&a.isPaintingActiveNote(e,b);if(!f)continue;const g=a.svg.querySelector(`rect[data-index="${c}"]`);a.fillActiveRect(g,e);const h=a.svgPiano.querySelector(`rect[data-pitch="${e.pitch}"]`);a.fillActiveRect(h,e)}return null}function styleToViewBox(a){const b=a.style,c=parseFloat(b.width),d=parseFloat(b.height),e=`0 0 ${c} ${d}`;a.setAttribute("viewBox",e),a.removeAttribute("style")}const MIN_NOTE_LENGTH=1;class WaterfallSVGVisualizer extends core.BaseSVGVisualizer{NOTES_PER_OCTAVE=12;WHITE_NOTES_PER_OCTAVE=7;LOW_C=12;firstDrawnOctave=0;lastDrawnOctave=6;constructor(d,b,a={}){if(super(d,a),!(b instanceof HTMLDivElement))throw new Error("This visualizer requires a <div> element to display the visualization");this.config.whiteNoteWidth=a.whiteNoteWidth||20,this.config.blackNoteWidth=a.blackNoteWidth||this.config.whiteNoteWidth*2/3,this.config.whiteNoteHeight=a.whiteNoteHeight||70,this.config.blackNoteHeight=a.blackNoteHeight||2*70/3,this.config.showOnlyOctavesUsed=a.showOnlyOctavesUsed,this.setupDOM(b);const c=this.getSize();this.width=c.width,this.height=c.height,this.svg.style.width=`${this.width}px`,this.svg.style.height=`${this.height}px`,this.svgPiano.style.width=`${this.width}px`,this.svgPiano.style.height=`${this.config.whiteNoteHeight}px`,this.parentElement.style.width=`${this.width+this.config.whiteNoteWidth}px`,this.parentElement.scrollTop=this.parentElement.scrollHeight,this.clear(),this.drawPiano(),this.draw()}setupDOM(a){this.parentElement=document.createElement("div"),this.parentElement.classList.add("waterfall-notes-container");const b=Math.max(a.getBoundingClientRect().height,200);this.parentElement.style.paddingTop=`${b-this.config.whiteNoteHeight}px`,this.parentElement.style.height=`${b-this.config.whiteNoteHeight}px`,this.parentElement.style.boxSizing="border-box",this.parentElement.style.overflowX="hidden",this.parentElement.style.overflowY="auto",this.svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),this.svgPiano=document.createElementNS("http://www.w3.org/2000/svg","svg"),this.svg.classList.add("waterfall-notes"),this.svgPiano.classList.add("waterfall-piano"),this.parentElement.appendChild(this.svg),a.innerHTML="",a.appendChild(this.parentElement),a.appendChild(this.svgPiano)}redraw(a,b){if(this.drawn||this.draw(),!a)return null;this.clearActiveNotes(),this.parentElement.style.paddingTop=this.parentElement.style.height;for(let c=0;c<this.noteSequence.notes.length;c++){const b=this.noteSequence.notes[c],e=a&&this.isPaintingActiveNote(b,a);if(!e)continue;const d=this.svg.querySelector(`rect[data-index="${c}"]`);this.fillActiveRect(d,b);const f=this.svgPiano.querySelector(`rect[data-pitch="${b.pitch}"]`);if(this.fillActiveRect(f,b),b===a){const a=parseFloat(d.getAttribute("y")),b=parseFloat(d.getAttribute("height"));return a<this.parentElement.scrollTop-b&&(this.parentElement.scrollTop=a+b),a}}return null}getSize(){this.updateMinMaxPitches(!0);let a=52;if(this.config.showOnlyOctavesUsed){let b=!1,c=!1;for(let a=1;a<7;a++){const d=this.LOW_C+this.NOTES_PER_OCTAVE*a;!b&&d>this.config.minPitch&&(this.firstDrawnOctave=a-1,b=!0),!c&&d>this.config.maxPitch&&(this.lastDrawnOctave=a-1,c=!0)}a=(this.lastDrawnOctave-this.firstDrawnOctave+1)*this.WHITE_NOTES_PER_OCTAVE}const c=a*this.config.whiteNoteWidth,b=this.noteSequence.totalTime;if(!b)throw new Error("The sequence you are using with the visualizer does not have a totalQuantizedSteps or totalTime field set, so the visualizer can't be horizontally sized correctly.");const d=Math.max(b*this.config.pixelsPerTimeStep,MIN_NOTE_LENGTH);return{width:c,height:d}}getNotePosition(a,h){const b=this.svgPiano.querySelector(`rect[data-pitch="${a.pitch}"]`);if(!b)return null;const e=this.getNoteEndTime(a)-this.getNoteStartTime(a),f=Number(b.getAttribute("x")),g=Number(b.getAttribute("width")),c=Math.max(this.config.pixelsPerTimeStep*e-this.config.noteSpacing,MIN_NOTE_LENGTH),d=this.height-this.getNoteStartTime(a)*this.config.pixelsPerTimeStep-c;return{x:f,y:d,w:g,h:c}}drawPiano(){this.svgPiano.innerHTML="";const c=this.config.whiteNoteWidth-this.config.blackNoteWidth/2,d=[1,3,6,8,10];let b=0,a=0;this.config.showOnlyOctavesUsed?a=this.firstDrawnOctave*this.NOTES_PER_OCTAVE+this.LOW_C:(a=this.LOW_C-3,this.drawWhiteKey(a,b),this.drawWhiteKey(a+2,this.config.whiteNoteWidth),a+=3,b=2*this.config.whiteNoteWidth);for(let c=this.firstDrawnOctave;c<=this.lastDrawnOctave;c++)for(let c=0;c<this.NOTES_PER_OCTAVE;c++)d.indexOf(c)===-1&&(this.drawWhiteKey(a,b),b+=this.config.whiteNoteWidth),a++;this.config.showOnlyOctavesUsed?(a=this.firstDrawnOctave*this.NOTES_PER_OCTAVE+this.LOW_C,b=-this.config.whiteNoteWidth):(this.drawWhiteKey(a,b),a=this.LOW_C-3,this.drawBlackKey(a+1,c),a+=3,b=this.config.whiteNoteWidth);for(let e=this.firstDrawnOctave;e<=this.lastDrawnOctave;e++)for(let e=0;e<this.NOTES_PER_OCTAVE;e++)d.indexOf(e)!==-1?this.drawBlackKey(a,b+c):b+=this.config.whiteNoteWidth,a++}drawWhiteKey(b,c){const a=document.createElementNS("http://www.w3.org/2000/svg","rect");return a.dataset.pitch=String(b),a.setAttribute("x",String(c)),a.setAttribute("y","0"),a.setAttribute("width",String(this.config.whiteNoteWidth)),a.setAttribute("height",String(this.config.whiteNoteHeight)),a.setAttribute("fill","white"),a.setAttribute("original-fill","white"),a.setAttribute("stroke","black"),a.setAttribute("stroke-width","3px"),a.classList.add("white"),this.svgPiano.appendChild(a),a}drawBlackKey(b,c){const a=document.createElementNS("http://www.w3.org/2000/svg","rect");return a.dataset.pitch=String(b),a.setAttribute("x",String(c)),a.setAttribute("y","0"),a.setAttribute("width",String(this.config.blackNoteWidth)),a.setAttribute("height",String(this.config.blackNoteHeight)),a.setAttribute("fill","black"),a.setAttribute("original-fill","black"),a.setAttribute("stroke","black"),a.setAttribute("stroke-width","3px"),a.classList.add("black"),this.svgPiano.appendChild(a),a}clearActiveNotes(){super.unfillActiveRect(this.svg);const a=this.svgPiano.querySelectorAll("rect.active");for(let b=0;b<a.length;++b){const c=a[b];c.setAttribute("fill",c.getAttribute("original-fill")),c.classList.remove("active")}}}function initVisualizer(){const b=document.getElementById("gamePanel"),c={showOnlyOctavesUsed:!0};visualizer=new WaterfallSVGVisualizer(ns,b,c),styleToViewBox(visualizer.svg),styleToViewBox(visualizer.svgPiano);const a=visualizer.parentElement;a.style.width="100%",a.style.height="50vh",a.style.paddingTop="50vh",a.style.overflowY="hidden",a.scrollTop=a.scrollHeight,currentScrollTop=a.scrollTop}async function initPlayer(){const a="https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus",b={run:a=>redraw(visualizer,a),stop:()=>{visualizer.clearActiveNotes(),clearPlayer();const a=visualizer.parentElement;a.scrollTop=a.scrollHeight;const b=document.getElementById("repeat"),c=b.classList.contains("active");c&&(player.start(ns),setTimer(0),initSeekbar(ns,0))}};stop(),player=new core.SoundFontPlayer(a,void 0,void 0,void 0,b),await player.loadSamples(ns)}function setTimer(b){const c=1,d=Date.now()-b*1e3,a=ns.totalTime,e=visualizer.parentElement;timer=setInterval(()=>{const b=(Date.now()-d)/1e3;if(Math.floor(currentTime)!=Math.floor(b)&&updateSeekbar(b),currentTime=b,currentTime<a){const b=1-currentTime/a;e.scrollTop=currentScrollTop*b}else clearInterval(timer),currentTime=0},c)}function play(){switch(document.getElementById("play").classList.add("d-none"),document.getElementById("pause").classList.remove("d-none"),player.getPlayState()){case"stopped":{if(player.getPlayState()=="started")return;const a=parseInt(document.getElementById("speed").value);setSpeed(ns,a),player.start(ns),setTimer(0),initSeekbar(ns,0);break}case"paused":player.resume(),setTimer(currentTime)}}function pause(){player.pause(),clearPlayer()}function stop(){player&&player.isPlaying()&&(document.getElementById("currentTime").textContent=formatTime(0),player.stop(),clearPlayer())}function clearPlayer(){document.getElementById("play").classList.remove("d-none"),document.getElementById("pause").classList.add("d-none"),clearInterval(timer)}function getCheckboxString(b,a){return`
<div class="form-check form-check-inline">
  <label class="form-check-label">
    <input class="form-check-input" name="${b}" value="${a}" type="checkbox" checked>
    ${a}
  </label>
</div>`}function setInstrumentsCheckbox(){const a=new Set;ns.notes.forEach(b=>{a.add(b.instrument)});const d=new Map;let b="";a.forEach(a=>{b+=getCheckboxString("instrument",a),d.set(a,!0)});const e=(new DOMParser).parseFromString(b,"text/html"),c=document.getElementById("filterInstruments");c.replaceChildren(...e.body.childNodes),[...c.querySelectorAll("input")].forEach(a=>{a.addEventListener("change",()=>{const b=a.value;[...visualizer.svg.children].forEach(a=>{a.dataset.instrument==b&&a.classList.toggle("d-none")})})})}function setProgramsCheckbox(){const a=new Set;ns.notes.forEach(b=>{a.add(b.program)});const d=new Map;let b="";a.forEach(a=>{b+=getCheckboxString("program",a),d.set(a,!0)});const e=(new DOMParser).parseFromString(b,"text/html"),c=document.getElementById("filterPrograms");c.replaceChildren(...e.body.childNodes),[...c.querySelectorAll("input")].forEach(a=>{a.addEventListener("change",()=>{const b=a.value;[...visualizer.svg.children].forEach(a=>{a.dataset.program==b&&a.classList.toggle("d-none")})})})}function setToolbar(){setProgramsCheckbox(),setInstrumentsCheckbox()}function speedDown(){const a=document.getElementById("speed"),b=parseInt(a.value)-10,c=b<0?0:b;a.value=c,document.getElementById("speedDown").disabled=!0,changeSpeed(c),document.getElementById("speedDown").disabled=!1}function speedUp(){const a=document.getElementById("speed"),b=parseInt(a.value)+10;a.value=b,document.getElementById("speedUp").disabled=!0,changeSpeed(b),document.getElementById("speedUp").disabled=!1}function changeSpeed(a){if(!ns)return;switch(player.getPlayState()){case"started":{player.stop(),clearInterval(timer);const c=nsCache.totalTime/ns.totalTime,d=c/(a/100),b=currentTime*d;setSpeed(ns,a),initSeekbar(ns,b),player.start(ns,void 0,b),setTimer(b);break}case"paused":{setSpeed(ns,a);const b=nsCache.totalTime/ns.totalTime,c=b/(a/100),d=currentTime*c;initSeekbar(ns,d);break}}}function changeSpeedEvent(a){const b=parseInt(a.target.value);changeSpeed(b)}function setSpeed(b,a){a/=100;const e=nsCache.controlChanges;b.controlChanges.forEach((b,c)=>{b.time=e[c].time/a});const c=nsCache.tempos;b.tempos.forEach((b,d)=>{b.time=c[d].time/a,b.qpm=c[d].qpm*a});const d=nsCache.notes;b.notes.forEach((b,c)=>{b.startTime=d[c].startTime/a,b.endTime=d[c].endTime/a}),b.totalTime=nsCache.totalTime/a}function repeat(){document.getElementById("repeat").classList.toggle("active")}function volumeOnOff(){const b=document.getElementById("volumeOnOff").firstElementChild,a=document.getElementById("volumebar");b.classList.contains("bi-volume-up-fill")?(b.className="bi bi-volume-mute-fill",a.dataset.value=a.value,a.value=-50,player.output.mute=!0):(b.className="bi bi-volume-up-fill",a.value=a.dataset.value,player.output.mute=!1)}function changeVolumebar(){const a=document.getElementById("volumebar"),b=a.value;a.dataset.value=b,player.output.volume.value=b}function formatTime(a){a=Math.floor(a);const c=a%60,b=(a-c)/60,d=(a-c-60*b)/3600,e=String(c).padStart(2,"0"),f=b>9||!d?`${b}:`:`0${b}:`,g=d?`${d}:`:"";return`${g}${f}${e}`}function changeSeekbar(b){clearInterval(timer),visualizer.clearActiveNotes();const a=parseInt(b.target.value);document.getElementById("currentTime").textContent=formatTime(a),currentTime=a,resizeScroll(a),player.isPlaying()&&(player.seekTo(a),player.getPlayState()=="started"&&setTimer(a))}function updateSeekbar(a){const b=document.getElementById("seekbar");b.value=a;const c=formatTime(a);document.getElementById("currentTime").textContent=c}function initSeekbar(a,b){document.getElementById("seekbar").max=a.totalTime,document.getElementById("seekbar").value=b,document.getElementById("totalTime").textContent=formatTime(a.totalTime),document.getElementById("currentTime").textContent=formatTime(b)}function resize(){const a=visualizer.parentElement;a.scrollTop=a.scrollHeight,currentScrollTop=a.scrollTop}function resizeScroll(b){const a=visualizer.parentElement;a.scrollTop=a.scrollHeight,currentScrollTop=a.scrollTop;const c=(ns.totalTime-b)/ns.totalTime;a.scrollTop=c*currentScrollTop}function typeEvent(a){switch(a.code){case"Space":a.preventDefault(),player.getPlayState()=="started"?pause():play()}}function initQuery(){const a=new URLSearchParams;return a.set("title","When the Swallows Homeward Fly (Agathe)"),a.set("composer","Franz Wilhelm Abt"),a.set("maintainer","Stan Sanderson"),a.set("license","Public Domain"),a}let currentTime=0,currentScrollTop,ns,nsCache,timer,player,visualizer;if(loadConfig(),location.search)convertFromUrlParams();else{const a=initQuery();convertFromUrl("abt.mid",a)}document.getElementById("toggleDarkMode").onclick=toggleDarkMode,document.ondragover=a=>{a.preventDefault()},document.ondrop=dropFileEvent,document.getElementById("inputFile").onchange=convertFileEvent,document.getElementById("inputUrl").onchange=convertUrlEvent,document.getElementById("play").onclick=play,document.getElementById("pause").onclick=pause,document.getElementById("speed").onchange=changeSpeedEvent,document.getElementById("speedDown").onclick=speedDown,document.getElementById("speedUp").onclick=speedUp,document.getElementById("repeat").onclick=repeat,document.getElementById("volumeOnOff").onclick=volumeOnOff,document.getElementById("volumebar").onchange=changeVolumebar,document.getElementById("seekbar").onchange=changeSeekbar,document.addEventListener("keydown",typeEvent),window.addEventListener("resize",resize)