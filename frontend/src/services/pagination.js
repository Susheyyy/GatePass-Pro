// Existing screens consume complete collections. Keep page traversal here so
// reports, search results, and selectors cannot accidentally use only page one.
export async function fetchCollection(client, url, key, params = {}) {
  const records = new Map();
  for (let page = 1; page <= 1000; page++) {
    const { data } = await client.get(url, { params: { ...params, page, limit: 200 } });
    if (Array.isArray(data) && page === 1) return data;
    if (!data || !Array.isArray(data[key]) || data.page !== page ||
        !Number.isInteger(data.pages) || data.pages < 0 || data.pages > 1000 ||
        (data.pages === 0 && (page !== 1 || data[key].length !== 0)) ||
        (data.pages > page && data[key].length === 0)) {
      throw new Error('Invalid pagination response. Refresh and retry.');
    }
    for (const record of data[key]) {
      if (!record?._id) throw new Error('List response contains a record without an identity.');
      records.set(String(record._id), record);
    }
    if (page >= data.pages) return [...records.values()];
  }
  throw new Error('Collection exceeds the supported page count. Narrow the search.');
}
