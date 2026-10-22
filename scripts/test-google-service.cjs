const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/elara-google-service.gs'),'utf8');
function fixture(){
 const properties=new Map([['ELARA_SECRET','test-secret']]),published=[],sent=[];
 let itemId=0;
 const item=()=>({setTitle(){return this;},setRequired(){return this;},setValidation(){return this;},getId(){return ++itemId;}});
 const form={supportsAdvancedResponderPermissions:()=>true,setPublished:value=>published.push(value),getId:()=> 'form-test',addPublishedReader:email=>{form.responder=email;},setDescription(){},setCollectEmail(){},setAllowResponseEdits(){},setPublishingSummary(){},addTextItem:item,addParagraphTextItem:item,getPublishedUrl:()=> 'https://docs.google.com/forms/test'};
 const context=vm.createContext({
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperty:(k,v)=>properties.set(k,v)})},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,hasLock:()=>true,releaseLock(){}})},
  Session:{getEffectiveUser:()=>({getEmail:()=> 'owner@example.com'})},
  MailApp:{getRemainingDailyQuota:()=>10,sendEmail:message=>sent.push(message)},
  FormApp:{create:()=>form,createTextValidation:()=>({requireNumberBetween(){return this;},setHelpText(){return this;},build(){return {};}})},
 });
 vm.runInContext(source,context);
 const assignment={id:'12345678-1234-1234-1234-123456789012',subject:'Artes',school:'Escuela',groupLabel:'3 A',email:'teacher@example.com',start:'2026-09-01',end:'2026-11-27',students:[{id:1,name:'Ana'}]};
 const invoke=(action,secret='test-secret')=>context.doPost({postData:{contents:JSON.stringify({action,secret,assignment})}});
 return {invoke,published,sent,form};
}
test('Google service uses native Forms permissions and sends only once',()=>{
 const f=fixture();assert.equal(f.invoke('create').ok,true);assert.equal(f.form.responder,'teacher@example.com');
 assert.deepEqual(f.published,[false,true]);f.invoke('send');f.invoke('send');assert.equal(f.sent.length,1);
});
test('Google service rejects unauthorized requests without creating or publishing forms',()=>{
 const f=fixture();assert.equal(f.invoke('create','wrong').ok,false);assert.deepEqual(f.published,[]);assert.equal(f.sent.length,0);
});
