// Sources live here once. Scene policies hold relative gain, not duplicate paths.
window.GensokyoAudioConfig=Object.freeze({
 tracks:Object.freeze({boundary:Object.freeze({src:'assets/login-v060.mp3',volume:.21}),village:Object.freeze({src:'assets/village-v02-loop.wav',volume:.14}),yokai:Object.freeze({src:'assets/yokai-road.mp3',volume:.15})}),
 scenes:Object.freeze(Object.fromEntries(Object.entries({courtyard:['village',1],interior:['village',1],village:['village',1],yujinRoom:['village',1],warehouse:['village',1],geidontei:['village',1],terakoya:['village',.25],dungeonHub:['yokai',1],regionEntrance:['yokai',1],field:['village',1]}).map(([k,[track,gain]])=>[k,Object.freeze({track,gain})]))),
 ambience:Object.freeze({breeze:'assets/school-breeze-audible.wav',pages:'assets/school-pages.wav',minDelay:40000,maxDelay:90000}),duckGain:.2
});
