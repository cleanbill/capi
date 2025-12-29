const fileName = "data.json";
const jsonData = await Deno.readTextFile(fileName);
const dataBytes = new TextEncoder().encode(jsonData);

const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, 
    ["encrypt", "decrypt"]
);

const iv = crypto.getRandomValues(new Uint8Array(12));

const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    dataBytes
);

const exportedKey = await crypto.subtle.exportKey("raw", key);
const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));

const finalData = new Uint8Array(iv.length + encryptedBuffer.byteLength);
finalData.set(iv);
finalData.set(new Uint8Array(encryptedBuffer), iv.length);

await Deno.writeFile("data.enc", finalData);

console.log("✅ File encrypted successfully as 'data.enc'");
console.log("🔑 YOUR DECRYPTION KEY (Save this!):", keyBase64);













