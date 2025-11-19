// UMD module for Neon API Client

const API_BASE = "https://attentiocloud-api.vercel.app";

function getToken() {
  return (
    localStorage.getItem("_ms-mid") ||
    document.cookie
      .split("; ")
      .find((r) => r.startsWith("_ms-mid="))
      ?.split("=")[1] ||
    null
  );
}

function getPlans() {
  const raw = localStorage.getItem("_ms-mem");
  if (!raw) return [];
  try {
    const obj = JSON.parse(raw);
    return (obj.planConnections || []).map(p => p.planId);
  } catch (e) {
    console.warn("Invalid _ms-mem JSON", e);
    return [];
  }
}

function buildHeaders() {
  const token = getToken();
  if (!token) throw new Error("Missing Memberstack token (_ms-mid)");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-MS-Plans": getPlans().join(","),
  };
}

/* ------------------ GET ------------------ */
function getNEON({
  table,
  fields = null,
  where = null,
  responsId,
  cache = false,
  public: isPublic = false,
  pagination = null
}) {
  let url = `${API_BASE}/api/${table}`;
  const params = new URLSearchParams();

  // felt
  if (fields?.length) params.set("fields", fields.join(","));

  // where = { id: 5, status: "active" }
  if (where) {
    Object.entries(where).forEach(([k, v]) => params.set(k, v));
  }

  // cache
  if (cache) params.set("cache", "1");

  // pagination
  if (pagination && typeof pagination === "object") {
    if (pagination.limit != null) params.set("limit", String(pagination.limit));
    if (pagination.offset != null) params.set("offset", String(pagination.offset));
  }

  // bygg URL
  if ([...params].length > 0) url += `?${params.toString()}`;

  const options = isPublic ? {} : { headers: buildHeaders() };

  fetch(url, options)
    .then(res => res.json())
    .then(json =>
      apiresponse(
        {
          rows: json.rows,
          cached: json.cached,
          limit: json.limit,
          offset: json.offset,
          count: json.count,
          total: json.total,
          hasMore: json.hasMore
        },
        responsId
      )
    );
}

/* ------------------ POST ------------------ */
async function postNEON({
  table,
  data,
  responsId,
  public: isPublic = false
}) {
  const url = `${API_BASE}/api/${table}`;

  const options = {
    method: "POST",
    headers: isPublic ? {} : buildHeaders(),
    body: JSON.stringify(Array.isArray(data) ? data : [data]),
  };

  const res = await fetch(url, options);

  if (!res.ok) throw new Error(`POST failed: ${res.status}`);

  const json = await res.json();

  apiresponse(
    {
      inserted: json.inserted,
      insertedCount: json.insertedCount,
      user: json.user
    },
    responsId
  );
}

/* ----------------- PATCH ------------------ */
async function patchNEON({
  table,
  data,          // single or bulk
  responsId,
  public: isPublic = false
}) {
  const url = `${API_BASE}/api/${table}`;

  // Hvis data er én rad (single update)
  let payload;

  if (!Array.isArray(data)) {
    // data = { id: 1, fields: {...} }  eller { id: 1, runnnr: 999 }
    if (data.id && data.fields) {
      payload = { id: data.id, data: data.fields };
    } else {
      // Hvis user skriver data: { id: 1, runnnr: 999 }
      const { id, ...rest } = data;
      payload = { id, data: rest };
    }
  }

  // Hvis data er flere rader (bulk)
  else {
    payload = data.map(item => {
      if (item.fields) {
        return { id: item.id, fields: item.fields };
      }

      // støtte for data: [ { id: 1, runnnr: 99 }, ... ]
      const { id, ...rest } = item;
      return { id, fields: rest };
    });
  }

  const options = {
    method: "PATCH",
    headers: isPublic ? {} : buildHeaders(),
    body: JSON.stringify(payload),
  };

  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`PATCH failed: ${res.status}`);

  const json = await res.json();

  apiresponse(
    {
      rows: json.rows,
      updatedCount: json.updatedCount,
      mode: json.mode,
    },
    responsId
  );
}

/* ------------------ DELETE ------------------ */
async function deleteNEON({ table, data, responsId }) {
  if (data === undefined || data === null) {
    throw new Error("deleteNEON requires 'data' to be an ID or array of IDs");
  }

  // Hvis brukeren sender et enkelt tall → gjør det om til array
  const ids = Array.isArray(data) ? data : [data];

  // value=1,2,3
  const value = ids.join(",");

  const url = `${API_BASE}/api/${table}?field=id&value=${value}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: buildHeaders()
  });

  if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);

  const json = await res.json();

  apiresponse(
    {
      deleted: json.deleted,
      ids
    },
    responsId
  );
}




