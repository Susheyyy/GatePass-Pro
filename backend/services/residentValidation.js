const definitions = {
  flatNo: value => typeof value === 'string' && /^[A-Z]{1,12}-\d{1,8}$/.test(value),
  name: value => typeof value === 'string' && value.length >= 2 && value.length <= 80,
  mobile: value => typeof value === 'string' && /^\d{8,15}$/.test(value),
  gmail: value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  members: value => Number.isInteger(value) && value >= 1 && value <= 50,
  vehicles: value => Array.isArray(value) && value.length <= 20 && new Set(value).size === value.length && value.every(v => typeof v === 'string' && /^[A-Z0-9 -]{3,15}$/.test(v)),
  bio: value => typeof value === 'string' && value.length <= 1000,
  location: value => typeof value === 'string' && value.length <= 200,
  address: value => typeof value === 'string' && value.length <= 500,
  avatar: value => ['avatar1', 'avatar2', 'avatar3', 'avatar4'].includes(value)
};

function residentInput(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('A JSON object is required');
  const result = {};
  for (const [key, validate] of Object.entries(definitions)) {
    if (body[key] === undefined) {
      if (!partial && ['flatNo', 'name', 'mobile', 'gmail', 'members'].includes(key)) throw new Error(`${key} is required`);
      continue;
    }
    let value = body[key];
    if (typeof value === 'string') value = value.trim();
    if (key === 'flatNo') value = typeof value === 'string' ? value.toUpperCase() : value;
    if (key === 'gmail') value = typeof value === 'string' ? value.toLowerCase() : value;
    if (key === 'members' && typeof value === 'string' && /^\d+$/.test(value)) value = Number(value);
    if (!validate(value)) throw new Error(`Invalid ${key}`);
    result[key] = value;
  }
  return result;
}

module.exports = { definitions, residentInput };
