export default function attach(client){ client.on("message", m=>{ if(m.body==="oi") client.sendMessage(m.from,"Olá Fight Arcade!"); }); }
