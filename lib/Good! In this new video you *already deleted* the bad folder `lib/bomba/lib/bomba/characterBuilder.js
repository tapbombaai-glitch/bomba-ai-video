/* =====================================================
BOMBA AI — CHARACTER BUILDER
File: lib/bomba/characterBuilder.js

Purpose:

Centralize BOMBA character definitions

Keep character data consistent

Make character logic testable

NO video generation

NO voice generation

NO API calls
===================================================== */


export const createMasterCharacters = () => {
return [
{
id: "character-main",
name: "Main Character",
role: "Main Character",
gender: "Male",
voiceId: "ada_pcm",
voiceName: "Ada",
voiceGender: "Female",
voiceStatus: "ready",
},

{  
  id: "character-friend",  
  name: "Friend",  
  role: "Support Character",  
  gender: "Female",  
  voiceId: "blessing_pcm",  
  voiceName: "Blessing",  
  voiceGender: "Female",  
  voiceStatus: "ready",  
},  

{  
  id: "character-rival",  
  name: "Rival",  
  role: "Rival",  
  gender: "Male",  
  voiceId: "ifeanyi_ig",  
  voiceName: "Ifeanyi",  
  voiceGender: "Male",  
  voiceStatus: "ready",  
},

];
};

Check