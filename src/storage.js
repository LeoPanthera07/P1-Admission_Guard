'use strict';
var STORAGE_KEY='admitguard-submissions';
var THEME_KEY='admitguard-theme';
var RULES_KEY='admitguard-rules';
var DATA_FILE_NAME='admitguard-data.json';
var _dirHandle=null;
function _openIDB(cb){try{var req=indexedDB.open('admitguard-idb',1);req.onupgradeneeded=function(e){e.target.result.createObjectStore('handles');};req.onsuccess=function(e){cb(null,e.target.result);};req.onerror=function(){cb(new Error('IDB open failed'),null);};}catch(e){cb(e,null);}}
function _saveDirHandle(handle){_dirHandle=handle;_openIDB(function(err,db){if(err||!db)return;try{var tx=db.transaction('handles','readwrite');tx.objectStore('handles').put(handle,'dirHandle');}catch(e){}});}
function _loadDirHandle(cb){if(_dirHandle){cb(_dirHandle);return;}_openIDB(function(err,db){if(err||!db){cb(null);return;}try{var tx=db.transaction('handles','readonly');var req=tx.objectStore('handles').get('dirHandle');req.onsuccess=function(e){var h=e.target.result||null;if(h)_dirHandle=h;cb(h);};req.onerror=function(){cb(null);};}catch(e){cb(null);}});}
function _clearDirHandle(){_dirHandle=null;_openIDB(function(err,db){if(err||!db)return;try{var tx=db.transaction('handles','readwrite');tx.objectStore('handles').delete('dirHandle');}catch(e){}});}
function hasFSAA(){return typeof window!=='undefined'&&'showDirectoryPicker'in window;}
function hasActiveDirHandle(){return!!_dirHandle;}
async function pickStorageFolder(){if(!hasFSAA()){return{ok:false,message:'Your browser does not support folder selection.'};}try{var handle=await window.showDirectoryPicker({mode:'readwrite',startIn:'documents'});_saveDirHandle(handle);return{ok:true,name:handle.name};}catch(e){if(e.name==='AbortError')return{ok:false,message:'Folder selection cancelled.'};return{ok:false,message:'Could not access folder: '+e.message};}}
async function clearStorageFolder(){_clearDirHandle();return{ok:true};}
async function _readFileFromDir(handle,name){try{var fh=await handle.getFileHandle(name,{create:false});var file=await fh.getFile();var text=await file.text();return JSON.parse(text);}catch(e){return null;}}
async function _writeFileToDir(handle,name,data){var fh=await handle.getFileHandle(name,{create:true});var wr=await fh.createWritable();await wr.write(JSON.stringify(data,null,2));await wr.close();}
async function _ensurePermission(handle){try{var perm=await handle.queryPermission({mode:'readwrite'});if(perm==='granted')return true;var req=await handle.requestPermission({mode:'readwrite'});return req==='granted';}catch(e){return false;}}
function getSubmissions(){try{var raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):[];}catch(e){return[];}}
function _syncSave(subs){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(subs));}catch(e){}}
async function saveSubmission(record){record.id='AG-'+Date.now();var subs=getSubmissions();subs.push(record);_syncSave(subs);await _persistToDir(subs);return record;}
async function updateSubmission(id,updates){var subs=getSubmissions();var idx=subs.findIndex(function(s){return s.id===id;});if(idx===-1)return null;subs[idx]=Object.assign(subs[idx],updates,{updatedAt:new Date().toISOString()});_syncSave(subs);await _persistToDir(subs);return subs[idx];}
async function deleteSubmission(id){var subs=getSubmissions().filter(function(s){return s.id!==id;});_syncSave(subs);await _persistToDir(subs);}
async function toggleFlag(id){var subs=getSubmissions();var idx=subs.findIndex(function(s){return s.id===id;});if(idx===-1)return;subs[idx].flaggedForManager=!subs[idx].flaggedForManager;subs[idx].updatedAt=new Date().toISOString();_syncSave(subs);await _persistToDir(subs);return subs[idx];}
async function _persistToDir(subs){_loadDirHandle(async function(handle){if(!handle)return;var ok=await _ensurePermission(handle);if(!ok)return;try{await _writeFileToDir(handle,'admitguard-data.json',subs);}catch(e){}});}
async function syncFromDir(){return new Promise(function(resolve){_loadDirHandle(async function(handle){if(!handle){resolve(false);return;}var ok=await _ensurePermission(handle);if(!ok){resolve(false);return;}try{var data=await _readFileFromDir(handle,'admitguard-data.json');if(Array.isArray(data)){_syncSave(data);resolve(true);}else{resolve(false);}}catch(e){resolve(false);}});});}
function getDirName(){return _dirHandle?_dirHandle.name:null;}
function getSavedRules(){try{var raw=localStorage.getItem(RULES_KEY);return raw?JSON.parse(raw):null;}catch(e){return null;}}
function saveRules(rules){try{localStorage.setItem(RULES_KEY,JSON.stringify(rules));}catch(e){}}
function resetRules(){try{localStorage.removeItem(RULES_KEY);}catch(e){}}
function getTheme(){try{return localStorage.getItem(THEME_KEY)||'light';}catch(e){return'light';}}
function saveTheme(t){try{localStorage.setItem(THEME_KEY,t);}catch(e){}}
function clearSubmissions(){try{localStorage.removeItem(STORAGE_KEY);}catch(e){}}
function exportJSON(){var subs=getSubmissions();var blob=new Blob([JSON.stringify(subs,null,2)],{type:'application/json'});_triggerDownload(blob,'admitguard-export-'+_dateStamp()+'.json');}
function exportCSV(){var subs=getSubmissions();if(!subs.length)return;var softFields=['dateOfBirth','graduationYear','percentageOrCgpa','screeningTestScore'];var baseHeaders=['id','fullName','email','phone','dateOfBirth','highestQualification','graduationYear','percentageOrCgpa','screeningTestScore','interviewStatus','aadhaarNumber','offerLetterSent','exceptionCount','flaggedForManager','createdAt','updatedAt'];var excHeaders=softFields.map(function(f){return[f+'_exception',f+'_rationale'];}).flat();var allHeaders=baseHeaders.concat(excHeaders);var rows=subs.map(function(s){var base=baseHeaders.map(function(h){var v=s[h];if(v===undefined||v===null)return'';if(typeof v==='boolean')return v?'Yes':'No';return'"'+String(v).replace(/"/g,'""')+'"';});var excs=softFields.map(function(f){var ex=s.exceptions&&s.exceptions[f];return[ex?'"Yes"':'"No"',ex?'"'+String(ex.rationale||'').replace(/"/g,'""')+'"':'""'];}).flat();return base.concat(excs).join(',');});var csv=allHeaders.join(',')+'\n'+rows.join('\n');var blob=new Blob([csv],{type:'text/csv'});_triggerDownload(blob,'admitguard-export-'+_dateStamp()+'.csv');}
function _dateStamp(){return new Date().toISOString().slice(0,10);}
function _triggerDownload(blob,filename){var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(url);a.remove();},1000);}
