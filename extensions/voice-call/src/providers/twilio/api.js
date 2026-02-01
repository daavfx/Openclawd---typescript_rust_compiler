export async function twilioApiRequest(params) {
  const bodyParams = (params.body instanceof URLSearchParams) ? params.body : Object.entries(params.body).reduce((acc, [key, value]) => {
    if (Array.isArray(value)) {
      for (const entry of value) {
        acc.append(key, entry);
      }
    } else {
      if ((typeof value === "string")) {
        acc.append(key, value);
      }
    }
    return acc;
  }, new URLSearchParams());
  const response = await fetch("", { method: "POST", headers: { Authorization: "Basic ", "Content-Type": "application/x-www-form-urlencoded" }, body: bodyParams });
  if (!response.ok) {
    if ((params.allowNotFound && (response.status === 404))) {
      return undefined;
    }
    const errorText = await response.text();
    throw new Error("Twilio API error:  ");
  }
  const text = await response.text();
  return text ? JSON.parse(text) : undefined;
}

