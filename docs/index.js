function loadConfig(){localStorage.getItem("darkMode")==1&&(document.documentElement.dataset.theme="dark")}function toggleDarkMode(){localStorage.getItem("darkMode")==1?(localStorage.setItem("darkMode",0),delete document.documentElement.dataset.theme):(localStorage.setItem("darkMode",1),document.documentElement.dataset.theme="dark")}function dropFileEvent(a){a.preventDefault();const b=a.dataTransfer.files[0],c=new DataTransfer;c.items.add(b);const d=document.getElementById("inputFile");d.files=c.files,convertFromBlob(b)}function convertFileEvent(a){convertFromBlob(a.target.files[0])}function convertUrlEvent(a){convertFromUrl(a.target.value)}async function convertFromUrlParams(){const a=parseQuery(location.search);ns=await core.urlToNoteSequence(a.url),convert(ns,a.title,a.composer)}async function convertFromBlob(a){ns=await core.blobToNoteSequence(a);const b=a.name;convert(ns,b)}async function convertFromUrl(a){ns=await core.urlToNoteSequence(a);const b=a.split("/").at(-1);convert(ns,b)}function convert(a,b,c){b&&(document.getElementById("midiTitle").textContent=b),c&&(document.getElementById("composer").textContent=c),a.totalTime+=3,a.notes.forEach(a=>{a.startTime+=3,a.endTime+=3}),nsCache=core.sequences.clone(a),setToolbar(),initVisualizer(),initPlayer()}function getScale(a){const b=a.parentElement.getBoundingClientRect(),c=a.getSize();return b.width/c.width}function redraw(a,b){if(a.drawn||a.draw(),!b)return null;const c=a.parentElement;a.clearActiveNotes(),c.style.paddingTop=c.style.height;const e=getScale(a),d=a.noteSequence.notes;for(let g=0;g<d.length;g++){const f=d[g],i=b&&a.isPaintingActiveNote(f,b);if(!i)continue;const h=a.svg.querySelector(`rect[data-index="${g}"]`);a.fillActiveRect(h,f);const j=a.svgPiano.querySelector(`rect[data-pitch="${f.pitch}"]`);if(a.fillActiveRect(j,f),f===b){const a=parseFloat(h.getAttribute("y")),b=parseFloat(h.getAttribute("height"));return c.scrollTop=(a+b)*e,a}}return null}function styleToViewBox(a){const b=a.style,c=parseFloat(b.width),d=parseFloat(b.height),e=`0 0 ${c} ${d}`;a.setAttribute("viewBox",e),a.removeAttribute("style")}function initVisualizer(){const b=document.getElementById("gamePanel"),c={showOnlyOctavesUsed:!0};visualizer=new core.WaterfallSVGVisualizer(ns,b,c),styleToViewBox(visualizer.svg),styleToViewBox(visualizer.svgPiano);const a=visualizer.parentElement;a.style.width="100%",a.style.height="50vh",a.style.overflowY="hidden",a.scrollTop=a.scrollHeight}function initPlayer(){const a="https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus",b={run:a=>redraw(visualizer,a),stop:()=>{visualizer.clearActiveNotes(),document.getElementById("play").classList.remove("d-none"),document.getElementById("pause").classList.add("d-none"),clearInterval(seekbarInterval),clearInterval(scrollInterval);const a=visualizer.parentElement;a.scrollTop=a.scrollHeight;const b=document.getElementById("repeat"),c=b.classList.contains("active");c&&(player.start(ns),setSmoothScroll(),initSeekbar(ns,0))}};player&&player.isPlaying()&&(document.getElementById("currentTime").textContent=formatTime(0),document.getElementById("play").classList.remove("d-none"),document.getElementById("pause").classList.add("d-none"),player.stop(),clearInterval(seekbarInterval),clearInterval(scrollInterval)),player=new core.SoundFontPlayer(a,void 0,void 0,void 0,b)}function setSmoothScroll(){let a=0;const b=20,d=Date.now()+ns.totalTime*1e3,c=visualizer.parentElement;scrollInterval=setInterval(()=>{if(Date.now()<d){{const d=c.scrollHeight,e=d/ns.totalTime*b/1e3;if(a+=e,a>=1){const b=Math.floor(a);c.scrollTop-=b,a-=b}}}else clearInterval(scrollInterval)},b)}function play(){switch(document.getElementById("play").classList.add("d-none"),document.getElementById("pause").classList.remove("d-none"),player.getPlayState()){case"stopped":if(player.getPlayState()=="started")return;setSpeed(ns),player.loadSamples(ns).then(()=>{player.start(ns),setSmoothScroll(),initSeekbar(ns,0)});break;case"paused":{player.resume();const a=parseInt(document.getElementById("seekbar").value);setSeekbarInterval(a),setSmoothScroll()}}}function pause(){document.getElementById("play").classList.remove("d-none"),document.getElementById("pause").classList.add("d-none"),player.pause(),clearInterval(seekbarInterval),clearInterval(scrollInterval)}function getCheckboxString(b,a){return`
<div class="form-check form-check-inline">
  <label class="form-check-label">
    <input class="form-check-input" name="${b}" value="${a}" type="checkbox" checked>
    ${a}
  </label>
</div>`}function setInstrumentsCheckbox(){const a=new Set;ns.notes.forEach(b=>{a.add(b.instrument)});const d=new Map;let b="";a.forEach(a=>{b+=getCheckboxString("instrument",a),d.set(a,!0)});const e=(new DOMParser).parseFromString(b,"text/html"),c=document.getElementById("filterInstruments");c.replaceChildren(...e.body.childNodes),[...c.querySelectorAll("input")].forEach(a=>{a.addEventListener("change",()=>{const b=a.value;[...visualizer.svg.children].forEach(a=>{a.dataset.instrument==b&&a.classList.toggle("d-none")})})})}function setProgramsCheckbox(){const a=new Set;ns.notes.forEach(b=>{a.add(b.program)});const d=new Map;let b="";a.forEach(a=>{b+=getCheckboxString("program",a),d.set(a,!0)});const e=(new DOMParser).parseFromString(b,"text/html"),c=document.getElementById("filterPrograms");c.replaceChildren(...e.body.childNodes),[...c.querySelectorAll("input")].forEach(a=>{a.addEventListener("change",()=>{const b=a.value;[...visualizer.svg.children].forEach(a=>{a.dataset.program==b&&a.classList.toggle("d-none")})})})}function setToolbar(){setProgramsCheckbox(),setInstrumentsCheckbox()}function speedDown(){const a=document.getElementById("speed"),b=parseInt(a.value)-10;b<0?a.value=0:a.value=b,document.getElementById("speedDown").disabled=!0,changeSpeed(),document.getElementById("speedDown").disabled=!1}function speedUp(){const a=document.getElementById("speed");a.value=parseInt(a.value)+10,document.getElementById("speedUp").disabled=!0,changeSpeed(),document.getElementById("speedUp").disabled=!1}function changeSpeed(){if(ns)switch(player.getPlayState()){case"started":{player.stop(),clearInterval(seekbarInterval),clearInterval(scrollInterval);const b=ns.totalTime;setSpeed(ns);const c=b/ns.totalTime,d=parseInt(document.getElementById("seekbar").value),a=d/c;player.start(ns,void 0,a),setSmoothScroll(),initSeekbar(ns,a);break}case"paused":{speedChanged=!0;break}}}function setSpeed(b){const e=document.getElementById("speed"),a=parseInt(e.value)/100,f=nsCache.controlChanges;b.controlChanges.forEach((b,c)=>{b.time=f[c].time/a});const c=nsCache.tempos;b.tempos.forEach((b,d)=>{b.time=c[d].time/a,b.qpm=c[d].qpm*a});const d=nsCache.notes;b.notes.forEach((b,c)=>{b.startTime=d[c].startTime/a,b.endTime=d[c].endTime/a}),b.totalTime=nsCache.totalTime/a}function repeat(){document.getElementById("repeat").classList.toggle("active")}function volumeOnOff(){const b=document.getElementById("volumeOnOff").firstElementChild,a=document.getElementById("volumebar");b.classList.contains("bi-volume-up-fill")?(b.className="bi bi-volume-mute-fill",a.dataset.value=a.value,a.value=-50,player.output.mute=!0):(b.className="bi bi-volume-up-fill",a.value=a.dataset.value,player.output.mute=!1)}function changeVolumebar(){const a=document.getElementById("volumebar"),b=a.value;a.dataset.value=b,player.output.volume.value=b}function formatTime(a){a=Math.floor(a);const c=a%60,b=(a-c)/60,d=(a-c-60*b)/3600,e=String(c).padStart(2,"0"),f=b>9||!d?`${b}:`:`0${b}:`,g=d?`${d}:`:"";return`${g}${f}${e}`}function changeSeekbar(b){clearInterval(seekbarInterval);const a=parseInt(b.target.value);document.getElementById("currentTime").textContent=formatTime(a),player.isPlaying()&&(player.seekTo(a),setSeekbarInterval(a),player.getPlayState()=="paused"&&player.resume())}function updateSeekbar(a){const b=document.getElementById("seekbar");b.value=a;const c=formatTime(a);document.getElementById("currentTime").textContent=c}function initSeekbar(a,b){document.getElementById("seekbar").max=a.totalTime,document.getElementById("seekbar").value=b,document.getElementById("totalTime").textContent=formatTime(a.totalTime),clearInterval(seekbarInterval),setSeekbarInterval(b)}function setSeekbarInterval(a){seekbarInterval=setInterval(()=>{updateSeekbar(a),a+=1},1e3)}function resizeScroll(){const b=parseInt(document.getElementById("seekbar").value),a=visualizer.parentElement,c=(ns.totalTime-b/ns.totalTime)*a.scrollHeight;a.scrollTop=c}function parseQuery(a){const b={},c=(a[0]==="?"?a.substr(1):a).split("&");for(let a=0;a<c.length;a++){const d=c[a].split("=");b[decodeURIComponent(d[0])]=decodeURIComponent(d[1]||"")}return b}let ns,nsCache,seekbarInterval,scrollInterval,player,visualizer;loadConfig(),location.search?convertFromUrlParams():convertFromUrl("abt.mid"),document.getElementById("toggleDarkMode").onclick=toggleDarkMode,document.ondragover=a=>{a.preventDefault()},document.ondrop=dropFileEvent,document.getElementById("inputFile").onchange=convertFileEvent,document.getElementById("inputUrl").onchange=convertUrlEvent,document.getElementById("play").onclick=play,document.getElementById("pause").onclick=pause,document.getElementById("speed").onchange=changeSpeed,document.getElementById("speedDown").onclick=speedDown,document.getElementById("speedUp").onclick=speedUp,document.getElementById("repeat").onclick=repeat,document.getElementById("volumeOnOff").onclick=volumeOnOff,document.getElementById("volumebar").onchange=changeVolumebar,document.getElementById("seekbar").onchange=changeSeekbar,window.addEventListener("resize",resizeScroll)