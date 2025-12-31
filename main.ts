import { Hono } from "https://deno.land/x/hono@v3.4.1/mod.ts";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

const ENV_TOKEN = "CAPI_API_KEY";
const SYNC_MAX = 33;

const env = await load();

const keyBase64 = Deno.env.get("DECRYPTION_KEY");

if (!keyBase64) {
  console.error("❌ Error: DECRYPTION_KEY environment variable is not set.");
  Deno.exit(1);
}

let data = new Array<Location>();

try {
  // 2. Load the encrypted file
  const encryptedData = await Deno.readFile("data.enc");

  // 3. Extract the IV and the ciphertext
  // Remember: We saved the first 12 bytes as the IV
  const iv = encryptedData.slice(0, 12);
  const ciphertext = encryptedData.slice(12);

  // 4. Convert the Base64 key back into a CryptoKey object
  const keyBuffer = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    "AES-GCM",
    true,
    ["decrypt"]
  );

  // 5. Decrypt the data
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  // 6. Decode and output the result
  const decodedData = new TextDecoder().decode(decryptedBuffer);
  data = JSON.parse(decodedData);

  console.log("✅ Decryption successful!");

} catch (err) {
  const error = err as Error;
  console.error("❌ Decryption failed. The key might be wrong or the file is corrupted.");
  console.error(error.message);
  Deno.exit(1);
}

type Location = {
  locationID: number;
  desc: string[];
  go?: number;
  hitPoints?: number;
  options?: Array<any>;
  if?: undefined;
  checkMark?: undefined;
  role?: undefined;
  revists?: undefined;
  penality?: undefined;
  roll?: undefined;
  restore?: undefined;
  locationid?: undefined;
  end?: undefined;
}

const NotFound: Location = {
  locationID: 0,
  desc: ["Cannot find this Location ??!!"]
}

export function sortData() {
  const sorted = data.sort((locationA, locationB) => {
    const idA = parseID(locationA.locationID);
    const idB = parseID(locationB.locationID);
    return idA - idB;
  });
  return sorted as Array<Location>;
}

export function parseID(id: number | undefined): number {
  if (id != null) {
    return id;
  }
  console.error("ERROR");
  return 0;
}

export function display(data: Array<Location>, id: number) {
  console.log(data[id].locationID + ".");
  data[id].desc.forEach((line: string) => console.log(line));
  if (data[id].go) {
    console.log("Go to " + data[id].go);
  }
  console.log("==================================");
  console.log("==================================");
  console.log("==================================");
  console.log("");
  console.log("");
  console.log("");

}

const sortedList = sortData();

const getKey = (number = -1) => {
  const token = (number < 1) ? ENV_TOKEN : ENV_TOKEN + "_" + number;
  const key = env[token] || Deno.env.get(token);
  if (key) {
    console.log(number + ". STARTING UP, API KEY IS " + key.length + " Characters long");
  } else {
    return false;
  }
  return key;
}
const tokens = [...Array(SYNC_MAX).keys()].map((n) => getKey(n)).filter((v) => v);

const validToken = (token: string) => (tokens.indexOf(token) > -1);

const checkApiKey = (c: HonoRequest, token: string | undefined) => {
  if (!token) {
    c.status(400);
    return c.body("Missing token ");
  }
  if (!validToken(token)) {
    c.status(403);
    return c.body(token.length + ". Bad api key " + token);
  }
  return null;
}

export const app = new Hono();

type HonoRequest = {
  req: { param: (arg0: string) => string; header: (arg0: string) => string; }; json: (arg0: any) => any;
  redirect: (arg0: string) => any;
  status: (stat: number) => void;
  body: (b: string) => void;
}

const getResult = (id: number) => {
  if (id == 0) {
    return NotFound;
  }
  const result = sortedList[id - 1];
  if (!result) {
    return NotFound;
  }
  return result;
}

app.get("/:id", async (c: HonoRequest) => {
  const idString = c.req.param('id');
  console.info('GET ' + idString);
  let id = 0;
  try {
    id = parseInt(idString);
    id = (id > sortedList.length) ? 0 : id;
  } catch (error) {
    console.log('Cannot parse "' + idString + '"', error);
  }
  const token = c.req.header('X-API-KEY') || "";
  const apiKeyResponse = checkApiKey(c, token);
  if (apiKeyResponse) {
    console.error('Bad token for get');
    return apiKeyResponse;
  }
  console.info('Token OK');
  const result = getResult(id);
  if (Object.keys(result).length > 0) {
    console.info("request got data back");
  } else {
    console.warn("request got nothing back!?");
  }

  try {
    return c.json(result);
  } catch (er) {
    console.error(er);
  }

});

Deno.serve(app.fetch);
