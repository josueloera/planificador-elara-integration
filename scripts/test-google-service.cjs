const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/elara-google-service.gs'),'utf8');
function fixture(status=200){
 const properties=new Map([['ELARA_SECRET','test-secret']]),calls=[],published=[],sent=[];
 let itemId=0;
 const item=()=>({setTitle(){return this;},setRequired(){return this;},setValidation(){return this;},getId(){return ++itemId;}});
 const form={supportsAdvancedResponderPermissions:()=>true,setPublished:value=>published.push(value),getId:()=> 'form-test',addPublishedReader:()=>{},setDescription(){},setCollectEmail(){},setAllowResponseEdits(){},setPublishingSummary(){},addTextItem:item,addParagraphTextItem:item,getPublishedUrl:()=> 'https://docs.google.com/forms/test'};
 const context=vm.createContext({
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperty:(k,v)=>properties.set(k,v)})},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,hasLock:()=>true,releaseLock(){}})},
  Session:{getEffectiveUser:()=>({getEmail:()=> 'owner@example.com'})},
  MailApp:{getRemainingDailyQuota:()=>10,sendEmail:message=>sent.push(message)},
  Drive:{Permissions:{list:()=>({permissions:[]}),remove(){}}},
  FormApp:{create:()=>form,createTextValidation:()=>({requireNumberBetween(){return this;},setHelpText(){return this;},build(){return {};}})},
  ScriptApp:{getOAuthToken:()=> 'test-oauth'},
  UrlFetchApp:{fetch:(url,options)=>{calls.push({url,options});return {getResponseCode:()=>status};}},
 });
 vm.runInContext(source,context);
 const assignment={id:'12345678-1234-1234-1234-123456789012',subject:'Artes',school:'Escuela',groupLabel:'3 A',email:'teacher@example.com',start:'2026-09-01',end:'2026-11-27',students:[{id:1,name:'Ana'}]};
 const invoke=(action,secret='test-secret')=>context.doPost({postData:{contents:JSON.stringify({action,secret,assignment})}});
 return {invoke,calls,published,sent};
}
test('Google service uses the REST API with the owner OAuth token and sends only once',()=>{
 const f=fixture();assert.equal(f.invoke('create').ok,true);
 assert.equal(f.calls[0].url,'https://forms.googleapis.com/v1/forms/form-test:batchUpdate');
 assert.equal(f.calls[0].options.headers.Authorization,'Bearer test-oauth');
 assert.equal(JSON.parse(f.calls[0].options.payload).requests[0].updateSettings.settings.emailCollectionType,'VERIFIED');
 assert.deepEqual(f.published,[false,true]);f.invoke('send');f.invoke('send');assert.equal(f.sent.length,1);
});
test('Google rejects unauthorized requests and does not publish or send if verification fails',()=>{
 const f=fixture(403);assert.equal(f.invoke('create','wrong').ok,false);assert.equal(f.calls.length,0);
 assert.equal(f.invoke('create').ok,false);assert.deepEqual(f.published,[false]);assert.equal(f.sent.length,0);
});
