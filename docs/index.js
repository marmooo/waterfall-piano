function loadConfig(){localStorage.getItem("darkMode")==1&&(document.documentElement.dataset.theme="dark")}function toggleDarkMode(){localStorage.getItem("darkMode")==1?(localStorage.setItem("darkMode",0),delete document.documentElement.dataset.theme):(localStorage.setItem("darkMode",1),document.documentElement.dataset.theme="dark")}function dropFileEvent(a){a.preventDefault();const b=a.dataTransfer.files[0],c=new DataTransfer;c.items.add(b);const d=document.getElementById("inputMIDIFile");d.files=c.files,loadMIDIFromBlob(b)}function loadMIDIFileEvent(a){loadMIDIFromBlob(a.target.files[0])}function loadMIDIUrlEvent(a){loadMIDIFromUrl(a.target.value)}async function loadMIDIFromUrlParams(){const a=new URLSearchParams(location.search);ns=await core.urlToNoteSequence(a.get("url")),convert(ns,a)}async function loadMIDIFromBlob(a,b){ns=await core.blobToNoteSequence(a),convert(ns,b)}async function loadMIDIFromUrl(a,b){ns=await core.urlToNoteSequence(a),convert(ns,b)}function setMIDIInfo(a){if(a instanceof URLSearchParams){const f=a.get("title"),c=a.get("composer"),b=a.get("maintainer"),d=a.get("web"),e=a.get("license");if(document.getElementById("midiTitle").textContent=f,c!=b&&(document.getElementById("composer").textContent=c),d){const a=document.createElement("a");a.href=d,a.textContent=b,document.getElementById("maintainer").replaceChildren(a)}else document.getElementById("maintainer").textContent=b;try{new URL(e)}catch{document.getElementById("license").textContent=e}}else document.getElementById("midiTitle").textContent="",document.getElementById("composer").textContent="",document.getElementById("maintainer").textContent="",document.getElementById("license").textContent=""}function convert(a,c){const b=3;a.totalTime+=b,a.notes.forEach(a=>{a.startTime+=b,a.endTime+=b}),a.controlChanges.forEach(a=>{a.time+=b}),a.tempos.slice(1).forEach(a=>{a.time+=b}),a.timeSignatures.slice(1).forEach(a=>{a.time+=b}),a.notes=a.notes.sort((a,b)=>a.startTime<b.startTime?-1:a.startTime>b.startTime?1:0),nsCache=core.sequences.clone(a),setMIDIInfo(c),setInstrumentsCheckbox(),initVisualizer(),initPlayer()}async function loadSoundFontFileEvent(a){if(player){document.getElementById("soundfonts").options[0].selected=!0;const b=a.target.files[0],c=await b.arrayBuffer();await player.loadSoundFontBuffer(c)}}async function loadSoundFontUrlEvent(a){if(player){document.getElementById("soundfonts").options[0].selected=!0;const b=await fetch(a.target.value),c=await b.arrayBuffer();await player.loadSoundFontBuffer(c)}}function styleToViewBox(a){const b=a.style,c=parseFloat(b.width),d=parseFloat(b.height),e=`0 0 ${c} ${d}`;a.setAttribute("viewBox",e),a.removeAttribute("style")}function searchNotePosition(a,c){let d=0,b=a.length-1;if(c<a[0].startTime)return-1;while(d<=b){const e=Math.floor((d+b)/2);if(a[e].startTime===c){const b=a[e].startTime-1e-8;return b<a[0].startTime?0:searchNotePosition(a,b)}else a[e].startTime<c?d=e+1:b=e-1}return b}const MIN_NOTE_LENGTH=1;class WaterfallSVGVisualizer extends core.BaseSVGVisualizer{NOTES_PER_OCTAVE=12;WHITE_NOTES_PER_OCTAVE=7;LOW_C=12;firstDrawnOctave=0;lastDrawnOctave=8;constructor(d,b,a={}){if(super(d,a),!(b instanceof HTMLDivElement))throw new Error("This visualizer requires a <div> element to display the visualization");this.config.whiteNoteWidth=a.whiteNoteWidth||20,this.config.blackNoteWidth=a.blackNoteWidth||this.config.whiteNoteWidth*2/3,this.config.whiteNoteHeight=a.whiteNoteHeight||70,this.config.blackNoteHeight=a.blackNoteHeight||2*70/3,this.config.showOnlyOctavesUsed=a.showOnlyOctavesUsed,this.setupDOM(b);const c=this.getSize();this.width=c.width,this.height=c.height,this.svg.style.width=`${this.width}px`,this.svg.style.height=`${this.height}px`,this.svgPiano.style.width=`${this.width}px`,this.svgPiano.style.height=`${this.config.whiteNoteHeight}px`,this.parentElement.style.width=`${this.width+this.config.whiteNoteWidth}px`,this.parentElement.scrollTop=this.parentElement.scrollHeight,this.clear(),this.drawPiano(),this.draw()}setupDOM(a){this.parentElement=document.createElement("div"),this.parentElement.classList.add("waterfall-notes-container");const b=Math.max(a.getBoundingClientRect().height,200);this.parentElement.style.paddingTop=`${b-this.config.whiteNoteHeight}px`,this.parentElement.style.height=`${b-this.config.whiteNoteHeight}px`,this.parentElement.style.boxSizing="border-box",this.parentElement.style.overflowX="hidden",this.parentElement.style.overflowY="auto",this.svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),this.svgPiano=document.createElementNS("http://www.w3.org/2000/svg","svg"),this.svg.classList.add("waterfall-notes"),this.svgPiano.classList.add("waterfall-piano"),this.parentElement.appendChild(this.svg),a.innerHTML="",a.appendChild(this.parentElement),a.appendChild(this.svgPiano)}redraw(d,a){if(visualizer.drawn||visualizer.draw(),!d)return;this.clearActivePianoKeys();const b=visualizer.noteSequence.notes,f=visualizer.svg.children,g=visualizer.svgPiano.children,e=d.startTime;a||(a=searchNotePosition(b,e));const h=b.slice(a);let c=h.findIndex(a=>e<a.startTime);c=c==-1?b.length:a+c;for(let d=a;d<c;d++){const e=b[d];visualizer.fillActiveRect(f[d],e);const h=pianoKeyIndex.get(e.pitch);visualizer.fillActiveRect(g[h],e)}}getSize(){this.updateMinMaxPitches(!0);let a=52;if(this.config.showOnlyOctavesUsed){let b=!1,c=!1;for(let a=1;a<7;a++){const d=this.LOW_C+this.NOTES_PER_OCTAVE*a;!b&&d>this.config.minPitch&&(this.firstDrawnOctave=a-1,b=!0),!c&&d>this.config.maxPitch&&(this.lastDrawnOctave=a-1,c=!0)}a=(this.lastDrawnOctave-this.firstDrawnOctave+1)*this.WHITE_NOTES_PER_OCTAVE}const c=a*this.config.whiteNoteWidth,b=this.noteSequence.totalTime;if(!b)throw new Error("The sequence you are using with the visualizer does not have a totalQuantizedSteps or totalTime field set, so the visualizer can't be horizontally sized correctly.");const d=Math.max(b*this.config.pixelsPerTimeStep,MIN_NOTE_LENGTH);return{width:c,height:d}}getNotePosition(a,h){const b=this.svgPiano.querySelector(`rect[data-pitch="${a.pitch}"]`);if(!b)return null;const e=this.getNoteEndTime(a)-this.getNoteStartTime(a),f=Number(b.getAttribute("x")),g=Number(b.getAttribute("width")),c=Math.max(this.config.pixelsPerTimeStep*e-this.config.noteSpacing,MIN_NOTE_LENGTH),d=this.height-this.getNoteStartTime(a)*this.config.pixelsPerTimeStep-c;return{x:f,y:d,w:g,h:c}}drawPiano(){this.svgPiano.innerHTML="";const c=this.config.whiteNoteWidth-this.config.blackNoteWidth/2,d=[1,3,6,8,10];let b=0,a=0;this.config.showOnlyOctavesUsed?a=this.firstDrawnOctave*this.NOTES_PER_OCTAVE+this.LOW_C:(a=this.LOW_C-3,this.drawWhiteKey(a,b),this.drawWhiteKey(a+2,this.config.whiteNoteWidth),a+=3,b=2*this.config.whiteNoteWidth);for(let c=this.firstDrawnOctave;c<=this.lastDrawnOctave;c++)for(let c=0;c<this.NOTES_PER_OCTAVE;c++)d.indexOf(c)===-1&&(this.drawWhiteKey(a,b),b+=this.config.whiteNoteWidth),a++;this.config.showOnlyOctavesUsed?(a=this.firstDrawnOctave*this.NOTES_PER_OCTAVE+this.LOW_C,b=-this.config.whiteNoteWidth):(this.drawWhiteKey(a,b),a=this.LOW_C-3,this.drawBlackKey(a+1,c),a+=3,b=this.config.whiteNoteWidth);for(let e=this.firstDrawnOctave;e<=this.lastDrawnOctave;e++)for(let e=0;e<this.NOTES_PER_OCTAVE;e++)d.indexOf(e)!==-1?this.drawBlackKey(a,b+c):b+=this.config.whiteNoteWidth,a++}drawWhiteKey(b,c){const a=document.createElementNS("http://www.w3.org/2000/svg","rect");return a.dataset.pitch=String(b),a.setAttribute("x",String(c)),a.setAttribute("y","0"),a.setAttribute("width",String(this.config.whiteNoteWidth)),a.setAttribute("height",String(this.config.whiteNoteHeight)),a.setAttribute("fill","white"),a.setAttribute("original-fill","white"),a.setAttribute("stroke","black"),a.setAttribute("stroke-width","3px"),a.classList.add("white"),this.svgPiano.appendChild(a),a}drawBlackKey(b,c){const a=document.createElementNS("http://www.w3.org/2000/svg","rect");return a.dataset.pitch=String(b),a.setAttribute("x",String(c)),a.setAttribute("y","0"),a.setAttribute("width",String(this.config.blackNoteWidth)),a.setAttribute("height",String(this.config.blackNoteHeight)),a.setAttribute("fill","black"),a.setAttribute("original-fill","black"),a.setAttribute("stroke","black"),a.setAttribute("stroke-width","3px"),a.classList.add("black"),this.svgPiano.appendChild(a),a}clearActiveNotes(){super.unfillActiveRect(this.svg),this.clearActivePianoKeys()}clearActivePianoKeys(){const a=this.svgPiano.querySelectorAll("rect.active");for(let b=0;b<a.length;++b){const c=a[b];c.setAttribute("fill",c.getAttribute("original-fill")),c.classList.remove("active")}}}function initPianoKeyIndex(){[...visualizer.svgPiano.children].forEach((a,b)=>{const c=parseInt(a.dataset.pitch);pianoKeyIndex.set(c,b)})}function getMinMaxPitch(){let a=1/0,b=-(1/0);return ns.notes.forEach(c=>{c.pitch<a&&(a=c.pitch),b<c.pitch&&(b=c.pitch)}),[a,b]}function initVisualizer(){const c=document.getElementById("gamePanel"),h=c.getBoundingClientRect(),[d,e]=getMinMaxPitch(ns),b=Math.round(h.width/(e-d+1)*12/7),f=Math.round(b*70/20),g={showOnlyOctavesUsed:!0,whiteNoteWidth:b,whiteNoteHeight:f,blackNoteWidth:Math.round(b*2/3),blackNoteHeight:Math.round(f*2/3),maxPitch:e,minPitch:d};visualizer=new WaterfallSVGVisualizer(ns,c,g),initPianoKeyIndex(),styleToViewBox(visualizer.svg),styleToViewBox(visualizer.svgPiano),[...visualizer.svgPiano.children].forEach(a=>{a.setAttribute("vector-effect","non-scaling-stroke"),a.setAttribute("stroke-width","1px"),a.setAttribute("ry","3%")});const a=visualizer.parentElement;a.style.width="100%",a.style.height="50vh",a.style.paddingTop="50vh",a.style.overflowY="hidden",resize()}class MagentaPlayer extends core.SoundFontPlayer{constructor(a,b,c){const d="https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus",e={run:a=>b(a),stop:()=>c()};super(d,void 0,void 0,void 0,e),this.ns=a,this.output.volume.value=20*Math.log(.5)/Math.log(10)}loadSamples(a){return super.loadSamples(a).then(()=>{this.synth=!0})}start(a){return super.start(a)}restart(a){return a?super.start(ns,void 0,a/ns.ticksPerQuarter):this.start(this.ns)}resume(a){super.resume(),this.seekTo(a)}changeVolume(a){a==0?a=-100:a=20*Math.log(a/100)/Math.log(10),this.output.volume.value=a}changeMute(a){this.output.mute=a}}class SoundFontPlayer{constructor(a){this.context=new AudioContext,this.state="stopped",this.callStop=!1,this.stopCallback=a,this.prevGain=.5,this.cacheUrls=new Array(128),this.totalTicks=0}async loadSoundFontDir(b,c){const a=new Set;b.notes.forEach(b=>a.add(b.program)),b.notes.some(a=>a.isDrum)&&a.add(128);const d=[...a].map(a=>{const d=a.toString().padStart(3,"0"),b=`${c}/${d}.sf3`;return this.cacheUrls[a]==b||(this.cacheUrls[a]=b,this.fetchBuffer(b))}),e=await Promise.all(d);for(const a of e)a instanceof ArrayBuffer&&await this.loadSoundFontBuffer(a)}async fetchBuffer(b){const a=await fetch(b);return a.status==200?await a.arrayBuffer():void 0}async loadSoundFontUrl(a){const b=await this.fetchBuffer(a),c=await this.loadSoundFontBuffer(b);return c}async loadSoundFontBuffer(a){if(!this.synth){await this.context.audioWorklet.addModule("https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/externals/libfluidsynth-2.3.0-with-libsndfile.min.js"),await this.context.audioWorklet.addModule("https://cdn.jsdelivr.net/npm/js-synthesizer@1.8.5/dist/js-synthesizer.worklet.min.js"),this.synth=new JSSynth.AudioWorkletNodeSynthesizer,this.synth.init(this.context.sampleRate);const a=this.synth.createAudioNode(this.context);a.connect(this.context.destination)}const b=await this.synth.loadSFont(a);return b}async loadNoteSequence(a){await this.synth.resetPlayer(),this.ns=a;const b=core.sequenceProtoToMidi(a);return this.totalTicks=this.calcTick(a.totalTime),player.synth.addSMFDataToPlayer(b)}resumeContext(){this.context.resume()}async restart(a){this.state="started",await this.synth.playPlayer(),this.seekTo(a),await this.synth.waitForPlayerStopped(),await this.synth.waitForVoicesStopped(),this.state="paused";const b=await this.synth.retrievePlayerCurrentTick();this.totalTicks<=b&&(player.seekTo(0),this.stopCallback())}async start(a,c,b){a&&await this.loadNoteSequence(a),b&&this.seekTo(b),this.restart()}stop(){this.isPlaying()&&this.synth.stopPlayer()}pause(){this.state="paused",this.synth.stopPlayer()}resume(a){this.restart(a)}changeVolume(a){a=a/100,this.synth.setGain(a)}changeMute(a){a?(this.prevGain=this.synth.getGain(),this.synth.setGain(0)):this.synth.setGain(this.prevGain)}calcTick(d){let a=0,b=0,c=120;for(const f of this.ns.tempos){const e=f.time,g=f.qpm;if(e<d){const d=e-b;a+=c/60*d*this.ns.ticksPerQuarter}else{const e=d-b;return a+=c/60*e*this.ns.ticksPerQuarter,Math.round(a)}b=e,c=g}const e=d-b;return a+=c/60*e*this.ns.ticksPerQuarter,Math.round(a)}seekTo(a){const b=this.calcTick(a);this.synth.seekPlayer(b)}isPlaying(){return!!this.synth&&this.synth.isPlaying()}getPlayState(){return this.synth?this.synth.isPlaying()?"started":this.state:"stopped"}}function stopCallback(){clearInterval(timer),currentTime=0,currentPos=0,initSeekbar(ns,0),visualizer.parentElement.scrollTop=visualizer.parentElement.scrollHeight,clearPlayer();const a=document.getElementById("repeat"),b=a.classList.contains("active");b&&play(),visualizer.clearActiveNotes()}async function initPlayer(){disableController(),player&&player.isPlaying()&&player.stop(),currentTime=0,currentPos=0,initSeekbar(ns,0),player=new SoundFontPlayer(stopCallback),firstRun?(firstRun=!1,await loadSoundFont("GeneralUser_GS_v1.471")):await loadSoundFont(),enableController()}async function loadSoundFont(a){if(player instanceof SoundFontPlayer){if(!a){const b=document.getElementById("soundfonts"),c=b.selectedIndex;if(c==0)return;a=b.options[c].value}const b=`https://soundfonts.pages.dev/${a}`;await player.loadSoundFontDir(ns,b),await player.loadNoteSequence(ns)}}function checkNoteEvent(){const a=ns.notes;if(a.length<=currentPos)return;const b=a[currentPos].startTime;if(b<=currentTime){let c=currentPos+1;while(a.length<c&&b==a[c].startTime)c+=1;visualizer.redraw(a[currentPos],currentPos),currentPos=c}}function setTimer(b){const c=1,d=Date.now()-b*1e3,a=ns.totalTime;clearInterval(timer),timer=setInterval(()=>{const b=(Date.now()-d)/1e3;if(Math.floor(currentTime)!=Math.floor(b)&&updateSeekbar(b),currentTime=b,currentTime<a){const b=1-currentTime/a;visualizer.parentElement.scrollTop=currentScrollHeight*b,player instanceof SoundFontPlayer&&checkNoteEvent()}else clearInterval(timer)},c)}function setLoadingTimer(a){const b=setInterval(()=>{player.isPlaying()&&(clearInterval(b),player.seekTo(a),setTimer(a),enableController())},10)}function disableController(){controllerDisabled=!0;const a=document.getElementById("controller").querySelectorAll("button, input");[...a].forEach(a=>{a.disabled=!0})}function enableController(){controllerDisabled=!1;const a=document.getElementById("controller").querySelectorAll("button, input");[...a].forEach(a=>{a.disabled=!1})}function unlockAudio(){player.resumeContext()}function play(){switch(disableController(),document.getElementById("play").classList.add("d-none"),document.getElementById("pause").classList.remove("d-none"),player.getPlayState()){case"stopped":initSeekbar(ns,currentTime),setLoadingTimer(currentTime),player.restart();break;case"started":case"paused":player.resume(currentTime),setTimer(currentTime),enableController();break}}function pause(){player.pause(),clearPlayer()}function clearPlayer(){clearInterval(timer),document.getElementById("play").classList.remove("d-none"),document.getElementById("pause").classList.add("d-none")}function getCheckboxString(b,a){return`
<div class="form-check form-check-inline">
  <label class="form-check-label">
    <input class="form-check-input" name="${b}" value="${a}" type="checkbox" checked>
    ${a}
  </label>
</div>`}function setInstrumentsCheckbox(){const a=new Set;ns.notes.forEach(b=>a.add(`${b.program}:${b.instrument}`));let b="";[...a].sort().forEach(a=>{b+=getCheckboxString("instrument",a)});const d=(new DOMParser).parseFromString(b,"text/html"),c=document.getElementById("filterInstruments");c.replaceChildren(...d.body.children),[...c.querySelectorAll("input")].forEach(a=>{a.addEventListener("change",changeInstrumentsCheckbox)})}function changeInstrumentsCheckbox(a){const c=a.target.checked,[d,e]=a.target.value.split(":").map(a=>parseInt(a)),b=visualizer.svg.children;ns.notes.forEach((a,f)=>{if(a.program!=d)return;if(a.instrument!=e)return;c?(a.target=!0,b[f].classList.remove("d-none")):(a.target=!1,b[f].classList.add("d-none"))})}function speedDown(){player.isPlaying()&&disableController();const a=document.getElementById("speed"),b=parseInt(a.value)-10,c=b<=0?1:b;a.value=c,changeSpeed(c)}function speedUp(){player.isPlaying()&&disableController();const a=document.getElementById("speed"),b=parseInt(a.value)+10;a.value=b,changeSpeed(b)}async function changeSpeed(b){if(!ns)return;const c=player.getPlayState();player.stop(),clearInterval(timer);const d=nsCache.totalTime/ns.totalTime,e=d/(b/100),a=currentTime*e;setSpeed(ns,b),initSeekbar(ns,a),c=="started"?(setLoadingTimer(a),player.start(ns)):player instanceof SoundFontPlayer&&(await player.loadNoteSequence(ns),player.seekTo(a))}function changeSpeedEvent(a){player.isPlaying()&&disableController();const b=parseInt(a.target.value);changeSpeed(b)}function setSpeed(b,a){a<=0&&(a=1),a/=100;const e=nsCache.controlChanges;b.controlChanges.forEach((b,c)=>{b.time=e[c].time/a});const c=nsCache.tempos;b.tempos.forEach((b,d)=>{b.time=c[d].time/a,b.qpm=c[d].qpm*a});const f=nsCache.timeSignatures;b.timeSignatures.forEach((b,c)=>{b.time=f[c].time/a});const d=nsCache.notes;b.notes.forEach((b,c)=>{b.startTime=d[c].startTime/a,b.endTime=d[c].endTime/a}),b.totalTime=nsCache.totalTime/a}function repeat(){document.getElementById("repeat").classList.toggle("active")}function volumeOnOff(){const b=document.getElementById("volumeOnOff").firstElementChild,a=document.getElementById("volumebar");b.classList.contains("bi-volume-up-fill")?(b.className="bi bi-volume-mute-fill",a.dataset.value=a.value,a.value=0,player.changeMute(!0)):(b.className="bi bi-volume-up-fill",a.value=a.dataset.value,player.changeMute(!1))}function changeVolumebar(){const a=document.getElementById("volumebar"),b=parseInt(a.value);a.dataset.value=b,player.changeVolume(b)}function formatTime(a){a=Math.floor(a);const c=a%60,b=(a-c)/60,d=(a-c-60*b)/3600,e=String(c).padStart(2,"0"),f=b>9||!d?`${b}:`:`0${b}:`,g=d?`${d}:`:"";return`${g}${f}${e}`}function changeSeekbar(a){clearInterval(timer),visualizer.clearActiveNotes(),currentTime=parseInt(a.target.value),currentTime==0?currentPos=0:currentPos=searchNotePosition(ns.notes,currentTime),document.getElementById("currentTime").textContent=formatTime(currentTime),seekScroll(currentTime),player.getPlayState()=="started"&&(player.seekTo(currentTime),setTimer(currentTime))}function updateSeekbar(a){const b=document.getElementById("seekbar");b.value=a;const c=formatTime(a);document.getElementById("currentTime").textContent=c}function initSeekbar(a,b){document.getElementById("seekbar").max=a.totalTime,document.getElementById("seekbar").value=b,document.getElementById("totalTime").textContent=formatTime(a.totalTime),document.getElementById("currentTime").textContent=formatTime(b)}function loadSoundFontList(){return fetch("https://soundfonts.pages.dev/list.json").then(a=>a.json()).then(a=>{const b=document.getElementById("soundfonts");a.forEach(c=>{const a=document.createElement("option");a.textContent=c.name,c.name=="GeneralUser_GS_v1.471"&&(a.selected=!0),b.appendChild(a)})})}async function changeConfig(){switch(player.getPlayState()){case"started":{player.stop(),await loadSoundFont();const b=parseInt(document.getElementById("speed").value);setSpeed(ns,b);const a=parseInt(document.getElementById("seekbar").value);initSeekbar(ns,a),setLoadingTimer(a),player.start(ns);break}case"paused":configChanged=!0;break}}function resize(){const a=visualizer.parentElement,b=a.getBoundingClientRect().height;currentScrollHeight=a.scrollHeight-b,seekScroll(currentTime)}function seekScroll(a){const b=(ns.totalTime-a)/ns.totalTime;visualizer.parentElement.scrollTop=currentScrollHeight*b}function typeEvent(a){if(!player||!player.synth)return;if(controllerDisabled)return;switch(player.resumeContext(),a.code){case"Space":a.preventDefault(),player.getPlayState()=="started"?pause():play()}}function initQuery(){const a=new URLSearchParams;return a.set("title","When the Swallows Homeward Fly (Agathe)"),a.set("composer","Franz Wilhelm Abt"),a.set("maintainer","Stan Sanderson"),a.set("license","Public Domain"),a}const pianoKeyIndex=new Map;let controllerDisabled,currentTime=0,currentPos=0,currentScrollHeight,ns,nsCache,timer,player,visualizer,firstRun=!0;if(loadConfig(),location.search)loadMIDIFromUrlParams();else{const a=initQuery();loadMIDIFromUrl("abt.mid",a)}loadSoundFontList(),document.getElementById("toggleDarkMode").onclick=toggleDarkMode,document.ondragover=a=>{a.preventDefault()},document.ondrop=dropFileEvent,document.getElementById("play").onclick=play,document.getElementById("pause").onclick=pause,document.getElementById("speed").onchange=changeSpeedEvent,document.getElementById("speedDown").onclick=speedDown,document.getElementById("speedUp").onclick=speedUp,document.getElementById("repeat").onclick=repeat,document.getElementById("volumeOnOff").onclick=volumeOnOff,document.getElementById("volumebar").onchange=changeVolumebar,document.getElementById("seekbar").onchange=changeSeekbar,document.getElementById("inputMIDIFile").onchange=loadMIDIFileEvent,document.getElementById("inputMIDIUrl").onchange=loadMIDIUrlEvent,document.getElementById("inputSoundFontFile").onchange=loadSoundFontFileEvent,document.getElementById("inputSoundFontUrl").onchange=loadSoundFontUrlEvent,document.getElementById("soundfonts").onchange=changeConfig,document.addEventListener("keydown",typeEvent),window.addEventListener("resize",resize),document.addEventListener("click",unlockAudio,{once:!0,useCapture:!0})