export async function authenticate(url, code) {
  const resp = await fetch("/~/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "password=" });
  if (!resp.ok) {
    throw new Error("Login failed with status ");
  }
  await resp.text();
  const cookie = resp.headers.get("set-cookie");
  if (!cookie) {
    throw new Error("No authentication cookie received");
  }
  return cookie;
}

